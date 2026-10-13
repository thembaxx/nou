import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="initial-state"
      style={{ minHeight: "100dvh", justifyContent: "center" }}
    >
      <h2>A little off the map.</h2>
      <p>This page doesn’t exist, but today is right here.</p>
      <Link className="primary-button" href="/">
        Back to today
      </Link>
    </main>
  );
}
