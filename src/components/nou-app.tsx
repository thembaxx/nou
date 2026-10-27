"use client";
import { ActivityWindows } from "./activity-windows";

import { useCallback, useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
  useDragControls,
} from "motion/react";
import { NouMark, NouWordmark } from "./brand-mark";
import QuietMoment from "./quiet-moment";
import Onboarding from "./onboarding";
import { VoicePicker, DailyVoice } from "./voice-controls";
import { useVoice } from "@/lib/use-voice";
import { dailyNarration, summaryFilename, voiceById } from "@/lib/voice";
import {
  GestureMain,
  TactileCard,
  AnimatedReading,
  SaveButton,
  ForecastScrubber,
} from "./interactions";
import { BRAND } from "@/lib/brand";
import { usePwa } from "./pwa-provider";
import { applyTheme, resolveTheme, weatherThemeContext, type ThemeContext } from "@/lib/theme";
import { IOS_SPRING, IOS_SHEET_SPRING, IOS_PRESS } from "@/lib/ios-motion";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  ArrowClockwiseIcon,
  CheckIcon,
  CaretDownIcon,
  CaretRightIcon,
  CloudIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  CompassIcon,
  CrosshairIcon,
  DownloadSimpleIcon,
  DropIcon,
  HeartIcon,
  InfoIcon,
  LeafIcon,
  KeyboardIcon,
  SpeakerHighIcon,
  PlayIcon,
  LightningIcon,
  MapPinIcon,
  MapTrifoldIcon,
  MoonIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  SunIcon,
  SunHorizonIcon,
  ThermometerIcon,
  TrashIcon,
  WavesIcon,
  WindIcon,
  XIcon,
  WifiSlashIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import {
  LONDON,
  DISCOVER,
  compass,
  condition,
  hourIndex,
  insight,
  isDaylight,
  localTime,
  skyKind,
  temperature,
  validPlace,
  validWeather,
  type Place,
  type Theme,
  type Unit,
  type Weather,
} from "@/lib/weather";

const Sky = dynamic(() => import("./sky"), {
  ssr: false,
  loading: () => (
    <div className="sky-loading">
      <CloudSunIcon size={120} weight="duotone" />
    </div>
  ),
});
const WeatherMap = dynamic(() => import("./weather-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <MapTrifoldIcon size={32} />
      <span>Finding your place in the world…</span>
    </div>
  ),
});

type Tab = "today" | "map" | "places";
type Sheet =
  | "search"
  | "install"
  | "settings"
  | "voice"
  | "summary"
  | "wind"
  | "humidity"
  | "uv"
  | "air"
  | "daylight"
  | "about"
  | null;
const storage = {
  get(key: string) {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "null");
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Browser storage may be unavailable in private mode. */
    }
  },
};

function WeatherIcon({
  code,
  night = false,
  size = 24,
}: {
  code: number;
  night?: boolean;
  size?: number;
}) {
  const kind = skyKind(code);
  if (kind === "rain") return <CloudRainIcon size={size} weight="duotone" />;
  if (kind === "snow") return <CloudSnowIcon size={size} weight="duotone" />;
  if (kind === "storm") return <LightningIcon size={size} weight="duotone" />;
  if (kind === "clear")
    return night ? (
      <MoonIcon size={size} weight="duotone" />
    ) : (
      <SunIcon size={size} weight="duotone" />
    );
  return code === 3 ? (
    <CloudIcon size={size} weight="duotone" />
  ) : (
    <CloudSunIcon size={size} weight="duotone" />
  );
}

function SheetDialog({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const reduced = !!useReducedMotion();
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const target =
      dialog.current?.querySelector<HTMLElement>(
        'input:not([type="radio"]),input[type="radio"]:checked',
      ) ?? dialog.current?.querySelector<HTMLElement>('button[aria-label="Close dialog"]');
    target?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const nodes = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input,a[href],select,[tabindex="0"]',
          ) ?? [],
        ).filter((node) => node.getClientRects().length > 0);
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [close, title]);
  return (
    <motion.div
      className="sheet-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
      onClick={close}
    >
      <motion.div
        ref={dialog}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        initial={
          reduced
            ? false
            : { y: mobile ? "100%" : 18, opacity: mobile ? 1 : 0, scale: mobile ? 1 : 0.98 }
        }
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { y: mobile ? "100%" : 12, opacity: mobile ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : IOS_SHEET_SPRING}
        drag={mobile && !reduced ? "y" : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.65 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || (info.offset.y > 25 && info.velocity.y > 550)) close();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="sheet-handle"
          aria-label="Dismiss dialog"
          onClick={close}
          onPointerDown={(event) => {
            if (mobile && !reduced) dragControls.start(event);
          }}
        >
          <span />
        </button>
        <div className="sheet-heading">
          <h2 id="sheet-title">{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={close}>
            <XIcon size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function SearchContent({
  select,
  locate,
  busy,
}: {
  select: (p: Place) => void;
  locate: () => void;
  busy: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setResults(data.places.filter(validPlace));
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Couldn't search. Try again.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  return (
    <>
      <div className="search-field">
        <MagnifyingGlassIcon size={21} />
        <input
          aria-label="Search for a city"
          placeholder="A city, a town, your little corner…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {query && (
          <button aria-label="Clear search" onClick={() => setQuery("")}>
            <XIcon size={17} />
          </button>
        )}
      </div>
      <button className="location-action" onClick={locate} disabled={busy}>
        <CrosshairIcon size={22} />
        <span>
          Use my current location<small>Weather right where you are</small>
        </span>
        {busy ? <ArrowClockwiseIcon className="spin" size={19} /> : <ArrowUpRightIcon size={20} />}
      </button>
      <p className="overline search-caption">
        {query.length >= 2
          ? searching
            ? "Looking around…"
            : "Places we found"
          : "Somewhere to start"}
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {!searching && !error && query.length >= 2 && !results.length && (
        <p className="empty-search">No places found. Try the city’s full name.</p>
      )}
      <div className="search-results">
        {(query.length >= 2 ? results : DISCOVER).map((p) => (
          <button key={p.id} onClick={() => select(p)} disabled={busy}>
            <span className="search-pin">
              <MapPinIcon size={21} />
            </span>
            <span>
              {p.name}
              <small>{[p.region, p.country].filter(Boolean).join(", ")}</small>
            </span>
            <ArrowUpRightIcon size={20} />
          </button>
        ))}
      </div>
    </>
  );
}

function DaylightDial({ weather, now }: { weather: Weather; now: number }) {
  const start = weather.daily.sunrise[0] * 1000,
    end = weather.daily.sunset[0] * 1000;
  const fraction = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const angle = Math.PI + fraction * Math.PI;
  return (
    <div className="daylight-dial">
      <svg viewBox="0 0 260 148" aria-hidden="true">
        <path
          d="M26 126a104 104 0 0 1 208 0"
          fill="none"
          stroke="var(--dial-track)"
          strokeWidth="15"
          strokeLinecap="round"
        />
        {Array.from({ length: 33 }, (_, i) => {
          const a = Math.PI + (i / 32) * Math.PI;
          return (
            <line
              key={i}
              x1={130 + Math.cos(a) * 104}
              y1={126 + Math.sin(a) * 104}
              x2={130 + Math.cos(a) * 87}
              y2={126 + Math.sin(a) * 87}
              stroke={i / 32 <= fraction ? "var(--accent-strong)" : "var(--dial-tick)"}
              strokeWidth="4"
            />
          );
        })}
        <circle
          cx={130 + Math.cos(angle) * 104}
          cy={126 + Math.sin(angle) * 104}
          r="7"
          fill="var(--ink)"
          stroke="var(--surface)"
          strokeWidth="3"
        />
      </svg>
      <div className="daylight-center">
        <SunHorizonIcon size={23} />
        <strong>
          {Math.floor((end - start) / 3600000)}
          <span>h</span> {Math.floor(((end - start) / 60000) % 60)}
          <span>m</span>
        </strong>
        <small>of daylight today</small>
      </div>
      <div className="sun-times">
        <span>
          {localTime(start, weather.timezone)}
          <small>Sunrise</small>
        </span>
        <span>
          {localTime(end, weather.timezone)}
          <small>Sunset</small>
        </span>
      </div>
    </div>
  );
}

export default function NouApp({ initialWeather }: { initialWeather: Weather | null }) {
  const voice = useVoice();
  const pwa = usePwa();
  const stopVoice = voice.stop;
  const [onboarding, setOnboarding] = useState(false);
  const rerunPending = useRef(false);
  const [summary, setSummary] = useState({ text: "", filename: "" });
  const completeOnboarding = useCallback(() => {
    stopVoice();
    storage.set("nou-onboarding-v1", true);
    setOnboarding(false);
  }, [stopVoice]);
  const [weather, setWeather] = useState(initialWeather);
  const [place, setPlace] = useState<Place>(LONDON);
  const [saved, setSaved] = useState<Place[]>([]);
  const [unit, setUnit] = useState<Unit>("c");
  const [theme, setTheme] = useState<Theme>("auto");
  const [tab, setTab] = useState<Tab>("today");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [quietMoment, setQuietMoment] = useState(false);
  const [shortcuts, setShortcuts] = useState(true);
  const logoTaps = useRef({ count: 0, last: 0 });
  const closeMoment = useCallback(() => setQuietMoment(false), []);
  const [now, setNow] = useState(initialWeather?.fetchedAt ?? 0);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [forecastMode, setForecastMode] = useState<"temperature" | "rain">("temperature");
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [systemDark, setSystemDark] = useState(false);
  const [startupTheme, setStartupTheme] = useState<"light" | "dark">("light");
  const [savedThemeContext, setSavedThemeContext] = useState<ThemeContext | null>(null);
  const reduced = !!useReducedMotion();
  const controller = useRef<AbortController | null>(null);
  const placeRef = useRef(place);
  const close = useCallback(() => {
    stopVoice();
    setSheet(null);
  }, [stopVoice]);
  const navigate = useCallback((next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "today") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    if (url.href !== window.location.href) window.history.pushState({ view: next }, "", url);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const daylight = weather ? isDaylight(weather, now || weather.fetchedAt) : true;
  const appearance = ready
    ? resolveTheme(
        theme,
        weather ? weatherThemeContext(weather) : savedThemeContext,
        now,
        systemDark,
      )
    : startupTheme;
  const dark = appearance === "dark";
  const isSaved = saved.some((p) => p.id === place.id);

  const loadWeather = useCallback(async (target: Place, silent = false) => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/weather?lat=${target.latitude}&lon=${target.longitude}`, {
        signal: ctrl.signal,
      });
      const data = await response.json();
      if (!response.ok || !validWeather(data))
        throw new Error(data.error ?? "Weather couldn't load. Try again.");
      const savedReading = response.headers.get("X-Nou-Saved-Reading") === "1";
      if (savedReading) setError("Showing your saved reading. Live weather couldn’t refresh.");
      setWeather(data);
      setPlace(target);
      placeRef.current = target;
      setSelectedHour(null);
      storage.set("nou-place", target);
      storage.set(`nou-weather-${target.id}`, data);
      setSheet((current) => (current === "search" ? null : current));
      return !savedReading;
    } catch (e) {
      if (ctrl.signal.aborted) return false;
      const cached = storage.get(`nou-weather-${target.id}`);
      if (validWeather(cached)) {
        setWeather(cached);
        setPlace(target);
        placeRef.current = target;
        setError("Showing your saved reading. Live weather couldn’t refresh.");
        setSheet((current) => (current === "search" ? null : current));
      } else setError(e instanceof Error ? e.message : "Weather couldn't load. Try again.");
      return false;
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  const refreshMoment = useCallback(async () => {
    const refreshed = await loadWeather(placeRef.current);
    if (refreshed) setToast("Your weather, freshly checked.");
    return refreshed;
  }, [loadWeather]);

  function touchBrand(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (tab !== "today") navigate("today");
    if (event.detail === 0) return;
    const time = performance.now();
    logoTaps.current.count = time - logoTaps.current.last < 650 ? logoTaps.current.count + 1 : 1;
    logoTaps.current.last = time;
    if (logoTaps.current.count === 5) {
      logoTaps.current.count = 0;
      setQuietMoment(true);
    }
  }

  useEffect(() => {
    let letters = "",
      lastKey = 0;
    const keys = (event: KeyboardEvent) => {
      const target = event.target as Element;
      if (
        !shortcuts ||
        event.isComposing ||
        sheet ||
        quietMoment ||
        onboarding ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target.closest(
          'input,textarea,select,[contenteditable="true"],[data-gesture-ignore],.sky-object,.map-shell',
        )
      )
        return;
      if (event.key === "/") {
        event.preventDefault();
        setSheet("search");
        return;
      }
      if (event.key.toLowerCase() === "r" && !event.repeat) {
        void refreshMoment();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        // Native form controls and navigation buttons keep their own key behavior.
        if (target.closest("a,button")) return;
        event.preventDefault();
        const views: Tab[] = ["today", "map", "places"];
        const next = views[views.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1)];
        if (next) navigate(next);
        return;
      }
      if (event.key.length !== 1 || event.repeat) return;
      const time = performance.now();
      letters =
        time - lastKey < 1100
          ? (letters + event.key.toLowerCase()).slice(-3)
          : event.key.toLowerCase();
      lastKey = time;
      if (letters === "now") {
        letters = "";
        setQuietMoment(true);
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [sheet, quietMoment, onboarding, shortcuts, tab, navigate, refreshMoment]);

  useEffect(() => {
    setStartupTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    setReady(true);
    setOnboarding(storage.get("nou-onboarding-v1") !== true);
    setNow(Date.now());
    setOffline(!navigator.onLine);
    const readView = () => {
      const view = new URLSearchParams(window.location.search).get("view");
      setTab(view === "map" || view === "places" ? view : "today");
    };
    readView();
    window.addEventListener("popstate", readView);
    const storedPlace = storage.get("nou-place"),
      storedSaved = storage.get("nou-saved"),
      storedUnit = storage.get("nou-unit"),
      storedTheme = storage.get("nou-theme");
    const context = storage.get("nou-theme-context");
    if (context && typeof context === "object") setSavedThemeContext(context);
    if (Array.isArray(storedSaved)) setSaved(storedSaved.filter(validPlace));
    if (storedUnit === "c" || storedUnit === "f") setUnit(storedUnit);
    if (storage.get("nou-shortcuts") === false) setShortcuts(false);
    if (["auto", "system", "light", "dark"].includes(storedTheme)) setTheme(storedTheme);
    const target = validPlace(storedPlace) ? storedPlace : LONDON;
    const cached = storage.get(`nou-weather-${target.id}`);
    if (validWeather(cached) && (!navigator.onLine || target.id !== LONDON.id)) {
      setWeather(cached);
      setPlace(target);
      placeRef.current = target;
    }
    if (target.id !== LONDON.id) {
      if (!validWeather(cached)) setWeather(null);
      void loadWeather(target);
    } else if (!initialWeather || Date.now() - initialWeather.current.time * 1000 > 20 * 60000)
      void loadWeather(LONDON);
    else if (navigator.onLine) storage.set(`nou-weather-${LONDON.id}`, initialWeather);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(() => {
      if (navigator.onLine && document.visibilityState === "visible")
        void loadWeather(placeRef.current, true);
    }, 300000);
    const online = () => {
      setOffline(false);
      void loadWeather(placeRef.current, true);
    };
    const offlineEvent = () => setOffline(true);
    const visible = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        void loadWeather(placeRef.current, true);
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineEvent);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(clock);
      clearInterval(refresh);
      controller.current?.abort();
      window.removeEventListener("popstate", readView);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineEvent);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [initialWeather, loadWeather]);

  useEffect(() => {
    if (!ready) return;
    applyTheme(appearance);
    storage.set("nou-theme", theme);
    if (weather) storage.set("nou-theme-context", weatherThemeContext(weather));
  }, [appearance, ready, theme, weather]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const changed = () => setSystemDark(media.matches);
    const stored = (event: StorageEvent) => {
      if (event.key === "nou-theme") {
        const next = storage.get("nou-theme");
        if (["auto", "system", "light", "dark"].includes(next)) setTheme(next);
      }
    };
    changed();
    media.addEventListener("change", changed);
    window.addEventListener("storage", stored);
    return () => {
      media.removeEventListener("change", changed);
      window.removeEventListener("storage", stored);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Location isn't available on this device. Search for a place instead.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let name = "Your location",
          country = "";
        try {
          const r = await fetch(`/api/location?lat=${latitude}&lon=${longitude}`);
          const data = await r.json();
          name = data.name;
          country = data.country;
        } catch {
          /* Coordinates still give accurate local weather without a city label. */
        }
        await loadWeather({
          id: `geo-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
          name,
          country,
          latitude,
          longitude,
        });
        setLocating(false);
      },
      (e) => {
        setLocating(false);
        setError(
          e.code === 1
            ? "Location access was declined. You can still search for any city."
            : "Couldn't find your location. Try again or search for a city.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, [loadWeather]);

  function listenToToday() {
    if (!weather) return;
    const text = dailyNarration(weather, place, unit, Date.now(), offline);
    setSummary({ text, filename: summaryFilename(place, weather, voice.selected) });
    setSheet("summary");
    void voice.summarize(text);
  }

  function savePlace() {
    const next = isSaved ? saved.filter((p) => p.id !== place.id) : [...saved, place];
    setSaved(next);
    storage.set("nou-saved", next);
    setToast(
      isSaved
        ? `${place.name} removed from saved places`
        : `${place.name} saved for a little later`,
    );
  }

  async function installApp() {
    const result = await pwa.install();
    if (result === "manual") setSheet("install");
    if (result === "error") setToast("Installation couldn’t open. Try your browser’s app menu.");
  }

  async function shareWeather() {
    if (!weather) return;
    const data = {
      title: `Nou · ${place.name} today`,
      text: `${place.name}: ${temperature(weather.current.temperature_2m, unit)}°${unit.toUpperCase()}, ${condition(weather.current.weather_code).toLowerCase()}. Weather for now.`,
      url: window.location.origin,
    };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(data)))
        await navigator.share(data);
      else {
        await navigator.clipboard.writeText(`${data.text} ${data.url}`);
        setToast("Today’s weather copied to your clipboard");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setToast("Sharing isn't available in this browser.");
    }
  }

  const clockTime = weather
    ? localTime(now || weather.fetchedAt, weather.timezone, { second: "2-digit" })
    : "—";
  const date = weather
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: weather.timezone,
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(now || weather.fetchedAt))
    : "Today, right here";
  const index = weather ? hourIndex(weather, now || weather.fetchedAt) : 0;
  const hours = weather
    ? weather.hourly.time.map((time, i) => ({ time, i })).filter(({ i }) => i >= index)
    : [];
  const activeIndex = selectedHour ?? index;
  const advice = weather ? insight(weather, now || weather.fetchedAt) : null;
  const uv = weather?.hourly.uv_index[index] ?? 0;
  const remainingRain = weather
    ? Math.max(...weather.hourly.precipitation_probability.slice(index))
    : 0;
  const stale = weather ? now - weather.current.time * 1000 > 3600000 : false;

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell" data-ready={ready} data-sheet-open={!!sheet || onboarding}>
        <aside className="sidebar" inert={onboarding}>
          <a className="brand" href="/" aria-label="Nou home" onClick={touchBrand}>
            <NouMark />
            <NouWordmark />
          </a>
          <p className="brand-caption">{BRAND.tagline}</p>
          <div className="sidebar-nav">
            <p className="overline">YOUR DAY, SIMPLIFIED</p>
            {(
              [
                { id: "today", title: "Today", icon: SunIcon },
                { id: "map", title: "Weather map", icon: MapTrifoldIcon },
                { id: "places", title: "Saved places", icon: HeartIcon },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                className={tab === item.id ? "active" : ""}
                onClick={() => navigate(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
              >
                <item.icon size={21} weight={tab === item.id ? "fill" : "regular"} />
                <span>{item.title}</span>
                {tab === item.id && <span className="nav-indicator" />}
              </button>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <span className="tiny-sun">
                <NouMark size={21} />
              </span>
              <p>
                Just today.
                <br />
                That’s enough.
              </p>
            </div>
            <button className="sidebar-setting" onClick={() => setSheet("settings")}>
              <SlidersHorizontalIcon size={19} /> Make it yours <ArrowUpRightIcon size={17} />
            </button>
            <div className="sidebar-footer">
              <span>Made for the moment</span>
              <span className="footer-dot" />
            </div>
          </div>
        </aside>

        <GestureMain
          view={tab}
          onNavigate={navigate}
          onRefresh={refreshMoment}
          disabled={!!sheet || quietMoment || onboarding || !ready}
          busy={loading}
          inert={onboarding}
        >
          <header className="topbar">
            <a className="brand mobile-brand" href="/" aria-label="Nou home" onClick={touchBrand}>
              <NouMark size={26} />
              <NouWordmark />
            </a>
            <div className="date-label">
              <span className="date-dot" />
              {date}
            </div>
            <div className="topbar-actions">
              <button className="location-button" onClick={() => setSheet("search")}>
                <MapPinIcon size={18} weight="fill" />
                <span>{place.name}</span>
                <CaretDownIcon size={13} />
              </button>
              <div className="unit-switch" aria-label="Temperature units">
                <button
                  className={unit === "c" ? "active" : ""}
                  aria-pressed={unit === "c"}
                  onClick={() => {
                    setUnit("c");
                    storage.set("nou-unit", "c");
                  }}
                >
                  °C
                </button>
                <button
                  className={unit === "f" ? "active" : ""}
                  aria-pressed={unit === "f"}
                  onClick={() => {
                    setUnit("f");
                    storage.set("nou-unit", "f");
                  }}
                >
                  °F
                </button>
              </div>
              <button
                className="icon-button top-settings"
                aria-label="Open preferences"
                disabled={!ready}
                onClick={() => setSheet("settings")}
              >
                <SlidersHorizontalIcon size={21} />
              </button>
            </div>
          </header>
          <div className="page-heading">
            <div>
              <p className="overline">
                <span className="live-dot" />{" "}
                {offline ? "YOUR LAST SAVED MOMENT" : "RIGHT HERE. RIGHT NOW."}
              </p>
              <h1>
                {tab === "today" ? (
                  <>
                    Hello, {daylight ? "today" : "tonight"}
                    <span className="heading-period">.</span>
                  </>
                ) : tab === "map" ? (
                  <>
                    A little perspective<span className="heading-period">.</span>
                  </>
                ) : (
                  <>
                    Your little corners<span className="heading-period">.</span>
                  </>
                )}
              </h1>
              <p className="page-subtitle">
                {tab === "today"
                  ? "The weather that matters. The day you’re in."
                  : tab === "map"
                    ? "Your place in the world, with a live view of the sky."
                    : "A few places close to your heart. Their weather, today."}
              </p>
            </div>
            <div className="local-clock">
              <span>LOCAL TIME</span>
              <time suppressHydrationWarning>{clockTime}</time>
              <small>
                {weather?.timezone.replaceAll("_", " ").split("/").at(-1) ?? place.name}
              </small>
            </div>
          </div>
          {(offline || stale || error) && (
            <div className="status-banner" role="status">
              {offline ? <WifiSlashIcon size={18} /> : <InfoIcon size={18} />}
              <span>
                {offline
                  ? "You’re offline. Your saved weather is here, until you reconnect."
                  : error || "This reading is over an hour old. Refresh for the latest weather."}
              </span>
              {!offline && (
                <button onClick={() => void loadWeather(place)} disabled={loading}>
                  Try again <ArrowClockwiseIcon className={loading ? "spin" : ""} />
                </button>
              )}
            </div>
          )}

          {!weather ? (
            <div className="initial-state">
              <div className="initial-logo">
                <NouMark size={55} />
              </div>
              <h2>A moment for your weather.</h2>
              <p>
                {loading
                  ? "Finding out what today has in store…"
                  : "Let’s find your corner of the world."}
              </p>
              {!loading && (
                <button className="primary-button" onClick={() => void loadWeather(place)}>
                  Try again <ArrowClockwiseIcon />
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={reduced ? false : { opacity: 0, y: 8, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={
                  reduced ? { duration: 0 } : { ...IOS_SPRING, opacity: { duration: 0.12 } }
                }
              >
                {tab === "today" && (
                  <>
                    <div className="hero-grid">
                      <section className="weather-hero card">
                        <div className="hero-top">
                          <span className="eyebrow">
                            <span className="live-dot" /> CURRENT WEATHER
                          </span>
                          <SaveButton saved={isSaved} onToggle={savePlace} />
                        </div>
                        <div className="hero-body">
                          <div className="hero-reading">
                            <div className="hero-location">
                              <h2>{place.name}</h2>
                              <span>{place.country}</span>
                            </div>
                            <div className="temperature-value">
                              <AnimatedReading
                                value={temperature(weather.current.temperature_2m, unit)}
                              />
                              <span>°</span>
                            </div>
                            <p className="condition-label">
                              {condition(weather.current.weather_code)}
                            </p>
                            <span className="feels-like">
                              Feels like {temperature(weather.current.apparent_temperature, unit)}°
                              <span className="small-separator">·</span>
                              <ArrowUpIcon size={12} />
                              {temperature(weather.daily.temperature_2m_max[0], unit)}°{" "}
                              <ArrowDownIcon size={12} />
                              {temperature(weather.daily.temperature_2m_min[0], unit)}°
                            </span>
                            <p className="precise-reading">
                              {temperature(weather.current.temperature_2m, unit, true)}°
                              {unit.toUpperCase()} at{" "}
                              {localTime(weather.current.time * 1000, weather.timezone)} local
                            </p>
                          </div>
                          <div className="hero-sky">
                            <div className="sky-halo" />
                            <Sky
                              code={weather.current.weather_code}
                              night={!daylight}
                              reduced={reduced || onboarding || !!sheet}
                            />
                            <span className="sky-hint">
                              <SparkleIcon size={12} /> Drag or double tap the sky
                            </span>
                          </div>
                        </div>
                        <button className="day-voice-button" onClick={listenToToday}>
                          <span className="day-voice-icon">
                            <SpeakerHighIcon size={18} />
                          </span>
                          <span>
                            <strong>Listen to today</strong>
                            <small>
                              {voiceById(voice.selected).name} ·{" "}
                              {voice.installed.includes(voice.selected)
                                ? "Ready offline"
                                : "First listen ~110 MB"}
                            </small>
                          </span>
                          <PlayIcon size={17} weight="fill" />
                        </button>
                        <div className="hero-bottom">
                          <span>
                            <span className="live-dot" />
                            {offline ? "Saved" : "Updated"}{" "}
                            {localTime(weather.current.time * 1000, weather.timezone)}
                            <span className="reading-source"> · Open-Meteo</span>
                          </span>
                          <button
                            onClick={() => void loadWeather(place)}
                            disabled={loading}
                            aria-label="Refresh current weather"
                          >
                            <ArrowClockwiseIcon size={16} className={loading ? "spin" : ""} />
                            <span>{loading ? "Refreshing" : "Refresh"}</span>
                          </button>
                        </div>
                      </section>
                      <section className="insight-card card">
                        <div className="insight-top">
                          <span className="eyebrow">A NOTE FOR TODAY</span>
                          <span className="insight-icon">
                            {advice?.icon === "moon" ? (
                              <MoonIcon size={21} />
                            ) : advice?.icon === "rain" ? (
                              <CloudRainIcon size={21} />
                            ) : (
                              <SunIcon size={21} />
                            )}
                          </span>
                        </div>
                        <div className="insight-copy">
                          <h2>{advice?.title}</h2>
                          <p>{advice?.text}</p>
                        </div>
                        <div className="insight-bottom">
                          <span>
                            <span className="note-dot" /> {advice?.tag}
                          </span>
                          <button
                            className="dark-circle"
                            onClick={() => setSheet(remainingRain >= 40 ? "humidity" : "uv")}
                            aria-label="Explore today's weather advice"
                          >
                            <ArrowUpRightIcon size={22} />
                          </button>
                        </div>
                        <div className="insight-orbit" aria-hidden="true" />
                      </section>
                    </div>

                    <section className="hourly-section card">
                      <div className="section-header">
                        <div className="section-title">
                          <span className="mini-icon">
                            <WavesIcon size={18} />
                          </span>
                          <h2>The rest of today</h2>
                          <span className="subtle-pill">One day at a time</span>
                        </div>
                        <div className="chart-switch">
                          <button
                            className={forecastMode === "temperature" ? "active" : ""}
                            aria-label="Show temperature forecast"
                            aria-pressed={forecastMode === "temperature"}
                            onClick={() => setForecastMode("temperature")}
                          >
                            <ThermometerIcon size={15} />
                            <span>Temperature</span>
                          </button>
                          <button
                            className={forecastMode === "rain" ? "active" : ""}
                            aria-label="Show rain probability forecast"
                            aria-pressed={forecastMode === "rain"}
                            onClick={() => setForecastMode("rain")}
                          >
                            <DropIcon size={15} />
                            <span>Rain</span>
                          </button>
                        </div>
                      </div>
                      <ForecastScrubber onScrub={setSelectedHour}>
                        <div className="hourly-chart">
                          {hours.map(({ time, i }, n) => {
                            const temp = weather.hourly.temperature_2m[i],
                              rain = weather.hourly.precipitation_probability[i];
                            const minimum = Math.min(...weather.hourly.temperature_2m),
                              maximum = Math.max(...weather.hourly.temperature_2m);
                            const height =
                              forecastMode === "rain"
                                ? 12 + rain * 0.58
                                : 28 + ((temp - minimum) / Math.max(maximum - minimum, 1)) * 48;
                            const night =
                              time < weather.daily.sunrise[0] || time >= weather.daily.sunset[0];
                            return (
                              <button
                                key={time}
                                data-hour-index={i}
                                className={`hour-column ${activeIndex === i ? "selected" : ""}`}
                                aria-label={`${n === 0 ? "Now" : localTime(time * 1000, weather.timezone)}: ${temperature(temp, unit)} degrees, ${rain}% chance of rain`}
                                aria-pressed={activeIndex === i}
                                onClick={() => setSelectedHour(i)}
                              >
                                <span className="hour-time">
                                  {n === 0
                                    ? "Now"
                                    : localTime(time * 1000, weather.timezone, {
                                        minute: undefined,
                                      })}
                                </span>
                                <span className="hour-icon">
                                  <WeatherIcon
                                    code={weather.hourly.weather_code[i]}
                                    night={night}
                                    size={23}
                                  />
                                </span>
                                <strong>
                                  {forecastMode === "rain"
                                    ? `${rain}%`
                                    : `${temperature(temp, unit)}°`}
                                </strong>
                                <div className="bar-track">
                                  <motion.div
                                    className="hour-bar"
                                    animate={{ height }}
                                    transition={{ duration: reduced ? 0 : 0.5 }}
                                  />
                                </div>
                                <span className="hour-rain">
                                  <DropIcon size={11} weight="fill" />
                                  {rain}%
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </ForecastScrubber>
                      <div className="forecast-footnote">
                        <span>
                          {selectedHour === null
                            ? "A little clarity for what’s ahead."
                            : `${localTime(weather.hourly.time[activeIndex] * 1000, weather.timezone)} · ${condition(weather.hourly.weather_code[activeIndex])} · Humidity ${weather.hourly.relative_humidity_2m[activeIndex]}%`}
                        </span>
                        <span>Only today. Always.</span>
                      </div>
                    </section>

                    <ActivityWindows
                      weather={weather}
                      now={now || weather.fetchedAt}
                      offline={offline}
                      stale={stale || !!error}
                    />
                    <div className="details-heading">
                      <h2>A little more detail</h2>
                      <span>
                        The small things that shape your day <ArrowDownIcon size={14} />
                      </span>
                    </div>
                    <div className="metrics-grid">
                      <TactileCard
                        className="metric-card card wind-card"
                        onClick={() => setSheet("wind")}
                      >
                        <div className="metric-heading">
                          <span>
                            <WindIcon size={19} /> Wind
                          </span>
                          <ArrowUpRightIcon size={18} />
                        </div>
                        <div className="metric-value">
                          {Math.round(weather.current.wind_speed_10m)}
                          <small>km/h</small>
                        </div>
                        <div className="wind-illustration" aria-hidden="true">
                          <svg viewBox="0 0 150 65">
                            <path d="M5 22h86c24 0 24-30 7-26M27 35h95c29 0 24 31 3 25M4 47h56" />
                          </svg>
                        </div>
                        <p>
                          {compass(weather.current.wind_direction_10m)} wind{" "}
                          <span>· Gusts {Math.round(weather.current.wind_gusts_10m)} km/h</span>
                        </p>
                      </TactileCard>
                      <TactileCard
                        className="metric-card card humidity-card"
                        onClick={() => setSheet("humidity")}
                      >
                        <div className="metric-heading">
                          <span>
                            <DropIcon size={19} /> Humidity
                          </span>
                          <ArrowUpRightIcon size={18} />
                        </div>
                        <div className="metric-value">
                          {weather.current.relative_humidity_2m}
                          <small>%</small>
                        </div>
                        <div className="humidity-art" aria-hidden="true">
                          {Array.from({ length: 10 }, (_, i) => (
                            <span
                              key={i}
                              className={
                                i / 10 < weather.current.relative_humidity_2m / 100 ? "filled" : ""
                              }
                            />
                          ))}
                        </div>
                        <p>
                          {weather.current.relative_humidity_2m > 70
                            ? "A little moisture in the air"
                            : weather.current.relative_humidity_2m < 30
                              ? "The air is feeling dry"
                              : "Comfortably balanced"}
                        </p>
                      </TactileCard>
                      <TactileCard
                        className="metric-card card uv-card"
                        onClick={() => setSheet("uv")}
                      >
                        <div className="metric-heading">
                          <span>
                            <SunIcon size={19} /> UV index
                          </span>
                          <ArrowUpRightIcon size={18} />
                        </div>
                        <div className="metric-value">
                          {uv.toFixed(1)}
                          <small>
                            {uv < 3 ? "Low" : uv < 6 ? "Moderate" : uv < 8 ? "High" : "Very high"}
                          </small>
                        </div>
                        <div className="uv-scale">
                          <span style={{ left: `${Math.min(uv / 11, 1) * 100}%` }} />
                        </div>
                        <p>
                          {uv < 3 ? "A gentle kind of sunshine" : "A little SPF goes a long way"}
                        </p>
                      </TactileCard>
                    </div>

                    <div className="bottom-grid">
                      <section className="daylight-card card">
                        <div className="section-header">
                          <div className="section-title">
                            <SunHorizonIcon size={21} />
                            <h2>Chasing daylight</h2>
                          </div>
                          <button
                            className="icon-button"
                            aria-label="View daylight details"
                            onClick={() => setSheet("daylight")}
                          >
                            <ArrowUpRightIcon size={19} />
                          </button>
                        </div>
                        <DaylightDial weather={weather} now={now || weather.fetchedAt} />
                      </section>
                      <section className="map-card card">
                        <div className="section-header">
                          <div className="section-title">
                            <MapTrifoldIcon size={20} />
                            <h2>Your corner of the world</h2>
                          </div>
                          <button
                            className="icon-button"
                            aria-label="Expand weather map"
                            onClick={() => navigate("map")}
                          >
                            <ArrowUpRightIcon size={19} />
                          </button>
                        </div>
                        <WeatherMap place={place} dark={dark} />
                      </section>
                    </div>
                    <div className="other-details">
                      <button onClick={() => setSheet("air")}>
                        <LeafIcon size={19} />
                        <span>Air quality</span>
                        <strong>{weather.air ? `${weather.air.us_aqi} AQI` : "Unavailable"}</strong>
                        <CaretRightIcon size={15} />
                      </button>
                      <span>
                        <CompassIcon size={18} /> Visibility{" "}
                        <strong>
                          {((weather.hourly.visibility[index] ?? 0) / 1000).toFixed(1)} km
                        </strong>
                      </span>
                      <span>
                        <WavesIcon size={18} /> Pressure{" "}
                        <strong>{Math.round(weather.current.pressure_msl)} hPa</strong>
                      </span>
                    </div>
                  </>
                )}
                {tab === "map" && (
                  <section className="full-map-card card">
                    <div className="section-header">
                      <div className="section-title">
                        <MapPinIcon size={20} />
                        <h2>{place.name}</h2>
                        <span className="subtle-pill">
                          {temperature(weather.current.temperature_2m, unit)}° ·{" "}
                          {condition(weather.current.weather_code)}
                        </span>
                      </div>
                      <button className="small-button" onClick={() => setSheet("search")}>
                        <MagnifyingGlassIcon size={17} /> Find a place
                      </button>
                    </div>
                    <WeatherMap place={place} dark={dark} expanded />
                    <div className="map-legend">
                      <span>
                        <span className="map-key" /> Your selected location
                      </span>
                      <p>Turn on rain radar to see the latest available precipitation.</p>
                    </div>
                  </section>
                )}
                {tab === "places" && (
                  <section className="places-section">
                    <div className="places-toolbar">
                      <span>
                        {saved.length} {saved.length === 1 ? "place" : "places"} saved
                      </span>
                      <button className="primary-button" onClick={() => setSheet("search")}>
                        <PlusIcon size={18} /> Find a place
                      </button>
                    </div>
                    {saved.length === 0 ? (
                      <div className="empty-places card">
                        <div className="empty-place-icon">
                          <HeartIcon size={35} weight="duotone" />
                        </div>
                        <h2>Keep your favorites close.</h2>
                        <p>
                          Save a place with the heart on its weather card.
                          <br />A home, a getaway, somewhere you miss.
                        </p>
                        <button className="primary-button" onClick={savePlace}>
                          <PlusIcon size={18} /> Save {place.name}
                        </button>
                      </div>
                    ) : (
                      <div className="saved-grid">
                        {saved.map((p) => (
                          <SavedPlace
                            key={p.id}
                            place={p}
                            unit={unit}
                            select={() => {
                              void loadWeather(p).then((ok) => {
                                if (ok) navigate("today");
                              });
                            }}
                            remove={() => {
                              const next = saved.filter((x) => x.id !== p.id);
                              setSaved(next);
                              storage.set("nou-saved", next);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          )}
          <footer className="main-footer">
            <span>
              <NouMark size={16} /> Weather for now.
            </span>
            <button onClick={() => setSheet("about")}>
              Weather by Open-Meteo <ArrowUpRightIcon size={13} />
            </button>
            <span className="footer-message">No tomorrow. Just today.</span>
          </footer>
        </GestureMain>

        <nav className="mobile-nav" aria-label="Main navigation" inert={onboarding}>
          {(
            [
              { id: "today", label: "Today", icon: SunIcon },
              { id: "map", label: "Map", icon: MapTrifoldIcon },
              { id: "places", label: "Places", icon: HeartIcon },
            ] as const
          ).map((item) => (
            <motion.button
              key={item.id}
              aria-label={item.label}
              className={tab === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              whileTap={reduced ? undefined : IOS_PRESS}
              transition={IOS_SPRING}
            >
              {tab === item.id && (
                <motion.span
                  className="mobile-tab-indicator"
                  layoutId="mobile-tab-indicator"
                  transition={IOS_SPRING}
                  aria-hidden="true"
                />
              )}
              <item.icon size={22} weight={tab === item.id ? "fill" : "regular"} />
            </motion.button>
          ))}
          <motion.button
            aria-label="Search"
            onClick={() => setSheet("search")}
            whileTap={reduced ? undefined : IOS_PRESS}
            transition={IOS_SPRING}
          >
            <MagnifyingGlassIcon size={22} />
          </motion.button>
        </nav>

        <AnimatePresence
          onExitComplete={() => {
            if (rerunPending.current) {
              rerunPending.current = false;
              setOnboarding(true);
            }
          }}
        >
          {sheet && (
            <SheetDialog
              title={
                sheet === "search"
                  ? "Find your somewhere."
                  : sheet === "settings"
                    ? "Make it yours."
                    : sheet === "install"
                      ? "Keep today close."
                      : sheet === "voice"
                        ? "A voice for your day."
                        : sheet === "summary"
                          ? "Your day, spoken."
                          : sheet === "about"
                            ? "A little about Nou."
                            : sheet === "daylight"
                              ? "A day in the light."
                              : sheet === "air"
                                ? "Take a breath."
                                : sheet === "wind"
                                  ? "A little breeze."
                                  : sheet === "humidity"
                                    ? "In the air today."
                                    : "A little sunshine."
              }
              close={close}
            >
              {sheet === "search" && (
                <>
                  <SearchContent
                    select={(p) => void loadWeather(p)}
                    locate={locate}
                    busy={loading || locating}
                  />
                  {error && (
                    <p className="inline-error" role="alert">
                      {error}
                    </p>
                  )}
                </>
              )}
              {sheet === "settings" && (
                <>
                  <p className="sheet-description">Small preferences. A more personal day.</p>
                  <div className="preference-row">
                    <div>
                      <SunHorizonIcon size={22} />
                      <span>
                        Appearance
                        <small>
                          {theme === "auto"
                            ? "Follows sunrise and sunset where you are"
                            : "Your preferred look"}
                        </small>
                      </span>
                    </div>
                    <div className="segmented">
                      {(["auto", "system", "light", "dark"] as const).map((t) => (
                        <button
                          key={t}
                          aria-pressed={theme === t}
                          className={theme === t ? "selected" : ""}
                          onClick={() => setTheme(t)}
                        >
                          {t === "auto"
                            ? "Daylight"
                            : t === "system"
                              ? "Device"
                              : t === "light"
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
                        Temperature<small>However you read the weather</small>
                      </span>
                    </div>
                    <div className="segmented">
                      {(["c", "f"] as const).map((u) => (
                        <button
                          key={u}
                          className={unit === u ? "selected" : ""}
                          aria-pressed={unit === u}
                          onClick={() => {
                            setUnit(u);
                            storage.set("nou-unit", u);
                          }}
                        >
                          °{u.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="preference-row">
                    <div>
                      <KeyboardIcon size={22} />
                      <span>
                        Keyboard shortcuts<small>Search, refresh, and move between views</small>
                      </span>
                    </div>
                    <button
                      className="shortcut-toggle"
                      role="switch"
                      aria-label="Keyboard shortcuts"
                      aria-checked={shortcuts}
                      onClick={() => {
                        const next = !shortcuts;
                        setShortcuts(next);
                        storage.set("nou-shortcuts", next);
                      }}
                    >
                      <span />
                    </button>
                  </div>
                  <button className="settings-action" onClick={() => setSheet("voice")}>
                    <SpeakerHighIcon size={22} />
                    <span>
                      Voice & downloads
                      <small>
                        {voiceById(voice.selected).name} ·{" "}
                        {voice.installed.includes(voice.selected)
                          ? "Ready offline"
                          : "Choose, preview, and download"}
                      </small>
                    </span>
                    <ArrowUpRightIcon size={20} />
                  </button>
                  <button
                    className="settings-action"
                    onClick={() => {
                      voice.stop();
                      rerunPending.current = true;
                      setSheet(null);
                    }}
                  >
                    <SparkleIcon size={22} />
                    <span>
                      Replay the welcome tour<small>Your voice, your sky, your way</small>
                    </span>
                    <ArrowUpRightIcon size={20} />
                  </button>
                  <button
                    className="settings-action"
                    onClick={() => void installApp()}
                    disabled={pwa.installed}
                  >
                    <DownloadSimpleIcon size={22} />
                    <span>
                      {pwa.installed ? "Nou is on your home screen" : "A place on your home screen"}
                      <small>
                        {pwa.installed
                          ? "Ready whenever you are"
                          : "Install Nou. Keep today a tap away."}
                      </small>
                    </span>
                    {pwa.installed ? <CheckIcon size={20} /> : <ArrowUpRightIcon size={20} />}
                  </button>
                  <button className="settings-action" onClick={() => void shareWeather()}>
                    <ShareNetworkIcon size={22} />
                    <span>
                      Share this little moment<small>Send today’s weather to someone</small>
                    </span>
                    <ArrowUpRightIcon size={20} />
                  </button>
                  <div className="interaction-note">
                    <SparkleIcon size={20} />
                    <p>
                      Swipe between views. Pull down to refresh. Drag the sky or double tap for a
                      little spin.
                      <small>
                        {shortcuts
                          ? "On a keyboard: / to search · R to refresh. A little secret lives in ‘now’."
                          : "Keyboard shortcuts are off. There is still a little secret in the Nou logo."}
                      </small>
                    </p>
                  </div>
                  <div className="theme-note">
                    <MoonIcon size={20} />
                    <p>
                      Nou follows the sun at your selected location. Light by day, a softer dark
                      after sunset. Your browser’s background follows along.
                    </p>
                  </div>
                </>
              )}
              {sheet === "install" && (
                <div className="install-guide">
                  <p className="sheet-description">
                    Nou opens in its own window, with your preferences and saved weather ready when
                    you need them.
                  </p>
                  <ol>
                    {pwa.platform === "ios" ? (
                      <>
                        <li>Open Nou in Safari and tap the browser’s Share button.</li>
                        <li>
                          Choose <strong>Add to Home Screen</strong>. You may need to scroll through
                          the actions.
                        </li>
                        <li>
                          Keep <strong>Open as Web App</strong> enabled if shown, then tap{" "}
                          <strong>Add</strong>.
                        </li>
                      </>
                    ) : pwa.platform === "android" ? (
                      <>
                        <li>Open your browser’s menu.</li>
                        <li>
                          Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>
                          .
                        </li>
                        <li>Confirm, then open Nou from your home screen.</li>
                      </>
                    ) : (
                      <>
                        <li>
                          In Chrome or Edge, choose the install icon in the address bar, or{" "}
                          <strong>Install Nou</strong> from the browser menu.
                        </li>
                        <li>
                          In Safari on Mac, choose <strong>File → Add to Dock</strong>.
                        </li>
                        <li>
                          If your browser doesn’t offer installation, bookmark Nou to keep it close.
                        </li>
                      </>
                    )}
                  </ol>
                  <p>
                    Your last reading stays available offline. Fresh weather and map tiles need a
                    connection.
                  </p>
                </div>
              )}
              {sheet === "voice" && (
                <>
                  <p className="sheet-description">
                    A familiar voice for your weather. Preview freely, then download for offline
                    listening.
                  </p>
                  <VoicePicker voice={voice} />
                  {voice.installed.includes(voice.selected) && (
                    <button
                      className="remove-offline-voice"
                      onClick={() => void voice.remove(voice.selected)}
                      disabled={
                        !!voice.downloading ||
                        voice.phase === "generating" ||
                        voice.phase === "preparing"
                      }
                    >
                      Remove {voiceById(voice.selected).name} from this device
                    </button>
                  )}
                  <p className="voice-privacy">
                    These are AI voices. Speech is generated on this device. No microphone, account,
                    or speech API is needed.
                  </p>
                </>
              )}
              {sheet === "summary" && (
                <DailyVoice
                  voice={voice}
                  text={summary.text}
                  filename={summary.filename}
                  changeVoice={() => {
                    voice.stop();
                    setSheet("voice");
                  }}
                />
              )}
              {sheet === "about" && (
                <>
                  <div className="about-brand">
                    <NouMark size={46} />
                    <NouWordmark className="about-wordmark" />
                  </div>
                  <p className="about-intro">{BRAND.tagline}</p>
                  <p className="sheet-description">{BRAND.story}</p>
                  <div className="source-note">
                    <InfoIcon size={20} />
                    <div>
                      <strong>Real data, thoughtfully presented.</strong>
                      <p>
                        Current conditions are Open-Meteo’s weather model estimates, updated in
                        15-minute intervals. The live clock shows the exact local time; weather
                        readings show their own update time. Hourly values are forecasts for today.
                      </p>
                    </div>
                  </div>
                  <div className="source-links">
                    <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                      Weather & air quality · Open-Meteo <ArrowUpRightIcon />
                    </a>
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Maps · OpenStreetMap <ArrowUpRightIcon />
                    </a>
                    <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">
                      Rain radar · RainViewer <ArrowUpRightIcon />
                    </a>
                  </div>
                  <p className="tiny-note">
                    Your places and preferences stay on this device. Location is requested only when
                    you choose to use it.
                  </p>
                  <Link className="about-story-link" href="/about">
                    The story behind Nou <ArrowUpRightIcon size={17} />
                  </Link>
                </>
              )}
              {weather &&
                sheet !== "search" &&
                sheet !== "settings" &&
                sheet !== "install" &&
                sheet !== "about" &&
                sheet !== "voice" &&
                sheet !== "summary" && (
                  <MetricDetails
                    kind={sheet}
                    weather={weather}
                    unit={unit}
                    now={now}
                    index={index}
                  />
                )}
            </SheetDialog>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {onboarding && (
            <Onboarding
              key="welcome"
              voice={voice}
              weather={weather}
              place={place}
              theme={theme}
              unit={unit}
              setTheme={setTheme}
              setUnit={(next) => {
                setUnit(next);
                storage.set("nou-unit", next);
              }}
              complete={completeOnboarding}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {quietMoment && <QuietMoment key="quiet-moment" close={closeMoment} />}
        </AnimatePresence>
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <CheckIcon size={18} />
              <span>{toast}</span>
              <button aria-label="Dismiss notification" onClick={() => setToast("")}>
                <XIcon size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function SavedPlace({
  place,
  unit,
  select,
  remove,
}: {
  place: Place;
  unit: Unit;
  select: () => void;
  remove: () => void;
}) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    const cached = storage.get(`nou-weather-${place.id}`);
    if (validWeather(cached)) setWeather(cached);
    fetch(`/api/weather?lat=${place.latitude}&lon=${place.longitude}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!validWeather(data)) throw new Error();
        setWeather(data);
        storage.set(`nou-weather-${place.id}`, data);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setError(true);
      });
    return () => ctrl.abort();
  }, [place]);
  return (
    <div className="saved-place-card card">
      <button className="saved-place-main" onClick={select}>
        <div>
          <MapPinIcon size={21} />
          <h2>{place.name}</h2>
          <p>{place.country}</p>
        </div>
        {weather ? (
          <div className="saved-weather">
            <WeatherIcon
              code={weather.current.weather_code}
              night={!isDaylight(weather)}
              size={48}
            />
            <strong>{temperature(weather.current.temperature_2m, unit)}°</strong>
            <span>{condition(weather.current.weather_code)}</span>
            <small>
              {error ? "Saved reading" : "Updated"}{" "}
              {localTime(weather.current.time * 1000, weather.timezone)}
            </small>
          </div>
        ) : (
          <span>{error ? "Tap to try again" : "Finding today’s weather…"}</span>
        )}
        <span className="saved-open">
          See today <ArrowUpRightIcon size={19} />
        </span>
      </button>
      <button
        className="saved-remove icon-button"
        onClick={remove}
        aria-label={`Remove ${place.name} from saved places`}
      >
        <TrashIcon size={18} />
      </button>
    </div>
  );
}

function MetricDetails({
  kind,
  weather,
  now,
  index,
}: {
  kind: Exclude<Sheet, "search" | "settings" | "about" | null>;
  weather: Weather;
  unit: Unit;
  now: number;
  index: number;
}) {
  const c = weather.current,
    uv = weather.hourly.uv_index[index];
  if (kind === "daylight")
    return (
      <>
        <DaylightDial weather={weather} now={now} />
        <p className="sheet-description">
          {isDaylight(weather, now)
            ? "There’s still a little light to enjoy. Find a moment outside before the sun calls it a day."
            : "The sun has set on today. A quieter sky, a slower pace."}
        </p>
        <div className="detail-row">
          <span>Sunrise</span>
          <strong>{localTime(weather.daily.sunrise[0] * 1000, weather.timezone)}</strong>
        </div>
        <div className="detail-row">
          <span>Sunset</span>
          <strong>{localTime(weather.daily.sunset[0] * 1000, weather.timezone)}</strong>
        </div>
        <p className="tiny-note">Times are local to {weather.timezone.replaceAll("_", " ")}.</p>
      </>
    );
  if (kind === "wind")
    return (
      <>
        <div className="detail-big-number">
          {Math.round(c.wind_speed_10m)}
          <span>km/h</span>
          <WindIcon size={54} />
        </div>
        <p className="sheet-description">
          {c.wind_speed_10m < 15
            ? "A gentle breeze, enough to rustle the leaves."
            : c.wind_speed_10m < 30
              ? "A noticeable breeze. A light jacket might be welcome."
              : "It’s a blustery one. Keep a firm hold on your hat."}
        </p>
        <div className="detail-row">
          <span>Direction</span>
          <strong>
            {compass(c.wind_direction_10m)} · {Math.round(c.wind_direction_10m)}°
          </strong>
        </div>
        <div className="detail-row">
          <span>Gusts</span>
          <strong>{Math.round(c.wind_gusts_10m)} km/h</strong>
        </div>
        <div className="detail-row">
          <span>Pressure at sea level</span>
          <strong>{Math.round(c.pressure_msl)} hPa</strong>
        </div>
        <p className="tiny-note">
          Wind is estimated 10 metres above the ground. Direction indicates where the wind comes
          from.
        </p>
      </>
    );
  if (kind === "humidity")
    return (
      <>
        <div className="detail-big-number">
          {c.relative_humidity_2m}
          <span>%</span>
          <DropIcon size={54} />
        </div>
        <p className="sheet-description">
          Relative humidity tells you how much moisture is in the air compared with what it can hold
          at this temperature.
        </p>
        <div className="detail-row">
          <span>Rain chance this hour</span>
          <strong>{weather.hourly.precipitation_probability[index]}%</strong>
        </div>
        <div className="detail-row">
          <span>Highest remaining chance today</span>
          <strong>{Math.max(...weather.hourly.precipitation_probability.slice(index))}%</strong>
        </div>
        <div className="detail-row">
          <span>Current precipitation</span>
          <strong>{c.precipitation} mm</strong>
        </div>
        <div className="detail-row">
          <span>Cloud cover</span>
          <strong>{c.cloud_cover}%</strong>
        </div>
      </>
    );
  if (kind === "uv")
    return (
      <>
        <div className="detail-big-number">
          {uv.toFixed(1)}
          <span>UV index</span>
          <SunIcon size={54} />
        </div>
        <p className="sheet-description">
          {uv < 3
            ? "Low UV right now. Enjoy a little time outside."
            : uv < 6
              ? "Moderate UV. Sunscreen and a little shade are good company."
              : "High UV. Bring sunscreen, a hat, and seek shade around midday."}
        </p>
        <div className="uv-scale large">
          <span style={{ left: `${Math.min(uv / 11, 1) * 100}%` }} />
        </div>
        <div className="uv-labels">
          <span>Low</span>
          <span>Moderate</span>
          <span>High</span>
          <span>Extreme</span>
        </div>
        <div className="detail-row">
          <span>Today’s peak</span>
          <strong>{Math.max(...weather.hourly.uv_index).toFixed(1)}</strong>
        </div>
        <p className="tiny-note">
          Hourly UV is a model forecast. Protection is recommended at an index of 3 or higher.
        </p>
      </>
    );
  return (
    <>
      <div className="detail-big-number">
        {weather.air?.us_aqi ?? "—"}
        <span>US AQI</span>
        <LeafIcon size={54} />
      </div>
      <p className="sheet-description">
        {!weather.air
          ? "Air quality data isn’t available for this location at the moment."
          : weather.air.us_aqi <= 50
            ? "A good day to take a deep breath. Air quality is in the good range."
            : weather.air.us_aqi <= 100
              ? "Air quality is moderate. Sensitive people may prefer shorter outdoor sessions."
              : "Air quality is elevated. Consider taking it easy outdoors, especially if you’re sensitive to pollution."}
      </p>
      {weather.air && (
        <>
          <div className="detail-row">
            <span>European AQI</span>
            <strong>{weather.air.european_aqi}</strong>
          </div>
          <div className="detail-row">
            <span>Fine particles (PM2.5)</span>
            <strong>{weather.air.pm2_5.toFixed(1)} µg/m³</strong>
          </div>
        </>
      )}
      <p className="tiny-note">
        Air quality is estimated by CAMS via Open-Meteo. Coverage and update intervals differ from
        weather readings.
      </p>
    </>
  );
}
