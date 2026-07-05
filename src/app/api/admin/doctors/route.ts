import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireRole, HttpError } from "@/lib/http";
import { doctorCreateSchema } from "@/lib/validation-admin";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const doctors = await prisma.doctor.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        schedules: { orderBy: { weekday: "asc" } },
        services: { select: { serviceId: true } },
        _count: { select: { appointments: true } },
      },
    });
    return json({
      doctors: doctors.map((d) => ({
        ...d,
        commissionPct: Number(d.commissionPct),
        services: d.services.map((s) => s.serviceId),
        appointmentCount: d._count.appointments,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");
    const input = await parseBody(req, doctorCreateSchema);

    const exists = await prisma.doctor.findUnique({ where: { slug: input.slug } });
    if (exists) throw new HttpError(409, "A doctor with this slug already exists.");

    const doctor = await prisma.doctor.create({
      data: {
        name: input.name,
        slug: input.slug,
        specialty: input.specialty,
        bio: input.bio ?? "",
        photoUrl: input.photoUrl || null,
        instagramUrl: input.instagramUrl || null,
        monthlySalaryCents: input.monthlySalaryCents ?? 0,
        commissionPct: input.commissionPct ?? 0,
        isActive: input.isActive ?? true,
        schedules: input.schedules
          ? { create: input.schedules.filter((s) => s.endMinute > s.startMinute) }
          : undefined,
        services: input.serviceIds ? { create: input.serviceIds.map((serviceId) => ({ serviceId })) } : undefined,
      },
    });
    audit({ userId: session.sub, action: "doctor.create", entity: "Doctor", entityId: doctor.id, req });
    return json({ ok: true, id: doctor.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
