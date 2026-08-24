import type { Request, Response } from "express";
import prisma from "../config/db.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

// Generate a random room code like "X7K2P"
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Create a room
export async function createRoom(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Generate unique room code
    const roomId = generateRoomCode();

    // Create room in database
    const room = await prisma.room.create({
      data: {
        roomId,
        createdById: userId,
        isPrivate: req.body.isPrivate ?? false,
      },
    });

    res.status(201).json({
      message: "Room created successfully",
      roomId: room.roomId,
      isPrivate: room.isPrivate,
    });

  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}

// Join a room
export async function joinRoom(req: AuthRequest, res: Response) {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      res.status(400).json({ message: "Room code is required" });
      return;
    }

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { roomId },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    res.status(200).json({
      message: "Room found",
      roomId: room.roomId,
      isPrivate: room.isPrivate,
    });

  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}

// Get all public rooms
export async function getRooms(req: Request, res: Response) {
  try {
    const rooms = await prisma.room.findMany({
      where: { isPrivate: false },
      include: {
        createdBy: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ rooms });

  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}