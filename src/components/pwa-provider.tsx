"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { applyTheme, resolveTheme } from "@/lib/theme";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type InstallResult = "accepted" | "dismissed" | "manual" | "error";
type PwaState = {
  installed: boolean;
  platform: "ios" | "android" | "desktop";
  install: () => Promise<InstallResult>;
};
const PwaContext = createContext<PwaState>({
  installed: false,
  platform: "desktop",
  install: async () => "manual",
});
export const usePwa = () => useContext(PwaContext);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<PwaState["platform"]>("desktop");
  const [updateReady, setUpdateReady] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const installEvent = useRef<InstallEvent | null>(null);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const reloadForUpdate = useRef(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const fullscreen = window.matchMedia("(display-mode: fullscreen)");
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
    const syncInstalled = () =>
      setInstalled(standalone.matches || fullscreen.matches || !!iosStandalone);
    syncInstalled();
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setPlatform(ios ? "ios" : /Android/.test(navigator.userAgent) ? "android" : "desktop");
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      installEvent.current = event as InstallEvent;
    };
    const appInstalled = () => {
      setInstalled(true);
      installEvent.current = null;
      void navigator.storage?.persist?.().catch(() => false);
    };
    standalone.addEventListener("change", syncInstalled);
    fullscreen.addEventListener("change", syncInstalled);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);

    // Keep browser metadata aligned on informational pages and after cross-tab changes.
    const syncTheme = () => {
      let preference: unknown = "auto",
        context = null;
      try {
        preference = JSON.parse(localStorage.getItem("nou-theme") || '"auto"');
        context = JSON.parse(localStorage.getItem("nou-theme-context") || "null");
      } catch {
        /* The app works without persistent preferences. */
      }
      applyTheme(resolveTheme(preference, context, Date.now(), media.matches));
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const storageChanged = (event: StorageEvent) => {
      if (!event.key || event.key === "nou-theme" || event.key === "nou-theme-context") syncTheme();
    };
    syncTheme();
    const themeTimer = setInterval(syncTheme, 60000);
    media.addEventListener("change", syncTheme);
    window.addEventListener("storage", storageChanged);

    let disposed = false;
    let updateTimer: ReturnType<typeof setTimeout> | undefined;
    let installing: ServiceWorker | null = null;
    const stateChanged = () => {
      if (installing?.state === "installed" && navigator.serviceWorker.controller)
        setUpdateReady(true);
    };
    const foundUpdate = () => {
      installing?.removeEventListener("statechange", stateChanged);
      installing = registration.current?.installing ?? null;
      installing?.addEventListener("statechange", stateChanged);
    };
    const controlled = () => {
      if (reloadForUpdate.current) window.location.reload();
    };
    const checkUpdate = () => {
      if (document.visibilityState !== "visible") return;
      syncTheme();
      if (navigator.onLine) void registration.current?.update().catch(() => {});
    };
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator &&
      window.isSecureContext
    ) {
      navigator.serviceWorker.addEventListener("controllerchange", controlled);
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(async (worker) => {
          if (disposed) return;
          registration.current = worker;
          setUpdateReady(!!worker.waiting && !!navigator.serviceWorker.controller);
          worker.addEventListener("updatefound", foundUpdate);
          foundUpdate();
          const active = await navigator.serviceWorker.ready;
          if (!disposed) active.active?.postMessage({ type: "CACHE_PAGES" });
        })
        .catch(() => {
          /* Installation restrictions must not interrupt weather. */
        });
      updateTimer = setInterval(checkUpdate, 60 * 60 * 1000);
    }
    document.addEventListener("visibilitychange", checkUpdate);
    window.addEventListener("online", checkUpdate);
    return () => {
      disposed = true;
      clearInterval(themeTimer);
      clearInterval(updateTimer);
      standalone.removeEventListener("change", syncInstalled);
      fullscreen.removeEventListener("change", syncInstalled);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
      media.removeEventListener("change", syncTheme);
      window.removeEventListener("storage", storageChanged);
      document.removeEventListener("visibilitychange", checkUpdate);
      window.removeEventListener("online", checkUpdate);
      registration.current?.removeEventListener("updatefound", foundUpdate);
      installing?.removeEventListener("statechange", stateChanged);
      navigator.serviceWorker?.removeEventListener("controllerchange", controlled);
    };
  }, []);

  async function install(): Promise<InstallResult> {
    const prompt = installEvent.current;
    if (!prompt) return "manual";
    installEvent.current = null;
    try {
      await prompt.prompt();
      return (await prompt.userChoice).outcome;
    } catch {
      return "error";
    }
  }

  function update() {
    const waiting = registration.current?.waiting;
    if (!waiting) {
      setUpdateError("The update is no longer ready. Reopen Nou to check again.");
      return;
    }
    reloadForUpdate.current = true;
    setUpdating(true);
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <PwaContext.Provider value={{ installed, platform, install }}>
      {children}
      {updateReady && (
        <aside className="pwa-update" aria-label="Nou update">
          <p role="status">{updateError || "A fresh version of Nou is ready."}</p>
          <button onClick={update} disabled={updating}>
            {updating ? "Updating…" : "Update Nou"}
          </button>
          <button onClick={() => setUpdateReady(false)} disabled={updating}>
            Later
          </button>
        </aside>
      )}
    </PwaContext.Provider>
  );
}
