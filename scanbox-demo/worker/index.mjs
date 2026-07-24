/**
 * Cloudflare Worker entry point. Static client is served by the assets
 * binding; /api/* routes run here (run_worker_first). Reuses the exact same
 * demo pipelines and grounding layer as the Node server - the dataset is
 * injected from the bundled module instead of read from disk.
 */
import dataset from "./dataset.generated.mjs";
import { primeDataset, loadDataset, droppedLog } from "../server/grounding.mjs";
import { hasLLM } from "../server/llm.mjs";
import { advisor, identifyUnit, tender, support } from "../server/demos.mjs";
import { buildDocx } from "../server/docx.mjs";

primeDataset(dataset);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

async function supportSSE(body) {
  const result = await support(body ?? {});
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event, data) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      if (result.guard || result.refused || result.error) {
        send("meta", result);
        send("done", {});
        controller.close();
        return;
      }
      send("meta", { retrieval: result.retrieval, datasetMode: result.datasetMode, note: result.note });
      for (const block of result.answer) {
        const words = block.text.split(" ");
        send("passage_start", { citation: block.citation });
        for (let i = 0; i < words.length; i += 8) {
          send("chunk", { text: words.slice(i, i + 8).join(" ") + " " });
          await new Promise((r) => setTimeout(r, 30));
        }
        send("passage_end", {});
      }
      send("done", {});
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
  });
}

export default {
  async fetch(request, env) {
    // Make secrets visible to the shared server modules, which read
    // process.env (nodejs_compat populates it from vars, but secrets set
    // after deploy arrive on env - mirror them defensively).
    if (env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
    }

    const url = new URL(request.url);
    const route = `${request.method} ${url.pathname}`;
    let body = null;
    if (request.method === "POST") {
      try { body = await request.json(); } catch { body = {}; }
    }

    try {
      switch (route) {
        case "GET /api/state": {
          const ds = await loadDataset();
          return json({
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
        }
        case "GET /api/products": {
          const ds = await loadDataset();
          return json({
            datasetMode: ds.mode,
            products: ds.products.map((p) => ({
              id: p.id, name: p.name, line: p.line, model_type: p.model_type ?? null,
              function: p.function ?? null, tray_system: p.tray_system ?? [],
              source_url: p.source_url, specs: p.specs,
            })),
          });
        }
        case "POST /api/advisor":
          return json(await advisor(body));
        case "POST /api/parts/identify":
          return json(await identifyUnit(body));
        case "POST /api/tender":
          return json(await tender(body));
        case "POST /api/tender/docx": {
          const result = await tender(body);
          if (result.error) return json(result, 400);
          const buf = buildDocx(result.paragraphs);
          return new Response(buf, {
            headers: {
              "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "content-disposition": `attachment; filename="tender-${result.unit.id}-${result.language}.docx"`,
            },
          });
        }
        case "POST /api/support":
          return supportSSE(body);
        default:
          return json({ error: "not_found" }, 404);
      }
    } catch (err) {
      console.error(err);
      return json({ error: "server_error", message: err.message }, 500);
    }
  },
};
