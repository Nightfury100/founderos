#!/usr/bin/env node
/**
 * Samples ScanBox's actual brand colours from their live site and rewrites
 * client/brand.css. Until this has run against the real site, brand.css keeps
 * a neutral placeholder palette that is clearly marked as such - we do not
 * invent a "ScanBox look" (Phase 4 rule: sample, don't invent).
 *
 * Strategy: fetch the homepage + linked stylesheets, count hex/rgb colour
 * occurrences, pick the most frequent saturated colour as the accent and the
 * most frequent dark neutral as ink. Writes the evidence into a comment.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const BRAND_CSS = path.join(here, "..", "client", "brand.css");

try {
  const { EnvHttpProxyAgent, setGlobalDispatcher } = await import("undici");
  if (process.env.HTTPS_PROXY) setGlobalDispatcher(new EnvHttpProxyAgent());
} catch { /* direct fetch */ }

const hexToHsl = (hex) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { s, l };
};

async function main() {
  const counts = new Map();
  const collect = (text) => {
    for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) {
      const c = m[0].toLowerCase();
      counts.set(c, (counts.get(c) || 0) + 1);
    }
  };

  let home;
  try {
    home = await (await fetch("https://www.scanbox.se/en", { redirect: "follow" })).text();
  } catch (err) {
    console.error(`Cannot reach scanbox.se (${err.message}). brand.css left unchanged (placeholder palette).`);
    process.exit(1);
  }
  collect(home);
  for (const m of home.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)) {
    try {
      const cssUrl = new URL(m[1], "https://www.scanbox.se").toString();
      collect(await (await fetch(cssUrl)).text());
    } catch { /* skip stylesheet */ }
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const accent = ranked.find(([c]) => { const { s, l } = hexToHsl(c); return s > 0.35 && l > 0.2 && l < 0.7; });
  const ink = ranked.find(([c]) => { const { l } = hexToHsl(c); return l < 0.25; });
  if (!accent) {
    console.error("No saturated brand colour found in sampled CSS - brand.css left unchanged.");
    process.exit(1);
  }

  const existing = await readFile(BRAND_CSS, "utf8");
  const updated = existing
    .replace(/--accent:\s*[^;]+;/, `--accent: ${accent[0]};`)
    .replace(/--ink:\s*[^;]+;/, ink ? `--ink: ${ink[0]};` : "$&")
    .replace(/\/\* PALETTE: [^*]* \*\//,
      `/* PALETTE: sampled from www.scanbox.se on ${new Date().toISOString().slice(0, 10)} (accent ${accent[0]} seen ${accent[1]}x) */`);
  await writeFile(BRAND_CSS, updated);
  console.log(`brand.css updated: accent ${accent[0]}, ink ${ink?.[0] ?? "(kept)"}.`);
}

main();
