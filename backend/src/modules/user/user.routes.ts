import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  getMeController,
  getMyOwnershipsController,
  getMyTransactionsController,
  updateWalletAddressController,
} from "./user.controller";

const router = Router();

router.use(asyncHandler(authenticate));

router.get("/me", asyncHandler(getMeController));
router.get("/me/ownerships", asyncHandler(getMyOwnershipsController));
router.get("/me/transactions", asyncHandler(getMyTransactionsController));
router.patch("/me/wallet-address", asyncHandler(updateWalletAddressController));

export default router;