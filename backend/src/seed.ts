import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Create admin user ─────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@fractax.com" },
    update: {},
    create: {
      email: "admin@fractax.com",
      passwordHash: adminHash,
      fullName: "Platform Admin",
      role: "ADMIN",
      kycStatus: "APPROVED",
      walletBalance: 100000,
    },
  });
  console.log("✅ Admin created:", admin.email);

  // ── Create demo users ─────────────────────────────
  const userHash = await bcrypt.hash("demo123", 12);

  const user1 = await prisma.user.upsert({
    where: { email: "rahul@demo.com" },
    update: {},
    create: {
      email: "rahul@demo.com",
      passwordHash: userHash,
      fullName: "Rahul Sharma",
      role: "USER",
      kycStatus: "APPROVED",
      walletBalance: 50000,
      phone: "9876543210",
      profession: "Salaried — Private Sector",
      education: "Graduate",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "priya@demo.com" },
    update: {},
    create: {
      email: "priya@demo.com",
      passwordHash: userHash,
      fullName: "Priya Patel",
      role: "USER",
      kycStatus: "APPROVED",
      walletBalance: 75000,
      phone: "9876543211",
      profession: "Self Employed / Business Owner",
      education: "Post Graduate",
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: "arjun@demo.com" },
    update: {},
    create: {
      email: "arjun@demo.com",
      passwordHash: userHash,
      fullName: "Arjun Mehta",
      role: "USER",
      kycStatus: "APPROVED",
      walletBalance: 25000,
      phone: "9876543212",
      profession: "Salaried — Government",
      education: "Graduate",
    },
  });

  console.log("✅ Demo users created");

  // ── Create assets ─────────────────────────────────
  const assets = [
    {
      publisherId: user1.id,
      title: "Mumbai Commercial Property",
      description: "Prime commercial space in Bandra Kurla Complex, Mumbai. 2500 sq ft office space currently leased to a Fortune 500 company. Generating stable rental income with 5-year lease agreement.",
      totalValuation: 5000000,
      totalShares: 1000,
      sharesAvailableForSale: 800,
      category: "REAL_ESTATE" as const,
      generatesRevenue: true,
      revenueType: "FIXED" as const,
      estimatedAnnualRevenue: 360000,
      distributionMode: "FREE_CHOICE" as const,
      externalReferenceUrl: "https://www.magicbricks.com",
      status: "LIVE" as const,
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
    {
      publisherId: user1.id,
      title: "Rolex Submariner 2024",
      description: "Brand new Rolex Submariner Date in Oystersteel and yellow gold (ref. 126613LB). Purchased directly from authorized dealer with full papers and box. Current market value appreciating at 8-12% annually.",
      totalValuation: 1200000,
      totalShares: 500,
      sharesAvailableForSale: 400,
      category: "LUXURY_GOODS" as const,
      generatesRevenue: false,
      distributionMode: "FREE_CHOICE" as const,
      externalReferenceUrl: "https://www.chrono24.com",
      status: "LIVE" as const,
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
    {
      publisherId: user2.id,
      title: "Air Jordan 1 Retro High OG Chicago",
      description: "Deadstock Air Jordan 1 Retro High OG Chicago (2015). Size US 10. One of the most iconic sneaker releases of all time. Factory sealed, never worn. Certificate of authenticity included.",
      totalValuation: 450000,
      totalShares: 200,
      sharesAvailableForSale: 180,
      category: "COLLECTIBLES" as const,
      generatesRevenue: false,
      distributionMode: "FREE_CHOICE" as const,
      externalReferenceUrl: "https://stockx.com",
      status: "LIVE" as const,
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
    {
      publisherId: user2.id,
      title: "Pune IT Park Office Space",
      description: "Modern office space in Hinjewadi IT Park Phase 2, Pune. 1800 sq ft currently leased to a mid-size IT company. 3-year lease with annual escalation clause of 10%.",
      totalValuation: 3500000,
      totalShares: 700,
      sharesAvailableForSale: 600,
      category: "REAL_ESTATE" as const,
      generatesRevenue: true,
      revenueType: "VARIABLE" as const,
      estimatedAnnualRevenue: 280000,
      distributionMode: "FIXED_RATIO" as const,
      basicSharesAllotted: 400,
      premiumSharesAllotted: 200,
      premiumSharePrice: 5500,
      externalReferenceUrl: "https://www.99acres.com",
      status: "LIVE" as const,
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
    {
      publisherId: user3.id,
      title: "Beeple Digital Art — Everydays Collection",
      description: "Authenticated physical print of Beeple's Everydays series, signed by the artist. High-quality archival print on aluminum. One of only 10 prints ever made. Certificate of authenticity from the artist.",
      totalValuation: 800000,
      totalShares: 400,
      sharesAvailableForSale: 350,
      category: "ART" as const,
      generatesRevenue: false,
      distributionMode: "FREE_CHOICE" as const,
      status: "LIVE" as const,
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
    {
      publisherId: user3.id,
      title: "Vintage 1967 Ford Mustang Fastback",
      description: "Fully restored 1967 Ford Mustang Fastback in Highland Green. Numbers matching 390 GT engine. Restoration completed in 2023 by certified classic car specialists. Currently stored in climate-controlled facility.",
      totalValuation: 2800000,
      totalShares: 600,
      sharesAvailableForSale: 500,
      category: "VEHICLES" as const,
      generatesRevenue: false,
      distributionMode: "FREE_CHOICE" as const,
      externalReferenceUrl: "https://www.hemmings.com",
      status: "LIVE" as const,
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
  ];

  const createdAssets = [];
  for (const asset of assets) {
    const created = await prisma.asset.create({ data: asset as any });
    createdAssets.push(created);
    console.log(`✅ Asset created: ${created.title}`);
  }

  // ── Create some share purchases ───────────────────
  const purchases = [
    { buyerId: user2.id, assetIndex: 0, shareType: "BASIC" as const, quantity: 50 },
    { buyerId: user3.id, assetIndex: 0, shareType: "PREMIUM" as const, quantity: 30 },
    { buyerId: user1.id, assetIndex: 2, shareType: "BASIC" as const, quantity: 20 },
    { buyerId: user3.id, assetIndex: 1, shareType: "BASIC" as const, quantity: 40 },
    { buyerId: user1.id, assetIndex: 3, shareType: "BASIC" as const, quantity: 25 },
    { buyerId: user2.id, assetIndex: 4, shareType: "BASIC" as const, quantity: 15 },
  ];

  for (const purchase of purchases) {
    const asset = createdAssets[purchase.assetIndex];
    const pricePerShare = Number(asset.totalValuation) / asset.totalShares;
    const totalAmount = pricePerShare * purchase.quantity;

    // Deduct buyer balance
    await prisma.user.update({
      where: { id: purchase.buyerId },
      data: { walletBalance: { decrement: totalAmount } },
    });

    // Credit publisher
    await prisma.user.update({
      where: { id: asset.publisherId },
      data: { walletBalance: { increment: totalAmount } },
    });

    // Reduce available shares
    await prisma.asset.update({
      where: { id: asset.id },
      data: { sharesAvailableForSale: { decrement: purchase.quantity } },
    });

    // Create ownership
    await prisma.shareOwnership.create({
      data: {
        userId: purchase.buyerId,
        assetId: asset.id,
        shareType: purchase.shareType,
        quantity: purchase.quantity,
        averageBuyPrice: pricePerShare,
      },
    });

    // Create transaction
    await prisma.transaction.create({
      data: {
        assetId: asset.id,
        buyerId: purchase.buyerId,
        sellerId: asset.publisherId,
        shareType: purchase.shareType,
        quantity: purchase.quantity,
        pricePerShare,
        totalAmount,
        txType: "PURCHASE",
        status: "BLOCKCHAIN_CONFIRMED",
        blockchainTxHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
      },
    });
  }

  console.log("✅ Demo purchases created");
  console.log("\n🎉 Seed complete!\n");
  console.log("Demo accounts:");
  console.log("  Admin:  admin@fractax.com / admin123");
  console.log("  User 1: rahul@demo.com / demo123");
  console.log("  User 2: priya@demo.com / demo123");
  console.log("  User 3: arjun@demo.com / demo123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());