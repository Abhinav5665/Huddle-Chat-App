import express from "express";
import { startWebSocketServer } from "./websocket/wsServer.js";
import roomRoutes from "./routes/roomRoutes.js";
import { messageRoutes } from "./routes/messageRoutes.js";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);

// Start Express server
app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

// Start WebSocket server
startWebSocketServer();

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong" });
});