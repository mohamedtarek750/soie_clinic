import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireSession } from "@/lib/http";
import { profileSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
  try {
    assertCsrf(req);
    const session = await requireSession();
    const input = await parseBody(req, profileSchema);
    const user = await prisma.user.update({
      where: { id: session.sub },
      data: { name: input.name, phone: input.phone || null },
      select: { id: true, name: true, email: true, phone: true },
    });
    audit({ userId: session.sub, action: "profile.update", entity: "User", entityId: session.sub, req });
    return json({ ok: true, user });
  } catch (err) {
    return errorResponse(err);
  }
}
