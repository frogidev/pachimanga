import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SERVER = process.env.COMFY_URL || "http://127.0.0.1:8188";
const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, "..", "public", "ai-art", "raw");

async function api(path, options) {
  const response = await fetch(`${SERVER}${path}`, options);
  if (!response.ok) throw new Error(`ComfyUI ${path} -> HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) {
    console.error("Usage: node scripts/comfy-generate.mjs \"<positive prompt>\"");
    process.exit(2);
  }
  const template = JSON.parse(
    (await import("node:fs/promises").then((fs) => fs.readFile(join(HERE, "comfy-workflow.json"), "utf8"))).replaceAll(
      "$PROMPT",
      prompt,
    ),
  );
  const clientId = randomUUID();
  const queued = await api("/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: template, client_id: clientId }),
  }).catch(() => {
    console.error(`ComfyUI server not reachable at ${SERVER}. Start it first (scripts/setup-comfyui.ps1).`);
    process.exit(1);
  });
  const promptId = queued.prompt_id;
  const deadline = Date.now() + 10 * 60 * 1000;
  for (;;) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for ComfyUI render.");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const history = await api(`/history/${promptId}`);
    const entry = history[promptId];
    if (!entry) continue;
    if (entry.status?.status_str === "error") throw new Error("ComfyUI execution failed.");
    if (!entry.status?.completed) continue;
    const images = Object.values(entry.outputs || {}).flatMap((output) => output.images || []);
    if (!images.length) throw new Error("Render completed with no images.");
    await mkdir(RAW_DIR, { recursive: true });
    for (const [index, image] of images.entries()) {
      const params = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || "", type: image.type || "output" });
      const bytes = await fetch(`${SERVER}/view?${params}`).then((res) => {
        if (!res.ok) throw new Error(`Image download -> HTTP ${res.status}`);
        return res.arrayBuffer();
      });
      const name = `pachi-${Date.now()}-${index}.png`;
      await writeFile(join(RAW_DIR, name), Buffer.from(bytes));
      console.log(`Saved public/ai-art/raw/${name}`);
    }
    return;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
