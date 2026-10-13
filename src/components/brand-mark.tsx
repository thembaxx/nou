import { MARK_PATH } from "@/lib/brand";
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from "@/lib/wordmark-path";

export function NouMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path d={MARK_PATH} fill="currentColor" />
      <circle cx="16" cy="22.5" r="2" fill="currentColor" />
      <path d="M6 29h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function NouWordmark({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "brand-wordmark"}
      viewBox={WORDMARK_VIEWBOX}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={WORDMARK_PATH} />
    </svg>
  );
}
