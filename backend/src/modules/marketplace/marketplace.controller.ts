import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../../middleware/auth";
import { buyShares, getMarketplaceListings } from "./marketplace.service";

const buySharesSchema = z.object({
  assetId: z.string().uuid(),
  shareType: z.enum(["BASIC", "PREMIUM"]),
  quantity: z.number().int().positive(),
});

export async function buySharesController(req: AuthRequest, res: Response) {
  const body = buySharesSchema.parse(req.body);
  const result = await buyShares({
    ...body,
    buyerId: req.user!.id,
    buyerWalletAddress: req.body.walletAddress,
  });
  res.status(201).json({ success: true, data: result });
}

export async function getListingsController(req: AuthRequest, res: Response) {
  const query = z
    .object({
      search: z.string().optional(),
      category: z.string().optional(),
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(10),
    })
    .parse(req.query);

  const data = await getMarketplaceListings(query);
  res.json({ success: true, data });
}