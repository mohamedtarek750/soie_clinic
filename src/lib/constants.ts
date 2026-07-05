/** Clinic business rules, in one place. */
export const CLINIC_TZ = "Africa/Cairo";

/** Bookings must start at least this many minutes from now. */
export const BOOKING_LEAD_MINUTES = 60;

/** How far ahead patients may book. */
export const BOOKING_HORIZON_DAYS = 60;

/** Patients can cancel / reschedule up to this many hours before start. */
export const MIN_NOTICE_HOURS = 12;

/** Slot grid step (minutes). Kept in Settings for future per-clinic tuning. */
export const DEFAULT_SLOT_STEP_MIN = 30;

/** Appointment statuses that block a time slot. */
export const BLOCKING_STATUSES = ["PENDING", "CONFIRMED"] as const;
