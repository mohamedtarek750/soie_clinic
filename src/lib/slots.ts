/**
 * Scheduling engine.
 *
 * A doctor's availability on a date = their working block for that
 * weekday, stepped on the slot grid, minus anything that overlaps a
 * blocking appointment. Bookings re-check for conflicts inside a
 * SERIALIZABLE transaction, so two clients grabbing the same slot at the
 * same moment cannot both succeed.
 */
import { Prisma, AppointmentStatus } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./http";
import {
  BLOCKING_STATUSES,
  BOOKING_HORIZON_DAYS,
  BOOKING_LEAD_MINUTES,
  DEFAULT_SLOT_STEP_MIN,
} from "./constants";
import { clinicTimeToUtc, clinicWeekday } from "./tz";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type Slot = { startsAt: Date; endsAt: Date };

async function slotStepMin(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: "slot_step_minutes" } });
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) && n >= 10 && n <= 120 ? n : DEFAULT_SLOT_STEP_MIN;
}

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && aEnd > bStart;

export async function getAvailableSlots(doctorId: string, serviceId: string, dateStr: string): Promise<Slot[]> {
  if (!DATE_RE.test(dateStr)) throw new HttpError(422, "date must be YYYY-MM-DD.");

  const [doctor, service, step] = await Promise.all([
    prisma.doctor.findFirst({
      where: { id: doctorId, isActive: true },
      include: { schedules: true, services: { where: { serviceId } } },
    }),
    prisma.service.findFirst({ where: { id: serviceId, isActive: true } }),
    slotStepMin(),
  ]);
  if (!doctor) throw new HttpError(404, "Doctor not found or inactive.");
  if (!service) throw new HttpError(404, "Service not found or inactive.");
  if (doctor.services.length === 0) throw new HttpError(422, "This doctor does not offer the selected treatment.");

  const weekday = clinicWeekday(dateStr);
  const block = doctor.schedules.find((s) => s.weekday === weekday);
  if (!block) return []; // day off

  const now = new Date();
  const earliest = new Date(now.getTime() + BOOKING_LEAD_MINUTES * 60_000);
  const horizon = new Date(now.getTime() + BOOKING_HORIZON_DAYS * 24 * 3600_000);

  const dayStart = clinicTimeToUtc(dateStr, 0);
  const dayEnd = clinicTimeToUtc(dateStr, 24 * 60);
  if (dayEnd <= now || dayStart > horizon) return [];

  const busy = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: { in: BLOCKING_STATUSES as unknown as AppointmentStatus[] },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
    },
    select: { startsAt: true, endsAt: true },
  });

  const slots: Slot[] = [];
  for (let m = block.startMinute; m + service.durationMin <= block.endMinute; m += step) {
    const startsAt = clinicTimeToUtc(dateStr, m);
    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);
    if (startsAt < earliest || startsAt > horizon) continue;
    if (busy.some((b) => overlaps(startsAt, endsAt, b.startsAt, b.endsAt))) continue;
    slots.push({ startsAt, endsAt });
  }
  return slots;
}

/** Validates the requested instant against the live availability grid. */
async function assertSlotAvailable(doctorId: string, serviceId: string, startsAt: Date): Promise<Slot> {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(startsAt);
  const slots = await getAvailableSlots(doctorId, serviceId, dateStr);
  const match = slots.find((s) => s.startsAt.getTime() === startsAt.getTime());
  if (!match) throw new HttpError(409, "That time is no longer available. Please pick another slot.");
  return match;
}

export type BookingInput = {
  patientId: string;
  doctorId: string;
  serviceId: string;
  startsAt: Date;
  notes?: string | null;
  referredByDoctorId?: string | null;
  rescheduledFromId?: string | null;
  status?: AppointmentStatus;
};

export async function createAppointmentSafely(input: BookingInput) {
  const slot = await assertSlotAvailable(input.doctorId, input.serviceId, input.startsAt);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // conflict re-check inside the transaction
          const clash = await tx.appointment.findFirst({
            where: {
              doctorId: input.doctorId,
              status: { in: BLOCKING_STATUSES as unknown as AppointmentStatus[] },
              startsAt: { lt: slot.endsAt },
              endsAt: { gt: slot.startsAt },
            },
            select: { id: true },
          });
          if (clash) throw new HttpError(409, "That time was just taken. Please pick another slot.");

          return tx.appointment.create({
            data: {
              patientId: input.patientId,
              doctorId: input.doctorId,
              serviceId: input.serviceId,
              startsAt: slot.startsAt,
              endsAt: slot.endsAt,
              notes: input.notes || null,
              referredByDoctorId: input.referredByDoctorId ?? null,
              rescheduledFromId: input.rescheduledFromId ?? null,
              status: input.status ?? "PENDING",
            },
            include: { doctor: true, service: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      // serialization conflict → one retry; anything else bubbles up
      const retriable =
        e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2034" || e.code === "40001");
      if (!retriable || attempt === 1) throw e;
    }
  }
  throw new HttpError(409, "That time was just taken. Please pick another slot.");
}
