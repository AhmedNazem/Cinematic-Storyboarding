import * as Sentry from "@sentry/node";

const SENTRY_DSN = process.env.SENTRY_DSN;
const isProd = process.env.NODE_ENV === "production";

export function initSentry(): void {
  if (!SENTRY_DSN) {
    // Sentry is opt-in — skip silently in dev if DSN is not set
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",

    // Performance tracing: 10% in prod, 100% in dev/staging
    tracesSampleRate: isProd ? 0.1 : 1.0,

    // Strip PII before events are sent
    beforeSend(event) {
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
        delete event.user.username;
      }
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
        delete event.request.headers["x-csrf-token"];
      }
      return event;
    },
  });
}

export { Sentry };
