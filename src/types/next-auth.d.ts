// src/types/next-auth-d.ts
import type { DefaultSession, DefaultUser } from "next-auth";

type UserRole = "USER" | "PROMOTER" | "ADMIN" | "FINANCE" | "SUPPORT"; // ajuste conforme seu sistema

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      profileCompleted: boolean;
      role: UserRole;
      image: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    profileCompleted: boolean;
    role: UserRole;
    image: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    profileCompleted: boolean;
    role: UserRole;
    image: string;
  }
}
