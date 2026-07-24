/**
 * Grounding layer - Phase 3 "zero hallucination" implemented as architecture.
 *
 * Every demo goes through this module. It owns:
 *   1. Dataset loading (real -> fixture -> empty, with the active mode exposed
 *      to the UI so fixture/empty states are always visibly labelled)
 *   2. Unit-ID validation: any id not present in the dataset is DROPPED and
 *      logged, never rendered
 *   3. Field lookup: numbers are read from the dataset or reported as
 *      NOT_SPECIFIED - they are never generated
 *   4. Query guards: price questions and competitor comparisons short-circuit
 *      to canned, honest responses before any model is involved
 *   5. Retrieval (BM25-lite) over the manual index, with a score threshold
 *      below which the answer is an explicit refusal + real support contact
 */
export const NOT_SPECIFIED = "Not specified in ScanBox documentation";

// Real support channel, from the project brief (verified facts supplied by the
// project owner): spare parts are ordered by phone or email, 08:00-16:00 CET.
export const SUPPORT_CONTACT = {
  email: "spareparts@scanbox.se",
  hours: "08:00-16:00 CET",
  source: "project brief (owner-verified)",
};

let cache = null;

/**
 * Inject a pre-built dataset (Cloudflare Workers has no filesystem; the
 * worker entry point primes this from a bundled module instead). The shape
 * must match what loadDataset would build from disk.
 */
export function primeDataset(data) {
  cache = data;
}

export async function loadDataset({ allowFixtures = true } = {}) {
  if (cache) return cache;

  // Node path: read the dataset from disk. Imported lazily so this module
  // also runs on runtimes without node:fs (the worker primes the cache).
  const { readFile } = await import("node:fs/promises");
  const path = (await import("node:path")).default;
  const { fileURLToPath } = await import("node:url");
  const here = path.dirname(fileURLToPath(import.meta.url));
  const DATA = path.join(here, "..", "data");
  const readJson = async (p) => {
    try {
      return JSON.parse(await readFile(p, "utf8"));
    } catch {
      return null;
    }
  };

  const real = await readJson(path.join(DATA, "products.json"));
  const realIndex = await readJson(path.join(DATA, "manuals-index.json"));
  const parts = await readJson(path.join(DATA, "parts.json"));
  const sources = await readJson(path.join(DATA, "sources.json"));

  if (real?.products?.length) {
    cache = {
      mode: "real",
      version: real.version,
      products: real.products,
      passages: realIndex?.passages ?? [],
      parts: parts?.parts ?? null,
      sourcesCount: sources?.manifest?.length ?? 0,
    };
    return cache;
  }

  if (allowFixtures) {
    const fx = await readJson(path.join(DATA, "fixtures", "products.fixture.json"));
    const fxIdx = await readJson(path.join(DATA, "fixtures", "manuals-index.fixture.json"));
    if (fx?.products?.length) {
      cache = {
        mode: "fixture",
        version: fx.version,
        notice: fx.notice,
        products: fx.products,
        passages: fxIdx?.passages ?? [],
        parts: null,
        sourcesCount: 0,
      };
      return cache;
    }
  }

  cache = { mode: "empty", products: [], passages: [], parts: null, sourcesCount: 0 };
  return cache;
}

// --- unit-ID validation ---------------------------------------------------
export const droppedLog = [];

export function validateUnitIds(ids, dataset) {
  const known = new Map(dataset.products.map((p) => [p.id.toUpperCase(), p]));
  const valid = [];
  const dropped = [];
  for (const id of ids) {
    const hit = known.get(String(id).toUpperCase());
    if (hit) valid.push(hit);
    else {
      dropped.push(id);
      droppedLog.push({ at: new Date().toISOString(), id });
      console.warn(`[grounding] dropped unknown unit id: ${id}`);
    }
  }
  return { valid, dropped };
}

export function lookupField(product, fieldName) {
  const spec = product.specs?.[fieldName];
  if (spec?.value) return { value: spec.value, source_url: spec.source_url };
  return { value: NOT_SPECIFIED, source_url: null };
}

// --- query guards ---------------------------------------------------------
const PRICE_RE = /\b(price|prices|pricing|cost|costs|how much|quote price|margin|margins|discount|discounts|pris|priser|kostar|kosta|kostnad|rabatt|preis|preise|prix|€|\$|\bsek\b|\bkr\b)\b/i;
const COMPETITOR_RE = /\b(rieber|burlodge|thermoport|check ?cloud|bcloud|iq-?control|hupfer|blanco|temp-?rite|cambro|metos)\b/i;

export function guardQuery(text) {
  if (PRICE_RE.test(text)) {
    return {
      blocked: true,
      type: "price",
      answer:
        "ScanBox does not publish pricing. Request a quote via the quote basket, or contact ScanBox directly.",
    };
  }
  if (COMPETITOR_RE.test(text)) {
    return {
      blocked: true,
      type: "competitor",
      answer:
        "This assistant only answers from ScanBox's published material, which does not contain information about other manufacturers' products, so a comparison would not be grounded. I can describe the ScanBox unit's documented specifications instead.",
    };
  }
  return { blocked: false };
}

// --- retrieval (BM25-lite) ------------------------------------------------
const tokenize = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9åäöü/+.-]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

// Function words carry no grounding signal - matching on them must never be
// enough to "answer" a question (QA traps #15/#18/#19 caught exactly that).
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "be", "do", "does", "did", "will",
  "can", "could", "should", "would", "what", "when", "where", "which", "who",
  "how", "why", "it", "its", "this", "that", "these", "those", "to", "of",
  "in", "on", "at", "for", "with", "and", "or", "not", "no", "my", "your",
  "me", "we", "you", "they", "have", "has", "had", "about", "tell", "there",
  "en", "ett", "och", "att", "det", "som", "har", "kan", "vad", "hur", "der",
  "die", "das", "und", "ist", "les", "des", "une", "est",
]);

export function retrieve(query, dataset, k = 4) {
  const passages = dataset.passages;
  if (!passages.length) return { hits: [], maxScore: 0, matchedContentTokens: 0, contentTokens: 0 };
  const qTokens = [...new Set(tokenize(query))].filter((t) => !STOPWORDS.has(t));
  if (!qTokens.length) return { hits: [], maxScore: 0, matchedContentTokens: 0, contentTokens: 0 };
  const N = passages.length;
  const df = new Map();
  const docTokens = passages.map((p) => tokenize(p.text));
  for (const t of qTokens) {
    let n = 0;
    for (const toks of docTokens) if (toks.includes(t)) n++;
    df.set(t, n);
  }
  const avgLen = docTokens.reduce((a, t) => a + t.length, 0) / N;
  const scored = passages.map((p, i) => {
    const toks = docTokens[i];
    let score = 0;
    for (const t of qTokens) {
      const tf = toks.filter((x) => x === t).length;
      if (!tf) continue;
      const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
      score += idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (toks.length / avgLen))));
    }
    return { ...p, score: Number(score.toFixed(3)) };
  });
  scored.sort((a, b) => b.score - a.score);
  const hits = scored.slice(0, k).filter((h) => h.score > 0);
  const topIdx = hits.length
    ? passages.findIndex((p) => p.text === hits[0].text && p.page === hits[0].page)
    : -1;
  const topTokens = topIdx >= 0 ? docTokens[topIdx] : [];
  const matchedContentTokens = qTokens.filter((t) => topTokens.includes(t)).length;
  return { hits, maxScore: hits[0]?.score ?? 0, matchedContentTokens, contentTokens: qTokens.length };
}

// Score below which we refuse rather than answer. Tuned conservatively: with
// no lexical overlap beyond stop-ish terms, we say "not in the corpus".
export const RETRIEVAL_FLOOR = 1.0;

export function refusal(reason) {
  return {
    refused: true,
    reason,
    message:
      `This isn't in ScanBox's published material that I have access to, so I won't guess. ` +
      `For a definitive answer, contact ScanBox support at ${SUPPORT_CONTACT.email} (${SUPPORT_CONTACT.hours}).`,
  };
}
