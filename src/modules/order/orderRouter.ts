// src/modules/order/order.router.ts
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { createOrderSchema } from "./order.schema";
import { createOrderService } from "./order.service";

export const orderRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await createOrderService(input, ctx.session.user.id);
        return result;
      } catch (err) {
        console.error("❌ Erro ao criar pedido:", err);
        throw err;
      }
    }),
});
