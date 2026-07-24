#!/usr/bin/env node
/**
 * Phase 1 acquisition crawler for scanbox.se.
 *
 * - Respects robots.txt (fetched and parsed before any page request)
 * - Rate-limited: one request every CRAWL_DELAY_MS (default 1500ms)
 * - Restricted to scanbox.se hosts; follows in-scope links from seed pages
 * - Saves raw HTML/PDF bytes under data/raw/ and writes data/sources.json:
 *   { url, fetched_at, status, content_type, sha256, bytes, saved_as }
 *
 * Run: npm run acquire   (then: npm run parse)
 *
 * If every request fails with a proxy 403, the environment's egress policy is
 * blocking scanbox.se - the crawler reports that plainly and exits non-zero.
 * It never fabricates content for unreachable pages.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "..", "data");
const RAW_DIR = path.join(DATA_DIR, "raw");
const MANUALS_DIR = path.join(DATA_DIR, "manuals");
const CRAWL_DELAY_MS = Number(process.env.CRAWL_DELAY_MS || 1500);
const MAX_PAGES = Number(process.env.MAX_PAGES || 600);
const UA = "ScanBoxDemoBot/0.1 (+demo dataset builder; contact: repo owner)";

// Route through an HTTPS proxy when the environment defines one (remote
// sessions). undici's EnvHttpProxyAgent reads HTTPS_PROXY/NO_PROXY itself.
try {
  const { EnvHttpProxyAgent, setGlobalDispatcher } = await import("undici");
  if (process.env.HTTPS_PROXY || process.env.https_proxy) {
    setGlobalDispatcher(new EnvHttpProxyAgent());
  }
} catch {
  /* undici not installed - fall back to direct fetch */
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

function urlToFilename(url) {
  const u = new URL(url);
  const slug = (u.pathname + u.search)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "index";
  return slug.slice(0, 180);
}

// --- robots.txt -----------------------------------------------------------
async function loadRobots(origin) {
  const rules = { disallow: [], crawlDelay: null };
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "user-agent": UA } });
    if (!res.ok) return rules;
    const text = await res.text();
    let applies = false;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/#.*$/, "").trim();
      if (!line) continue;
      const [key, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      switch (key.trim().toLowerCase()) {
        case "user-agent":
          applies = value === "*" || UA.toLowerCase().includes(value.toLowerCase());
          break;
        case "disallow":
          if (applies && value) rules.disallow.push(value);
          break;
        case "crawl-delay":
          if (applies && !Number.isNaN(Number(value))) rules.crawlDelay = Number(value) * 1000;
          break;
      }
    }
  } catch {
    /* unreachable robots.txt -> stay with defaults, still rate-limited */
  }
  return rules;
}

const robotsAllows = (rules, url) => {
  const p = new URL(url).pathname;
  return !rules.disallow.some((d) => p.startsWith(d));
};

// --- link extraction ------------------------------------------------------
function extractLinks(html, baseUrl, allowedHosts) {
  const out = new Set();
  const re = /href\s*=\s*["']([^"'#]+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], baseUrl);
      u.hash = "";
      if (!allowedHosts.includes(u.hostname)) continue;
      if (!/^https?:$/.test(u.protocol)) continue;
      out.add(u.toString());
    } catch { /* malformed href */ }
  }
  return [...out];
}

const IN_SCOPE = [
  /\/en\/products/, /\/en\/product\//, /\/en\/explore-our-products/,
  /\/en\/resources/, /\/en\/customer-support/, /\/en\/industries/,
  /\/en\/customer-stories/, /\/en\/services/, /\/en\/why-scanbox/,
  /\/en\/support/, /\.pdf$/i,
];
const inScope = (url) => IN_SCOPE.some((re) => re.test(new URL(url).pathname));

// --- main -----------------------------------------------------------------
async function main() {
  const seeds = JSON.parse(await readFile(path.join(here, "seeds.json"), "utf8"));
  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(MANUALS_DIR, { recursive: true });

  const robots = await loadRobots("https://www.scanbox.se");
  const delay = Math.max(CRAWL_DELAY_MS, robots.crawlDelay ?? 0);

  const queue = [...new Set([...seeds.sections, ...seeds.discovered])];
  const seen = new Set(queue);
  const manifest = [];
  const failures = [];
  let fetched = 0;

  while (queue.length && fetched < MAX_PAGES) {
    const url = queue.shift();
    if (!robotsAllows(robots, url)) {
      failures.push({ url, reason: "disallowed by robots.txt" });
      continue;
    }
    await sleep(delay);
    let res;
    try {
      res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
    } catch (err) {
      failures.push({ url, reason: `network error: ${err.message}` });
      continue;
    }
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
      failures.push({ url, reason: `HTTP ${res.status}` });
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const isPdf = /pdf/i.test(contentType) || /\.pdf$/i.test(url);
    const dir = isPdf ? MANUALS_DIR : RAW_DIR;
    const ext = isPdf ? ".pdf" : ".html";
    const savedAs = path.join(path.basename(dir), urlToFilename(url) + ext);
    await writeFile(path.join(DATA_DIR, savedAs), buf);
    manifest.push({
      url,
      fetched_at: new Date().toISOString(),
      status: res.status,
      content_type: contentType,
      sha256: sha256(buf),
      bytes: buf.length,
      saved_as: savedAs,
    });
    fetched++;
    process.stdout.write(`[${fetched}] ${url} (${buf.length}b)\n`);

    if (!isPdf) {
      const links = extractLinks(buf.toString("utf8"), url, seeds.allowed_hosts);
      for (const link of links) {
        if (!seen.has(link) && inScope(link)) {
          seen.add(link);
          queue.push(link);
        }
      }
    }
  }

  await writeFile(
    path.join(DATA_DIR, "sources.json"),
    JSON.stringify(
      { generated_at: new Date().toISOString(), crawler: UA, fetched, failures, manifest },
      null,
      2
    )
  );

  console.log(`\nDone. Fetched ${fetched} resources, ${failures.length} failures.`);
  if (fetched === 0) {
    console.error(
      "\nACQUISITION BLOCKED: no page could be fetched. If failures show " +
        "'CONNECT tunnel failed, response 403', this environment's egress policy " +
        "blocks scanbox.se. Re-run from an environment with network access to " +
        "www.scanbox.se. No content has been fabricated."
    );
    process.exit(1);
  }
  console.log("Next: npm run parse");
}

main();
