import { WebSocket } from "ws";
import type { IncomingMessage } from "../types/index.js";
import { AddClient, getClientBySocket, getClientsInRoom, removeClientsInRoom } from "./roomManager.js";
import prisma from "../config/db.js";
import { publisher, subscriber } from "../config/redis.js";

export async  function handleMessage(socket: WebSocket, rawMessage: string,username: string) {
  
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

    await handleJoin(socket, data.payload.roomId, username);
    return;
  }

  if (data.type === "chat") {
    await handleChat(socket, data.payload.message, username);
    return;
  }

  if (data.type === "typing") {
    await handleTyping(socket, username);
  return;
}

if (data.type === "stop_typing") {
  handleStopTyping(socket, username);
  return;
}
}


async function handleJoin(socket: WebSocket, roomId: string, username: string) {
  roomId = String(roomId ?? "").trim().toUpperCase();

  // 1. Verify the room exists and get its owner
  let room;
  try {
    room = await prisma.room.findUnique({
      where: { roomId },
      select: {
        roomName: true,
        createdBy: { select: { username: true } },
      },
    });
  } catch (error) {
    console.log("Failed to look up room:", error);
    socket.send(JSON.stringify({ type: "ERROR", message: "Could not join room" }));
    return;
  }

  if (!room) {
    socket.send(JSON.stringify({ type: "ERROR", message: "Room not found" }));
    return;
  }

  // 2. Get everyone BEFORE adding the new person
  const onlineUsers = getClientsInRoom(roomId).map((c) => c.username);

  AddClient(socket, roomId, username);
  await subscriber.subscribe(roomId);

  let messageHistory: any[] = [];
let hasMore = false;
try {
  const rows = await prisma.message.findMany({
    where: { room: { roomId } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51,
    include: { sender: { select: { username: true } } },
  });
  hasMore = rows.length > 50;
  messageHistory = rows
    .slice(0, 50)
    .reverse()
    .map((msg) => ({
      id: msg.id,
      username: msg.sender.username,
      message: msg.text,
      timestamp: msg.createdAt,
    }));
} catch (error) {
  console.log("Failed to fetch message history:", error);
}

  socket.send(
    JSON.stringify({
      type: "JOINED",
      payload: {
        roomId,
        roomName: room.roomName,
        createdBy: room.createdBy.username, // owner badge
        username,
        message: `You joined room ${roomId} as ${username}`,
        onlineUsers,
        messageHistory,
        hasMore,
      },
    })
  );

  await publisher.publish(
    roomId,
    JSON.stringify({
      type: "USER_JOINED",
      payload: { username, message: `${username} joined the room` },
    })
  );
}

async function handleChat(socket: WebSocket, message: string, username: string) {
  
  const sender = getClientBySocket(socket);

  if (!sender) {
    socket.send(
      JSON.stringify({ type: "ERROR", message: "You are not in a room yet, join a room first" })
    );
    return;
  }

  // Save message to database
  try {
    await prisma.message.create({
      data: {
        text: message,
        sender: { connect: { username: username } },
        room: { connect: { roomId: sender.roomId } }
      }
    });
  } catch (error) {
    console.log("Failed to save message:", error);
  }

  // Publish to Redis channel instead of broadcasting directly
  await publisher.publish(sender.roomId, JSON.stringify({
    type: "CHAT",
    payload: {
      username,
      message,
      timestamp: new Date().toISOString(),
    }
  }));
}




function handleTyping(socket: WebSocket,username: string) {
  const sender = getClientBySocket(socket);
  if (!sender) return;

  const roomMembers = getClientsInRoom(sender.roomId);

  roomMembers.forEach((client) => {
    if (client.socket !== socket) {
      client.socket.send(
        JSON.stringify({
          type: "TYPING",
          payload: {
            username: username,
          },
        })
      );
    }
  });
}

function handleStopTyping(socket: WebSocket, username: string) {
  const sender = getClientBySocket(socket);
  if (!sender) return;

  const roomMembers = getClientsInRoom(sender.roomId);

  roomMembers.forEach((client) => {
    if (client.socket !== socket) {
      client.socket.send(
        JSON.stringify({
          type: "STOP_TYPING",
          payload: {
            username: username,
          },
        })
      );
    }
  });
}


// Listen for messages from Redis and deliver to clients in that room
subscriber.on("message", (channel, message) => {
  // Deliver to everyone on this server in that room
  getClientsInRoom(channel).forEach((client) => {
    client.socket.send(message);
  });

  // If the room was deleted, clean up this server's state
  try {
    const parsed = JSON.parse(message);
    if (parsed.type === "ROOM_DELETED") {
      removeClientsInRoom(channel);
      subscriber.unsubscribe(channel);
    }
  } catch {
    // ignore malformed messages
  }
});