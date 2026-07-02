import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { z } from "zod";
import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
// UPDATED IMPORT: Added verifyAndCreditWallet
import { initiateAddFunds, verifyAndCreditWallet } from "./transaction.controller";
import { withdrawController } from "./transaction.controller";

const router = Router();

router.use(asyncHandler(authenticate));

// Initiate Add Funds (Razorpay/Bypass)
router.post("/initiate-add-funds", asyncHandler(initiateAddFunds));

// ─── NEW ROUTE: Verify and Credit Wallet ───
router.post("/verify-and-credit", asyncHandler(verifyAndCreditWallet));

router.post("/withdraw", asyncHandler(withdrawController));

// EXISTING ROUTE: Get Transaction By ID
router.get("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: {
      asset: { select: { id: true, title: true } },
      buyer: { select: { id: true, fullName: true } },
      seller: { select: { id: true, fullName: true } },
      blockchainJob: true,
    },
  });

  if (!tx) throw new ApiError(404, "Transaction not found");

  if (tx.buyerId !== req.user!.id && tx.sellerId !== req.user!.id) {
    throw new ApiError(403, "Access denied");
  }

  res.json({ success: true, data: tx });
}));

export default router;