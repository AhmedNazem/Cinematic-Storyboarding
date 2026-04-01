import "dotenv/config";
import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { prisma } from "./lib/db/client";
import { errorHandler } from "./middleware/error-handler";
import { publicRateLimit } from "./middleware/rate-limit";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// ─── Global Middleware (order matters per AXIOM) ───
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(publicRateLimit);

// ─── Health Checks ───
app.get("/health/live", (_req: Request, res: Response) => {
  res.status(200).json({ status: "alive" });
});

app.get("/health/ready", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready", db: "connected" });
  } catch {
    res.status(503).json({ status: "not ready", db: "disconnected" });
  }
});

// ─── API Routes (Phase 2 — will be mounted here) ───
// app.use("/api/organizations", organizationRoutes);
// app.use("/api/projects", projectRoutes);

// ─── Socket.IO Namespaces ───
const studioNamespace = io.of("/studio");
studioNamespace.on("connection", (socket) => {
  console.log("Client connected to /studio namespace");
  socket.on("disconnect", () => {
    console.log("Client disconnected from /studio");
  });
});

// ─── Centralized Error Handler (MUST be last) ───
app.use(errorHandler);

// ─── Start Server ───
httpServer.listen(PORT, () => {
  console.log(
    `[server]: AXIOM BFF Backend is running at http://localhost:${PORT}`,
  );
});
