import express from "express";
import { startWebSocketServer } from "./websocket/wsServer.js";
import roomRoutes from "./routes/roomRoutes.js";


import authRoutes from "./routes/authRoutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

// Start Express server
app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

// Start WebSocket server
startWebSocketServer();

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }
  next(err);
});