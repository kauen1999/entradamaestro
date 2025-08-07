import { TRPCError } from "@trpc/server";
import { middleware } from "@/server/trpc";
import type { Role } from "../types/auth.types";

export const hasRole = (role: Role) => middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.role) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.role !== role) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next();
});