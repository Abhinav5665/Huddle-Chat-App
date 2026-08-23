

import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import { generateToken } from "../utils/generateToken.js";

// Signup
export async function signup(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      res.status(400).json({ message: "Username already taken" });
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    // Return token
    res.status(201).json({
      message: "User created successfully",
      token: generateToken(user.id),
      username: user.username,
    });

  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}

// Login
export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(400).json({ message: "Invalid username or password" });
      return;
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(400).json({ message: "Invalid username or password" });
      return;
    }

    // Return token
    res.status(200).json({
      message: "Login successful",
      token: generateToken(user.id),
      username: user.username,
    });

  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}