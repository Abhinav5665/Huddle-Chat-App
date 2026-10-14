import type { Request, Response } from "express";
import { randomBytes } from "crypto";
import prisma from "../config/db.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import { publisher } from "../config/redis.js";

// 32 characters (no I, O, 0, 1 to avoid look-alikes).
// 256 is divisible by 32, so `byte % 32` has no modulo bias.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

function generateRoomCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return code;
}

// Create a room
export async function createRoom(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { isPrivate, roomName } = req.body;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!roomName || !roomName.trim()) {
      res.status(400).json({ message: "Room name is required" });
      return;
    }

    // Retry if the generated code collides with an existing one (P2002)
    let room = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        room = await prisma.room.create({
          data: {
            roomId: generateRoomCode(),
            roomName: roomName.trim(),
            createdById: userId,
            isPrivate: isPrivate ?? false,
          },
        });
        break;
      } catch (err: any) {
        if (err?.code !== "P2002") throw err;
      }
    }

    if (!room) {
      res.status(500).json({ message: "Could not generate a unique room code" });
      return;
    }

    res.status(201).json({
      message: "Room created successfully",
      roomId: room.roomId,
      roomName: room.roomName,
      isPrivate: room.isPrivate,
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}

// Join a room
export async function joinRoom(req: AuthRequest, res: Response) {
  try {
    const roomId = String(req.body.roomId ?? "").trim().toUpperCase();

    if (!roomId) {
      res.status(400).json({ message: "Room code is required" });
      return;
    }

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { createdBy: { select: { username: true } } },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    res.status(200).json({
      message: "Room found",
      roomId: room.roomId,
      roomName: room.roomName,
      isPrivate: room.isPrivate,
      createdBy: room.createdBy.username, // for the owner badge (Feature 3)
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}

// Public rooms (unchanged)
export async function getRooms(req: Request, res: Response) {
  try {
    const rooms = await prisma.room.findMany({
      where: { isPrivate: false },
      include: {
        createdBy: { select: { username: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}

// Rooms created by the logged-in user (public AND private)
export async function getMyRooms(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const rooms = await prisma.room.findMany({
      where: { createdById: userId },
      select: {
        roomId: true,
        roomName: true,
        isPrivate: true,
        createdAt: true,
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}

// Delete a room (owner only)
export async function deleteRoom(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const roomId = String(req.params.roomId ?? "").trim().toUpperCase();

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!roomId || roomId.length > 20) {
      res.status(400).json({ message: "Invalid room code" });
      return;
    }

    const room = await prisma.room.findUnique({
      where: { roomId },
      select: { roomId: true, createdById: true },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.createdById !== userId) {
      res.status(403).json({ message: "Only the room owner can delete this room" });
      return;
    }

    try {
      await prisma.room.delete({ where: { roomId: room.roomId } });
    } catch (err: any) {
      // P2025: record was already deleted between our check and the delete
      if (err?.code === "P2025") {
        res.status(404).json({ message: "Room not found" });
        return;
      }
      throw err;
    }

    // The room is gone from the DB at this point. A notification failure
    // must not turn a successful delete into an error response.
    try {
      await publisher.publish(
        room.roomId,
        JSON.stringify({
          type: "ROOM_DELETED",
          payload: {
            roomId: room.roomId,
            message: "This room was deleted by its owner",
          },
        })
      );
    } catch (err) {
      console.error("Room deleted but ROOM_DELETED publish failed:", err);
    }

    res.status(200).json({ message: "Room deleted" });
  } catch (error) {
    console.error("deleteRoom failed:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}