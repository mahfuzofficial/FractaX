import { Router } from "express";
import { authenticate, requireKyc } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { buySharesController, getListingsController } from "./marketplace.controller";

const router = Router();

// Public — no auth required
router.get("/", asyncHandler(getListingsController));

// Protected — auth + KYC required
router.post("/buy", asyncHandler(authenticate), requireKyc, asyncHandler(buySharesController));

export default router;