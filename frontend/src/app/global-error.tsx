'use client' // Error boundaries must be Client Components

/**
 * Root-level error boundary. Replaces the entire app (including the root
 * layout) when an uncaught exception escapes — e.g. a route chunk failing to
 * load on a flaky mobile connection. Shows a friendly retry instead of a
 * dead page. Must define its own <html>/<body> because the root layout is
 * replaced when this renders.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#04070f",
          color: "#e8f4ff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "420px" }}>
          <p
            style={{
              fontSize: "0.72rem",
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "#00e5ff",
              marginBottom: "12px",
            }}
          >
            SL Tech Radar
          </p>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>
            Something didn&apos;t load right
          </h1>
          <p style={{ color: "#8fa3bf", fontSize: "0.9rem", marginBottom: "24px" }}>
            {error?.message
              ? `(${error.message.slice(0, 120)})`
              : "The page hit a snag — usually a hiccup in the connection."}{" "}
            Your data is safe.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "12px 28px",
                borderRadius: "999px",
                border: "none",
                background: "#00e5ff",
                color: "#04070f",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/sl-tech-radar/")}
              style={{
                padding: "12px 28px",
                borderRadius: "999px",
                border: "1px solid rgba(0,229,255,0.4)",
                background: "transparent",
                color: "#00e5ff",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
