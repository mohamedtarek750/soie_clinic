import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name.").max(120),
  email: emailSchema,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const bookingSchema = z.object({
  doctorId: z.string().min(1, "Choose a doctor."),
  serviceId: z.string().min(1, "Choose a treatment."),
  startsAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const rescheduleSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema.optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(2000),
});
