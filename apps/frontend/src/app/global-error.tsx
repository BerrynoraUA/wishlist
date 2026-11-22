"use client";

// Replaces the root layout when it fails, so no providers, translations, or
// global styles are available here.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "64px 24px" }}
      >
        <h1 style={{ fontSize: 20 }}>Something went wrong.</h1>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  );
}
