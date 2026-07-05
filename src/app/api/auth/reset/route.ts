import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/passwords";
import { resetSchema } from "@/lib/validation";
import { assertCsrf, assertRateLimit, errorResponse, json, parseBody, HttpError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    assertRateLimit(req, "auth.reset", 10, 15 * 60_000);
    const { token, password } = await parseBody(req, resetSchema);

    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!row || row.purpose !== "password_reset" || row.usedAt || row.expiresAt < new Date()) {
      throw new HttpError(400, "This reset link is invalid or has expired. Request a new one.");
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } }),
      prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    ]);
    audit({ userId: row.userId, action: "auth.reset", entity: "User", entityId: row.userId, req });

    return json({ ok: true, message: "Password updated. You can sign in now." });
  } catch (err) {
    return errorResponse(err);
  }
}
