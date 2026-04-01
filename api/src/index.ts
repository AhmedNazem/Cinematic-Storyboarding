import "dotenv/config";
import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { prisma } from "./lib/db/client";
import { errorHandler } from "./middleware/error-handler";
import { publicRateLimit, applySocketRateLimit } from "./middleware/rate-limit";
import { correlationId } from "./middleware/correlation-id";
import { cspWithNonce } from "./middleware/csp";
import { csrfProtection } from "./middleware/csrf";
import { logger } from "./lib/utils/logger";
import { generateToken } from "./lib/auth/jwt";

// ─── Route Imports ───
import organizationRoutes from "./routes/organization.routes";
import userRoutes from "./routes/user.routes";
import projectRoutes from "./routes/project.routes";
import sequenceRoutes from "./routes/sequence.routes";
import shotRoutes from "./routes/shot.routes";

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

// ─── Global Middleware (order per AXIOM) ───
app.use(
  helmet({
    // CSP is handled by cspWithNonce below (nonce must be generated per-request)
    contentSecurityPolicy: false,
    hsts: {
      maxAge: 31_536_000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
  }),
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(cspWithNonce);
app.use(express.json({ limit: "10mb" }));
app.use(correlationId);
app.use(publicRateLimit);
app.use(csrfProtection);

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

// ─── Dev Token Generator (remove in production) ───
if (process.env.NODE_ENV !== "production") {
  app.post("/dev/token", async (req: Request, res: Response) => {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, orgId: true, role: true },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const token = generateToken({
      sub: user.id,
      orgId: user.orgId,
      role: user.role,
    });
    res.json({ token, user });
  });
}

// ─── API Routes ───
app.use("/api/organizations", organizationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", sequenceRoutes); // Hybrid: /api/projects/:projectId/sequences + /api/sequences/:id
app.use("/api", shotRoutes);     // Hybrid: /api/sequences/:sequenceId/shots + /api/shots/:id

// ─── Socket.IO Namespaces ───
const studioNamespace = io.of("/studio");
studioNamespace.on("connection", (socket) => {
  applySocketRateLimit(socket, { limit: 60, windowMs: 10_000 }); // 60 events / 10s per socket
  logger.info("Socket connected", { namespace: "/studio", socketId: socket.id });
  socket.on("disconnect", () => {
    logger.info("Socket disconnected", { namespace: "/studio", socketId: socket.id });
  });
});

// ─── Centralized Error Handler (MUST be last) ───
app.use(errorHandler);

// ─── Start Server ───
httpServer.listen(PORT, async () => {
  logger.info("AXIOM BFF Backend started", { port: PORT });

  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connected", { provider: "Neon PostgreSQL" });
  } catch (err) {
    logger.error("Database connection failed", { error: String(err) });
  }
});
