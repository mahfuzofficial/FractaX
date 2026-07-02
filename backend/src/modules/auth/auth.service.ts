import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";

// ── Token helpers ─────────────────────────────────────

export const generateAccessToken = (user: {
  id: string;
  role: string;
  kycStatus: string;
}) => {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(
    { id: user.id, role: user.role, kycStatus: user.kycStatus },
    env.JWT_ACCESS_SECRET,
    options
  );
};

export const generateRefreshToken = (userId: string) => {
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(
    { id: userId },
    env.JWT_REFRESH_SECRET,
    options
  );
};

// ── Register ──────────────────────────────────────────

export const registerUser = async (
  email: string,
  password: string,
  fullName: string
) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "Email already registered");

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, passwordHash, fullName },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      kycStatus: true,
    },
  });

  return user;
};

// ── Login ─────────────────────────────────────────────

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(401, "Invalid credentials");

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new ApiError(401, "Invalid credentials");

  const accessToken = generateAccessToken({
    id: user.id,
    role: user.role,
    kycStatus: user.kycStatus,
  });

  const refreshToken = generateRefreshToken(user.id);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      kycStatus: user.kycStatus,
    },
  };
};

// ── Refresh ───────────────────────────────────────────

export const refreshAccessToken = async (refreshToken: string) => {
  let decoded: { id: string };
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, "Refresh token expired or revoked");
  }

  const newAccessToken = generateAccessToken({
    id: stored.user.id,
    role: stored.user.role,
    kycStatus: stored.user.kycStatus,
  });

  return { accessToken: newAccessToken };
};

// ── Logout ────────────────────────────────────────────

export const logoutUser = async (
  accessToken: string,
  refreshToken: string
) => {
  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });
};