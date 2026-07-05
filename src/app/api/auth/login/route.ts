import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import { loginSchema } from "@/lib/validation";
import { assertCsrf, assertRateLimit, errorResponse, json, parseBody, HttpError } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const input = await parseBody(req, loginSchema);
    // limit by IP and by target account so one address can't be brute forced
    assertRateLimit(req, "auth.login", 10, 15 * 60_000);
    assertRateLimit(req, "auth.login.email", 5, 15 * 60_000, input.email);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const valid = user && (await verifyPassword(input.password, user.passwordHash));
    if (!valid || !user) throw new HttpError(401, "Incorrect email or password.");
    if (!user.isActive) throw new HttpError(403, "This account has been deactivated. Contact the clinic.");

    await setSessionCookie({ sub: user.id, role: user.role, name: user.name });
    audit({ userId: user.id, action: "auth.login", entity: "User", entityId: user.id, req });

    return json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    return errorResponse(err);
  }
}
