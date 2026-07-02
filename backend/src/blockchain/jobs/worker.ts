import { prisma } from "../../config/db";
import { shareTokenContract, getBasicTokenId, getPremiumTokenId } from "../contract";
import { logger } from "../../utils/logger";

let isWorkerBusy = false;

export const startBlockchainWorker = () => {
  logger.info("🔗 Native PostgreSQL Blockchain Worker Loop initialized");

  setInterval(async () => {
    if (isWorkerBusy) return; // Skip tick if a block is currently mining on-chain
    
    isWorkerBusy = true;
    try {
      await processNextJob();
    } catch (error) {
      logger.error("System critical background unhandled loop exception:", error);
    } finally {
      isWorkerBusy = false;
    }
  }, 3000); // Evaluates queue table states every 3 seconds
};

async function processNextJob(): Promise<void> {
  // Find oldest job scheduled to execute
  const job = await prisma.blockchainJob.findFirst({
    where: {
      status: "QUEUED",
      runAt: { lte: new Date() }
    },
    include: { transaction: true, asset: true },
    orderBy: { createdAt: "asc" }
  });

  if (!job) return;

  logger.info(`Processing background blockchain job: ${job.jobType} [ID: ${job.id}]`);

  // Lock row state immediately before calling smart contracts
  const updatedJob = await prisma.blockchainJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING", attempts: job.attempts + 1 },
  });

  try {
    // Read the embedded deployment address payloads safely from storage
    const metadata = JSON.parse(job.lastError || "{}");
    const assetIndex = metadata.assetIndex ?? 0;
    const fromAddress = metadata.fromAddress;
    const toAddress = metadata.toAddress;

    const tokenId = job.transaction.shareType === "BASIC"
      ? getBasicTokenId(assetIndex)
      : getPremiumTokenId(assetIndex);

    let tx: any;

    if (job.jobType === "MINT_SHARES") {
      tx = await shareTokenContract.mintShares(
        toAddress,
        tokenId,
        job.transaction.quantity,
        job.assetId
      );
    } else {
      tx = await shareTokenContract.adminTransfer(
        fromAddress,
        toAddress,
        tokenId,
        job.transaction.quantity,
        job.transactionId
      );
    }

    const receipt = await tx.wait();
    const txHash: string = receipt.hash;

    logger.info(`Blockchain tx confirmed: ${txHash}`);

    // Commit changes across tables simultaneously
    await prisma.$transaction([
      prisma.blockchainJob.update({
        where: { id: job.id },
        data: { status: "CONFIRMED", txHash, lastError: null },
      }),
      prisma.transaction.update({
        where: { id: job.transactionId },
        data: { status: "BLOCKCHAIN_CONFIRMED", blockchainTxHash: txHash },
      }),
    ]);

    logger.info(`Blockchain job completed successfully [ID: ${job.id}]`);

  } catch (error: any) {
    const errorMessage = error.message;
    logger.error(`Blockchain job processing failure: ${errorMessage}`, { jobId: job.id });

    if (updatedJob.attempts >= job.maxAttempts) {
      // Hard failure state once all 3 retry limits are reached
      await prisma.$transaction([
        prisma.blockchainJob.update({
          where: { id: job.id },
          data: { status: "FAILED", lastError: errorMessage },
        }),
        prisma.transaction.update({
          where: { id: job.transactionId },
          data: { status: "FAILED_BLOCKCHAIN", failureReason: errorMessage },
        }),
      ]);
    } else {
      // Re-enqueue task with a 10-second delay backoff strategy
      await prisma.blockchainJob.update({
        where: { id: job.id },
        data: {
          status: "QUEUED",
          lastError: errorMessage,
          runAt: new Date(Date.now() + 10000)
        }
      });
    }
  }
}