import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", balance.toString());

  const ShareToken = await ethers.getContractFactory("ShareToken");
  const shareToken = await ShareToken.deploy();
  await shareToken.waitForDeployment();

  const address = await shareToken.getAddress();
  console.log("✅ ShareToken deployed to:", address);
  console.log("👉 Copy this to backend/.env as CONTRACT_ADDRESS=", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});