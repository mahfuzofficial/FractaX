import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../../middleware/auth";
import { getMe, getMyOwnerships, getMyTransactions, updateWalletAddress } from "./user.service";

export async function getMeController(req: AuthRequest, res: Response) {
  const user = await getMe(req.user!.id);
  res.json({ success: true, data: user });
}

export async function getMyOwnershipsController(req: AuthRequest, res: Response) {
  const data = await getMyOwnerships(req.user!.id);
  res.json({ success: true, data });
}

export async function getMyTransactionsController(req: AuthRequest, res: Response) {
  const data = await getMyTransactions(req.user!.id);
  res.json({ success: true, data });
}

export async function updateWalletAddressController(req: AuthRequest, res: Response) {
  const { walletAddress } = z
    .object({
      walletAddress: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
    })
    .parse(req.body);

  const data = await updateWalletAddress(req.user!.id, walletAddress);
  res.json({ success: true, data });
}