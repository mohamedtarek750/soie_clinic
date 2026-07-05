import { z } from "zod";

const cents = z.number().int().min(0).max(100_000_000);
const pct = z.number().min(0).max(100);

export const scheduleBlockSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(24 * 60),
  endMinute: z.number().int().min(0).max(24 * 60),
});

export const doctorCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, digits and dashes only.")
    .max(80),
  specialty: z.string().trim().min(2).max(160),
  bio: z.string().trim().max(2000).optional().default(""),
  photoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  instagramUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
  monthlySalaryCents: cents.optional().default(0),
  commissionPct: pct.optional().default(0),
  isActive: z.boolean().optional().default(true),
  schedules: z.array(scheduleBlockSchema).max(7).optional(),
  serviceIds: z.array(z.string()).optional(),
});

export const doctorUpdateSchema = doctorCreateSchema.partial();

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .max(80),
  description: z.string().trim().max(2000).optional().default(""),
  durationMin: z.number().int().min(10).max(480),
  priceCents: cents,
  isActive: z.boolean().optional().default(true),
  doctorIds: z.array(z.string()).optional(),
});

export const serviceUpdateSchema = serviceCreateSchema.partial();

export const productCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .max(80),
  description: z.string().trim().max(2000).optional().default(""),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  priceCents: cents,
  stockQty: z.number().int().min(0).max(1_000_000).optional().default(0),
  lowStockThreshold: z.number().int().min(0).max(100_000).optional().default(5),
  isActive: z.boolean().optional().default(true),
});

export const productUpdateSchema = productCreateSchema.partial();

export const stockAdjustSchema = z.object({
  qty: z.number().int().min(-100_000).max(100_000).refine((v) => v !== 0, "Quantity cannot be zero."),
  type: z.enum(["PURCHASE", "ADJUSTMENT", "RETURN"]),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const productSellSchema = z.object({
  qty: z.number().int().min(1).max(10_000),
  method: z.enum(["CASH", "CARD", "TRANSFER", "WALLET"]).default("CASH"),
});

export const appointmentActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("no_show") }),
  z.object({
    action: z.literal("complete"),
    amountCents: cents,
    method: z.enum(["CASH", "CARD", "TRANSFER", "WALLET"]).default("CASH"),
  }),
  z.object({ action: z.literal("notes"), adminNotes: z.string().trim().max(2000) }),
  z.object({ action: z.literal("referral"), referredByDoctorId: z.string().nullable() }),
  z.object({
    action: z.literal("assign"),
    doctorId: z.string(),
    startsAt: z.string().datetime({ offset: true }),
  }),
]);

export const expenseCreateSchema = z.object({
  category: z.enum(["RENT", "UTILITIES", "SUPPLIES", "MARKETING", "MAINTENANCE", "SALARIES", "OTHER"]),
  description: z.string().trim().min(2).max(300),
  amountCents: cents,
  incurredAt: z.string().datetime({ offset: true }).optional(),
});

export const salaryUpsertSchema = z.object({
  doctorId: z.string(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  bonusCents: cents.optional().default(0),
  deductionsCents: cents.optional().default(0),
  markPaid: z.boolean().optional().default(false),
});

export const settingsSchema = z.object({
  default_commission_pct: pct.optional(),
  slot_step_minutes: z.number().int().min(10).max(120).optional(),
});
