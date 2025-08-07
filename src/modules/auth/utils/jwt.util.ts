import jwt from "jsonwebtoken";
import { Role } from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET!;
const EXPIRES_IN = "1d";

export const generateJWT = (payload: { id: string; role: Role }) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });

export const verifyJWT = (token: string) =>
  jwt.verify(token, JWT_SECRET) as { id: string; role: Role };