import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, requireRole, HttpError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN", "STAFF");
    const { id } = await ctx.params;
    const row = await prisma.contactRequest.findUnique({ where: { id } });
    if (!row) throw new HttpError(404, "Contact request not found.");
    const updated = await prisma.contactRequest.update({
      where: { id },
      data: { handledAt: row.handledAt ? null : new Date() },
    });
    audit({ userId: session.sub, action: "contact.toggle", entity: "ContactRequest", entityId: id, req });
    return json({ ok: true, handledAt: updated.handledAt });
  } catch (err) {
    return errorResponse(err);
  }
}
