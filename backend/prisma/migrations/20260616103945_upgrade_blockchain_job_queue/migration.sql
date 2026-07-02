-- AlterTable
ALTER TABLE "BlockchainJob" ADD COLUMN     "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "BlockchainJob_status_runAt_idx" ON "BlockchainJob"("status", "runAt");
