import { build } from "esbuild";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { mkdir, copyFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const transformers = createRequire(require.resolve("@huggingface/transformers"));
const ort = dirname(transformers.resolve("onnxruntime-web"));
const root = "public/vendor/voice-runtime/v1";
await mkdir(root, { recursive: true });
await mkdir("public/voices/styles", { recursive: true });
await build({
  entryPoints: ["src/lib/voice-worker.ts"],
  outfile: `${root}/voice-worker.js`,
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "eof",
  alias: {
    "onnxruntime-web/webgpu": transformers.resolve("onnxruntime-web/wasm"),
    "onnxruntime-web": transformers.resolve("onnxruntime-web/wasm"),
    path: "./scripts/browser-empty.mjs",
    "fs/promises": "./scripts/browser-empty.mjs",
  },
});
for (const file of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"])
  await copyFile(join(ort, file), `${root}/${file}`);
const kokoro = dirname(dirname(require.resolve("kokoro-js")));
for (const voice of ["af_heart", "af_nicole", "af_bella", "bm_george"])
  await copyFile(join(kokoro, "voices", `${voice}.bin`), `public/voices/styles/${voice}.bin`);
await copyFile(join(kokoro, "LICENSE"), "public/voices/LICENSE.txt");
console.log("Built local voice worker, WASM runtime, and four voice styles.");
