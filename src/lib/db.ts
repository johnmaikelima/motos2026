import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma único (singleton).
 * Em desenvolvimento o Next recarrega muito; sem o singleton, abriríamos
 * conexões demais com o MySQL. Aqui reaproveitamos a mesma instância.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
