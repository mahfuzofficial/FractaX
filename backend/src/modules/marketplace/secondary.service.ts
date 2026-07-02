import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { Prisma } from "@prisma/client";

export async function createListing(
  sellerId: string,
  assetId: string,
  shareType: "BASIC" | "PREMIUM",
  quantity: number,
  pricePerShare: number
) {
  const ownership = await prisma.shareOwnership.findUnique({
    where: { userId_assetId_shareType: { userId: sellerId, assetId, shareType } },
  });

  if (!ownership) throw new ApiError(400, "You don't own any shares of this type");
  if (ownership.quantity < quantity) {
    throw new ApiError(400, `You only own ${ownership.quantity} shares of this type`);
  }

  const existingListings = await prisma.shareListing.aggregate({
    where: { sellerId, assetId, shareType, status: "ACTIVE" },
    _sum: { quantity: true },
  });

  const alreadyListed = existingListings._sum.quantity ?? 0;
  if (alreadyListed + quantity > ownership.quantity) {
    throw new ApiError(
      400,
      `You can only list ${ownership.quantity - alreadyListed} more shares (${ownership.quantity} owned, ${alreadyListed} already listed)`
    );
  }

  return prisma.shareListing.create({
    data: {
      sellerId,
      assetId,
      shareType,
      quantity,
      pricePerShare: new Prisma.Decimal(pricePerShare),
    },
    include: {
      asset: { select: { id: true, title: true } },
      seller: { select: { id: true, fullName: true } },
    },
  });
}

export async function getAssetListings(assetId: string) {
  return prisma.shareListing.findMany({
    where: { assetId, status: "ACTIVE" },
    include: {
      seller: { select: { id: true, fullName: true } },
    },
    orderBy: { pricePerShare: "asc" },
  });
}

export async function getAllListings(filters: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { search, page = 1, limit = 10 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ShareListingWhereInput = {
    status: "ACTIVE",
    ...(search && {
      asset: { title: { contains: search, mode: "insensitive" } },
    }),
  };

  const [listings, total] = await Promise.all([
    prisma.shareListing.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        asset: {
          select: {
            id: true,
            title: true,
            totalValuation: true,
            totalShares: true,
            category: true,
          },
        },
        seller: { select: { id: true, fullName: true } },
      },
    }),
    prisma.shareListing.count({ where }),
  ]);

  return {
    listings,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

export async function buyFromListing(
  listingId: string,
  buyerId: string,
  quantityToBuy?: number
) {
  const listing = await prisma.shareListing.findUnique({
    where: { id: listingId },
    include: { asset: true },
  });

  if (!listing) throw new ApiError(404, "Listing not found");
  if (listing.status !== "ACTIVE") throw new ApiError(400, "Listing is no longer active");
  if (listing.sellerId === buyerId) throw new ApiError(400, "Cannot buy your own listing");

  const qty = quantityToBuy ?? listing.quantity;
  if (qty > listing.quantity) {
    throw new ApiError(400, `Only ${listing.quantity} shares available in this listing`);
  }
  if (qty < 1) {
    throw new ApiError(400, "Quantity must be at least 1");
  }

  const totalAmount = new Prisma.Decimal(Number(listing.pricePerShare) * qty);

  const { transaction, blockchainJob } = await prisma.$transaction(async (tx) => {
    const buyer = await tx.user.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new ApiError(404, "Buyer not found");
    if (Number(buyer.walletBalance) < Number(totalAmount)) {
      throw new ApiError(400, "Insufficient wallet balance");
    }

    const sellerOwnership = await tx.shareOwnership.findUnique({
      where: {
        userId_assetId_shareType: {
          userId: listing.sellerId,
          assetId: listing.assetId,
          shareType: listing.shareType,
        },
      },
    });

    if (!sellerOwnership || sellerOwnership.quantity < qty) {
      throw new ApiError(400, "Seller no longer owns enough shares");
    }

    // Deduct buyer balance
    await tx.user.update({
      where: { id: buyerId },
      data: { walletBalance: { decrement: totalAmount } },
    });

    // Credit seller balance
    await tx.user.update({
      where: { id: listing.sellerId },
      data: { walletBalance: { increment: totalAmount } },
    });

    // Deduct seller ownership
    const newSellerQty = sellerOwnership.quantity - qty;
    if (newSellerQty === 0) {
      await tx.shareOwnership.delete({
        where: {
          userId_assetId_shareType: {
            userId: listing.sellerId,
            assetId: listing.assetId,
            shareType: listing.shareType,
          },
        },
      });
    } else {
      await tx.shareOwnership.update({
        where: {
          userId_assetId_shareType: {
            userId: listing.sellerId,
            assetId: listing.assetId,
            shareType: listing.shareType,
          },
        },
        data: { quantity: newSellerQty },
      });
    }

    // Add buyer ownership
    const existingBuyerOwnership = await tx.shareOwnership.findUnique({
      where: {
        userId_assetId_shareType: {
          userId: buyerId,
          assetId: listing.assetId,
          shareType: listing.shareType,
        },
      },
    });

    if (existingBuyerOwnership) {
      const newQty = existingBuyerOwnership.quantity + qty;
      const newAvg = new Prisma.Decimal(
        (Number(existingBuyerOwnership.averageBuyPrice) * existingBuyerOwnership.quantity +
          Number(totalAmount)) / newQty
      );
      await tx.shareOwnership.update({
        where: {
          userId_assetId_shareType: {
            userId: buyerId,
            assetId: listing.assetId,
            shareType: listing.shareType,
          },
        },
        data: { quantity: newQty, averageBuyPrice: newAvg },
      });
    } else {
      await tx.shareOwnership.create({
        data: {
          userId: buyerId,
          assetId: listing.assetId,
          shareType: listing.shareType,
          quantity: qty,
          averageBuyPrice: listing.pricePerShare,
        },
      });
    }

    // Update listing — partial or full
    const remainingQty = listing.quantity - qty;
    await tx.shareListing.update({
      where: { id: listingId },
      data: remainingQty === 0
        ? { status: "SOLD", buyerId, soldAt: new Date() }
        : { quantity: remainingQty },
    });

    // Update asset price history
    const currentHistory = (listing.asset.priceHistory as any[]) || [];
    const updatedHistory = [
      ...currentHistory,
      {
        price: Number(listing.pricePerShare),
        timestamp: new Date().toISOString(),
        type: "SECONDARY",
      },
    ].slice(-20);

    await tx.asset.update({
      where: { id: listing.assetId },
      data: {
        lastTradedPrice: listing.pricePerShare,
        lastTradedAt: new Date(),
        priceHistory: updatedHistory,
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        assetId: listing.assetId,
        buyerId,
        sellerId: listing.sellerId,
        shareType: listing.shareType,
        quantity: qty,
        pricePerShare: listing.pricePerShare,
        totalAmount,
        txType: "RESALE",
        status: "DB_CONFIRMED",
      },
    });

    const [buyerUser, seller] = await Promise.all([
      tx.user.findUnique({ where: { id: buyerId }, select: { walletAddress: true } }),
      tx.user.findUnique({ where: { id: listing.sellerId }, select: { walletAddress: true } }),
    ]);

    const toAddress = buyerUser?.walletAddress ?? null;
    const fromAddress = seller?.walletAddress ?? null;
    const jobType = toAddress && fromAddress ? "TRANSFER_SHARES" : "MINT_SHARES";
    const effectiveToAddress = toAddress ?? "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const effectiveFromAddress = fromAddress ?? "0x0000000000000000000000000000000000000000";

    const blockchainJob = await tx.blockchainJob.create({
      data: {
        transactionId: transaction.id,
        assetId: listing.assetId,
        jobType,
        status: "QUEUED",
        lastError: JSON.stringify({
          assetIndex: listing.asset.contractTokenId ?? 0,
          fromAddress: effectiveFromAddress,
          toAddress: effectiveToAddress,
        }),
      },
    });

    return { transaction, blockchainJob };
  });

  return { transaction, message: "Shares purchased from secondary market" };
}

export async function cancelListing(listingId: string, sellerId: string) {
  const listing = await prisma.shareListing.findUnique({ where: { id: listingId } });
  if (!listing) throw new ApiError(404, "Listing not found");
  if (listing.sellerId !== sellerId) throw new ApiError(403, "Not your listing");
  if (listing.status !== "ACTIVE") throw new ApiError(400, "Listing is not active");

  return prisma.shareListing.update({
    where: { id: listingId },
    data: { status: "CANCELLED" },
  });
}

export async function getMyListings(sellerId: string) {
  return prisma.shareListing.findMany({
    where: { sellerId },
    include: {
      asset: {
        select: { id: true, title: true, totalValuation: true, totalShares: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSellerInsights(userId: string, assetId: string, shareType: "BASIC" | "PREMIUM") {
  // 1. Fetch asset details and user ownership details concurrently to save database time
  const [asset, ownership] = await Promise.all([
    prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        totalValuation: true,
        totalShares: true,
        lastTradedPrice: true,
        premiumSharePrice: true,
        generatesRevenue: true,
      },
    }),
    prisma.shareOwnership.findUnique({
      where: {
        userId_assetId_shareType: { userId, assetId, shareType },
      },
      select: {
        averageBuyPrice: true,
        quantity: true,
      },
    }),
  ]);

  // 2. If the asset doesn't exist at all, throw an error
  if (!asset) {
    throw new ApiError(404, "Asset metadata records not found");
  }

  // 3. Calculate market price baseline using your existing primary rule formula
  const marketPricePerShare = shareType === "PREMIUM" && asset.generatesRevenue && asset.premiumSharePrice
    ? Number(asset.premiumSharePrice)
    : Number(asset.totalValuation) / asset.totalShares;

  // 4. Return a clean data object to the controller
  return {
    marketPrice: marketPricePerShare,
    lastTradedPrice: asset.lastTradedPrice ? Number(asset.lastTradedPrice) : null,
    averageBuyPrice: ownership?.averageBuyPrice ? Number(ownership.averageBuyPrice) : null,
    ownedQuantity: ownership?.quantity ?? 0,
  };
}
