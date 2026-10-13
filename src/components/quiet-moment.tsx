"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowClockwiseIcon, ArrowRightIcon, XIcon, SparkleIcon } from "@phosphor-icons/react";
import { IOS_SHEET_SPRING } from "@/lib/ios-motion";

export default function QuietMoment({ close }: { close: () => void }) {
  const reduced = !!useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0),
    [round, setRound] = useState(0);
  const done = elapsed >= 12;
  const instruction = done
    ? "That was your little moment."
    : elapsed < 4
      ? "Breathe in."
      : elapsed < 6
        ? "A little pause."
        : "Breathe out.";
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        const buttons = Array.from(
          panel.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
        );
        const first = buttons[0],
          last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
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
  }, [close]);
  useEffect(() => {
    const start = Date.now();
    setElapsed(0);
    const timer = setInterval(() => {
      const seconds = Math.min(12, (Date.now() - start) / 1000);
      setElapsed(seconds);
      if (seconds === 12) clearInterval(timer);
    }, 120);
    return () => clearInterval(timer);
  }, [round]);
  return (
    <motion.div
      className="quiet-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
      onClick={close}
    >
      <motion.div
        ref={panel}
        className="quiet-moment"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiet-title"
        initial={reduced ? false : { y: 20, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: reduced ? 0 : 15, opacity: 0 }}
        transition={reduced ? { duration: 0 } : IOS_SHEET_SPRING}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="quiet-close icon-button" aria-label="Close quiet moment" onClick={close}>
          <XIcon size={19} />
        </button>
        <p className="overline">
          <SparkleIcon size={13} /> YOU FOUND A LITTLE STILLNESS
        </p>
        <h2 id="quiet-title">
          Now is a good
          <br />
          place to be.
        </h2>
        <div className="breathing-sky" aria-hidden="true">
          <div className="quiet-orbit" />
          {Array.from({ length: 12 }, (_, index) => (
            <motion.i
              className="quiet-star"
              key={index}
              style={{ left: `${12 + ((index * 37) % 79)}%`, top: `${8 + ((index * 29) % 83)}%` }}
              animate={reduced ? {} : { opacity: [0.25, 0.8, 0.25] }}
              transition={{ duration: 3.5, delay: index * 0.17, repeat: Infinity }}
            />
          ))}
          <motion.div
            key={round}
            className="breathing-sun"
            animate={reduced ? {} : { scale: [0.72, 1, 1, 0.72] }}
            transition={{ duration: 12, times: [0, 1 / 3, 0.5, 1], ease: "easeInOut" }}
          />
          <motion.span
            className="shooting-star"
            animate={reduced ? {} : { x: [0, 100], y: [0, 50], opacity: [0, 1, 0] }}
            transition={{ duration: 1.4, delay: 2, repeat: Infinity, repeatDelay: 7 }}
          />
        </div>
        <p
          className="breathing-instruction"
          key={done ? "done" : elapsed < 4 ? "in" : elapsed < 6 ? "pause" : "out"}
          role="status"
        >
          {instruction}
        </p>
        <p className="quiet-caption">Nothing to chase. Just a little space.</p>
        <div className="quiet-progress" aria-hidden="true">
          <span style={{ width: `${Math.min(elapsed / 12, 1) * 100}%` }} />
        </div>
        <div className="quiet-actions">
          <button onClick={() => setRound((value) => value + 1)}>
            <ArrowClockwiseIcon size={16} /> Again, if you like
          </button>
          <button onClick={close}>
            Back to your day <ArrowRightIcon size={16} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
