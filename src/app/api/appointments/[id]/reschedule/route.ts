import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireSession, HttpError } from "@/lib/http";
import { rescheduleSchema } from "@/lib/validation";
import { MIN_NOTICE_HOURS } from "@/lib/constants";
import { createAppointmentSafely } from "@/lib/slots";
import { audit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { clinicDateTimeLabel } from "@/lib/tz";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertCsrf(req);
    const session = await requireSession();
    const { id } = await ctx.params;
    const { startsAt } = await parseBody(req, rescheduleSchema);

    const appt = await prisma.appointment.findFirst({
      where: { id, patientId: session.sub },
      include: { patient: true, service: true, doctor: true },
    });
    if (!appt) throw new HttpError(404, "Appointment not found.");
    if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") {
      throw new HttpError(422, `This appointment is already ${appt.status.toLowerCase()} and cannot be moved.`);
    }
    const hoursLeft = (appt.startsAt.getTime() - Date.now()) / 3600_000;
    if (hoursLeft < MIN_NOTICE_HOURS) {
      throw new HttpError(
        422,
        `Online rescheduling closes ${MIN_NOTICE_HOURS} hours before the appointment. Please call the clinic.`,
      );
    }

    // mark the old appointment as moved first so its slot frees up,
    // then create the replacement; roll back if the new slot fails
    const prev = await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "RESCHEDULED" },
    });
    try {
      const next = await createAppointmentSafely({
        patientId: session.sub,
        doctorId: appt.doctorId,
        serviceId: appt.serviceId,
        startsAt: new Date(startsAt),
        notes: appt.notes,
        referredByDoctorId: appt.referredByDoctorId,
        rescheduledFromId: appt.id,
      });
      void notifyUser({
        userId: session.sub,
        email: appt.patient.email,
        type: "BOOKING_RESCHEDULED",
        title: "Your Soie Clinic appointment was rescheduled",
        body: `Your ${appt.service.name} with ${appt.doctor.name} has moved to ${clinicDateTimeLabel(next.startsAt)}. The new time is pending confirmation.`,
      });
      audit({
        userId: session.sub,
        action: "appointment.reschedule",
        entity: "Appointment",
        entityId: appt.id,
        meta: { newAppointmentId: next.id },
        req,
      });
      return json({ ok: true, appointment: { id: next.id, startsAt: next.startsAt, status: next.status } });
    } catch (e) {
      await prisma.appointment.update({ where: { id: prev.id }, data: { status: appt.status } });
      throw e;
    }
  } catch (err) {
    return errorResponse(err);
  }
}
