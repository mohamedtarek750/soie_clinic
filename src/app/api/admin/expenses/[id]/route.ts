import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, requireRole, HttpError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const exists = await prisma.expense.findUnique({ where: { id } });
    if (!exists) throw new HttpError(404, "Expense not found.");
    await prisma.expense.delete({ where: { id } });
    audit({ userId: session.sub, action: "expense.delete", entity: "Expense", entityId: id, req });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
