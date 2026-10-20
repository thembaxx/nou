/// <reference lib="webworker" />
import { KokoroTTS } from "kokoro-js";
import { AutoTokenizer, StyleTextToSpeech2Model, RawAudio, env } from "@huggingface/transformers";
import {
  MODEL_ID,
  MODEL_REVISION,
  VOICE_CACHE,
  RUNTIME_FILES,
  RUNTIME_PATH,
  voiceById,
  type VoiceId,
} from "./voice";

env.allowLocalModels = false;
env.useBrowserCache = false;
env.useCustomCache = true;
const wasm = env.backends.onnx.wasm;
if (!wasm) throw new Error("WebAssembly speech is unavailable.");
wasm.wasmPaths = new URL(RUNTIME_PATH, self.location.origin).href;
wasm.numThreads = self.crossOriginIsolated ? Math.min(2, navigator.hardwareConcurrency || 1) : 1;
wasm.proxy = false;
let engine: KokoroTTS | null = null;
let queue = Promise.resolve();

async function runtime(cache: Cache) {
  for (const file of RUNTIME_FILES) {
    const url = new URL(RUNTIME_PATH + file, self.location.origin).href;
    if (await cache.match(url)) continue;
    const response = await fetch(url);
    if (!response.ok)
      throw new Error("The speech engine could not download. Please try again online.");
    await cache.put(url, response);
  }
}
async function prepare(id: number, voice: VoiceId) {
  if (!("caches" in self)) throw new Error("Offline voice storage is unavailable in this browser.");
  const cache = await caches.open(VOICE_CACHE);
  env.customCache = cache;
  await runtime(cache);
  if (!engine) {
    let lastProgress = -1;
    const progress_callback = (info: Record<string, unknown>) => {
      if (
        info.status === "progress" &&
        typeof info.progress === "number" &&
        String(info.file).endsWith(".onnx") &&
        Math.floor(info.progress) !== lastProgress
      ) {
        lastProgress = Math.floor(info.progress);
        self.postMessage({
          kind: "progress",
          id,
          progress: info.progress * 0.009,
          label: "Downloading the shared speech engine",
        });
      }
    };
    self.postMessage({
      kind: "progress",
      id,
      progress: 0.01,
      label: "Preparing the shared speech engine",
    });
    const [model, tokenizer] = await Promise.all([
      StyleTextToSpeech2Model.from_pretrained(MODEL_ID, {
        revision: MODEL_REVISION,
        dtype: "q8",
        device: "wasm",
        progress_callback,
      }),
      AutoTokenizer.from_pretrained(MODEL_ID, { revision: MODEL_REVISION }),
    ]);
    // Transformers types the factory result as the base model, although this factory is the style-TTS subclass.
    engine = new KokoroTTS(model as StyleTextToSpeech2Model, tokenizer);
  }
  const definition = voiceById(voice);
  const url = new URL(`/voices/styles/${definition.model}.bin`, self.location.origin).href;
  let style = await cache.match(url);
  if (!style) {
    style = await fetch(url);
    if (!style.ok) throw new Error("This voice could not download. Please try again.");
    await cache.put(url, style.clone());
  }
  const voiceCache = await caches.open("kokoro-voices");
  await voiceCache.put(
    `https://huggingface.co/${MODEL_ID}/resolve/main/voices/${definition.model}.bin`,
    style,
  );
  self.postMessage({
    kind: "progress",
    id,
    progress: 0.95,
    label: `Getting ${definition.name} ready`,
  });
  await engine.generate("Hello.", { voice: definition.model });
  await cache.put(
    new URL(`/voices/installed/${voice}`, self.location.origin).href,
    new Response(JSON.stringify({ revision: MODEL_REVISION, voice }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  return engine;
}
self.onmessage = (event) => {
  const { id, kind, voice, text } = event.data as {
    id: number;
    kind: "install" | "generate";
    voice: VoiceId;
    text?: string;
  };
  queue = queue.then(async () => {
    try {
      const tts = await prepare(id, voice);
      self.postMessage({ kind: "installed", id, voice });
      if (kind === "generate" && text) {
        const sentences = text
          .match(/[^]*?(?:[.!?](?=\s|$)|$)/g)
          ?.map((s) => s.trim())
          .filter(Boolean) ?? [text];
        const chunks: Float32Array[] = [];
        for (let index = 0; index < sentences.length; index++) {
          self.postMessage({ kind: "generating", id, progress: index / sentences.length });
          const audio = await tts.generate(sentences[index], { voice: voiceById(voice).model });
          chunks.push(audio.audio);
        }
        const samples = new Float32Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          samples.set(chunk, offset);
          offset += chunk.length;
        }
        const wav = await new RawAudio(samples, 24000).toBlob().arrayBuffer();
        self.postMessage({ kind: "result", id, wav }, [wav]);
      } else self.postMessage({ kind: "result", id });
    } catch (error) {
      self.postMessage({
        kind: "error",
        id,
        error:
          error instanceof Error ? error.message : "Your voice could not get ready. Try again.",
      });
    }
  });
};
