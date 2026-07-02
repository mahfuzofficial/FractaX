import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { Prisma } from "@prisma/client";

interface BuySharesInput {
  buyerId: string;
  assetId: string;
  shareType: "BASIC" | "PREMIUM";
  quantity: number;
  buyerWalletAddress?: string;
}

export async function buyShares(input: BuySharesInput) {
  const { buyerId, assetId, shareType, quantity } = input;

  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new ApiError(404, "Asset not found");
  if (asset.status !== "LIVE") throw new ApiError(400, "Asset is not available for purchase");
  if (asset.publisherId === buyerId) throw new ApiError(400, "Cannot buy your own asset");

  if (asset.sharesAvailableForSale < quantity) {
    throw new ApiError(400, `Only ${asset.sharesAvailableForSale} shares available`);
  }

  if (shareType === "PREMIUM" && !asset.generatesRevenue) {
    throw new ApiError(400, "This asset does not offer PREMIUM shares");
  }

  const pricePerShare = shareType === "PREMIUM" && asset.premiumSharePrice
    ? Number(asset.premiumSharePrice)
    : Number(asset.totalValuation) / asset.totalShares;
  const totalAmount = new Prisma.Decimal(pricePerShare * quantity);

  // Everything below here runs as a single, atomic operation
  const result = await prisma.$transaction(async (tx) => {
    const buyer = await tx.user.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new ApiError(404, "Buyer not found");
    if (Number(buyer.walletBalance) < Number(totalAmount)) {
      throw new ApiError(400, "Insufficient wallet balance");
    }

    // 1. Update balances
    await tx.user.update({
      where: { id: buyerId },
      data: { walletBalance: { decrement: totalAmount } },
    });

    await tx.user.update({
      where: { id: asset.publisherId },
      data: { walletBalance: { increment: totalAmount } },
    });

    // 2. Adjust price histories
    const currentHistory = (asset.priceHistory as any[]) || [];
    const newHistoryEntry = {
      price: pricePerShare,
      timestamp: new Date().toISOString(),
      type: "PRIMARY",
    };
    const updatedHistory = [...currentHistory, newHistoryEntry].slice(-20);

    await tx.asset.update({
      where: { id: assetId },
      data: {
        sharesAvailableForSale: { decrement: quantity },
        lastTradedPrice: new Prisma.Decimal(pricePerShare),
        lastTradedAt: new Date(),
        priceHistory: updatedHistory,
      },
    });

    // 3. Upsert user investment holdings profiles
    const existingOwnership = await tx.shareOwnership.findUnique({
      where: { userId_assetId_shareType: { userId: buyerId, assetId, shareType } },
    });

    if (existingOwnership) {
      const newQty = existingOwnership.quantity + quantity;
      const newAvg = new Prisma.Decimal(
        (Number(existingOwnership.averageBuyPrice) * existingOwnership.quantity +
          Number(totalAmount)) / newQty
      );
      await tx.shareOwnership.update({
        where: { userId_assetId_shareType: { userId: buyerId, assetId, shareType } },
        data: { quantity: newQty, averageBuyPrice: newAvg },
      });
    } else {
      await tx.shareOwnership.create({
        data: {
          userId: buyerId,
          assetId,
          shareType,
          quantity,
          averageBuyPrice: new Prisma.Decimal(pricePerShare),
        },
      });
    }

    // 4. Log system core transaction row
    const transaction = await tx.transaction.create({
      data: {
        assetId,
        buyerId,
        sellerId: asset.publisherId,
        shareType,
        quantity,
        pricePerShare: new Prisma.Decimal(pricePerShare),
        totalAmount,
        txType: "PURCHASE",
        status: "DB_CONFIRMED",
      },
    });

    // Fetch publishers within the active transaction scope for safety
    const publisher = await tx.user.findUnique({
      where: { id: asset.publisherId },
      select: { walletAddress: true },
    });

    const toAddress = buyer.walletAddress ?? null;
    const fromAddress = publisher?.walletAddress ?? null;

    const jobType = toAddress ? "TRANSFER_SHARES" : "MINT_SHARES";

    // 5. ATOMIC DB QUEUE ENTRY: Store all dynamic transaction metadata
    const blockchainJob = await tx.blockchainJob.create({
      data: {
        transactionId: transaction.id,
        assetId,
        jobType,
        status: "QUEUED",
        // Storing the runtime metadata securely inside your database-backed fields
        lastError: JSON.stringify({
          assetIndex: asset.contractTokenId ?? 0,
          fromAddress: fromAddress ?? "0x0000000000000000000000000000000000000000",
          toAddress: toAddress ?? process.env.BACKEND_WALLET_ADDRESS ?? "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
        })
      },
    });

    return { transaction, blockchainJob };
  });

  return { transaction: result.transaction, message: "Shares purchased successfully" };
}

export async function getMarketplaceListings(filters: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const { search, category, page = 1, limit = 10 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.AssetWhereInput = {
    status: "LIVE",
    sharesAvailableForSale: { gt: 0 },
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(category && category !== "ALL" && {
      category: category as any,
    }),
  };

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        publisher: { select: { id: true, fullName: true } },
      },
    }),
    prisma.asset.count({ where }),
  ]);

  return {
    assets,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}