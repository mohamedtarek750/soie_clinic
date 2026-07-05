import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, assertRateLimit, errorResponse, json, parseBody, requireSession } from "@/lib/http";
import { bookingSchema } from "@/lib/validation";
import { createAppointmentSafely } from "@/lib/slots";
import { clinicDateTimeLabel } from "@/lib/tz";
import { audit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

/** The signed-in patient's appointments. */
export async function GET() {
  try {
    const session = await requireSession();
    const appointments = await prisma.appointment.findMany({
      where: { patientId: session.sub },
      orderBy: { startsAt: "desc" },
      take: 100,
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        notes: true,
        doctor: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, durationMin: true, priceCents: true } },
      },
    });
    return json({ appointments });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Book a new appointment. */
export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const session = await requireSession();
    assertRateLimit(req, "appointments.create", 10, 10 * 60_000, session.sub);
    const input = await parseBody(req, bookingSchema);

    const appointment = await createAppointmentSafely({
      patientId: session.sub,
      doctorId: input.doctorId,
      serviceId: input.serviceId,
      startsAt: new Date(input.startsAt),
      notes: input.notes || null,
    });

    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    const when = clinicDateTimeLabel(appointment.startsAt);
    void notifyUser({
      userId: session.sub,
      email: user?.email,
      type: "BOOKING_CONFIRMED",
      title: "Your Soie Clinic booking request",
      body: `Thank you ${session.name}. Your request for ${appointment.service.name} with ${appointment.doctor.name} on ${when} has been received and is pending confirmation by our team.`,
    });
    audit({ userId: session.sub, action: "appointment.create", entity: "Appointment", entityId: appointment.id, req });

    return json(
      {
        ok: true,
        appointment: {
          id: appointment.id,
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
          status: appointment.status,
          doctor: appointment.doctor.name,
          service: appointment.service.name,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
