#!/usr/bin/env node
/**
 * Generates the clearly-labelled SAMPLE identification-label image for Demo 2.
 *
 * ScanBox units carry a silver label with model name, serial number, year of
 * manufacture and article number. We do not have a photo of a real label, so
 * this script renders an SVG mock-up. Model name and (when the real dataset
 * exists) article data come from data/products.json; the serial number is an
 * obviously synthetic value. The SVG carries a permanent "SAMPLE - NOT A REAL
 * LABEL" banner baked into the image itself, and the UI adds a badge on top.
 *
 * Without the real dataset it falls back to the fixture unit, which is not a
 * ScanBox product and says so on the label.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(here, "..", "data");

let unit = null;
let fromRealData = false;
try {
  const ds = JSON.parse(await readFile(path.join(DATA, "products.json"), "utf8"));
  if (ds.products?.length) {
    unit = ds.products[0];
    fromRealData = true;
  }
} catch { /* dataset not acquired */ }
if (!unit) {
  const fx = JSON.parse(await readFile(path.join(DATA, "fixtures", "products.fixture.json"), "utf8"));
  unit = fx.products[0];
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d8dadc"/><stop offset="0.5" stop-color="#c2c5c8"/><stop offset="1" stop-color="#aeb2b6"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" fill="#f4f4f5"/>
  <rect x="40" y="60" width="560" height="280" rx="10" fill="url(#steel)" stroke="#8b8f94"/>
  <text x="64" y="110" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#26282b">${esc(fromRealData ? "ScanBox Thermoproducts AB" : "DEMO FIXTURE (not a ScanBox product)")}</text>
  <text x="64" y="150" font-family="Arial" font-size="16" fill="#26282b">Model: ${esc(unit.name)}</text>
  <text x="64" y="180" font-family="Arial" font-size="16" fill="#26282b">Serial no: SB-DEMO-000001</text>
  <text x="64" y="210" font-family="Arial" font-size="16" fill="#26282b">Year of manufacture: 2024</text>
  <text x="64" y="240" font-family="Arial" font-size="16" fill="#26282b">Art. no: ${esc(unit.id)}</text>
  <text x="64" y="285" font-family="Arial" font-size="12" fill="#55585c">230V ~ 50Hz &#183; IPX5 &#183; Made in Sweden</text>
  <g transform="rotate(-8 320 200)">
    <rect x="120" y="170" width="400" height="52" rx="6" fill="#b91c1c" opacity="0.92"/>
    <text x="320" y="204" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" fill="#ffffff">SAMPLE &#8212; NOT A REAL LABEL</text>
  </g>
</svg>`;

const out = path.join(here, "..", "client", "sample-label.svg");
await writeFile(out, svg);
console.log(`Wrote ${out} (${fromRealData ? "from real dataset" : "from fixture - re-run after acquisition"}).`);
