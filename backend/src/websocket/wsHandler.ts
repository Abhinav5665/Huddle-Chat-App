import { WebSocket } from "ws";
import type { IncomingMessage } from "../types/index.js";
import { AddClient, getClientBySocket, getClientsInRoom } from "./roomManager.js";

export function handleMessage(socket: WebSocket, rawMessage: string) {
  
  // Error handling — if JSON is broken, don't crash
  let data: IncomingMessage;
  try {
    data = JSON.parse(rawMessage);
  } catch (e) {
    socket.send(JSON.stringify({ type: "ERROR", message: "Invalid JSON" }));
    return;
  }

  // Route to the right handler based on message type
  if (data.type === "join") {
    handleJoin(socket, data.payload.roomId, data.payload.username);
    return;
  }

  if (data.type === "chat") {
    handleChat(socket, data.payload.message);
    return;
  }

  if (data.type === "typing") {
  handleTyping(socket);
  return;
}

if (data.type === "stop_typing") {
  handleStopTyping(socket);
  return;
}
}


function handleJoin(socket: WebSocket, roomId: string, username: string) {
  
  
  const roomMembers = getClientsInRoom(roomId);
  const onlineUsers = roomMembers.map((client) => client.username);
  
  AddClient(socket, roomId, username);
// Send confirmation + who's already online
socket.send(
  JSON.stringify({
    type: "JOINED",
    payload: {
      roomId,
      username,
      message: `You joined room ${roomId} as ${username}`,
      onlineUsers, // ← this is new
    },
  })
);

  // Tell everyone else in the room someone joined
  
  roomMembers.forEach((client) => {
    if (client.socket !== socket) {
      client.socket.send(
        JSON.stringify({
          type: "USER_JOINED",
          payload: {
            username,
            message: `${username} joined the room`,
          },
        })
      );
    }
  });
}

// When someone sends a chat message
function handleChat(socket: WebSocket, message: string) {
  
  // Find out who sent this
  const sender = getClientBySocket(socket);

  if (!sender) {
    socket.send(
      JSON.stringify({ type: "ERROR", message: "You are not in a room yet, join a room first" })
    );
    return;
  }

  // Get everyone in the same room
  const roomMembers = getClientsInRoom(sender.roomId);

  // Broadcast to everyone in the room including sender
  roomMembers.forEach((client) => {
    client.socket.send(
      JSON.stringify({
        type: "CHAT",
        payload: {
          username: sender.username,
          message,
          timestamp: new Date().toISOString(),
        },
      })
    );
  });
}




function handleTyping(socket: WebSocket) {
  const sender = getClientBySocket(socket);
  if (!sender) return;

  const roomMembers = getClientsInRoom(sender.roomId);

  roomMembers.forEach((client) => {
    if (client.socket !== socket) {
      client.socket.send(
        JSON.stringify({
          type: "TYPING",
          payload: {
            username: sender.username,
          },
        })
      );
    }
  });
}

function handleStopTyping(socket: WebSocket) {
  const sender = getClientBySocket(socket);
  if (!sender) return;

  const roomMembers = getClientsInRoom(sender.roomId);

  roomMembers.forEach((client) => {
    if (client.socket !== socket) {
      client.socket.send(
        JSON.stringify({
          type: "STOP_TYPING",
          payload: {
            username: sender.username,
          },
        })
      );
    }
  });
}