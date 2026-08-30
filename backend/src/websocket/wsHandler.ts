import { WebSocket } from "ws";
import type { IncomingMessage } from "../types/index.js";
import { AddClient, getClientBySocket, getClientsInRoom } from "./roomManager.js";
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
    handleJoin(socket, data.payload.roomId, username);
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

  // Get everyone BEFORE adding the new person
  const roomMembers = getClientsInRoom(roomId);
  const onlineUsers = roomMembers.map((client) => client.username);

  // Now add the new person
  AddClient(socket, roomId, username);

   await subscriber.subscribe(roomId);

let messageHistory: any[] = [];
try {
  const messages = await prisma.message.findMany({
    where: { room: { roomId: roomId } },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      sender: {
        select: { username: true }
      }
    }
  });
  messageHistory = messages.map((msg) => ({
    username: msg.sender.username,
    message: msg.text,
    timestamp: msg.createdAt,
  }));
} catch (error) {
  console.log("Failed to fetch message history:", error);
}

  // Send confirmation + online users + message history
  socket.send(
    JSON.stringify({
      type: "JOINED",
      payload: {
        roomId,
        username,
        message: `You joined room ${roomId} as ${username}`,
        onlineUsers,
        messageHistory,
        
      },
    })
  );

  // Tell everyone else someone joined
 await publisher.publish(roomId, JSON.stringify({
  type: "USER_JOINED",
  payload: {
    username,
    message: `${username} joined the room`,
  },
}));
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
  const roomMembers = getClientsInRoom(channel);
  
  roomMembers.forEach((client) => {
    client.socket.send(message);
  });
});