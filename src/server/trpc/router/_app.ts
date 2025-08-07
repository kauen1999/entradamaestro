// src/server/trpc/router/_app.ts

import { pagoticRouter } from "@/modules/pagotic/pagotic.router";
import { router } from "../trpc";
import { authRouter } from "@/modules/auth/routers/auth.router";
import { eventRouter } from "@/modules/event/event.router";
import { orderRouter } from "@/modules/order/orderRouter";
import { categoryRouter } from "@/modules/category/category.router";

export const appRouter = router({
  auth: authRouter,
  pagotic: pagoticRouter,
  event: eventRouter,
  order: orderRouter,
  category: categoryRouter,
});
export type AppRouter = typeof appRouter;
