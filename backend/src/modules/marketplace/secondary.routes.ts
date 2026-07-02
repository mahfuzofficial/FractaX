import { Router } from "express";
import { authenticate, requireKyc } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { z } from "zod";
import {
  createListing,
  getAssetListings,
  getAllListings,
  buyFromListing,
  cancelListing,
  getMyListings,
  getSellerInsights,
} from "./secondary.service";

const router = Router();

// Public — view all secondary market listings
router.get("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = z.object({
    search: z.string().optional(),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(10),
  }).parse(req.query);

  const data = await getAllListings(query);
  res.json({ success: true, data });
}));

// Public — view listings for a specific asset
router.get("/asset/:assetId", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assetId } = req.params;
  const data = await getAssetListings(String(assetId));
  res.json({ success: true, data });
}));

// Protected routes
router.use(asyncHandler(authenticate));

// Get seller insights for the listing modal
router.get("/insights", asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = z.object({
    assetId: z.string().uuid(),
    shareType: z.enum(["BASIC", "PREMIUM"]),
  }).parse(req.query);

  const data = await getSellerInsights(
    req.user!.id,
    query.assetId,
    query.shareType
  );

  res.json({ success: true, data });
}));

// Get my listings
router.get("/my", asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await getMyListings(req.user!.id);
  res.json({ success: true, data });
}));

// Create a listing
router.post("/list", requireKyc, asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = z.object({
    assetId: z.string().uuid(),
    shareType: z.enum(["BASIC", "PREMIUM"]),
    quantity: z.number().int().positive(),
    pricePerShare: z.number().positive(),
  }).parse(req.body);

  const data = await createListing(
    req.user!.id,
    body.assetId,
    body.shareType,
    body.quantity,
    body.pricePerShare
  );
  res.status(201).json({ success: true, message: "Shares listed for sale", data });
}));

// Buy from a listing
router.post("/buy/:listingId", requireKyc, asyncHandler(async (req: AuthRequest, res: Response) => {
  const listingId = String(req.params.listingId);
  const { quantity } = z.object({
    quantity: z.coerce.number().int().positive().optional(),
  }).parse(req.body);
  const data = await buyFromListing(listingId, req.user!.id, quantity);
  res.status(201).json({ success: true, data });
}));

// Cancel a listing
router.delete("/:listingId", asyncHandler(async (req: AuthRequest, res: Response) => {
  const listingId = String(req.params.listingId);
  await cancelListing(listingId, req.user!.id);
  res.json({ success: true, message: "Listing cancelled" });
}));

export default router;