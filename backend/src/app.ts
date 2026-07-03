import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors"; // 1. Import cors
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { startBlockchainWorker } from "./blockchain/jobs/worker";
import secondaryRoutes from "./modules/marketplace/secondary.routes";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import kycRoutes from "./modules/kyc/kyc.routes";
import assetRoutes from "./modules/asset/asset.routes";
import marketplaceRoutes from "./modules/marketplace/marketplace.routes";
import transactionRoutes from "./modules/transaction/transaction.routes";
import adminRoutes from "./modules/admin/admin.routes";
import profileRoutes from "./modules/user/profile.routes";

const app = express();

startBlockchainWorker();

// 2. Configure CORS options
const corsOptions = {
  origin: [
    "http://localhost:8080",
    "https://fractax.vercel.app" // Ensure this matches your production URL exactly
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// 3. Apply CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ... your routes ...
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(errorHandler);
app.use("/api/secondary", secondaryRoutes);
app.use("/api/profile", profileRoutes);

app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;