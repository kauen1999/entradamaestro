// src/server/db/client.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // Evita múltiplas instâncias em dev/hot reload
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
