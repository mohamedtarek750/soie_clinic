import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireRole, HttpError } from "@/lib/http";
import { appointmentActionSchema } from "@/lib/validation-admin";
import { completeAppointment } from "@/lib/appointments-admin";
import { createAppointmentSafely } from "@/lib/slots";
import { audit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { clinicDateTimeLabel } from "@/lib/tz";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN", "STAFF");
    const { id } = await ctx.params;
    const input = await parseBody(req, appointmentActionSchema);

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, service: true, doctor: true },
    });
    if (!appt) throw new HttpError(404, "Appointment not found.");

    switch (input.action) {
      case "confirm": {
        if (appt.status !== "PENDING") throw new HttpError(422, "Only pending appointments can be confirmed.");
        await prisma.appointment.update({ where: { id }, data: { status: "CONFIRMED" } });
        void notifyUser({
          userId: appt.patientId,
          email: appt.patient.email,
          type: "BOOKING_CONFIRMED",
          title: "Your Soie Clinic appointment is confirmed",
          body: `${appt.service.name} with ${appt.doctor.name} on ${clinicDateTimeLabel(appt.startsAt)}. We look forward to seeing you.`,
        });
        break;
      }
      case "cancel": {
        if (appt.status === "COMPLETED") throw new HttpError(422, "Completed appointments cannot be cancelled.");
        await prisma.appointment.update({
          where: { id },
          data: { status: "CANCELLED", cancelReason: input.reason || "Cancelled by clinic" },
        });
        void notifyUser({
          userId: appt.patientId,
          email: appt.patient.email,
          type: "BOOKING_CANCELLED",
          title: "Your Soie Clinic appointment was cancelled",
          body: `${appt.service.name} on ${clinicDateTimeLabel(appt.startsAt)} was cancelled. Please contact us to find a new time.`,
        });
        break;
      }
      case "no_show": {
        if (appt.status !== "CONFIRMED" && appt.status !== "PENDING")
          throw new HttpError(422, "Only open appointments can be marked as no-show.");
        await prisma.appointment.update({ where: { id }, data: { status: "NO_SHOW" } });
        break;
      }
      case "complete": {
        await completeAppointment({
          appointmentId: id,
          amountCents: input.amountCents,
          method: input.method ?? "CASH",
          recordedById: session.sub,
        });
        break;
      }
      case "notes": {
        await prisma.appointment.update({ where: { id }, data: { adminNotes: input.adminNotes } });
        break;
      }
      case "referral": {
        await prisma.appointment.update({ where: { id }, data: { referredByDoctorId: input.referredByDoctorId } });
        break;
      }
      case "assign": {
        if (appt.status !== "PENDING" && appt.status !== "CONFIRMED")
          throw new HttpError(422, "Only open appointments can be moved.");
        const prevStatus = appt.status;
        await prisma.appointment.update({ where: { id }, data: { status: "RESCHEDULED" } });
        try {
          const next = await createAppointmentSafely({
            patientId: appt.patientId,
            doctorId: input.doctorId,
            serviceId: appt.serviceId,
            startsAt: new Date(input.startsAt),
            notes: appt.notes,
            referredByDoctorId: appt.referredByDoctorId,
            rescheduledFromId: appt.id,
            status: "CONFIRMED",
          });
          void notifyUser({
            userId: appt.patientId,
            email: appt.patient.email,
            type: "BOOKING_RESCHEDULED",
            title: "Your Soie Clinic appointment was moved",
            body: `${appt.service.name} is now on ${clinicDateTimeLabel(next.startsAt)} with ${next.doctor.name}.`,
          });
        } catch (e) {
          await prisma.appointment.update({ where: { id }, data: { status: prevStatus } });
          throw e;
        }
        break;
      }
    }

    audit({
      userId: session.sub,
      action: `appointment.${input.action}`,
      entity: "Appointment",
      entityId: id,
      req,
    });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
