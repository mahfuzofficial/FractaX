import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { startBlockchainWorker } from "./blockchain/jobs/worker"; // Modified: Dynamic local database loop tracker
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

// Initialize the database worker loop cleanly when server boots up
startBlockchainWorker();

const allowedOrigins = [
  "http://localhost:8080",
  env.FRONTEND_URL,
];

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
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