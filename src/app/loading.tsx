export default function Loading() {
  return (
    <main className="initial-state" style={{ minHeight: "100dvh", justifyContent: "center" }}>
      <svg
        className="initial-logo"
        width="46"
        height="46"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="16" cy="16" r="6" fill="currentColor" />
        <path
          d="M16 2v4M16 26v4M2 16h4M26 16h4M6 6l3 3M23 23l3 3M6 26l3-3M23 9l3-3"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <h2>nou.</h2>
      <p role="status">A moment for your weather.</p>
    </main>
  );
}
