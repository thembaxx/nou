import { NouMark, NouWordmark } from "@/components/brand-mark";

export default function Loading() {
  return (
    <main
      id="main-content"
      className="initial-state"
      style={{ minHeight: "100dvh", justifyContent: "center" }}
    >
      <NouMark className="initial-logo" size={46} />
      <h2 aria-label="Nou">
        <NouWordmark />
      </h2>
      <p role="status">A moment for your weather.</p>
    </main>
  );
}
