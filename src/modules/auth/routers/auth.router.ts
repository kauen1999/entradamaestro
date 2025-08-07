// src/modules/auth/routers/auth.router.ts

import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/trpc";
import { registerSchema } from "@/modules/auth/schemas/register.schema";
import type { RegisterInput } from "@/modules/auth/schemas/register.schema";
import { loginSchema } from "@/modules/auth/schemas/login.schema";
import type { LoginInput } from "@/modules/auth/schemas/login.schema";
import { completeProfileSchema } from "@/modules/auth/schemas/completeProfile.schema";
import type { CompleteProfileInput } from "@/modules/auth/schemas/completeProfile.schema";
import { AuthService } from "@/modules/auth/services/auth.service";
import { isAuthed } from "@/modules/auth/middlewares/isAuthed.middleware";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerSchema)
    .mutation(({ input }) => AuthService.register(input as RegisterInput)),

  login: publicProcedure
    .input(loginSchema)
    .mutation(({ input, ctx }) => AuthService.login(input as LoginInput, ctx)),

  completeProfile: protectedProcedure
    .use(isAuthed)
    .input(completeProfileSchema)
    .mutation(({ input, ctx }) =>
      AuthService.completeProfile(
        ctx.session.user.id,
        input as CompleteProfileInput
      )
    ),

  logout: protectedProcedure
    .use(isAuthed)
    .mutation(({ ctx }) => AuthService.logout(ctx)),

  getSession: publicProcedure.query(({ ctx }) => ctx.session),

  // Accept any non-empty string as user ID (not necessarily a UUID)
  getUserById: publicProcedure
    .input(z.string().min(1))
    .query(({ input }) => AuthService.getUserById(input)),

  modifyName: protectedProcedure
    .use(isAuthed)
    .input(
      z.object({ id: z.string().min(1), name: z.string().min(1) })
    )
    .mutation(({ input }) => AuthService.updateName(input.id, input.name)),

  modifydniName: protectedProcedure
    .use(isAuthed)
    .input(
      z.object({ id: z.string().min(1), dniName: z.string().min(3) })
    )
    .mutation(({ input }) =>
      AuthService.updateDniName(input.id, input.dniName)
    ),

  modifydni: protectedProcedure
    .use(isAuthed)
    .input(z.object({ id: z.string().min(1), dni: z.string().min(5) }))
    .mutation(({ input }) => AuthService.updateDni(input.id, input.dni)),

  modifyPhone: protectedProcedure
    .use(isAuthed)
    .input(z.object({ id: z.string().min(1), phone: z.string().min(8) }))
    .mutation(({ input }) => AuthService.updatePhone(input.id, input.phone)),

  modifyBirthdate: protectedProcedure
    .use(isAuthed)
    .input(
      z.object({
        id: z.string().min(1),
        birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .mutation(({ input }) =>
      AuthService.updateBirthdate(input.id, input.birthdate)
    ),
});
