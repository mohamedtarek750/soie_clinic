import type { NextRequest } from "next/server";
import { assertCsrf, errorResponse, json } from "@/lib/http";
import { clearSessionCookie, getSession } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const session = await getSession();
    await clearSessionCookie();
    if (session) audit({ userId: session.sub, action: "auth.logout", entity: "User", entityId: session.sub, req });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
