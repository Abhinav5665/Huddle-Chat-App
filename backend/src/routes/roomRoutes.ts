import { Router } from "express";
import { createRoom, joinRoom, getRooms } from "../controllers/roomController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/create", authMiddleware, createRoom);
router.post("/join", authMiddleware, joinRoom);
router.get("/", authMiddleware, getRooms);

export default router;