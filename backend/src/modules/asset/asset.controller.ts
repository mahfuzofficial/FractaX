import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../../middleware/auth";
import {
  createAsset,
  getAssets,
  getAssetById,
  updateAsset,
  getMyAssets,
  submitRevaluation,
} from "./asset.service";

const createAssetSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  totalValuation: z.coerce.number().positive(),
  totalShares: z.coerce.number().int().positive(),
  sharesAvailableForSale: z.coerce.number().int().positive(),
  category: z.enum(["REAL_ESTATE", "COLLECTIBLES", "LUXURY_GOODS", "VEHICLES", "ART", "EQUIPMENT", "OTHER"]).default("OTHER"),
  externalReferenceUrl: z.string().url().optional().or(z.literal("")),
  generatesRevenue: z.union([z.boolean(), z.string()]).transform((v) => v === true || v === "true"),
  revenueType: z.enum(["FIXED", "VARIABLE"]).optional(),
  estimatedAnnualRevenue: z.coerce.number().positive().optional(),
  distributionMode: z.enum(["FREE_CHOICE", "FIXED_RATIO"]).default("FREE_CHOICE"),
  basicSharesAllotted: z.coerce.number().int().positive().optional(),
  premiumSharesAllotted: z.coerce.number().int().positive().optional(),
  premiumSharePrice: z.coerce.number().positive().optional(),
});

const revaluationSchema = z.object({
  proposedValuation: z.coerce.number().positive(),
  proposedValuationNote: z.string().min(10),
  externalReferenceUrl: z.string().url().optional().or(z.literal("")),
});

export async function createAssetController(req: AuthRequest, res: Response) {
  const body = createAssetSchema.parse(req.body);
  const file = req.file;

  console.log("File received:", file ? `${file.originalname} (${file.size} bytes)` : "NO FILE");

  const asset = await createAsset({
    ...body,
    publisherId: req.user!.id,
    documentBuffer: file?.buffer,
  });

  res.status(201).json({
    success: true,
    message: "Asset submitted for approval",
    data: asset,
  });
}

export async function getAssetsController(req: AuthRequest, res: Response) {
  const query = z
    .object({
      search: z.string().optional(),
      category: z.string().optional(),
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(10),
    })
    .parse(req.query);

  const data = await getAssets(query);
  res.json({ success: true, data });
}

export async function getAssetByIdController(req: AuthRequest, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const data = await getAssetById(id);
  res.json({ success: true, data });
}

export async function updateAssetController(req: AuthRequest, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = createAssetSchema.partial().parse(req.body);
  const file = req.file;

  const data = await updateAsset(id, req.user!.id, {
    ...body,
    documentBuffer: file?.buffer,
  });
  res.json({ success: true, data });
}

export async function getMyAssetsController(req: AuthRequest, res: Response) {
  const data = await getMyAssets(req.user!.id);
  res.json({ success: true, data });
}

export async function submitRevaluationController(req: AuthRequest, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = revaluationSchema.parse(req.body);
  const data = await submitRevaluation(id, req.user!.id, body);
  res.json({ success: true, message: "Revaluation submitted for admin review", data });
}