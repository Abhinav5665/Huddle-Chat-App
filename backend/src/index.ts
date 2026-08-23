import express from "express";
import { startWebSocketServer } from "./websocket/wsServer.js";
import authRoutes from "./routes/authRoutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Start Express server
app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

// Start WebSocket server
startWebSocketServer();