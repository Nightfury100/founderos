#!/usr/bin/env node
/**
 * Phase 1 parser: builds the versioned dataset from crawled raw pages.
 *
 *   data/raw/*.html + data/manuals/*.pdf  ->  data/products.json
 *                                             data/manuals-index.json
 *                                             data/parts.json (only if real
 *                                             article numbers are found)
 *                                             coverage report on stdout
 *
 * Every extracted field is tagged with the exact source URL it came from.
 * Fields that cannot be found in the source are omitted - never guessed.
 *
 * NOTE: written before the first successful crawl (network to scanbox.se is
 * blocked in the build environment), so the HTML selectors are heuristic:
 * JSON-LD product blocks, <table>/<dl> spec rows, and <h1> titles. After the
 * first real crawl, inspect data/raw/ and tighten the selectors. The parser
 * fails loudly (empty dataset + coverage report showing gaps), never silently.
 */
import { createRequire } from "node:module";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "..", "data");

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(JSON.parse(m[1])); } catch { /* invalid JSON-LD */ }
  }
  return out.flat ? out.flatMap((x) => (Array.isArray(x) ? x : [x])) : out;
}

function extractSpecPairs(html) {
  const pairs = [];
  // <th>label</th><td>value</td> rows
  const rowRe = /<tr[^>]*>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html))) {
    const k = strip(m[1]);
    const v = strip(m[2]);
    if (k && v && k.length < 80 && v.length < 200) pairs.push([k, v]);
  }
  // <dt>label</dt><dd>value</dd>
  const dlRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  while ((m = dlRe.exec(html))) {
    const k = strip(m[1]);
    const v = strip(m[2]);
    if (k && v && k.length < 80 && v.length < 200) pairs.push([k, v]);
  }
  return pairs;
}

const LINE_NAMES = [
  "Ergo Line", "Under Counter", "Banquet Line", "Tray Line", "Banquet Master",
  "Portable", "Specialized", "Crate Line", "Basic Line", "Bakery Line",
  "Stackable Line", "Food 2 Go", "Food2Go", "Ouzi Line", "Plated Line",
];

function detectLine(text) {
  for (const name of LINE_NAMES) {
    if (text.toLowerCase().includes(name.toLowerCase())) {
      return name === "Food2Go" ? "Food 2 Go" : name;
    }
  }
  return null;
}

// Article-number heuristic for parts detection inside manual text: patterns
// like "art. no. 12345" / "artikelnr" / bare 5-7 digit codes next to part words.
const PART_LINE_RE = /(art(?:icle|ikel)?\.?\s*(?:no|nr)\.?\s*[:.]?\s*)([A-Z0-9-]{4,12})/gi;

async function main() {
  let sources;
  try {
    sources = JSON.parse(await readFile(path.join(DATA_DIR, "sources.json"), "utf8"));
  } catch {
    console.error("No data/sources.json - run `npm run acquire` first.");
    process.exit(1);
  }

  const products = [];
  const htmlEntries = sources.manifest.filter((e) => /html?$/.test(e.saved_as));
  const productPages = htmlEntries.filter((e) => /\/en\/(product|products)\//.test(e.url));

  for (const entry of productPages) {
    let html;
    try {
      html = await readFile(path.join(DATA_DIR, entry.saved_as), "utf8");
    } catch { continue; }

    const title = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");
    if (!title) continue;

    const jsonLd = extractJsonLd(html).find((x) => x["@type"] === "Product");
    const pairs = extractSpecPairs(html);
    if (!jsonLd && pairs.length === 0) continue; // listing page, not a detail page

    const record = {
      id: (jsonLd?.sku || jsonLd?.mpn || title).toString().replace(/\s+/g, "-").toUpperCase(),
      name: jsonLd?.name || title,
      line: detectLine(title + " " + entry.url),
      source_url: entry.url,
      fetched_at: entry.fetched_at,
      content_sha256: entry.sha256,
      specs: {},
    };
    if (jsonLd?.description) record.description = String(jsonLd.description);
    for (const [k, v] of pairs) {
      record.specs[k] = { value: v, source_url: entry.url };
    }
    products.push(record);
  }

  // --- manuals index ------------------------------------------------------
  const manualsIndex = [];
  const partsCandidates = [];
  let pdfParse = null;
  try { pdfParse = require("pdf-parse"); } catch { /* dep missing */ }

  const pdfFiles = (await readdir(path.join(DATA_DIR, "manuals")).catch(() => []))
    .filter((f) => f.endsWith(".pdf"));

  for (const file of pdfFiles) {
    const entry = sources.manifest.find((e) => e.saved_as.endsWith(file));
    if (!pdfParse) break;
    try {
      const buf = await readFile(path.join(DATA_DIR, "manuals", file));
      const parsed = await pdfParse(buf, { pagerender: undefined });
      // pdf-parse gives whole-document text; split on form feeds for pages.
      const pages = parsed.text.split("\f");
      pages.forEach((text, i) => {
        const clean = text.replace(/\s+/g, " ").trim();
        if (!clean) return;
        manualsIndex.push({
          manual: file,
          source_url: entry?.url || null,
          page: i + 1,
          text: clean,
        });
        let m;
        while ((m = PART_LINE_RE.exec(clean))) {
          partsCandidates.push({ manual: file, page: i + 1, article_number: m[2], context: clean.slice(Math.max(0, m.index - 60), m.index + 80) });
        }
      });
    } catch (err) {
      console.error(`Failed to parse ${file}: ${err.message}`);
    }
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, "products.json"),
    JSON.stringify({ version: new Date().toISOString(), products }, null, 2)
  );
  await writeFile(
    path.join(DATA_DIR, "manuals-index.json"),
    JSON.stringify({ version: new Date().toISOString(), passages: manualsIndex }, null, 2)
  );
  if (partsCandidates.length > 0) {
    await writeFile(
      path.join(DATA_DIR, "parts.json"),
      JSON.stringify({ version: new Date().toISOString(), note: "Heuristic extraction - verify against exploded diagrams before use", parts: partsCandidates }, null, 2)
    );
  }

  // --- coverage report ----------------------------------------------------
  const withSpecs = products.filter((p) => Object.keys(p.specs).length >= 3).length;
  const lines = new Set(products.map((p) => p.line).filter(Boolean));
  console.log("=== COVERAGE REPORT ===");
  console.log(`Pages fetched:            ${sources.manifest.length}`);
  console.log(`Fetch failures:           ${sources.failures.length}`);
  console.log(`Product records:          ${products.length}`);
  console.log(`  with >=3 spec fields:   ${withSpecs}`);
  console.log(`  product lines covered:  ${lines.size}/14 (${[...lines].join(", ") || "none"})`);
  console.log(`Manual PDFs downloaded:   ${pdfFiles.length}`);
  console.log(`Manual pages indexed:     ${manualsIndex.length}`);
  console.log(`Parts/article candidates: ${partsCandidates.length}${partsCandidates.length === 0 ? " -> parts.json NOT written; Demo 2 must run in degraded mode (unit ID + manual lookup + email request)" : ""}`);
  const missing = LINE_NAMES.filter((n) => n !== "Food2Go" && !lines.has(n));
  if (missing.length) console.log(`MISSING lines (no records): ${missing.join(", ")}`);
  if (products.length === 0) {
    console.log("\nDataset is EMPTY. The app will render its honest 'dataset not acquired' state.");
  }
}

main();
