/**
 * ScanBox AI Demo Suite server.
 * Single command: npm start (after npm install). No login, no build step.
 */
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDataset, droppedLog } from "./grounding.mjs";
import { hasLLM } from "./llm.mjs";
import { advisor, identifyUnit, tender, support } from "./demos.mjs";
import { buildDocx } from "./docx.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "12mb" }));
app.use(express.static(path.join(here, "..", "client")));

const wrap = (fn) => async (req, res) => {
  try {
    res.json(await fn(req.body ?? {}));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
};

app.get("/api/state", async (_req, res) => {
  const ds = await loadDataset();
  res.json({
    datasetMode: ds.mode,
    datasetVersion: ds.version ?? null,
    notice: ds.notice ?? null,
    productCount: ds.products.length,
    passageCount: ds.passages.length,
    partsAvailable: Boolean(ds.parts),
    sourcesCount: ds.sourcesCount,
    llm: hasLLM(),
    droppedIds: droppedLog.length,
  });
});

app.get("/api/products", async (_req, res) => {
  const ds = await loadDataset();
  res.json({
    datasetMode: ds.mode,
    products: ds.products.map((p) => ({
      id: p.id, name: p.name, line: p.line, model_type: p.model_type ?? null,
      function: p.function ?? null, tray_system: p.tray_system ?? [],
      source_url: p.source_url, specs: p.specs,
    })),
  });
});

app.post("/api/advisor", wrap(advisor));
app.post("/api/parts/identify", wrap(identifyUnit));
app.post("/api/tender", wrap(tender));

// Support answers stream over SSE so the client can render incrementally.
app.post("/api/support", async (req, res) => {
  try {
    const result = await support(req.body ?? {});
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (result.guard || result.refused || result.error) {
      send("meta", result);
      send("done", {});
      return res.end();
    }
    send("meta", { retrieval: result.retrieval, datasetMode: result.datasetMode, note: result.note });
    for (const block of result.answer) {
      // Stream each passage in word chunks for progressive rendering.
      const words = block.text.split(" ");
      send("passage_start", { citation: block.citation });
      for (let i = 0; i < words.length; i += 8) {
        send("chunk", { text: words.slice(i, i + 8).join(" ") + " " });
        await new Promise((r) => setTimeout(r, 30));
      }
      send("passage_end", {});
    }
    send("done", {});
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

app.post("/api/tender/docx", async (req, res) => {
  try {
    const result = await tender(req.body ?? {});
    if (result.error) return res.status(400).json(result);
    const buf = buildDocx(result.paragraphs);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="tender-${result.unit.id}-${result.language}.docx"`);
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

const port = process.env.PORT || 4173;
app.listen(port, async () => {
  const ds = await loadDataset();
  console.log(`ScanBox AI Demo Suite: http://localhost:${port}`);
  console.log(`Dataset mode: ${ds.mode} (${ds.products.length} products, ${ds.passages.length} manual passages)`);
  if (ds.mode !== "real") {
    console.log("Real dataset not acquired - see data/README.md. The UI labels this state explicitly.");
  }
  console.log(`LLM: ${hasLLM() ? "enabled" : "disabled (no ANTHROPIC_API_KEY - deterministic fallbacks active)"}`);
});
