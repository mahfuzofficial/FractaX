import { Router } from "express";
import { register, login, refresh, logout } from "./auth.controller";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/refresh-token", asyncHandler(refresh));
router.post("/logout", asyncHandler(authenticate), asyncHandler(logout));

export default router;