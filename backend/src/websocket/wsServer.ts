import { WebSocketServer, WebSocket } from "ws";
import { handleMessage } from "./wsHandler.js";
import { getClientsInRoom,getClientBySocket, removeClient } from "./roomManager.js";

export function startWebSocketServer() {
  const wss = new WebSocketServer({ port: 8080 });

  console.log("WebSocket server started on port 8080");

  wss.on("connection", (socket: WebSocket) => {
    console.log("New client connected");

    // When a message comes in, pass it to the handler
    socket.on("message", (rawMessage) => {
      handleMessage(socket, rawMessage.toString());
    });

    // When a client disconnects, remove them from the room
   socket.on("close", () => {
  console.log("Client disconnected");

  // Get their info before removing
  const leavingClient = getClientBySocket(socket);

  // Remove them from the Map
  removeClient(socket);

  // Tell everyone in the room they left
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

    // Handle any socket errors
    socket.on("error", (error) => {
      console.log("Socket error:", error);
      removeClient(socket);
    });
  });
}