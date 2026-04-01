import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// 1. Helmet for Security Headers
app.use(helmet());

// 2. CORS setup
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);

// 3. Body Parsing
app.use(express.json());

// Routes
app.get("/health/live", (req: Request, res: Response) => {
  res.status(200).json({ status: "alive" });
});

// Basic Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

// Socket.io namespaces structure based on AXIOM
const studioNamespace = io.of("/studio");
studioNamespace.on("connection", (socket) => {
  console.log("Client connected to /studio namespace");
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

httpServer.listen(PORT, () => {
  console.log(
    `[server]: AXIOM BFF Backend is running at http://localhost:${PORT}`,
  );
});
