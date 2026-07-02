import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";

export async function getMe(userId: string) {
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
      createdAt: true,
    },
  });
  if (!user) throw new ApiError(404, "User not found");
  return user;
}

export async function getMyOwnerships(userId: string) {
  return prisma.shareOwnership.findMany({
    where: { userId },
    include: {
      asset: {
        select: {
          id: true,
          title: true,
          totalValuation: true,
          totalShares: true,
          status: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getMyTransactions(userId: string) {
  return prisma.transaction.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: {
      asset: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateWalletAddress(
  userId: string,
  walletAddress: string
) {
  return prisma.user.update({
    where: { id: userId },
    data: { walletAddress },
    select: { id: true, walletAddress: true },
  });
}