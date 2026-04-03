/**
 * Test app builder — real routes, real middleware, no rate limiting or Sentry.
 * Used by all integration tests via supertest.
 */
import express from "express";
import cookieParser from "cookie-parser";
import { json } from "express";
import { correlationId } from "../../../middleware/correlation-id";
import { csrfProtection } from "../../../middleware/csrf";
import { errorHandler } from "../../../middleware/error-handler";
import organizationRoutes from "../../../routes/organization.routes";
import userRoutes from "../../../routes/user.routes";
import projectRoutes from "../../../routes/project.routes";
import sequenceRoutes from "../../../routes/sequence.routes";
import shotRoutes from "../../../routes/shot.routes";

export function buildTestApp() {
  const app = express();

  // cookieParser must precede csrfProtection (reads req.cookies)
  app.use(cookieParser());
  app.use(json());
  app.use(correlationId);
  app.use(csrfProtection);
  // Rate limiting intentionally omitted — would throttle rapid test runs

  // Used by csrf helper to obtain the csrf-token cookie
  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/organizations", organizationRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api", sequenceRoutes); // /api/projects/:id/sequences + /api/sequences/:id
  app.use("/api", shotRoutes);     // /api/sequences/:id/shots + /api/shots/:id

  app.use(errorHandler);
  return app;
}
