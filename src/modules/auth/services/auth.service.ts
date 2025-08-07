// src/modules/auth/services/auth.service.ts

import { prisma } from "@/server/db/client";
import bcrypt from "bcryptjs";
import type { Context } from "@/server/trpc/context";
import type { Role } from "../types/auth.types";
import { AuthError } from "../types/auth.types";
import type { RegisterInput } from "../schemas/register.schema";
import type { LoginInput } from "../schemas/login.schema";
import type { CompleteProfileInput } from "../schemas/completeProfile.schema";

export class AuthService {
  static async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AuthError("Email already registered");

    const hash = await bcrypt.hash(input.password, 12);
    await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hash,
        role: "USER" as Role,
      },
    });
    return { success: true };
  }

  static async login(input: LoginInput, ctx: Context) {
    if (!ctx.session) throw new AuthError("Session not initialized");

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.password) throw new AuthError("Invalid credentials");
    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new AuthError("Invalid credentials");

    ctx.session.user = {
      id: user.id,
      role: user.role as Role,
      profileCompleted: Boolean(user.dniName && user.dni && user.phone && user.birthdate),
      image: user.image || "",
      name: user.name,
      email: user.email,
    };
    return { success: true };
  }

  static async completeProfile(userId: string, input: CompleteProfileInput) {
    const birthdate =
      typeof input.birthdate === "string"
        ? new Date(input.birthdate + "T00:00:00.000Z")
        : input.birthdate;

    return prisma.user.update({
      where: { id: userId },
      data: {
        dniName: input.dniName,
        dni: input.dni,
        phone: input.phone,
        birthdate,
      },
    });
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        dniName: true,
        dni: true,
        phone: true,
        birthdate: true,
      },
    });
    if (!user) throw new AuthError("User not found");
    return user;
  }

  static async updateName(userId: string, name: string) {
    return prisma.user.update({ where: { id: userId }, data: { name } });
  }

  static async updateDniName(userId: string, dniName: string) {
    return prisma.user.update({ where: { id: userId }, data: { dniName } });
  }

  static async updateDni(userId: string, dni: string) {
    return prisma.user.update({ where: { id: userId }, data: { dni } });
  }

  static async updatePhone(userId: string, phone: string) {
    return prisma.user.update({ where: { id: userId }, data: { phone } });
  }

  static async updateBirthdate(userId: string, birthdateInput: string) {
    const birthdate = new Date(birthdateInput + "T00:00:00.000Z");
    return prisma.user.update({ where: { id: userId }, data: { birthdate } });
  }

  static async logout(ctx: Context) {
    if (!ctx.session) throw new AuthError("Session not initialized");
    return { success: true };
  }
}
