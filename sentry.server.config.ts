import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions in production; 100% in development.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
