/**
 * The four demo pipelines. All factual output flows through grounding.mjs;
 * the LLM (when a key is configured) only converts language <-> structure.
 */
import {
  loadDataset, validateUnitIds, lookupField, guardQuery, retrieve,
  refusal, NOT_SPECIFIED, RETRIEVAL_FLOOR, SUPPORT_CONTACT,
} from "./grounding.mjs";
import { hasLLM, extractNeeds, extractLabel } from "./llm.mjs";

// ---------------------------------------------------------------------------
// DEMO 1 - Needs Advisor
// ---------------------------------------------------------------------------

/** Deterministic fallback parser used when no ANTHROPIC_API_KEY is set. */
function parseNeedsDeterministic(text) {
  const t = text.toLowerCase();
  const covers = (t.match(/(\d{2,4})\s*(?:-|\s)?(?:bed|beds|cover|covers|seat|seats|meal|meals|guest|guests|pupil|pupils|resident|residents)/) || [])[1];
  const hot = /\b(hot|warm|heated|lunch|dinner|cooked)\b/.test(t);
  const cold = /\b(cold|chilled|salad|dessert|cool)\b/.test(t);
  const tray =
    (t.match(/gn\s*2\/1/) && "GN 2/1") ||
    (t.match(/gn\s*1\/1/) && "GN 1/1") ||
    (t.match(/400\s*x\s*600/) && "400x600") ||
    (t.match(/euronorm/) && "Euronorm") ||
    (t.match(/450\s*x\s*600/) && "450x600") ||
    (t.match(/veskanorm/) && "Veskanorm") ||
    null;
  const segment =
    (/care home|elderly|nursing/.test(t) && "elderly care") ||
    (/hospital|clinic|healthcare|patient/.test(t) && "healthcare") ||
    (/school|pupil/.test(t) && "schools") ||
    (/hotel|resort/.test(t) && "hotels/resorts") ||
    (/arena|stadium/.test(t) && "arenas") ||
    (/conference|event|banquet/.test(t) && "conferences & events") ||
    null;
  const questions = [];
  if (!covers) questions.push("Roughly how many meals per service do you distribute?");
  if (!hot && !cold) questions.push("Do you need to hold food hot, cold, or both in one unit?");
  if (!tray) questions.push("Which tray system do you use (GN 1/1, GN 2/1, 400x600, Euronorm, 450x600, Veskanorm)?");
  return {
    covers_per_service: covers ? Number(covers) : null,
    needs_hot: hot || null,
    needs_cold: cold || null,
    needs_combined_hot_cold: (hot && cold) || null,
    tray_system: tray,
    segment,
    transport_distance: /lift|elevator|corridor|ward|floor/.test(t) ? "in-building" : null,
    special_diets: /diet|pureed|diabetic|allerg/.test(t) || null,
    clarifying_questions: questions.slice(0, 3),
  };
}

function functionMatches(product, needs) {
  const fn = (product.function || "").toLowerCase();
  if (needs.needs_combined_hot_cold) return /combo|combined|\+/.test(fn) || product.model_type === "Combo";
  if (needs.needs_hot && !needs.needs_cold) return /heat/.test(fn);
  if (needs.needs_cold && !needs.needs_hot) return /cool|cold|peltier|compressor/.test(fn);
  return true;
}

function parseCapacity(product) {
  const cap = product.specs?.["Capacity"]?.value;
  if (!cap) return null;
  const m = cap.match(/(\d+)(?:\s*\+\s*(\d+))?\s*x/i);
  if (!m) return null;
  return Number(m[1]) + (m[2] ? Number(m[2]) : 0);
}

export async function advisor({ description, answers }) {
  const guard = guardQuery(description);
  if (guard.blocked) return { guard };

  const dataset = await loadDataset();
  if (dataset.mode === "empty") {
    return { error: "dataset_empty", message: "No dataset acquired. Run npm run acquire && npm run parse." };
  }

  const fullText = answers ? `${description}\n\nClarifications: ${answers}` : description;
  let needs, needsSource;
  if (hasLLM()) {
    needs = await extractNeeds(fullText);
    needsSource = "model (strict tool use, schema-validated)";
  }
  if (!needs) {
    needs = parseNeedsDeterministic(fullText);
    needsSource = "deterministic parser (no API key configured)";
  }

  // Ask at most 3 clarifying questions, once.
  if (!answers && needs.clarifying_questions?.length) {
    return { needs, needsSource, questions: needs.clarifying_questions.slice(0, 3) };
  }

  // Deterministic recommendation over the dataset only.
  let candidates = dataset.products.filter((p) => functionMatches(p, needs));
  if (needs.tray_system) {
    const withTray = candidates.filter((p) => (p.tray_system || []).includes(needs.tray_system));
    if (withTray.length) candidates = withTray;
  }
  const recommendations = candidates.slice(0, 4).map((p) => {
    const capacity = parseCapacity(p);
    let quantity = null;
    let quantityNote = null;
    if (needs.covers_per_service && capacity) {
      quantity = Math.max(1, Math.ceil(needs.covers_per_service / capacity));
      quantityNote = `${needs.covers_per_service} covers / documented capacity ${capacity} trays per unit`;
    } else if (needs.covers_per_service) {
      quantityNote = `Quantity not computed: capacity is ${NOT_SPECIFIED.toLowerCase()} for this unit.`;
    }
    const reasoning = [];
    if (needs.needs_combined_hot_cold) reasoning.push(`Documented function: ${p.function || NOT_SPECIFIED} (you need hot and cold in one unit)`);
    else if (needs.needs_hot) reasoning.push(`Documented function: ${p.function || NOT_SPECIFIED} (you need hot holding)`);
    else if (needs.needs_cold) reasoning.push(`Documented function: ${p.function || NOT_SPECIFIED} (you need cold holding)`);
    if (needs.tray_system) reasoning.push(`Tray system: ${(p.tray_system || []).join(", ") || NOT_SPECIFIED}`);
    const cap = lookupField(p, "Capacity");
    reasoning.push(`Capacity: ${cap.value}`);

    return {
      id: p.id,
      name: p.name,
      line: p.line,
      source_url: p.source_url,
      quantity,
      quantityNote,
      reasoning,
      specs: Object.fromEntries(
        ["Capacity", "Temperature range", "External dimensions (WxDxH)", "Weight"].map((f) => [f, lookupField(p, f)])
      ),
    };
  });

  // Schema validation: only ids present in the dataset are rendered.
  const { valid, dropped } = validateUnitIds(recommendations.map((r) => r.id), dataset);
  const validIds = new Set(valid.map((p) => p.id));

  return {
    needs,
    needsSource,
    recommendations: recommendations.filter((r) => validIds.has(r.id)),
    dropped,
    datasetMode: dataset.mode,
    sources: [...new Set(recommendations.map((r) => r.source_url))],
  };
}

// ---------------------------------------------------------------------------
// DEMO 2 - Spare Parts / Unit Identification
// ---------------------------------------------------------------------------
export async function identifyUnit({ image_base64, media_type, manual_fields }) {
  const dataset = await loadDataset();
  if (dataset.mode === "empty") {
    return { error: "dataset_empty", message: "No dataset acquired." };
  }

  let label, labelSource;
  if (image_base64 && hasLLM()) {
    label = await extractLabel(image_base64, media_type || "image/png");
    labelSource = "vision model (strict tool use; illegible fields returned as null)";
  } else if (manual_fields) {
    label = manual_fields;
    labelSource = image_base64
      ? "manual entry (no API key configured - vision extraction unavailable)"
      : "manual entry";
  } else {
    return { error: "no_input", message: hasLLM() ? "Upload a label image." : "No API key configured: enter the label fields manually." };
  }

  // Match against the dataset: by article number first, then model name.
  let match = null;
  if (label.article_number) {
    match = dataset.products.find((p) => p.id.toUpperCase() === String(label.article_number).toUpperCase()) || null;
  }
  if (!match && label.model_name) {
    const needle = String(label.model_name).toLowerCase();
    match = dataset.products.find(
      (p) => p.name.toLowerCase().includes(needle) || needle.includes(p.name.toLowerCase())
    ) || null;
  }

  const partsAvailable = Boolean(dataset.parts);
  const manualPassages = match
    ? dataset.passages.filter((ps) => ps.text.toLowerCase().includes(match.name.toLowerCase().slice(0, 12))).slice(0, 2)
    : [];

  const orderRequest = match
    ? [
        `To: ${SUPPORT_CONTACT.email}`,
        `Subject: Spare part request - ${match.name}`,
        ``,
        `Model: ${match.name}`,
        `Article no: ${match.id}`,
        `Serial no: ${label.serial_number || "(from silver label)"}`,
        `Year of manufacture: ${label.year_of_manufacture || "(from silver label)"}`,
        ``,
        `Requested part: (describe the part, or give the article number from the manual)`,
        ``,
        `Please confirm availability and delivery time.`,
      ].join("\n")
    : null;

  return {
    label,
    labelSource,
    match: match
      ? { id: match.id, name: match.name, line: match.line, source_url: match.source_url, specs: match.specs }
      : null,
    manualPassages,
    partsAvailable,
    degradedNote: partsAvailable
      ? null
      : "ScanBox's published manuals in this dataset do not contain exploded diagrams with article numbers, so part-level lookup is not possible. This demo therefore identifies the unit, links its manual, and pre-fills the real ordering channel (email, " +
        `${SUPPORT_CONTACT.hours}).`,
    orderRequest,
    datasetMode: dataset.mode,
  };
}

// ---------------------------------------------------------------------------
// DEMO 3 - Tender Specification Generator
// ---------------------------------------------------------------------------
const TENDER_FIELDS = ["Capacity", "Temperature range", "External dimensions (WxDxH)", "Weight"];

const TENDER_STRINGS = {
  en: {
    title: (n) => `Technical specification - ${n}`,
    intro: (n, line) => `The offered unit shall be ${n}${line ? ` from the ${line} series` : ""}, or technically equivalent.`,
    field: { "Capacity": "Capacity", "Temperature range": "Temperature range", "External dimensions (WxDxH)": "External dimensions (WxDxH)", "Weight": "Weight" },
    notSpecified: "Not specified in ScanBox documentation",
    source: "Source: manufacturer's published product documentation",
  },
  sv: {
    title: (n) => `Teknisk specifikation - ${n}`,
    intro: (n, line) => `Offererad enhet ska vara ${n}${line ? ` ur serien ${line}` : ""}, eller tekniskt likvärdig.`,
    field: { "Capacity": "Kapacitet", "Temperature range": "Temperaturområde", "External dimensions (WxDxH)": "Yttermått (BxDxH)", "Weight": "Vikt" },
    notSpecified: "Ej angivet i ScanBox dokumentation",
    source: "Källa: tillverkarens publicerade produktdokumentation",
  },
  fr: {
    title: (n) => `Spécification technique - ${n}`,
    intro: (n, line) => `L'unité proposée doit être ${n}${line ? ` de la série ${line}` : ""}, ou techniquement équivalente.`,
    field: { "Capacity": "Capacité", "Temperature range": "Plage de température", "External dimensions (WxDxH)": "Dimensions extérieures (LxPxH)", "Weight": "Poids" },
    notSpecified: "Non spécifié dans la documentation ScanBox",
    source: "Source : documentation produit publiée par le fabricant",
  },
  de: {
    title: (n) => `Technische Spezifikation - ${n}`,
    intro: (n, line) => `Die angebotene Einheit muss ${n}${line ? ` aus der Serie ${line}` : ""} oder technisch gleichwertig sein.`,
    field: { "Capacity": "Kapazität", "Temperature range": "Temperaturbereich", "External dimensions (WxDxH)": "Außenabmessungen (BxTxH)", "Weight": "Gewicht" },
    notSpecified: "In der ScanBox-Dokumentation nicht angegeben",
    source: "Quelle: veröffentlichte Produktdokumentation des Herstellers",
  },
};

export async function tender({ unit_id, language = "en" }) {
  const dataset = await loadDataset();
  if (dataset.mode === "empty") return { error: "dataset_empty", message: "No dataset acquired." };

  const { valid, dropped } = validateUnitIds([unit_id], dataset);
  if (!valid.length) return { error: "unknown_unit", dropped };
  const p = valid[0];
  const L = TENDER_STRINGS[language] || TENDER_STRINGS.en;

  const usedFields = [];
  const paragraphs = [`## ${L.title(p.name)}`, L.intro(p.name, p.line)];
  for (const f of TENDER_FIELDS) {
    const { value, source_url } = lookupField(p, f);
    const rendered = value === NOT_SPECIFIED ? L.notSpecified : value;
    paragraphs.push(`${L.field[f]}: ${rendered}`);
    usedFields.push({ field: f, value, source_url, rendered_as: rendered });
  }
  paragraphs.push(L.source + (p.source_url ? ` (${p.source_url})` : ""));

  return {
    unit: { id: p.id, name: p.name, line: p.line, source_url: p.source_url },
    language,
    paragraphs,
    usedFields,
    datasetMode: dataset.mode,
  };
}

// ---------------------------------------------------------------------------
// DEMO 4 - Technical Support Assistant (extractive RAG)
// ---------------------------------------------------------------------------
export async function support({ question }) {
  const guard = guardQuery(question);
  if (guard.blocked) return { guard };

  const dataset = await loadDataset();
  if (dataset.mode === "empty") return { error: "dataset_empty", message: "No dataset acquired." };
  if (!dataset.passages.length) return { ...refusal("no manual corpus"), datasetMode: dataset.mode };

  const { hits, maxScore, matchedContentTokens, contentTokens } = retrieve(question, dataset, 4);
  // Refuse unless the score clears the floor AND at least two content-bearing
  // query terms (or all of them, for very short queries) appear in the top
  // passage - a single incidental word match is not an answer.
  const requiredMatches = Math.min(2, contentTokens);
  if (maxScore < RETRIEVAL_FLOOR || matchedContentTokens < requiredMatches) {
    return {
      ...refusal(`below retrieval threshold (score ${maxScore}, ${matchedContentTokens}/${contentTokens} content terms matched)`),
      retrieval: { maxScore, hits: [] },
      datasetMode: dataset.mode,
    };
  }

  // Extractive answer: verbatim passages, each carrying its citation. The
  // model never paraphrases manual content, so nothing can drift from source.
  const answer = hits.map((h) => ({
    text: h.text,
    citation: { manual: h.manual, page: h.page, source_url: h.source_url, score: h.score },
  }));

  return {
    answer,
    retrieval: { maxScore, considered: dataset.passages.length },
    datasetMode: dataset.mode,
    note: "Answers are verbatim manual passages with page citations (extractive). If the corpus does not cover a question, the assistant refuses and gives the real support contact.",
  };
}
