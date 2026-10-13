import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { NouMark, NouWordmark } from "@/components/brand-mark";
import { absoluteUrl, BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About — Weather for Now",
  description:
    "Meet Nou, the weather app for today. Learn about its current weather data, daylight themes, real maps, privacy, and offline home screen experience.",
  alternates: { canonical: absoluteUrl("/about") },
  openGraph: {
    title: "Meet Nou — Weather for Now",
    description: BRAND.story,
    url: absoluteUrl("/about"),
    images: [{ url: absoluteUrl("/social.png"), width: 1200, height: 630, alt: BRAND.tagline }],
  },
};

export default function About() {
  return (
    <main id="main-content" className="story-page">
      <header className="story-header">
        <Link href="/" className="brand" aria-label="Nou home">
          <NouMark />
          <NouWordmark />
        </Link>
        <Link className="story-return" href="/">
          Back to today <ArrowUpRightIcon size={18} aria-hidden="true" />
        </Link>
      </header>
      <section className="story-hero">
        <span className="overline">A LITTLE ABOUT NOU</span>
        <h1>
          Weather
          <br />
          for <span>now.</span>
        </h1>
        <p>{BRAND.story}</p>
        <div className="story-symbol">
          <NouMark size={110} />
        </div>
        <Link href="/" className="primary-button">
          See your today <ArrowUpRightIcon size={18} aria-hidden="true" />
        </Link>
      </section>
      <section className="story-section">
        <span className="overline">THE NAME</span>
        <h2>
          A small word.
          <br />A whole point of view.
        </h2>
        <p>
          Nou means “now” in Afrikaans. It’s a name for paying attention to the day you’re in: the
          air outside, the light that’s left, the right moment to take a walk.
        </p>
        <p>
          The rounded “n” in our mark frames a small sun above a horizon. A quiet reminder that a
          little presence goes a long way.
        </p>
      </section>
      <section className="story-features" aria-label="What Nou offers">
        <article className="card">
          <span>01</span>
          <h2>Your weather, today.</h2>
          <p>
            Current temperature and conditions, followed by the hours still ahead. Wind, humidity,
            UV, air quality, and daylight give you a little more context.
          </p>
        </article>
        <article className="card">
          <span>02</span>
          <h2>A sky with some life.</h2>
          <p>
            A playful 3D sky responds to the weather. The app’s light and dark themes follow sunrise
            and sunset at your selected location.
          </p>
        </article>
        <article className="card">
          <span>03</span>
          <h2>A place on your phone.</h2>
          <p>
            Install Nou on your home screen. Save your favorite places, explore a real map, and keep
            your last reading available when you’re offline.
          </p>
        </article>
      </section>
      <section className="story-section story-questions">
        <span className="overline">A LITTLE CLARITY</span>
        <h2>Good to know.</h2>
        <details open>
          <summary>Where does the weather come from?</summary>
          <p>
            Current conditions and hourly forecasts come from{" "}
            <a href="https://open-meteo.com/">Open-Meteo</a>. Current readings are weather model
            estimates updated in 15-minute intervals. The clock shows the exact local time; every
            reading shows its own update time. Air quality is estimated by CAMS through Open-Meteo.
          </p>
        </details>
        <details>
          <summary>How do the daylight themes work?</summary>
          <p>
            Nou uses the selected location’s sunrise and sunset times to choose its light or dark
            theme. You can choose a permanent light or dark appearance in preferences.
          </p>
        </details>
        <details>
          <summary>Can I use Nou offline?</summary>
          <p>
            After your first visit, Nou saves the app and your last weather reading on this device.
            It displays an offline notice and the reading’s update time. New readings and map tiles
            need a connection.
          </p>
        </details>
        <details>
          <summary>Can Nou read the day to me?</summary>
          <p>
            Choose Ember, Luna, Nova, or Sage in the welcome tour or voice settings. Listen to today
            reads a summary of your actual weather on this device and lets you save WAV audio.
            Download a voice for offline use: the shared engine is about 110 MB, with extra voices
            about 0.5 MB each. These are AI voices powered by{" "}
            <a href="https://github.com/hexgrad/kokoro">Kokoro</a>. No microphone or speech API is
            needed. You can replay the welcome tour from settings.
          </p>
        </details>
        <details>
          <summary>What happens to my location and preferences?</summary>
          <p>
            Saved places and preferences stay in your browser on this device. Location access is
            requested only when you choose “Use my current location.” Coordinates are sent to the
            weather and reverse-geocoding services to return local results.
          </p>
        </details>
      </section>
      <section className="story-sources">
        <span className="overline">REAL SOURCES. CLEAR CREDIT.</span>
        <a href="https://open-meteo.com/">
          Weather & air quality · Open-Meteo <ArrowUpRightIcon size={18} aria-hidden="true" />
        </a>
        <a href="https://www.openstreetmap.org/copyright">
          Maps · OpenStreetMap <ArrowUpRightIcon size={18} aria-hidden="true" />
        </a>
        <a href="https://www.rainviewer.com/">
          Rain radar · RainViewer <ArrowUpRightIcon size={18} aria-hidden="true" />
        </a>
      </section>
      <footer className="story-footer">
        <span>{BRAND.tagline}</span>
        <div>
          <a href="/brand/brand-guide.svg" className="brand-download">
            Brand guide
          </a>
          <a href="/llms.txt">For AI assistants</a>
          <a href={BRAND.repository}>GitHub</a>
        </div>
      </footer>
    </main>
  );
}
