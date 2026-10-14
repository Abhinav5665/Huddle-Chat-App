import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getMessages } from "../controllers/messagecontroller.js";

const router = Router();

router.get("/:roomId", authMiddleware, getMessages);

export { router as messageRoutes };