import { TRPCError } from "@trpc/server";
import { middleware } from "@/server/trpc";

export const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next();
});