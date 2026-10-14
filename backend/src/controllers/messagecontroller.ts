import type { Response } from "express";
import prisma from "../config/db.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

export async function getMessages(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const roomId = String(req.params.roomId ?? "").toUpperCase();
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 50, 1), 100);

    const room = await prisma.room.findUnique({ where: { roomId }, select: { id: true } });
    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    // Fetch one extra row to know whether older messages remain
    const rows = await prisma.message.findMany({
      where: { roomId: room.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: { sender: { select: { username: true } } },
    });

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse(); // oldest first

    res.status(200).json({
      messages: page.map((m) => ({
        id: m.id,
        username: m.sender.username,
        message: m.text,
        timestamp: m.createdAt,
      })),
      hasMore,
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}