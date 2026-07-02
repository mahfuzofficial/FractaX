import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { AssetCategory, AssetStatus, Prisma } from "@prisma/client";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";

interface CreateAssetInput {
  publisherId: string;
  title: string;
  description: string;
  totalValuation: number;
  totalShares: number;
  sharesAvailableForSale: number;
  category?: AssetCategory;
  externalReferenceUrl?: string;
  generatesRevenue: boolean;
  revenueType?: "FIXED" | "VARIABLE";
  estimatedAnnualRevenue?: number;
  distributionMode: "FREE_CHOICE" | "FIXED_RATIO";
  basicSharesAllotted?: number;
  premiumSharesAllotted?: number;
  documentBuffer?: Buffer;
  premiumSharePrice?: number;
}

export async function createAsset(input: CreateAssetInput) {
  if (input.sharesAvailableForSale > input.totalShares) {
    throw new ApiError(400, "Shares available cannot exceed total shares");
  }

  if (input.distributionMode === "FIXED_RATIO") {
    if (!input.basicSharesAllotted || !input.premiumSharesAllotted) {
      throw new ApiError(400, "Fixed ratio requires basicSharesAllotted and premiumSharesAllotted");
    }
    if (input.basicSharesAllotted + input.premiumSharesAllotted !== input.sharesAvailableForSale) {
      throw new ApiError(400, "Basic + Premium shares must equal sharesAvailableForSale");
    }
  }

  let documentUrl: string | undefined;
  let documentId: string | undefined;

  if (input.documentBuffer) {
    const uploaded = await uploadToCloudinary(input.documentBuffer, "rwa-asset-documents");
    documentUrl = uploaded.url;
    documentId = uploaded.publicId;
  }

  return prisma.asset.create({
    data: {
      publisherId: input.publisherId,
      title: input.title,
      description: input.description,
      totalValuation: new Prisma.Decimal(input.totalValuation),
      totalShares: input.totalShares,
      sharesAvailableForSale: input.sharesAvailableForSale,
      category: input.category ?? "OTHER",
      externalReferenceUrl: input.externalReferenceUrl || null,
      generatesRevenue: input.generatesRevenue,
      revenueType: input.revenueType,
      premiumSharePrice: input.premiumSharePrice
        ? new Prisma.Decimal(input.premiumSharePrice)
        : null,
      estimatedAnnualRevenue: input.estimatedAnnualRevenue
        ? new Prisma.Decimal(input.estimatedAnnualRevenue)
        : null,
      distributionMode: input.distributionMode,
      basicSharesAllotted: input.basicSharesAllotted,
      premiumSharesAllotted: input.premiumSharesAllotted,
      documentUrl,
      documentId,
      status: "PENDING_APPROVAL",
      
    },
  });
}

export async function getAssets(filters: {
  status?: AssetStatus;
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const { status = "LIVE", search, category, page = 1, limit = 10 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.AssetWhereInput = {
    status,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(category && category !== "ALL" && { category: category as AssetCategory }),
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

export async function getAssetById(id: string) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      publisher: { select: { id: true, fullName: true } },
      ownerships: {
        include: { user: { select: { id: true, fullName: true } } },
      },
    },
  });
  if (!asset) throw new ApiError(404, "Asset not found");
  return asset;
}

export async function updateAsset(
  assetId: string,
  publisherId: string,
  updates: Partial<CreateAssetInput>
) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new ApiError(404, "Asset not found");
  if (asset.publisherId !== publisherId) throw new ApiError(403, "Not your asset");
  if (asset.status !== "DRAFT" && asset.status !== "REJECTED") {
    throw new ApiError(400, "Only DRAFT or REJECTED assets can be edited");
  }

  let documentUrl: string | undefined;
  let documentId: string | undefined;

  if (updates.documentBuffer) {
    const uploaded = await uploadToCloudinary(updates.documentBuffer, "rwa-asset-documents");
    documentUrl = uploaded.url;
    documentId = uploaded.publicId;
  }

  return prisma.asset.update({
    where: { id: assetId },
    data: {
      title: updates.title,
      description: updates.description,
      totalValuation: updates.totalValuation
        ? new Prisma.Decimal(updates.totalValuation)
        : undefined,
      totalShares: updates.totalShares,
      sharesAvailableForSale: updates.sharesAvailableForSale,
      category: updates.category,
      externalReferenceUrl: updates.externalReferenceUrl || undefined,
      generatesRevenue: updates.generatesRevenue,
      revenueType: updates.revenueType,
      premiumSharePrice: updates.premiumSharePrice
        ? new Prisma.Decimal(updates.premiumSharePrice)
        : undefined,
      estimatedAnnualRevenue: updates.estimatedAnnualRevenue
        ? new Prisma.Decimal(updates.estimatedAnnualRevenue)
        : undefined,
      distributionMode: updates.distributionMode,
      basicSharesAllotted: updates.basicSharesAllotted,
      premiumSharesAllotted: updates.premiumSharesAllotted,
      documentUrl: documentUrl || undefined,
      documentId: documentId || undefined,
      status: "PENDING_APPROVAL",
      adminNote: null,
    },
  });
}

export async function getMyAssets(publisherId: string) {
  return prisma.asset.findMany({
    where: { publisherId },
    orderBy: { createdAt: "desc" },
  });
}

export async function submitRevaluation(
  assetId: string,
  publisherId: string,
  data: {
    proposedValuation: number;
    proposedValuationNote: string;
    externalReferenceUrl?: string;
  }
) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new ApiError(404, "Asset not found");
  if (asset.publisherId !== publisherId) throw new ApiError(403, "Not your asset");
  if (asset.status !== "LIVE") throw new ApiError(400, "Only LIVE assets can be revalued");
  if (asset.valuationStatus === "PENDING_REVALUATION") {
    throw new ApiError(400, "A revaluation is already pending");
  }

  return prisma.asset.update({
    where: { id: assetId },
    data: {
      valuationStatus: "PENDING_REVALUATION",
      proposedValuation: new Prisma.Decimal(data.proposedValuation),
      proposedValuationNote: data.proposedValuationNote,
      externalReferenceUrl: data.externalReferenceUrl || undefined,
    },
  });
}