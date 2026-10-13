"use client";

import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowClockwiseIcon, HeartIcon } from "@phosphor-icons/react";
import { IOS_SPRING } from "@/lib/ios-motion";

type View = "today" | "map" | "places";
const VIEWS: View[] = ["today", "map", "places"];
const IGNORE =
  'a,button,input,textarea,select,[contenteditable="true"],[data-gesture-ignore],.map-shell,.hourly-section,.sky-object';

export function GestureMain({
  children,
  view,
  onNavigate,
  onRefresh,
  disabled,
  busy,
}: {
  children: ReactNode;
  view: View;
  onNavigate: (view: View) => void;
  onRefresh: () => Promise<unknown>;
  disabled: boolean;
  busy: boolean;
}) {
  const node = useRef<HTMLElement>(null);
  const latest = useRef({ view, onNavigate, onRefresh, disabled, busy });
  const reduced = !!useReducedMotion();
  const horizontal = useMotionValue(0),
    vertical = useMotionValue(0);
  const x = useSpring(horizontal, IOS_SPRING),
    y = useSpring(vertical, IOS_SPRING);
  const opacity = useTransform(y, [0, 18, 64], [0, 0.6, 1]);
  const rotation = useTransform(y, [0, 88], [0, 300]);
  const [phase, setPhase] = useState<"idle" | "pulling" | "armed" | "refreshing">("idle");
  useEffect(() => {
    latest.current = { view, onNavigate, onRefresh, disabled, busy };
  }, [view, onNavigate, onRefresh, disabled, busy]);
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    let gesture: {
      x: number;
      y: number;
      top: boolean;
      axis: "x" | "y" | null;
      dx: number;
      dy: number;
    } | null = null;
    let alive = true;
    const reset = () => {
      gesture = null;
      horizontal.set(0);
      vertical.set(0);
      if (alive) setPhase("idle");
    };
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        reset();
        return;
      }
      if (
        latest.current.disabled ||
        latest.current.busy ||
        event.touches.length !== 1 ||
        !window.matchMedia("(max-width: 760px)").matches ||
        (event.target as Element).closest(IGNORE)
      )
        return;
      const touch = event.touches[0];
      gesture = {
        x: touch.clientX,
        y: touch.clientY,
        top: window.scrollY < 2,
        axis: null,
        dx: 0,
        dy: 0,
      };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      if (event.touches.length !== 1 || latest.current.disabled) {
        reset();
        return;
      }
      const touch = event.touches[0];
      gesture.dx = touch.clientX - gesture.x;
      gesture.dy = touch.clientY - gesture.y;
      if (!gesture.axis && Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) > 12)
        gesture.axis = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4 ? "x" : "y";
      if (gesture.axis === "x") {
        if (event.cancelable) event.preventDefault();
        if (!reduced) horizontal.set(Math.max(-42, Math.min(42, gesture.dx * 0.2)));
      } else if (gesture.axis === "y" && gesture.top && gesture.dy > 0) {
        if (event.cancelable) event.preventDefault();
        const distance = Math.min(96, gesture.dy * 0.42);
        vertical.set(reduced ? Math.min(32, distance) : distance);
        setPhase(distance >= 68 ? "armed" : "pulling");
      }
    };
    const end = () => {
      if (!gesture) return;
      const current = gesture;
      gesture = null;
      horizontal.set(0);
      if (current.axis === "x" && Math.abs(current.dx) > 75) {
        const index = VIEWS.indexOf(latest.current.view) + (current.dx < 0 ? 1 : -1);
        if (VIEWS[index]) latest.current.onNavigate(VIEWS[index]);
      }
      if (current.axis === "y" && current.top && current.dy * 0.42 >= 68 && !latest.current.busy) {
        setPhase("refreshing");
        vertical.set(reduced ? 32 : 48);
        Promise.resolve(latest.current.onRefresh()).finally(() => {
          if (alive) {
            vertical.set(0);
            setPhase("idle");
          }
        });
      } else {
        vertical.set(0);
        setPhase("idle");
      }
    };
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchmove", move, { passive: false });
    element.addEventListener("touchend", end, { passive: true });
    element.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      alive = false;
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", move);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", reset);
    };
  }, [horizontal, vertical, reduced]);
  return (
    <motion.main
      ref={node}
      className="main-content gesture-main"
      id="main-content"
      style={{ x: reduced ? 0 : x, y: reduced ? vertical : y }}
      data-gesture-phase={phase}
    >
      <motion.div
        className="pull-indicator"
        style={{ opacity: reduced ? (phase === "idle" ? 0 : 1) : opacity }}
        aria-hidden={phase === "idle"}
      >
        <motion.span style={{ rotate: reduced ? 0 : rotation }}>
          <ArrowClockwiseIcon size={19} className={phase === "refreshing" ? "spin" : ""} />
        </motion.span>
        <span>
          {phase === "refreshing"
            ? "A fresh little moment…"
            : phase === "armed"
              ? "Let go for fresh weather"
              : "Pull for a fresh moment"}
        </span>
      </motion.div>
      {children}
    </motion.main>
  );
}

export function TactileCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className: string;
  onClick: () => void;
}) {
  const reduced = !!useReducedMotion();
  const rx = useMotionValue(0),
    ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 320, damping: 28 }),
    rotateY = useSpring(ry, { stiffness: 320, damping: 28 });
  const glowX = useMotionValue("50%"),
    glowY = useMotionValue("50%");
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (reduced || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width,
      y = (event.clientY - box.top) / box.height;
    rx.set((0.5 - y) * 4);
    ry.set((x - 0.5) * 4);
    glowX.set(`${x * 100}%`);
    glowY.set(`${y * 100}%`);
  }
  return (
    <motion.button
      className={`${className} tactile-card`}
      onClick={onClick}
      onPointerMove={move}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={
        {
          transformPerspective: 800,
          rotateX: reduced ? 0 : rotateX,
          rotateY: reduced ? 0 : rotateY,
          "--glow-x": glowX,
          "--glow-y": glowY,
        } as React.ComponentProps<typeof motion.button>["style"]
      }
      whileTap={reduced ? undefined : { scale: 0.975 }}
      transition={IOS_SPRING}
    >
      {children}
    </motion.button>
  );
}

export function AnimatedReading({ value }: { value: string }) {
  const reduced = !!useReducedMotion();
  return (
    <div className="animated-reading">
      <span className="sr-only">{value}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          aria-hidden="true"
          initial={reduced ? false : { y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reduced ? 0 : -8, opacity: 0 }}
          transition={reduced ? { duration: 0 } : { ...IOS_SPRING, opacity: { duration: 0.14 } }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function SaveButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  const reduced = !!useReducedMotion();
  const [burst, setBurst] = useState(0);
  return (
    <motion.button
      className={`icon-button save-button ${saved ? "saved" : ""}`}
      aria-label={saved ? "Unsave this place" : "Save this place"}
      onClick={() => {
        if (!saved && !reduced) setBurst((value) => value + 1);
        onToggle();
      }}
      whileTap={reduced ? undefined : { scale: 0.82 }}
      transition={IOS_SPRING}
    >
      <motion.span
        animate={{ scale: reduced ? 1 : saved ? [1, 1.22, 1] : 1 }}
        transition={{ duration: reduced ? 0 : 0.35, ease: "easeOut" }}
      >
        <HeartIcon size={21} weight={saved ? "fill" : "regular"} />
      </motion.span>
      {burst > 0 && !reduced && (
        <span key={burst} className="save-burst" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => (
            <motion.i
              key={index}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos((index * Math.PI * 2) / 7) * 26,
                y: Math.sin((index * Math.PI * 2) / 7) * 26,
                opacity: 0,
                scale: 0.3,
              }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          ))}
        </span>
      )}
    </motion.button>
  );
}

export function ForecastScrubber({
  children,
  onScrub,
}: {
  children: ReactNode;
  onScrub: (hour: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; start: number; dragging: boolean } | null>(null);
  const suppressed = useRef(false);
  function select(x: number) {
    const buttons = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>("[data-hour-index]") ?? [],
    );
    const nearest = buttons.reduce<HTMLButtonElement | null>((best, button) => {
      const box = button.getBoundingClientRect();
      const previous = best?.getBoundingClientRect();
      return !previous ||
        Math.abs(box.left + box.width / 2 - x) < Math.abs(previous.left + previous.width / 2 - x)
        ? button
        : best;
    }, null);
    if (nearest) onScrub(Number(nearest.dataset.hourIndex));
  }
  function end() {
    gesture.current = null;
    if (ref.current) ref.current.dataset.scrubbing = "false";
  }
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- This group delegates pointer gestures and arrow keys to its accessible hour buttons; it is not another tab stop.
    <div
      ref={ref}
      className="hourly-scroll forecast-scrubber"
      role="group"
      aria-label="Today’s hourly forecast"
      data-gesture-ignore
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        suppressed.current = false;
        gesture.current = {
          id: event.pointerId,
          start: event.clientX,
          dragging: false,
        };
      }}
      onPointerMove={(event) => {
        const current = gesture.current;
        if (!current || event.pointerId !== current.id) return;
        if (!current.dragging && Math.abs(event.clientX - current.start) > 5) {
          current.dragging = true;
          suppressed.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.dataset.scrubbing = "true";
        }
        if (current.dragging) {
          const box = event.currentTarget.getBoundingClientRect();
          if (event.clientX > box.right - 25) event.currentTarget.scrollLeft += 9;
          else if (event.clientX < box.left + 25) event.currentTarget.scrollLeft -= 9;
          select(event.clientX);
        }
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onClickCapture={(event) => {
        if (suppressed.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressed.current = false;
        }
      }}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-hour-index]"),
        );
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (index < 0) return;
        event.preventDefault();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : Math.max(
                  0,
                  Math.min(buttons.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)),
                );
        buttons[next]?.focus();
        buttons[next]?.click();
      }}
    >
      {children}
    </div>
  );
}
