import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, newResetToken } from "@/lib/passwords";
import { registerSchema } from "@/lib/validation";
import { assertCsrf, assertRateLimit, errorResponse, json, parseBody, HttpError } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";
import { audit } from "@/lib/audit";
import { sendMail } from "@/lib/mailer";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    assertRateLimit(req, "auth.register", 5, 15 * 60_000);
    const input = await parseBody(req, registerSchema);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new HttpError(409, "An account with this email already exists.");

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone || null,
        passwordHash: await hashPassword(input.password),
      },
    });

    // optional email verification (non-blocking for the user)
    const token = newResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: token.hash,
        purpose: "email_verify",
        expiresAt: new Date(Date.now() + 48 * 3600_000),
      },
    });
    void sendMail({
      to: user.email,
      subject: "Welcome to Soie Clinic — verify your email",
      text: `Hello ${user.name},\n\nWelcome to Soie Clinic. Confirm your email address by opening:\n${env.appOrigin}/api/auth/verify-email?token=${token.raw}\n\nIf you did not create this account, you can ignore this message.`,
    });

    await setSessionCookie({ sub: user.id, role: user.role, name: user.name });
    audit({ userId: user.id, action: "auth.register", entity: "User", entityId: user.id, req });

    return json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
