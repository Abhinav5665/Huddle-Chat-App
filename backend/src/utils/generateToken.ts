import jwt from "jsonwebtoken";

export function generateToken(userId: string): string {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
}