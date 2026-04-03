import express from "express";
import cookieParser from "cookie-parser";
import { json } from "express";
import { correlationId } from "../../../middleware/correlation-id";
import { csrfProtection } from "../../../middleware/csrf";
import { errorHandler } from "../../../middleware/error-handler";
import assetRoutes from "../../../routes/asset.routes";

export function buildAssetTestApp() {
  const app = express();
  app.use(cookieParser());
  app.use(json());
  app.use(correlationId);
  app.use(csrfProtection);
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/assets", assetRoutes);
  app.use(errorHandler);
  return app;
}
