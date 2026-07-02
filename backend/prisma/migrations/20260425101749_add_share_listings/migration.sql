-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED');

-- CreateTable
CREATE TABLE "ShareListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "shareType" "ShareType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerShare" DECIMAL(18,8) NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "buyerId" TEXT,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareListing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShareListing" ADD CONSTRAINT "ShareListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareListing" ADD CONSTRAINT "ShareListing_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareListing" ADD CONSTRAINT "ShareListing_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
