import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!dsn && process.env.NODE_ENV !== "test") {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[Sentry] NEXT_PUBLIC_SENTRY_DSN is not set — error reporting is disabled.");
  }
}

Sentry.init({
  dsn,

  // Replay may only be enabled for the client-side rendering.
  integrations: [Sentry.replayIntegration()],

  // Capture 10% of transactions in production; 100% in development.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture Replay for 10% of all sessions, plus for 100% of sessions with an error.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
