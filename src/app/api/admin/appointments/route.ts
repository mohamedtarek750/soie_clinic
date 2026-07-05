import type { NextRequest } from "next/server";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { errorResponse, json, requireRole } from "@/lib/http";
import { clinicTimeToUtc } from "@/lib/tz";

const STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"];

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const q = req.nextUrl.searchParams;

    const where: Prisma.AppointmentWhereInput = {};
    const status = q.get("status");
    if (status && STATUSES.includes(status)) where.status = status as AppointmentStatus;
    const doctorId = q.get("doctorId");
    if (doctorId) where.doctorId = doctorId;
    const from = q.get("from");
    const to = q.get("to");
    if (from || to) {
      where.startsAt = {
        ...(from ? { gte: clinicTimeToUtc(from, 0) } : {}),
        ...(to ? { lt: clinicTimeToUtc(to, 24 * 60) } : {}),
      };
    }
    const search = q.get("q")?.trim();
    if (search) {
      where.patient = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const page = Math.max(1, Number(q.get("page") || 1));
    const take = 25;
    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        orderBy: { startsAt: "desc" },
        skip: (page - 1) * take,
        take,
        select: {
          id: true,
          startsAt: true,
          status: true,
          notes: true,
          adminNotes: true,
          doctorId: true,
          serviceId: true,
          referredByDoctorId: true,
          patient: { select: { name: true, email: true, phone: true } },
          doctor: { select: { name: true } },
          service: { select: { name: true, priceCents: true } },
          payment: { select: { amountCents: true, method: true } },
        },
      }),
    ]);
    return json({ total, page, pageSize: take, appointments });
  } catch (err) {
    return errorResponse(err);
  }
}
