"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { audioBufferWav } from "./audio";
import {
  MODEL_URL,
  MODEL_REVISION,
  VOICE_CACHE,
  VOICES,
  RUNTIME_FILES,
  RUNTIME_PATH,
  voiceById,
  validVoice,
  type VoiceId,
} from "./voice";

type Phase = "idle" | "preparing" | "generating" | "playing" | "paused" | "ready" | "error";
type Job = {
  resolve: (value: ArrayBuffer | undefined) => void;
  reject: (error: Error) => void;
  voice: VoiceId;
  kind: "install" | "generate";
  token: number;
};
export function useVoice() {
  const [selected, setSelected] = useState<VoiceId>("ember");
  const [installed, setInstalled] = useState<VoiceId[]>([]);
  const [downloading, setDownloading] = useState<VoiceId | null>(null);
  const [progress, setProgress] = useState(0),
    [downloadLabel, setDownloadLabel] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [previewing, setPreviewing] = useState<VoiceId | null>(null);
  const [error, setError] = useState("");
  const [wav, setWav] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0),
    [duration, setDuration] = useState(0);
  const worker = useRef<Worker | null>(null),
    jobs = useRef(new Map<number, Job>()),
    sequence = useRef(0),
    operation = useRef(0);
  const context = useRef<AudioContext | null>(null),
    analyser = useRef<AnalyserNode | null>(null),
    audio = useRef<HTMLAudioElement | null>(null),
    source = useRef<AudioBufferSourceNode | null>(null),
    buffer = useRef<AudioBuffer | null>(null),
    started = useRef(0);
  const mounted = useRef(true);
  const playing = phase === "playing";

  useEffect(() => {
    mounted.current = true;
    const activeJobs = jobs.current;
    try {
      const stored = JSON.parse(localStorage.getItem("nou-voice") ?? "null");
      if (validVoice(stored)) setSelected(stored);
    } catch {
      /* Device storage is optional. */
    }
    void (async () => {
      try {
        const cache = await caches.open(VOICE_CACHE);
        if (!(await cache.match(MODEL_URL))) return;
        for (const file of RUNTIME_FILES)
          if (!(await cache.match(new URL(RUNTIME_PATH + file, location.origin).href))) return;
        const available = await Promise.all(
          VOICES.map(async (voice) => {
            const marker = await cache.match(
              new URL(`/voices/installed/${voice.id}`, location.origin).href,
            );
            if (
              !marker ||
              !(await cache.match(
                new URL(`/voices/styles/${voice.model}.bin`, location.origin).href,
              ))
            )
              return null;
            return (await marker.json()).revision === MODEL_REVISION ? voice.id : null;
          }),
        );
        if (mounted.current) setInstalled(available.filter((id): id is VoiceId => id !== null));
      } catch {
        /* Voice downloads report unavailable storage when requested. */
      }
    })();
    return () => {
      mounted.current = false;
      worker.current?.terminate();
      for (const job of activeJobs.values()) job.reject(new Error("Voice session ended."));
      activeJobs.clear();
      audio.current?.pause();
      source.current?.stop();
      void context.current?.close();
    };
  }, []);

  function audioContext() {
    if (!context.current) {
      const Constructor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor)
        throw new Error(
          "Audio playback is unavailable in this browser. You can still read today’s summary.",
        );
      const ctx = new Constructor();
      context.current = ctx;
      analyser.current = ctx.createAnalyser();
      analyser.current.fftSize = 256;
      analyser.current.connect(ctx.destination);
      const player = new Audio();
      player.preload = "auto";
      audio.current = player;
      ctx.createMediaElementSource(player).connect(analyser.current);
      player.onended = () => {
        if (mounted.current) setPreviewing(null);
      };
    }
    void context.current.resume();
    return context.current;
  }
  const stop = useCallback(() => {
    operation.current++;
    if (Array.from(jobs.current.values()).some((job) => job.kind === "generate")) {
      worker.current?.terminate();
      worker.current = null;
      for (const job of jobs.current.values()) job.reject(new Error("Voice preparation stopped."));
      jobs.current.clear();
    }
    audio.current?.pause();
    source.current?.stop();
    source.current = null;
    if (mounted.current) {
      setPreviewing(null);
      setPhase("idle");
      setElapsed(0);
    }
  }, []);
  function choose(id: VoiceId) {
    stop();
    setSelected(id);
    setWav(null);
    buffer.current = null;
    try {
      localStorage.setItem("nou-voice", JSON.stringify(id));
    } catch {
      /* Preferences can still apply for this session. */
    }
  }
  async function preview(id: VoiceId) {
    if (previewing === id) {
      audio.current?.pause();
      setPreviewing(null);
      return;
    }
    stop();
    setError("");
    try {
      audioContext();
      audio.current!.src = `/voices/previews/${id}.mp3`;
      await audio.current!.play();
      if (mounted.current) setPreviewing(id);
    } catch {
      setError("The preview could not play. Try again, or check your connection.");
    }
  }
  function request(kind: "install" | "generate", voice: VoiceId, text?: string) {
    if (!worker.current) {
      const instance = new Worker(RUNTIME_PATH + "voice-worker.js", {
        type: "module",
        name: "nou-voice",
      });
      worker.current = instance;
      instance.onmessage = (event) => {
        const data = event.data;
        const job = jobs.current.get(data.id);
        if (!job || !mounted.current) return;
        if (data.kind === "progress") {
          setProgress(data.progress);
          setDownloadLabel(data.label);
          if (job.kind === "generate" && job.token === operation.current) setPhase("preparing");
        } else if (data.kind === "installed") {
          setInstalled((previous) =>
            previous.includes(data.voice) ? previous : [...previous, data.voice],
          );
          setProgress(1);
        } else if (data.kind === "generating" && job.token === operation.current) {
          setPhase("generating");
          setProgress(data.progress);
        } else if (data.kind === "result") {
          jobs.current.delete(data.id);
          job.resolve(data.wav);
        } else if (data.kind === "error") {
          jobs.current.delete(data.id);
          job.reject(new Error(data.error));
        }
      };
      instance.onerror = () => {
        for (const job of jobs.current.values())
          job.reject(new Error("The voice engine could not start. Try downloading again online."));
        jobs.current.clear();
        instance.terminate();
        worker.current = null;
      };
    }
    const id = ++sequence.current;
    return new Promise<ArrayBuffer | undefined>((resolve, reject) => {
      jobs.current.set(id, { resolve, reject, voice, kind, token: operation.current });
      worker.current!.postMessage({ id, kind, voice, text });
    });
  }
  async function install(id: VoiceId) {
    if (downloading) return;
    setDownloading(id);
    setProgress(0);
    setDownloadLabel("Preparing your download");
    setError("");
    try {
      await request("install", id);
      await navigator.storage?.persist?.();
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "The voice could not download.");
    } finally {
      if (mounted.current) setDownloading(null);
    }
  }
  function cancelDownload() {
    worker.current?.terminate();
    worker.current = null;
    for (const job of jobs.current.values())
      job.reject(new Error("Download cancelled. You can try again anytime."));
    jobs.current.clear();
    setDownloading(null);
  }
  async function remove(id: VoiceId) {
    if (downloading || phase === "preparing" || phase === "generating") return;
    stop();
    try {
      const cache = await caches.open(VOICE_CACHE),
        definition = voiceById(id);
      await cache.delete(new URL(`/voices/installed/${id}`, location.origin).href);
      await cache.delete(new URL(`/voices/styles/${definition.model}.bin`, location.origin).href);
      await (
        await caches.open("kokoro-voices")
      ).delete(
        `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/${definition.model}.bin`,
      );
      const next = installed.filter((voice) => voice !== id);
      setInstalled(next);
      if (!next.length) {
        await caches.delete(VOICE_CACHE);
        worker.current?.terminate();
        worker.current = null;
      }
    } catch {
      setError("Could not remove this voice. Please try again.");
    }
  }
  function playBuffer() {
    const ctx = audioContext();
    if (!buffer.current) return;
    source.current?.stop();
    const node = ctx.createBufferSource();
    node.buffer = buffer.current;
    node.connect(analyser.current!);
    started.current = ctx.currentTime;
    source.current = node;
    node.onended = () => {
      if (source.current === node && mounted.current) {
        setPhase("ready");
        setElapsed(buffer.current?.duration ?? 0);
        source.current = null;
      }
    };
    node.start();
    setElapsed(0);
    setDuration(buffer.current.duration);
    setPhase("playing");
  }
  async function summarize(text: string) {
    stop();
    const token = operation.current;
    setError("");
    setWav(null);
    setPhase("preparing");
    setProgress(0);
    try {
      const ctx = audioContext();
      const offlinePrefix = "You are offline. This is your last saved weather reading.";
      const savedReading = text.startsWith(offlinePrefix);
      const body = savedReading ? text.slice(offlinePrefix.length).trim() : text;
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body))),
        (value) => value.toString(16).padStart(2, "0"),
      ).join("");
      const key = new URL(`/voices/audio/${selected}/${hash}.wav`, location.origin).href;
      const audioCache = await caches.open("nou-voice-audio-v1");
      const cached = await audioCache.match(key);
      const data = cached ? await cached.arrayBuffer() : await request("generate", selected, body);
      if (!data || !mounted.current || token !== operation.current) return;
      if (!cached) {
        try {
          await audioCache.put(
            key,
            new Response(data, { headers: { "Content-Type": "audio/wav" } }),
          );
          const keys = await audioCache.keys();
          for (const older of keys.slice(0, Math.max(0, keys.length - 6)))
            await audioCache.delete(older);
        } catch {
          /* Listening remains available when saved audio storage is full. */
        }
      }
      let decoded = await ctx.decodeAudioData(data.slice(0));
      if (savedReading) {
        const notice = await fetch(`/voices/notices/${selected}-offline.wav`);
        if (!notice.ok)
          throw new Error(
            "The offline voice notice is unavailable. Reconnect once to finish setup.",
          );
        const prefix = await ctx.decodeAudioData(await notice.arrayBuffer());
        const combined = ctx.createBuffer(1, prefix.length + decoded.length, ctx.sampleRate);
        combined.getChannelData(0).set(prefix.getChannelData(0));
        combined.getChannelData(0).set(decoded.getChannelData(0), prefix.length);
        decoded = combined;
      }
      const blob = audioBufferWav(decoded);
      if (!mounted.current || token !== operation.current) return;
      buffer.current = decoded;
      setWav(blob);
      playBuffer();
    } catch (e) {
      if (mounted.current && token === operation.current) {
        setError(e instanceof Error ? e.message : "Your summary could not play.");
        setPhase("error");
      }
    }
  }
  function toggle() {
    if (phase === "playing") {
      void context.current?.suspend();
      setPhase("paused");
    } else if (phase === "paused") {
      void context.current?.resume();
      setPhase("playing");
    } else if (buffer.current) playBuffer();
  }
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (context.current && buffer.current)
        setElapsed(
          Math.min(buffer.current.duration, context.current.currentTime - started.current),
        );
    }, 250);
    return () => clearInterval(timer);
  }, [playing]);
  return {
    selected,
    choose,
    installed,
    downloading,
    progress,
    downloadLabel,
    phase,
    previewing,
    error,
    wav,
    elapsed,
    duration,
    analyser,
    preview,
    stop,
    install,
    cancelDownload,
    remove,
    summarize,
    toggle,
  };
}
export type VoiceController = ReturnType<typeof useVoice>;
