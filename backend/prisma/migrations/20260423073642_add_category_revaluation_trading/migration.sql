-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('REAL_ESTATE', 'COLLECTIBLES', 'LUXURY_GOODS', 'VEHICLES', 'ART', 'EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ValuationStatus" AS ENUM ('STABLE', 'PENDING_REVALUATION', 'REVALUATION_APPROVED');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "category" "AssetCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "externalReferenceUrl" TEXT,
ADD COLUMN     "lastTradedAt" TIMESTAMP(3),
ADD COLUMN     "lastTradedPrice" DECIMAL(18,8),
ADD COLUMN     "priceHistory" JSONB,
ADD COLUMN     "proposedValuation" DECIMAL(18,8),
ADD COLUMN     "proposedValuationNote" TEXT,
ADD COLUMN     "valuationStatus" "ValuationStatus" NOT NULL DEFAULT 'STABLE';
