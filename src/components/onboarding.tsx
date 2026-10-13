"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  SparkleIcon,
  SpeakerHighIcon,
  SunHorizonIcon,
  PlayIcon,
  PauseIcon,
  ThermometerIcon,
} from "@phosphor-icons/react";
import { NouMark, NouWordmark } from "./brand-mark";
import { VoicePicker } from "./voice-controls";
import { IOS_SPRING, IOS_PRESS } from "@/lib/ios-motion";
import { isDaylight, type Weather, type Theme, type Unit, type Place } from "@/lib/weather";
import { voiceById } from "@/lib/voice";
import type { VoiceController } from "@/lib/use-voice";
const Sky = dynamic(() => import("./sky"), { ssr: false });
const TITLES = [
  "A little more today.\nA little less noise.",
  "Hi, I’m Nou.\nHow should I sound?",
  "A sky with\na little life.",
  "Your day.\nYour way.",
];
export default function Onboarding({
  voice,
  weather,
  place,
  theme,
  unit,
  setTheme,
  setUnit,
  complete,
}: {
  voice: VoiceController;
  weather: Weather | null;
  place: Place;
  theme: Theme;
  unit: Unit;
  setTheme: (theme: Theme) => void;
  setUnit: (unit: Unit) => void;
  complete: () => void;
}) {
  const stopVoice = voice.stop;
  const [step, setStep] = useState(0),
    [previewMotion, setPreviewMotion] = useState(true);
  const reduced = !!useReducedMotion();
  const panel = useRef<HTMLDivElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") complete();
      if (event.key === "Tab") {
        const buttons = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]),input:not([disabled]),a[href]",
          ) ?? [],
        ).filter((node) => node.getClientRects().length > 0);
        const first = buttons[0],
          last = buttons.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === heading.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [complete]);
  useEffect(() => {
    stopVoice();
    heading.current?.focus({ preventScroll: true });
  }, [step, stopVoice]);
  return (
    <motion.div
      className="onboarding-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
    >
      <motion.div
        ref={panel}
        className="onboarding"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        initial={reduced ? false : { y: 22, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduced ? 0 : 12 }}
        transition={IOS_SPRING}
      >
        <header className="onboarding-top">
          <button
            className="onboarding-back"
            aria-label="Previous onboarding step"
            disabled={step === 0}
            onClick={() => setStep((value) => value - 1)}
          >
            <ArrowLeftIcon size={21} />
          </button>
          <div
            className="onboarding-track"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={4}
            aria-valuenow={step + 1}
            aria-label={`Step ${step + 1} of 4`}
          >
            <motion.span animate={{ width: `${(step + 1) * 25}%` }} transition={IOS_SPRING} />
          </div>
          <button className="onboarding-skip" onClick={complete}>
            Skip
          </button>
        </header>
        <div className="onboarding-intro">
          <div
            className={`onboarding-emblem ${step === 1 ? "voice-" + voice.selected : ""}`}
            aria-hidden="true"
          >
            <motion.div
              className="onboarding-orb"
              exit={{ opacity: 0, transition: { duration: 0.1, repeat: 0 } }}
              animate={reduced ? {} : { rotate: [0, 360] }}
              transition={{ duration: 28, ease: "linear", repeat: Infinity }}
            />
            <NouMark size={43} />
          </div>
          <h2 ref={heading} id="onboarding-title" tabIndex={-1}>
            {TITLES[step].split("\n").map((line, index) => (
              <span key={line}>
                {index > 0 && <br />}
                {line}
              </span>
            ))}
          </h2>
          <p id="onboarding-description">
            {step === 0
              ? "Weather for now. A calmer way to meet your day."
              : step === 1
                ? "Tap play to preview. You can change this later."
                : step === 2
                  ? "A little response to every intentional touch."
                  : "Small preferences. A more personal day."}
          </p>
        </div>
        <div className="onboarding-content">
          <div className="onboarding-step-label">
            <span>
              {
                [
                  "Welcome to your moment",
                  "Make it sound like you",
                  "A little motion preview",
                  "Make it yours",
                ][step]
              }
            </span>
            <span>Step {step + 1} of 4</span>
          </div>
          <AnimatePresence mode="wait" initial={false} propagate>
            <motion.div
              key={step}
              initial={reduced ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduced ? 0 : -8 }}
              transition={{ duration: reduced ? 0 : 0.16 }}
            >
              {step === 0 && (
                <div className="welcome-features">
                  <div className="welcome-brand">
                    <NouWordmark />
                    <span>Just today. That’s enough.</span>
                  </div>
                  <p>
                    <SunHorizonIcon size={22} />
                    <span>
                      <strong>Your weather, right now.</strong>
                      <small>Real readings. Only the hours left today.</small>
                    </span>
                  </p>
                  <p>
                    <SpeakerHighIcon size={22} />
                    <span>
                      <strong>A voice that feels like you.</strong>
                      <small>Listen to your day, and keep it for later.</small>
                    </span>
                  </p>
                  <p>
                    <SparkleIcon size={22} />
                    <span>
                      <strong>A little room for play.</strong>
                      <small>A living sky, quiet moments, and thoughtful motion.</small>
                    </span>
                  </p>
                </div>
              )}
              {step === 1 && <VoicePicker voice={voice} compact />}
              {step === 2 && (
                <div className="motion-preview">
                  <div className="motion-sky">
                    <div className="motion-preview-halo" />
                    <Sky
                      code={weather?.current.weather_code ?? 2}
                      night={weather ? !isDaylight(weather) : false}
                      reduced={reduced || !previewMotion}
                    />
                  </div>
                  <div className="motion-preview-bottom">
                    <span>
                      <SparkleIcon size={15} /> Drag it. Double tap for a spin.
                    </span>
                    <button onClick={() => setPreviewMotion((value) => !value)} disabled={reduced}>
                      {previewMotion && !reduced ? (
                        <PauseIcon size={14} weight="fill" />
                      ) : (
                        <PlayIcon size={14} weight="fill" />
                      )}
                      {reduced
                        ? "Reduced motion"
                        : previewMotion
                          ? "Pause animation"
                          : "Play animation"}
                    </button>
                  </div>
                  <p>
                    {weather
                      ? `This sky follows the current weather in ${place.name}.`
                      : "Weather sculptures change with your sky."}
                    {reduced
                      ? " Your device has reduced motion enabled."
                      : " Motion follows your device’s accessibility preferences."}
                  </p>
                </div>
              )}
              {step === 3 && (
                <div className="onboarding-preferences">
                  <div className="onboarding-chosen">
                    <span className={`chosen-voice-orb voice-${voice.selected}`}>
                      <SpeakerHighIcon size={22} />
                    </span>
                    <span>
                      <strong>{voiceById(voice.selected).name}, your little voice.</strong>
                      <small>
                        {voice.installed.includes(voice.selected)
                          ? "Ready offline on this device"
                          : "Download anytime from voice settings"}
                      </small>
                    </span>
                    <CheckIcon size={20} />
                  </div>
                  <div className="preference-row">
                    <div>
                      <SunHorizonIcon size={22} />
                      <span>
                        Appearance<small>Let the daylight lead</small>
                      </span>
                    </div>
                    <div className="segmented">
                      {(["auto", "system", "light", "dark"] as const).map((item) => (
                        <button
                          key={item}
                          className={theme === item ? "selected" : ""}
                          aria-pressed={theme === item}
                          onClick={() => setTheme(item)}
                        >
                          {item === "auto"
                            ? "Daylight"
                            : item === "system"
                              ? "Device"
                              : item === "light"
                                ? "Light"
                                : "Dark"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="preference-row">
                    <div>
                      <ThermometerIcon size={22} />
                      <span>
                        Temperature<small>Your familiar degrees</small>
                      </span>
                    </div>
                    <div className="segmented">
                      {(["c", "f"] as const).map((item) => (
                        <button
                          key={item}
                          className={unit === item ? "selected" : ""}
                          aria-pressed={unit === item}
                          onClick={() => setUnit(item)}
                        >
                          °{item.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="onboarding-final-note">
                    Start with {place.name}, or find your city from the location button. Your
                    choices stay on this device. This tour is always in settings.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <footer className="onboarding-footer">
          <motion.button
            className="onboarding-continue"
            onClick={() => (step === 3 ? complete() : setStep((value) => value + 1))}
            whileTap={IOS_PRESS}
            transition={IOS_SPRING}
          >
            {step === 0 ? "Make it yours" : step === 3 ? "Meet today" : "Continue"}
            <ArrowRightIcon size={18} />
          </motion.button>
          <span>
            {step === 1
              ? "AI voices · Preview freely. Download when you’re ready."
              : "No account. No rush. Just today."}
          </span>
        </footer>
      </motion.div>
    </motion.div>
  );
}
