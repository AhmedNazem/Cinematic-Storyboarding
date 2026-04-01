import "dotenv/config";
import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { prisma } from "./lib/db/client";
import { errorHandler } from "./middleware/error-handler";
import { publicRateLimit } from "./middleware/rate-limit";
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
  console.log("Client connected to /studio namespace");
  socket.on("disconnect", () => {
    console.log("Client disconnected from /studio");
  });
});

// ─── Centralized Error Handler (MUST be last) ───
app.use(errorHandler);

// ─── Start Server ───
httpServer.listen(PORT, async () => {
  console.log(
    `[server]: AXIOM BFF Backend is running at http://localhost:${PORT}`,
  );

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("[database]: ✅ Connected to Neon PostgreSQL");
  } catch (err) {
    console.error("[database]: ❌ Failed to connect", err);
  }
});
