import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { z } from "zod";
import { prisma } from "../../config/db";
import multer from "multer";
import {
  getFullProfile,
  updatePersonalInfo,
  updateEmail,
  changePassword,
  updateAvatar,
  updateWalletAddr,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from "./profile.service";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const router = Router();

router.use(asyncHandler(authenticate));

// ── Profile ───────────────────────────────────────────

router.get("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await getFullProfile(req.user!.id);
  res.json({ success: true, data });
}));

router.patch("/personal", asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = z.object({
    fullName: z.string().min(2).optional(),
    phone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE", "PREFER_NOT_TO_SAY"]).optional(),
    profession: z.string().optional(),
    education: z.string().optional(),
  }).parse(req.body);

  const data = await updatePersonalInfo(req.user!.id, body);
  res.json({ success: true, data });
}));

router.patch("/email", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }).parse(req.body);

  const data = await updateEmail(req.user!.id, email, password);
  res.json({ success: true, data });
}));

router.patch("/password", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }).parse(req.body);

  await changePassword(req.user!.id, currentPassword, newPassword);
  res.json({ success: true, message: "Password changed successfully" });
}));

router.patch("/avatar", upload.single("avatar"), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new Error("No file uploaded");
  const data = await updateAvatar(req.user!.id, req.file.buffer);
  res.json({ success: true, data });
}));

router.patch("/wallet-address", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { walletAddress } = z.object({
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  }).parse(req.body);

  const data = await updateWalletAddr(req.user!.id, walletAddress);
  res.json({ success: true, data });
}));

// ── Payment methods ───────────────────────────────────

router.get("/payment-methods", asyncHandler(async (req: AuthRequest, res: Response) => {
  const methods = await prisma.paymentMethod.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: methods });
}));

router.post("/payment-methods", asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = z.object({
    type: z.enum(["BANK", "UPI"]),
    accountHolderName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    bankName: z.string().optional(),
    branch: z.string().optional(),
    upiId: z.string().optional(),
  }).parse(req.body);

  const data = await addPaymentMethod(req.user!.id, body as any);
  res.status(201).json({ success: true, data });
}));

router.patch("/payment-methods/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = await updatePaymentMethod(String(id), req.user!.id, req.body);
  res.json({ success: true, data });
}));

router.delete("/payment-methods/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  await deletePaymentMethod(String(req.params.id), req.user!.id);
  res.json({ success: true, message: "Payment method removed" });
}));

router.patch("/payment-methods/:id/default", asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await setDefaultPaymentMethod(String(req.params.id), req.user!.id);
  res.json({ success: true, data });
}));

export default router;