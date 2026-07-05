import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const ROUNDS = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** Opaque one-time token: the raw value goes to the user, only its hash is stored. */
export function newResetToken() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}
