import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { z } from "zod";
import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";

const router = Router();

router.use(asyncHandler(authenticate), requireAdmin);

// ── KYC review ────────────────────────────────────────

router.get("/kyc", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const docs = await prisma.kycDocument.findMany({
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: docs });
}));

router.patch("/kyc/:userId/approve", asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = String(req.params.userId);

  await prisma.$transaction([
    prisma.kycDocument.update({
      where: { userId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: req.user!.id,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { kycStatus: "APPROVED" },
    }),
  ]);

  res.json({ success: true, message: "KYC approved" });
}));

router.patch("/kyc/:userId/reject", asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = String(req.params.userId);
  const { note } = z.object({ note: z.string().min(1) }).parse(req.body);

  await prisma.$transaction([
    prisma.kycDocument.update({
      where: { userId },
      data: {
        status: "REJECTED",
        adminNote: note,
        reviewedAt: new Date(),
        reviewedBy: req.user!.id,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { kycStatus: "REJECTED" },
    }),
  ]);

  res.json({ success: true, message: "KYC rejected" });
}));

// ── Asset review ──────────────────────────────────────

router.get("/assets", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const assets = await prisma.asset.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: {
      publisher: { select: { id: true, fullName: true, email: true, kycStatus: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: assets });
}));

router.patch("/assets/:id/approve", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);

  const asset = await prisma.asset.update({
    where: { id },
    data: {
      status: "LIVE",
      approvedAt: new Date(),
      approvedBy: req.user!.id,
    },
  });

  res.json({ success: true, message: "Asset approved", data: asset });
}));

router.patch("/assets/:id/reject", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const { note } = z.object({ note: z.string().min(1) }).parse(req.body);

  const asset = await prisma.asset.update({
    where: { id },
    data: { status: "REJECTED", adminNote: note },
  });

  res.json({ success: true, message: "Asset rejected", data: asset });
}));


// ── Revaluation review ────────────────────────────────

router.get("/revaluations", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const assets = await prisma.asset.findMany({
    where: { valuationStatus: "PENDING_REVALUATION" },
    include: {
      publisher: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ success: true, data: assets });
}));

router.patch("/revaluations/:id/approve", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) throw new ApiError(404, "Asset not found");

  const currentHistory = (asset.priceHistory as any[]) || [];
  const newHistoryEntry = {
    price: Number(asset.totalValuation) / asset.totalShares,
    timestamp: new Date().toISOString(),
    type: "REVALUATION",
  };

  await prisma.asset.update({
    where: { id },
    data: {
      totalValuation: asset.proposedValuation!,
      valuationStatus: "REVALUATION_APPROVED",
      proposedValuation: null,
      proposedValuationNote: null,
      priceHistory: [...currentHistory, newHistoryEntry].slice(-20),
    },
  });

  res.json({ success: true, message: "Revaluation approved" });
}));

router.patch("/revaluations/:id/reject", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);

  await prisma.asset.update({
    where: { id },
    data: {
      valuationStatus: "STABLE",
      proposedValuation: null,
      proposedValuationNote: null,
    },
  });

  res.json({ success: true, message: "Revaluation rejected" });
}));

// ── Stats ─────────────────────────────────────────────

router.get("/stats", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [users, pendingKyc, liveAssets, transactions] = await Promise.all([
    prisma.user.count(),
    prisma.kycDocument.count({ where: { status: "PENDING" } }),
    prisma.asset.count({ where: { status: "LIVE" } }),
    prisma.transaction.count(),
  ]);

  res.json({
    success: true,
    data: { users, pendingKyc, liveAssets, transactions },
  });
}));

export default router;