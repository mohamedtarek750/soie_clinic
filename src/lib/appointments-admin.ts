/**
 * Admin-side appointment workflow. Completing an appointment records the
 * payment and, when the visit was referred by a doctor, writes that
 * doctor's commission at their configured percentage — so clinic
 * revenue, doctor commission and net profit always reconcile.
 */
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./http";

export async function completeAppointment(opts: {
  appointmentId: string;
  amountCents: number;
  method: PaymentMethod;
  recordedById: string;
}) {
  const appt = await prisma.appointment.findUnique({
    where: { id: opts.appointmentId },
    include: { referredBy: true, payment: true },
  });
  if (!appt) throw new HttpError(404, "Appointment not found.");
  if (appt.status === "COMPLETED") throw new HttpError(422, "Already completed.");
  if (appt.payment) throw new HttpError(422, "A payment is already recorded for this appointment.");
  if (opts.amountCents < 0 || opts.amountCents > 100_000_000) throw new HttpError(422, "Invalid amount.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: appt.id },
      data: { status: "COMPLETED" },
    });
    await tx.payment.create({
      data: {
        appointmentId: appt.id,
        amountCents: opts.amountCents,
        method: opts.method,
        recordedById: opts.recordedById,
      },
    });
    if (appt.referredBy && Number(appt.referredBy.commissionPct) > 0 && opts.amountCents > 0) {
      const pct = Number(appt.referredBy.commissionPct);
      await tx.commissionEntry.create({
        data: {
          doctorId: appt.referredBy.id,
          appointmentId: appt.id,
          pct,
          amountCents: Math.round((opts.amountCents * pct) / 100),
        },
      });
    }
    return updated;
  });
}
