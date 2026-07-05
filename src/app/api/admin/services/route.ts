import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireRole, HttpError } from "@/lib/http";
import { serviceCreateSchema } from "@/lib/validation-admin";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const services = await prisma.service.findMany({
      orderBy: { sortOrder: "asc" },
      include: { doctors: { select: { doctorId: true } }, _count: { select: { appointments: true } } },
    });
    return json({
      services: services.map((s) => ({
        ...s,
        doctors: s.doctors.map((d) => d.doctorId),
        appointmentCount: s._count.appointments,
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
    const input = await parseBody(req, serviceCreateSchema);

    const exists = await prisma.service.findUnique({ where: { slug: input.slug } });
    if (exists) throw new HttpError(409, "A service with this slug already exists.");

    const service = await prisma.service.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description ?? "",
        durationMin: input.durationMin,
        priceCents: input.priceCents,
        isActive: input.isActive ?? true,
        doctors: input.doctorIds ? { create: input.doctorIds.map((doctorId) => ({ doctorId })) } : undefined,
      },
    });
    audit({ userId: session.sub, action: "service.create", entity: "Service", entityId: service.id, req });
    return json({ ok: true, id: service.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
