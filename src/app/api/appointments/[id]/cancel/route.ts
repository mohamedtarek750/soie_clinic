import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, requireSession, HttpError } from "@/lib/http";
import { MIN_NOTICE_HOURS } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { clinicDateTimeLabel } from "@/lib/tz";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertCsrf(req);
    const session = await requireSession();
    const { id } = await ctx.params;

    const appt = await prisma.appointment.findFirst({
      where: { id, patientId: session.sub },
      include: { service: true, doctor: true, patient: true },
    });
    if (!appt) throw new HttpError(404, "Appointment not found.");
    if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") {
      throw new HttpError(422, `This appointment is already ${appt.status.toLowerCase()}.`);
    }
    const hoursLeft = (appt.startsAt.getTime() - Date.now()) / 3600_000;
    if (hoursLeft < MIN_NOTICE_HOURS) {
      throw new HttpError(
        422,
        `Online cancellation closes ${MIN_NOTICE_HOURS} hours before the appointment. Please call the clinic.`,
      );
    }

    const updated = await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELLED", cancelReason: "Cancelled by patient" },
    });
    void notifyUser({
      userId: session.sub,
      email: appt.patient.email,
      type: "BOOKING_CANCELLED",
      title: "Your Soie Clinic appointment was cancelled",
      body: `Your ${appt.service.name} with ${appt.doctor.name} on ${clinicDateTimeLabel(appt.startsAt)} has been cancelled. We hope to see you another time.`,
    });
    audit({ userId: session.sub, action: "appointment.cancel", entity: "Appointment", entityId: appt.id, req });

    return json({ ok: true, status: updated.status });
  } catch (err) {
    return errorResponse(err);
  }
}
