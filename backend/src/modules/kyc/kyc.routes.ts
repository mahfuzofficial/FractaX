import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { submitKycController, getKycStatusController } from "./kyc.controller";
import { kycUpload } from "./kyc.upload";

const router = Router();

router.use(asyncHandler(authenticate));

router.post("/submit", kycUpload.single("document"), asyncHandler(submitKycController));
router.get("/status", asyncHandler(getKycStatusController));

export default router;