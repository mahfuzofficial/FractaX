import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";
import bcrypt from "bcryptjs";

// ── Get full profile ──────────────────────────────────

export async function getFullProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      kycStatus: true,
      walletBalance: true,
      walletAddress: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      profession: true,
      education: true,
      avatarUrl: true,
      createdAt: true,
      kyc: {
        select: {
          status: true,
          documentType: true,
          cloudinaryUrl: true,
          adminNote: true,
          reviewedAt: true,
          createdAt: true,
        },
      },
      paymentMethods: true,
      _count: {
        select: {
          assets: true,
          ownerships: true,
          buyTxns: true,
        },
      },
    },
  });

  if (!user) throw new ApiError(404, "User not found");

  // Calculate total earned from resales
  const resaleTxns = await prisma.transaction.findMany({
    where: { sellerId: userId, txType: "RESALE", status: "BLOCKCHAIN_CONFIRMED" },
    select: { totalAmount: true },
  });

  const totalEarned = resaleTxns.reduce(
    (sum, tx) => sum + Number(tx.totalAmount),
    0
  );

  return { ...user, totalEarned };
}

// ── Update personal info ──────────────────────────────

export async function updatePersonalInfo(
  userId: string,
  data: {
    fullName?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    profession?: string;
    education?: string;
  }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      fullName: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      profession: true,
      education: true,
    },
  });
}

// ── Update email ──────────────────────────────────────

export async function updateEmail(userId: string, email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new ApiError(401, "Incorrect password");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    throw new ApiError(409, "Email already in use");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { email },
    select: { id: true, email: true },
  });
}

// ── Change password ───────────────────────────────────

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new ApiError(401, "Current password is incorrect");

  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

// ── Update avatar ─────────────────────────────────────

export async function updateAvatar(userId: string, buffer: Buffer) {
  const { url, publicId } = await uploadToCloudinary(buffer, "rwa-avatars");

  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: url, avatarId: publicId },
    select: { id: true, avatarUrl: true },
  });
}

// ── Update wallet address ─────────────────────────────

export async function updateWalletAddr(userId: string, walletAddress: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { walletAddress },
    select: { id: true, walletAddress: true },
  });
}

// ── Payment methods ───────────────────────────────────

export async function addPaymentMethod(
  userId: string,
  data: {
    type: "BANK" | "UPI";
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    branch?: string;
    upiId?: string;
  }
) {
  if (data.type === "BANK") {
    if (!data.accountHolderName || !data.accountNumber || !data.ifscCode || !data.bankName) {
      throw new ApiError(400, "Account holder name, account number, IFSC and bank name are required");
    }
  }
  if (data.type === "UPI") {
    if (!data.upiId) throw new ApiError(400, "UPI ID is required");
  }

  return prisma.paymentMethod.create({
    data: { userId, ...data },
  });
}

export async function updatePaymentMethod(
  id: string,
  userId: string,
  data: Partial<{
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    branch: string;
    upiId: string;
    isDefault: boolean;
  }>
) {
  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method) throw new ApiError(404, "Payment method not found");
  if (method.userId !== userId) throw new ApiError(403, "Not your payment method");

  return prisma.paymentMethod.update({ where: { id }, data });
}

export async function deletePaymentMethod(id: string, userId: string) {
  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method) throw new ApiError(404, "Payment method not found");
  if (method.userId !== userId) throw new ApiError(403, "Not your payment method");

  await prisma.paymentMethod.delete({ where: { id } });
}

export async function setDefaultPaymentMethod(id: string, userId: string) {
  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method) throw new ApiError(404, "Payment method not found");
  if (method.userId !== userId) throw new ApiError(403, "Not your payment method");

  // Remove default from all
  await prisma.paymentMethod.updateMany({
    where: { userId },
    data: { isDefault: false },
  });

  // Set new default
  return prisma.paymentMethod.update({
    where: { id },
    data: { isDefault: true },
  });
}