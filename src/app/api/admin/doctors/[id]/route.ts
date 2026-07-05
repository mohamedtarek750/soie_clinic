import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireRole, HttpError } from "@/lib/http";
import { doctorUpdateSchema } from "@/lib/validation-admin";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const input = await parseBody(req, doctorUpdateSchema);

    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) throw new HttpError(404, "Doctor not found.");

    await prisma.$transaction(async (tx) => {
      await tx.doctor.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          specialty: input.specialty,
          bio: input.bio,
          photoUrl: input.photoUrl === "" ? null : input.photoUrl,
          instagramUrl: input.instagramUrl === "" ? null : input.instagramUrl,
          monthlySalaryCents: input.monthlySalaryCents,
          commissionPct: input.commissionPct,
          isActive: input.isActive,
        },
      });
      if (input.schedules) {
        await tx.doctorSchedule.deleteMany({ where: { doctorId: id } });
        await tx.doctorSchedule.createMany({
          data: input.schedules
            .filter((s) => s.endMinute > s.startMinute)
            .map((s) => ({ ...s, doctorId: id })),
        });
      }
      if (input.serviceIds) {
        await tx.serviceDoctor.deleteMany({ where: { doctorId: id } });
        await tx.serviceDoctor.createMany({ data: input.serviceIds.map((serviceId) => ({ serviceId, doctorId: id })) });
      }
    });
    audit({ userId: session.sub, action: "doctor.update", entity: "Doctor", entityId: id, req });
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

    const count = await prisma.appointment.count({ where: { doctorId: id } });
    if (count > 0) {
      // history must survive — deactivate instead of deleting
      await prisma.doctor.update({ where: { id }, data: { isActive: false } });
      audit({ userId: session.sub, action: "doctor.deactivate", entity: "Doctor", entityId: id, req });
      return json({ ok: true, deactivated: true, message: "Doctor has appointment history, so the profile was deactivated instead of deleted." });
    }
    await prisma.doctor.delete({ where: { id } });
    audit({ userId: session.sub, action: "doctor.delete", entity: "Doctor", entityId: id, req });
    return json({ ok: true, deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
