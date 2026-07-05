import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireRole, HttpError } from "@/lib/http";
import { serviceUpdateSchema } from "@/lib/validation-admin";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const input = await parseBody(req, serviceUpdateSchema);

    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) throw new HttpError(404, "Service not found.");

    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          durationMin: input.durationMin,
          priceCents: input.priceCents,
          isActive: input.isActive,
        },
      });
      if (input.doctorIds) {
        await tx.serviceDoctor.deleteMany({ where: { serviceId: id } });
        await tx.serviceDoctor.createMany({ data: input.doctorIds.map((doctorId) => ({ serviceId: id, doctorId })) });
      }
    });
    audit({ userId: session.sub, action: "service.update", entity: "Service", entityId: id, req });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");
    const { id } = await ctx.params;

    const count = await prisma.appointment.count({ where: { serviceId: id } });
    if (count > 0) {
      await prisma.service.update({ where: { id }, data: { isActive: false } });
      audit({ userId: session.sub, action: "service.disable", entity: "Service", entityId: id, req });
      return json({ ok: true, deactivated: true, message: "Service has appointment history, so it was disabled instead of deleted." });
    }
    await prisma.service.delete({ where: { id } });
    audit({ userId: session.sub, action: "service.delete", entity: "Service", entityId: id, req });
    return json({ ok: true, deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
