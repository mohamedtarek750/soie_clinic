import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { newResetToken } from "@/lib/passwords";
import { forgotSchema } from "@/lib/validation";
import { assertCsrf, assertRateLimit, errorResponse, json, parseBody } from "@/lib/http";
import { sendMail } from "@/lib/mailer";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    assertRateLimit(req, "auth.forgot", 5, 15 * 60_000);
    const { email } = await parseBody(req, forgotSchema);

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = newResetToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: token.hash,
          purpose: "password_reset",
          expiresAt: new Date(Date.now() + 3600_000), // 1 hour
        },
      });
      void sendMail({
        to: user.email,
        subject: "Reset your Soie Clinic password",
        text: `Hello ${user.name},\n\nYou asked to reset your password. Open this link within one hour:\n${env.appOrigin}/reset-password?token=${token.raw}\n\nIf this wasn't you, ignore this message — your password is unchanged.`,
      });
      audit({ userId: user.id, action: "auth.forgot", entity: "User", entityId: user.id, req });
    }

    // identical response whether or not the account exists
    return json({ ok: true, message: "If that email belongs to an account, a reset link is on its way." });
  } catch (err) {
    return errorResponse(err);
  }
}
