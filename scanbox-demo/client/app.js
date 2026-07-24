/* ScanBox AI Demo Suite - client. Vanilla JS, no build step. */
"use strict";

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
};
const api = (path, body) =>
  fetch(path, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());

const NOT_SPECIFIED = "Not specified in ScanBox documentation";
let STATE = { datasetMode: "empty", llm: false };
let PRODUCTS = [];
const BASKET = new Map();

/* ---------- boot ---------- */
async function boot() {
  STATE = await api("/api/state");
  renderBanner();
  renderMeta();
  const prod = await api("/api/products");
  PRODUCTS = prod.products || [];
  renderFacets();
  renderTenderUnits();
  if (!STATE.llm) $("#parts-manual-entry").classList.remove("hidden");
}

function renderBanner() {
  const wrap = $("#banner");
  wrap.textContent = "";
  if (STATE.datasetMode === "empty") {
    wrap.append(el("div", { class: "banner error" },
      el("strong", {}, "No dataset. "),
      "The scanbox.se scrape has not run (network to scanbox.se was blocked in the build environment). Run npm run acquire && npm run parse from a networked machine, then restart. Nothing is faked in the meantime."));
  } else if (STATE.datasetMode === "fixture") {
    wrap.append(el("div", { class: "banner warn" },
      el("strong", {}, "Fixture data. "),
      "These units are synthetic placeholders, not ScanBox products - the real scrape was blocked by this environment's network policy. Every screen labels values with their (fixture) source. Acquire the real dataset before showing this to ScanBox."));
  }
  if (!STATE.llm) {
    wrap.append(el("div", { class: "banner warn" },
      el("strong", {}, "No API key. "),
      "ANTHROPIC_API_KEY is not set: free-text parsing and label vision are replaced by deterministic fallbacks. All grounding, validation and refusal behaviour is identical."));
  }
}

function renderMeta() {
  const dl = $("#meta");
  dl.innerHTML = "";
  const rows = [
    ["Dataset", STATE.datasetMode],
    ["Products", STATE.productCount],
    ["Manual passages", STATE.passageCount],
    ["Parts data", STATE.partsAvailable ? "available" : "not in corpus"],
    ["Model", STATE.llm ? "connected" : "off"],
  ];
  for (const [k, v] of rows) { dl.append(el("dt", {}, k), el("dd", {}, String(v))); }
}

/* ---------- nav ---------- */
document.querySelectorAll(".nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav button").forEach((b) => b.setAttribute("aria-current", "false"));
    btn.setAttribute("aria-current", "true");
    document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
    $(`#view-${btn.dataset.view}`).classList.remove("hidden");
  });
});

/* ---------- shared renderers ---------- */
function specTable(specs) {
  const table = el("table", { class: "spec-table" });
  for (const [field, entry] of Object.entries(specs || {})) {
    const value = entry?.value ?? NOT_SPECIFIED;
    const td = el("td", {}, value === NOT_SPECIFIED ? el("span", { class: "not-specified" }, value) : value);
    table.append(el("tr", {}, el("th", {}, field), td));
  }
  return table;
}

function sourcePanel(title, items) {
  const panel = el("div", { class: "source-panel" }, el("h4", {}, title));
  const ul = el("ul", {});
  for (const item of items) ul.append(el("li", {}, item));
  panel.append(ul);
  return panel;
}

function sourceLink(url) {
  if (!url) return el("span", { class: "not-specified" }, "no source");
  if (url.startsWith("fixture://")) return el("span", {}, `${url} (synthetic fixture, not ScanBox)`);
  return el("a", { href: url, target: "_blank", rel: "noopener" }, url);
}

function refusalBlock(message, why) {
  const d = el("div", { class: "refusal" }, el("div", {}, message));
  if (why) d.append(el("div", { class: "why" }, `Why: ${why}`));
  return d;
}

function skeletons(n = 3) {
  const wrap = el("div", {});
  const widths = ["w80", "w60", "w40"];
  for (let i = 0; i < n; i++) wrap.append(el("div", { class: `skeleton ${widths[i % 3]}` }));
  return wrap;
}

/* ---------- basket ---------- */
function renderBasket() {
  const wrap = $("#basket");
  wrap.innerHTML = "";
  if (!BASKET.size) {
    wrap.append(el("p", { class: "basket-empty" }, "No units added yet."));
    $("#basket-request").disabled = true;
    return;
  }
  for (const [id, item] of BASKET) {
    wrap.append(el("div", { class: "r" },
      el("span", {}, `${item.name}`),
      el("span", {}, `qty ${item.quantity ?? "-"} `,
        el("a", { href: "#", onclick: (e) => { e.preventDefault(); BASKET.delete(id); renderBasket(); } }, "remove"))));
  }
  $("#basket-request").disabled = false;
}
$("#basket-request").addEventListener("click", () => {
  alert("In production this submits ScanBox's real 'My quote' request. No prices are shown anywhere: ScanBox does not publish pricing.");
});

/* ---------- Demo 1: advisor ---------- */
$("#mode-ai").addEventListener("click", () => setAdvisorMode(true));
$("#mode-today").addEventListener("click", () => setAdvisorMode(false));
function setAdvisorMode(ai) {
  $("#mode-ai").setAttribute("aria-pressed", String(ai));
  $("#mode-today").setAttribute("aria-pressed", String(!ai));
  $("#advisor-ai").classList.toggle("hidden", !ai);
  $("#advisor-today").classList.toggle("hidden", ai);
}

const FACETS = {
  "Function": ["Fan heating", "Neutral", "Compressor cooling", "Static heating", "Peltier cooling"],
  "Model": ["Single", "Combo", "Duo", "Triple"],
  "Tray system": ["GN 1/1", "GN 2/1", "400x600", "Euronorm", "450x600", "Veskanorm"],
};

function renderFacets() {
  const wrap = $("#facet-groups");
  wrap.innerHTML = "";
  for (const [group, options] of Object.entries(FACETS)) {
    const g = el("div", { class: "facet-group" }, el("h4", {}, group));
    for (const opt of options) {
      g.append(el("label", {},
        el("input", { type: "checkbox", "data-group": group, value: opt, onchange: renderFacetResults }),
        opt));
    }
    wrap.append(g);
  }
  renderFacetResults();
}

function renderFacetResults() {
  const checked = [...document.querySelectorAll('#facet-groups input:checked')];
  const byGroup = {};
  for (const c of checked) (byGroup[c.dataset.group] ??= []).push(c.value.toLowerCase());
  const wrap = $("#facet-results");
  wrap.innerHTML = "";
  if (!PRODUCTS.length) {
    wrap.append(el("div", { class: "empty-state" },
      el("h3", {}, "No products loaded"),
      el("p", {}, "The facet filter reproduction needs the dataset. See the banner above.")));
    return;
  }
  const results = PRODUCTS.filter((p) => {
    if (byGroup["Function"] && !byGroup["Function"].some((f) => (p.function || "").toLowerCase().includes(f.split(" ")[0]))) return false;
    if (byGroup["Model"] && !byGroup["Model"].includes((p.model_type || "").toLowerCase())) return false;
    if (byGroup["Tray system"] && !byGroup["Tray system"].some((t) => (p.tray_system || []).map((x) => x.toLowerCase()).includes(t))) return false;
    return true;
  });
  if (!results.length) {
    wrap.append(el("div", { class: "empty-state" }, el("h3", {}, "0 results"),
      el("p", {}, "This is the buyer's dead end today: wrong facet combination, no guidance, start over.")));
    return;
  }
  for (const p of results) {
    wrap.append(el("div", { class: "card" },
      el("h3", {}, `${p.name} `, el("a", { href: p.source_url?.startsWith("http") ? p.source_url : "#", target: "_blank" }, p.source_url?.startsWith("http") ? "product page" : "")),
      specTable(p.specs)));
  }
}

$("#advisor-go").addEventListener("click", runAdvisor);
async function runAdvisor() {
  const description = $("#advisor-input").value.trim();
  if (!description) return;
  const answers = [...document.querySelectorAll("#advisor-questions input")]
    .map((i) => i.value.trim()).filter(Boolean).join("; ") || undefined;
  const result = $("#advisor-result");
  result.innerHTML = "";
  result.append(skeletons(4));
  const res = await api("/api/advisor", { description, answers });
  result.innerHTML = "";
  $("#advisor-questions").innerHTML = "";

  if (res.guard?.blocked) return result.append(refusalBlock(res.guard.answer, `blocked query type: ${res.guard.type}`));
  if (res.error) return result.append(refusalBlock(res.message, res.error));

  if (res.questions?.length) {
    const qwrap = $("#advisor-questions");
    qwrap.append(el("h3", {}, "A few clarifications (max 3):"));
    for (const q of res.questions) {
      const box = el("div", {});
      box.append(el("label", {}, q), el("input", { type: "text" }));
      qwrap.append(box);
    }
    result.append(el("p", { class: "lede" }, "Answer above (or leave blank) and press the button again."));
    return;
  }

  for (const rec of res.recommendations || []) {
    const card = el("div", { class: "card" });
    card.append(el("h3", {}, `${rec.name} `, sourceLink(rec.source_url)));
    if (rec.quantity) card.append(el("p", {}, el("strong", {}, `Suggested quantity: ${rec.quantity}`), ` - ${rec.quantityNote}`));
    else if (rec.quantityNote) card.append(el("p", { class: "not-specified" }, rec.quantityNote));
    const ul = el("ul", { style: "font-size:13.5px;padding-left:20px;margin-top:8px" });
    for (const r of rec.reasoning) ul.append(el("li", {}, r));
    card.append(ul, specTable(rec.specs));
    card.append(el("div", { style: "margin-top:12px" },
      el("button", { class: "btn", onclick: () => { BASKET.set(rec.id, rec); renderBasket(); } }, "Add to quote")));
    result.append(card);
  }
  if (!res.recommendations?.length) {
    result.append(el("div", { class: "empty-state" }, el("h3", {}, "No matching unit in the dataset"),
      el("p", {}, "Rather than inventing a product, the advisor says so. Broaden the requirements or check the dataset coverage report.")));
  }
  if (res.dropped?.length) {
    result.append(el("div", { class: "banner warn" }, el("strong", {}, "Validator: "),
      `dropped ${res.dropped.length} unit id(s) not present in the dataset: ${res.dropped.join(", ")} (logged, never rendered).`));
  }
  result.append(sourcePanel("Grounding", [
    `Needs extracted by: ${res.needsSource}`,
    `Dataset mode: ${res.datasetMode}`,
    ...(res.sources || []).map((s) => el("span", {}, "Source: ", sourceLink(s))),
  ]));
}

/* ---------- Demo 2: parts ---------- */
let uploadedImage = null;
$("#label-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    uploadedImage = { data: reader.result.split(",")[1], type: file.type };
    $("#label-img").src = reader.result;
  };
  reader.readAsDataURL(file);
});

$("#parts-go").addEventListener("click", async () => {
  const result = $("#parts-result");
  result.innerHTML = "";
  result.append(skeletons(4));
  const body = {};
  if (uploadedImage && STATE.llm) {
    body.image_base64 = uploadedImage.data;
    body.media_type = uploadedImage.type;
  } else {
    body.manual_fields = {
      model_name: $("#mf-model")?.value.trim() || null,
      serial_number: $("#mf-serial")?.value.trim() || null,
      article_number: $("#mf-article")?.value.trim() || null,
      year_of_manufacture: null,
    };
    // Sensible demo default: read the sample label's fixture values.
    if (!body.manual_fields.model_name && !body.manual_fields.article_number && PRODUCTS.length) {
      body.manual_fields.model_name = PRODUCTS[0].name;
      body.manual_fields.article_number = PRODUCTS[0].id;
      body.manual_fields.serial_number = "SB-DEMO-000001";
    }
  }
  const res = await api("/api/parts/identify", body);
  result.innerHTML = "";
  if (res.error) return result.append(refusalBlock(res.message, res.error));

  if (res.degradedNote) {
    $("#parts-degraded").innerHTML = "";
    $("#parts-degraded").append(el("div", { class: "banner warn" }, el("strong", {}, "Honest limitation: "), res.degradedNote));
  }

  const labelCard = el("div", { class: "card" }, el("h3", {}, "Extracted label fields"));
  labelCard.append(specTable(Object.fromEntries(
    Object.entries(res.label).filter(([k]) => k !== "legibility_notes")
      .map(([k, v]) => [k.replace(/_/g, " "), { value: v ?? NOT_SPECIFIED }]))));
  labelCard.append(el("p", { style: "font-size:12.5px;color:var(--ink-3);margin-top:8px" }, `Extraction: ${res.labelSource}`));
  result.append(labelCard);

  if (res.match) {
    const m = el("div", { class: "card" },
      el("h3", {}, `Matched unit: ${res.match.name} `, sourceLink(res.match.source_url)),
      specTable(res.match.specs));
    if (res.manualPassages?.length) {
      m.append(el("h3", { style: "margin-top:16px" }, "Manual"),
        ...res.manualPassages.map((p) => el("p", { style: "font-size:13px;margin-top:4px" },
          el("span", { class: "chip" }, `${p.manual} p.${p.page}`), ` ${p.text.slice(0, 160)}...`)));
    }
    result.append(m);
    if (res.orderRequest) {
      result.append(el("div", { class: "card" }, el("h3", {}, "Ready-to-send order request"),
        el("pre", { class: "mono", style: "margin-top:12px" }, res.orderRequest),
        el("div", { style: "margin-top:12px" },
          el("button", { class: "btn", onclick: () => navigator.clipboard.writeText(res.orderRequest) }, "Copy"))));
    }
  } else {
    result.append(el("div", { class: "empty-state" }, el("h3", {}, "No matching unit in the dataset"),
      el("p", {}, "The label fields did not match any dataset record. Nothing is guessed - check the fields or the dataset coverage.")));
  }
});

/* ---------- Demo 3: tender ---------- */
function renderTenderUnits() {
  const sel = $("#tender-unit");
  sel.innerHTML = "";
  for (const p of PRODUCTS) sel.append(el("option", { value: p.id }, p.name));
  if (!PRODUCTS.length) sel.append(el("option", {}, "(no dataset)"));
}

$("#tender-go").addEventListener("click", async () => {
  const wrap = $("#tender-result");
  wrap.innerHTML = "";
  wrap.append(skeletons(5));
  const body = { unit_id: $("#tender-unit").value, language: $("#tender-lang").value };
  const res = await api("/api/tender", body);
  wrap.innerHTML = "";
  if (res.error) return wrap.append(refusalBlock(res.message || "Unknown unit.", res.error));

  const text = res.paragraphs.map((p) => p.replace(/^## /, "")).join("\n\n");
  const card = el("div", { class: "card" });
  for (const p of res.paragraphs) {
    card.append(p.startsWith("## ") ? el("h3", {}, p.slice(3)) : el("p", { style: "margin-top:8px;font-size:14px" }, p));
  }
  card.append(el("div", { style: "margin-top:16px;display:flex;gap:8px" },
    el("button", { class: "btn", onclick: () => navigator.clipboard.writeText(text) }, "Copy"),
    el("button", { class: "btn", onclick: () => downloadDocx(body) }, "Export .docx")));
  wrap.append(card);

  wrap.append(sourcePanel("Fields used (looked up, never generated)",
    res.usedFields.map((f) => el("span", {}, `${f.field}: "${f.value}" - `, sourceLink(f.source_url)))));
});

async function downloadDocx(body) {
  const res = await fetch("/api/tender/docx", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const blob = await res.blob();
  const a = el("a", { href: URL.createObjectURL(blob), download: `tender-${body.unit_id}-${body.language}.docx` });
  document.body.append(a); a.click(); a.remove();
}

/* ---------- Demo 4: support (SSE) ---------- */
$("#support-go").addEventListener("click", runSupport);
$("#support-input").addEventListener("keydown", (e) => { if (e.key === "Enter") runSupport(); });

async function runSupport() {
  const question = $("#support-input").value.trim();
  if (!question) return;
  const wrap = $("#support-result");
  wrap.innerHTML = "";
  wrap.append(skeletons(3));

  const res = await fetch("/api/support", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }),
  });
  wrap.innerHTML = "";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentP = null;

  const handle = (event, data) => {
    if (event === "meta") {
      if (data.guard?.blocked) wrap.append(refusalBlock(data.guard.answer, `blocked query type: ${data.guard.type}`));
      else if (data.refused) wrap.append(refusalBlock(data.message, data.reason));
      else if (data.error) wrap.append(refusalBlock(data.message, data.error));
      else wrap.append(el("p", { style: "font-size:12.5px;color:var(--ink-3)" },
        `Retrieved from ${data.retrieval.considered} indexed manual passages (top score ${data.retrieval.maxScore}). ${data.note}`));
    } else if (event === "passage_start") {
      const card = el("div", { class: "card" });
      const cite = data.citation;
      const chip = cite.source_url?.startsWith("http")
        ? el("a", { class: "chip", href: cite.source_url, target: "_blank" }, `${cite.manual} - p.${cite.page}`)
        : el("span", { class: "chip" }, `${cite.manual} - p.${cite.page}`);
      card.append(chip);
      currentP = el("p", { style: "font-size:14px;margin-top:8px" });
      card.append(currentP);
      wrap.append(card);
    } else if (event === "chunk" && currentP) {
      currentP.textContent += data.text;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, idx); buffer = buffer.slice(idx + 2);
      const eventMatch = raw.match(/^event: (.+)$/m);
      const dataMatch = raw.match(/^data: (.+)$/m);
      if (eventMatch && dataMatch) handle(eventMatch[1], JSON.parse(dataMatch[1]));
    }
  }
}

boot();
