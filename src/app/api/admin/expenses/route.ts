import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireRole } from "@/lib/http";
import { expenseCreateSchema } from "@/lib/validation-admin";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");
    const input = await parseBody(req, expenseCreateSchema);
    const expense = await prisma.expense.create({
      data: {
        category: input.category,
        description: input.description,
        amountCents: input.amountCents,
        incurredAt: input.incurredAt ? new Date(input.incurredAt) : new Date(),
        recordedById: session.sub,
      },
    });
    audit({ userId: session.sub, action: "expense.create", entity: "Expense", entityId: expense.id, req });
    return json({ ok: true, id: expense.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
