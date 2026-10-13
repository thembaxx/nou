"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main
      id="main-content"
      className="initial-state"
      style={{ minHeight: "100dvh", justifyContent: "center" }}
    >
      <h2>A little pause.</h2>
      <p>Today’s weather couldn’t load. Let’s give it another moment.</p>
      <button className="primary-button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
