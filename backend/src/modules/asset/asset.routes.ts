import { Router } from "express";
import { authenticate, requireKyc } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import multer from "multer";
import {
  createAssetController,
  getAssetsController,
  getAssetByIdController,
  updateAssetController,
  getMyAssetsController,
  submitRevaluationController,
} from "./asset.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

// Public routes
router.get("/", asyncHandler(getAssetsController));
router.get("/my/listings", asyncHandler(authenticate), asyncHandler(getMyAssetsController));
router.get("/:id", asyncHandler(getAssetByIdController));

// Protected routes
router.use(asyncHandler(authenticate));
router.post("/", requireKyc, upload.single("document"), asyncHandler(createAssetController));
router.put("/:id", requireKyc, upload.single("document"), asyncHandler(updateAssetController));
router.post("/:id/revalue", requireKyc, asyncHandler(submitRevaluationController));

export default router;