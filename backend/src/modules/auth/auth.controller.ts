import { Request, Response } from "express";
import { z } from "zod";
import { registerUser, loginUser, refreshAccessToken, logoutUser } from "./auth.service";

const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name required"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response) {
  const body = registerSchema.parse(req.body);
  const user = await registerUser(body.email, body.password, body.fullName);
  res.status(201).json({ success: true, message: "Account created", data: user });
}

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);
  const result = await loginUser(body.email, body.password);
  res.json({ success: true, data: result });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = z
    .object({ refreshToken: z.string().min(1) })
    .parse(req.body);
  const result = await refreshAccessToken(refreshToken);
  res.json({ success: true, data: result });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = z
    .object({ refreshToken: z.string().min(1) })
    .parse(req.body);
  const accessToken = req.headers.authorization?.split(" ")[1] ?? "";
  await logoutUser(accessToken, refreshToken);
  res.json({ success: true, message: "Logged out successfully" });
}