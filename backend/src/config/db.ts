import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Verify the connection pool is alive immediately on startup
prisma.$connect()
  .then(() => {
    // Using console.log directly so it alerts you early on boot
    console.log("🐘 Database connection pool established successfully.");
  })
  .catch((err) => {
    console.error("❌ Failed to initialize database connection pool:", err);
  });