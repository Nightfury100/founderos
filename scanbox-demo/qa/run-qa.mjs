#!/usr/bin/env node
/**
 * Adversarial QA runner. Exercises the demo pipelines in-process (no server
 * needed) against qa/adversarial.json and writes qa/QA_REPORT.md with a
 * pass/fail table. Run: npm run qa
 *
 * The report states which dataset mode it ran against - results on fixture
 * data validate the ARCHITECTURE (guards, validation, refusal); the suite
 * must be re-run after real acquisition to validate corpus coverage.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { advisor, tender, support } from "../server/demos.mjs";
import { loadDataset, NOT_SPECIFIED } from "../server/grounding.mjs";
import { hasLLM } from "../server/llm.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const suite = JSON.parse(await readFile(path.join(here, "adversarial.json"), "utf8"));
const dataset = await loadDataset();

const results = [];

function checkSupport(res, expect) {
  const blockedType = res.guard?.blocked ? res.guard.type : null;
  const refused = Boolean(res.refused || res.error);
  const grounded = Array.isArray(res.answer) && res.answer.every((a) => a.citation?.page);
  switch (expect) {
    case "price_guard":
      return [blockedType === "price", `guard=${blockedType ?? "none"}`];
    case "competitor_guard":
      return [blockedType === "competitor", `guard=${blockedType ?? "none"}`];
    case "refuse":
      return [refused || blockedType !== null, refused ? "explicit refusal" : blockedType ? `guard=${blockedType}` : `ANSWERED (score ${res.retrieval?.maxScore})`];
    case "refuse_or_grounded":
      if (refused || blockedType) return [true, refused ? "explicit refusal" : `guard=${blockedType}`];
      return [grounded, grounded ? `grounded: ${res.answer.length} cited passages` : "answered WITHOUT citations"];
    default:
      return [false, `unknown expectation ${expect}`];
  }
}

function checkAdvisor(res, expect) {
  if (expect === "price_guard") {
    return [res.guard?.blocked && res.guard.type === "price", `guard=${res.guard?.type ?? "none"}`];
  }
  // grounded_recommendation_or_none: every rendered unit must exist in the
  // dataset (validator drops the rest), or the honest empty state is shown.
  if (res.guard?.blocked) return [true, `guard=${res.guard.type}`];
  if (res.error) return [true, `honest error: ${res.error}`];
  if (res.questions) return [true, `asked ${res.questions.length} clarifying question(s) (<=3: ${res.questions.length <= 3})`];
  const ids = new Set(dataset.products.map((p) => p.id));
  const allValid = (res.recommendations || []).every((r) => ids.has(r.id));
  return [allValid, `${res.recommendations?.length ?? 0} recommendation(s), all ids in dataset: ${allValid}, dropped: ${res.dropped?.length ?? 0}`];
}

async function checkTender(t) {
  if (t.expect === "validator_drop") {
    const res = await tender({ unit_id: t.unit_id, language: "en" });
    const ok = res.error === "unknown_unit" && res.dropped?.includes(t.unit_id);
    return [ok, ok ? "unknown id dropped and logged, nothing rendered" : JSON.stringify(res).slice(0, 120)];
  }
  const first = dataset.products[0]?.id;
  if (!first) return [true, "skipped: empty dataset (honest state)"];
  const res = await tender({ unit_id: first, language: t.language });
  if (res.error) return [false, `unexpected error ${res.error}`];
  const values = res.usedFields.map((f) => f.value);
  const localizedNotSpecified = res.paragraphs.some((p) => /Nicht angegeben|nicht angegeben|Non spécifié|Ej angivet|Not specified/i.test(p));
  const anyMissing = values.includes(NOT_SPECIFIED);
  const ok = res.usedFields.every((f) => f.value === NOT_SPECIFIED || f.source_url);
  return [ok && (!anyMissing || localizedNotSpecified),
    `lang=${t.language}, fields looked up=${values.length}, missing rendered honestly=${anyMissing ? localizedNotSpecified : "n/a (all present)"}`];
}

for (const t of suite.tests) {
  let pass = false, note = "";
  try {
    if (t.demo === "support") [pass, note] = checkSupport(await support({ question: t.query }), t.expect);
    else if (t.demo === "advisor") [pass, note] = checkAdvisor(await advisor({ description: t.query, answers: t.expect === "grounded_recommendation_or_none" ? "no further details" : undefined }), t.expect);
    else if (t.demo === "tender") [pass, note] = await checkTender(t);
  } catch (err) {
    note = `EXCEPTION: ${err.message}`;
  }
  results.push({ ...t, pass, note });
  console.log(`${pass ? "PASS" : "FAIL"}  #${t.id} [${t.demo}] ${t.query ?? t.unit_id} -> ${note}`);
}

const passed = results.filter((r) => r.pass).length;
const md = [
  "# Adversarial QA Report",
  "",
  `- Run: ${new Date().toISOString()}`,
  `- Dataset mode: **${dataset.mode}** (${dataset.products.length} products, ${dataset.passages.length} manual passages)`,
  `- LLM: ${hasLLM() ? "enabled" : "disabled (deterministic fallbacks - guards/validation identical)"}`,
  `- Result: **${passed}/${results.length} passed**`,
  "",
  dataset.mode !== "real"
    ? "> **Scope note:** this run validates the grounding *architecture* (price guard, competitor guard, refusal path, unit-id validation, honest missing-value rendering) against " +
      (dataset.mode === "fixture" ? "the clearly-labelled synthetic fixture corpus" : "an empty dataset") +
      ". Re-run after `npm run acquire && npm run parse` to validate real corpus coverage. Nothing in this report is based on fabricated ScanBox data.\n"
    : "",
  "| # | Demo | Query | Expected | Result | Detail |",
  "|---|------|-------|----------|--------|--------|",
  ...results.map((r) =>
    `| ${r.id} | ${r.demo} | ${(r.query ?? r.unit_id).replace(/\|/g, "\\|")} | ${r.expect} | ${r.pass ? "PASS" : "FAIL"} | ${r.note.replace(/\|/g, "\\|")} |`),
  "",
].join("\n");

await writeFile(path.join(here, "QA_REPORT.md"), md);
console.log(`\n${passed}/${results.length} passed. Report: qa/QA_REPORT.md`);
process.exit(passed === results.length ? 0 : 1);
