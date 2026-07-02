import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../../middleware/auth";
import { submitKyc, getKycStatus } from "./kyc.service";
import { ApiError } from "../../utils/ApiError";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";

export async function submitKycController(req: AuthRequest, res: Response) {
  const file = req.file;
  if (!file) throw new ApiError(400, "Document file is required");

  const { documentType } = z
    .object({
      documentType: z.enum(["passport", "aadhaar", "driving_license", "voter_id"]),
    })
    .parse(req.body);

  // Upload buffer to Cloudinary
  const { url, publicId } = await uploadToCloudinary(
    file.buffer,
    "rwa-kyc-documents"
  );

  const result = await submitKyc(
    req.user!.id,
    documentType,
    url,
    publicId
  );

  res.status(201).json({
    success: true,
    message: "KYC submitted for review",
    data: result,
  });
}

export async function getKycStatusController(req: AuthRequest, res: Response) {
  const data = await getKycStatus(req.user!.id);
  res.json({ success: true, data });
}