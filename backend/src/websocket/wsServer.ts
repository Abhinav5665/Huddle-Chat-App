import { WebSocketServer, WebSocket } from "ws";
import { handleMessage } from "./wsHandler.js";
import { removeClient, getClientBySocket, getClientsInRoom } from "./roomManager.js";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { IncomingMessage } from "http";

export function startWebSocketServer() {
  const wss = new WebSocketServer({ port: 8080 });

  console.log("WebSocket server started on port 8080");

  wss.on("connection", async (socket: WebSocket, request: IncomingMessage) => {
    console.log("New client connected");

    // Step 1 — Get token from URL
    // URL looks like: ws://localhost:8080?token=eyJhbGci...
    const url = new URL(request.url!, "ws://localhost:8080");
    const token = url.searchParams.get("token");

    // Step 2 — Reject if no token
    if (!token) {
      socket.close(1008, "No token provided");
      return;
    }

    // Step 3 — Verify token
    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        userId: string;
      };
      userId = decoded.userId;
    } catch (error) {
      socket.close(1008, "Invalid token");
      return;
    }

    // Step 4 — Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      socket.close(1008, "User not found");
      return;
    }

    console.log(`${user.username} connected`);

    // Step 5 — Handle messages
    socket.on("message", (rawMessage) => {
      handleMessage(socket, rawMessage.toString(), user.username);
    });

    // Step 6 — Handle disconnect
    socket.on("close", () => {
      console.log(`${user.username} disconnected`);
      const leavingClient = getClientBySocket(socket);
      removeClient(socket);

      if (leavingClient) {
        const roomMembers = getClientsInRoom(leavingClient.roomId);
        roomMembers.forEach((client) => {
          client.socket.send(
            JSON.stringify({
              type: "USER_LEFT",
              payload: {
                username: leavingClient.username,
                message: `${leavingClient.username} left the room`,
              },
            })
          );
        });
      }
    });

    // Step 7 — Handle errors
    socket.on("error", (error) => {
      console.log("Socket error:", error);
      removeClient(socket);
    });
  });
}