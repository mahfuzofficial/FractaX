import { ethers } from "ethers";
import { env } from "../config/env";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ShareTokenABI = require("./abi/ShareToken.json");

const provider = new ethers.JsonRpcProvider(env.RPC_URL);
const signer = new ethers.Wallet(env.BACKEND_PRIVATE_KEY, provider);

export const shareTokenContract = new ethers.Contract(
  env.CONTRACT_ADDRESS,
  ShareTokenABI,
  signer
);

export { provider };

export const getBasicTokenId = (assetIndex: number) => assetIndex * 2;
export const getPremiumTokenId = (assetIndex: number) => assetIndex * 2 + 1;