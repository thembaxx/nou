"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion, motion } from "motion/react";
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  CheckIcon,
  DownloadSimpleIcon,
  ArrowUpRightIcon,
  SpeakerHighIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react";
import { VOICES, voiceById } from "@/lib/voice";
import type { VoiceController } from "@/lib/use-voice";
import { IOS_PRESS, IOS_SPRING } from "@/lib/ios-motion";

export function VoiceWaveform({
  active,
  analyser,
  className = "",
}: {
  active: boolean;
  analyser: RefObject<AnalyserNode | null>;
  className?: string;
}) {
  const node = useRef<HTMLDivElement>(null),
    reduced = !!useReducedMotion();
  useEffect(() => {
    if (!active || reduced) return;
    const values = new Uint8Array(128);
    let frame = 0,
      last = 0;
    const draw = (time: number) => {
      if (time - last > 45 && analyser.current) {
        analyser.current.getByteFrequencyData(values);
        last = time;
        const bars = node.current?.children ?? [];
        for (let index = 0; index < bars.length; index++) {
          const band = Math.abs(index - 15);
          const level = values[Math.min(127, 3 + band * 3)] / 255;
          (bars[index] as HTMLElement).style.transform = `scaleY(${0.14 + level * 0.86})`;
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, analyser, reduced]);
  return (
    <div
      ref={node}
      className={`voice-waveform ${active ? "active" : ""} ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: 31 }, (_, i) => (
        <i key={i} style={{ height: `${12 + (1 - Math.abs(i - 15) / 16) * 28}px` }} />
      ))}
    </div>
  );
}

export function VoicePicker({
  voice,
  compact = false,
}: {
  voice: VoiceController;
  compact?: boolean;
}) {
  return (
    <section className={`voice-picker ${compact ? "compact" : ""}`} aria-label="Voice preferences">
      <div className="voice-picker-title">
        <h3>Choose a voice</h3>
        <span>Yours to change, anytime</span>
      </div>
      <div className="voice-grid" role="radiogroup" aria-label="Choose a voice">
        {VOICES.map((item) => (
          <div
            key={item.id}
            className={`voice-card voice-${item.id}`}
            data-selected={voice.selected === item.id}
          >
            <label className="voice-select">
              <input
                type="radio"
                name="nou-voice-choice"
                value={item.id}
                checked={voice.selected === item.id}
                onChange={() => voice.choose(item.id)}
              />
              <span>
                <strong>{item.name}</strong>
                <small>{item.mood}</small>
              </span>
              <span className="voice-check" aria-hidden="true">
                {voice.selected === item.id && <CheckIcon size={13} weight="bold" />}
              </span>
            </label>
            <div className="voice-landscape">
              <VoiceWaveform active={voice.previewing === item.id} analyser={voice.analyser} />
              <motion.button
                className="voice-preview"
                aria-label={
                  voice.previewing === item.id
                    ? `Stop ${item.name} preview`
                    : `Preview ${item.name}`
                }
                onClick={() => void voice.preview(item.id)}
                whileTap={IOS_PRESS}
                transition={IOS_SPRING}
              >
                {voice.previewing === item.id ? (
                  <StopIcon size={14} weight="fill" />
                ) : (
                  <PlayIcon size={14} weight="fill" />
                )}
              </motion.button>
            </div>
            <span className="voice-accent">{item.accent}</span>
          </div>
        ))}
      </div>
      <VoiceDownload voice={voice} />
      {voice.error && (
        <p className="voice-error" role="alert">
          {voice.error}
        </p>
      )}
      <span className="sr-only" role="status">
        {voice.previewing ? `${voiceById(voice.previewing).name} preview is playing.` : ""}
      </span>
    </section>
  );
}
export function VoiceDownload({ voice }: { voice: VoiceController }) {
  const chosen = voiceById(voice.selected),
    downloaded = voice.installed.includes(voice.selected);
  return (
    <div className="voice-download">
      {voice.downloading ? (
        <div className="voice-download-progress" role="status">
          <span>
            <ArrowClockwiseIcon size={16} className="spin" /> {voice.downloadLabel}
          </span>
          <progress
            aria-label={`Downloading ${voiceById(voice.downloading).name}`}
            value={voice.progress}
            max={1}
          />
          <small>{Math.round(voice.progress * 100)}% · Keep Nou open while downloading</small>
          <button className="cancel-voice-download" onClick={voice.cancelDownload}>
            Cancel download
          </button>
        </div>
      ) : (
        <>
          <button
            className={`voice-download-button ${downloaded ? "downloaded" : ""}`}
            aria-label={
              downloaded
                ? `${chosen.name} is ready offline`
                : `Download ${chosen.name} · ${voice.installed.length ? "~0.5 MB" : "~110 MB"}`
            }
            onClick={() => void voice.install(voice.selected)}
            disabled={downloaded || voice.phase === "preparing" || voice.phase === "generating"}
          >
            {downloaded ? <CheckIcon size={17} /> : <DownloadSimpleIcon size={17} />}{" "}
            {downloaded
              ? `${chosen.name} is ready offline`
              : `Download ${chosen.name} · ${voice.installed.length ? "~0.5 MB" : "~110 MB"}`}
          </button>
          <small>
            {downloaded
              ? "Saved on this device. No connection needed to speak."
              : "Shared engine ~110 MB · Each additional voice ~0.5 MB"}
          </small>
        </>
      )}
    </div>
  );
}

const time = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
export function DailyVoice({
  voice,
  text,
  filename,
  changeVoice,
}: {
  voice: VoiceController;
  text: string;
  filename: string;
  changeVoice: () => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!voice.wav) {
      setUrl("");
      return;
    }
    const value = URL.createObjectURL(voice.wav);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [voice.wav]);
  const busy = voice.phase === "preparing" || voice.phase === "generating";
  const chosen = voiceById(voice.selected);
  return (
    <div className="daily-voice">
      <div className={`summary-landscape voice-landscape voice-${voice.selected}`}>
        <VoiceWaveform active={voice.phase === "playing"} analyser={voice.analyser} />
        <div className="summary-voice-name">
          <SpeakerHighIcon size={18} />
          <span>
            {chosen.name}
            <small>{chosen.mood}</small>
          </span>
        </div>
      </div>
      <div className="summary-player">
        <motion.button
          className="summary-play"
          aria-label={
            busy
              ? "Stop preparing summary"
              : voice.phase === "playing"
                ? "Pause daily summary"
                : voice.wav
                  ? "Play daily summary"
                  : "Generate daily summary"
          }
          onClick={() => {
            if (busy) voice.stop();
            else if (voice.wav) voice.toggle();
            else void voice.summarize(text);
          }}
          whileTap={IOS_PRESS}
          transition={IOS_SPRING}
        >
          {busy ? (
            <StopIcon size={18} weight="fill" />
          ) : voice.phase === "playing" ? (
            <PauseIcon size={18} weight="fill" />
          ) : (
            <PlayIcon size={18} weight="fill" />
          )}
        </motion.button>
        <div>
          <strong>
            {voice.phase === "preparing"
              ? "Getting your voice ready…"
              : voice.phase === "generating"
                ? "Shaping your little summary…"
                : voice.phase === "playing"
                  ? "Your day, spoken."
                  : voice.phase === "paused"
                    ? "A little pause."
                    : "Today, in your own time."}
          </strong>
          {busy ? (
            <progress aria-label="Preparing daily summary" value={voice.progress} max={1} />
          ) : (
            <div className="summary-timeline">
              <span
                style={{ width: `${voice.duration ? (voice.elapsed / voice.duration) * 100 : 0}%` }}
              />
            </div>
          )}
          <small>
            {busy
              ? voice.phase === "preparing"
                ? voice.downloadLabel || "The first listen downloads the shared speech engine."
                : "Creating audio on your device. Your weather stays here."
              : `${time(voice.elapsed)} / ${time(voice.duration)}`}
          </small>
        </div>
      </div>
      {voice.error && (
        <p className="voice-error" role="alert">
          {voice.error}
        </p>
      )}
      <div className="summary-actions">
        <button onClick={changeVoice}>
          Change voice <ArrowUpRightIcon size={15} />
        </button>
        {url ? (
          <a href={url} download={filename}>
            <DownloadSimpleIcon size={16} /> Save audio · WAV
          </a>
        ) : (
          <span>
            <DownloadSimpleIcon size={16} /> Audio available when ready
          </span>
        )}
      </div>
      <div className="summary-transcript">
        <span className="overline">READ ALONG</span>
        <p>{text}</p>
      </div>
      <p className="voice-privacy">
        An AI voice, generated on your device. Weather values are model estimates, with their
        reading time spoken aloud.
      </p>
    </div>
  );
}
