import { KokoroTTS } from "kokoro-js";
import { mkdir } from "node:fs/promises";
import { StyleTextToSpeech2Model, AutoTokenizer } from "@huggingface/transformers";
import { execFileSync } from "node:child_process";
await mkdir("/tmp/nou-voice-previews", { recursive: true });
const modelId = "onnx-community/Kokoro-82M-v1.0-ONNX";
const revision = "1939ad2a8e416c0acfeecc08a694d14ef25f2231";
const [model, tokenizer] = await Promise.all([
  StyleTextToSpeech2Model.from_pretrained(modelId, {
    revision,
    dtype: "q8",
    device: "cpu",
    session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
  }),
  AutoTokenizer.from_pretrained(modelId, { revision }),
]);
const tts = new KokoroTTS(model, tokenizer);
await mkdir("public/voices/previews", { recursive: true });
await mkdir("public/voices/notices", { recursive: true });

for (const [name, voice] of [
  ["Ember", "af_heart"],
  ["Luna", "af_nicole"],
  ["Nova", "af_bella"],
  ["Sage", "bm_george"],
]) {
  const audio = await tts.generate(
    `Hi, I'm ${name}. A little voice for your day. I'll help you hear the weather that matters. Just today.`,
    { voice, speed: 1 },
  );
  await audio.save(`/tmp/nou-voice-previews/${name.toLowerCase()}.wav`);
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    `/tmp/nou-voice-previews/${name.toLowerCase()}.wav`,
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "96k",
    `public/voices/previews/${name.toLowerCase()}.mp3`,
  ]);
  const notice = await tts.generate("You are offline. This is your last saved weather reading.", {
    voice,
  });
  await notice.save(`public/voices/notices/${name.toLowerCase()}-offline.wav`);
  process.stdout.write(`Generated ${name} preview and offline notice\n`);
}
await tts.model.dispose();
