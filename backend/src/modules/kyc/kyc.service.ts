import { prisma } from "../../config/db";
import { cloudinary } from "../../config/cloudinary";
import { ApiError } from "../../utils/ApiError";

export async function submitKyc(
  userId: string,
  documentType: string,
  filePath: string,
  cloudinaryId: string
) {
  const existing = await prisma.kycDocument.findUnique({ where: { userId } });
  if (existing && existing.status === "APPROVED") {
    throw new ApiError(400, "KYC already approved");
  }

  if (existing) {
    // Delete old file from Cloudinary
    await cloudinary.uploader.destroy(existing.cloudinaryId);

    return prisma.kycDocument.update({
      where: { userId },
      data: {
        documentType,
        cloudinaryUrl: filePath,
        cloudinaryId,
        status: "PENDING",
        adminNote: null,
        reviewedAt: null,
        reviewedBy: null,
      },
    });
  }

  return prisma.kycDocument.create({
    data: {
      userId,
      documentType,
      cloudinaryUrl: filePath,
      cloudinaryId,
    },
  });
}

export async function getKycStatus(userId: string) {
  const kyc = await prisma.kycDocument.findUnique({
    where: { userId },
    select: {
      status: true,
      documentType: true,
      adminNote: true,
      reviewedAt: true,
      createdAt: true,
    },
  });
  if (!kyc) throw new ApiError(404, "No KYC submission found");
  return kyc;
}