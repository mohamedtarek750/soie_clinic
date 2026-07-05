import type { NotificationType } from "@prisma/client";
import { prisma } from "./db";
import { sendMail } from "./mailer";

/** In-app notification + best-effort email, never blocking the request. */
export async function notifyUser(opts: {
  userId: string;
  email?: string | null;
  type: NotificationType;
  title: string;
  body: string;
}) {
  try {
    await prisma.notification.create({
      data: { userId: opts.userId, type: opts.type, title: opts.title, body: opts.body },
    });
  } catch (e) {
    console.error("[notify] db write failed:", e);
  }
  if (opts.email) void sendMail({ to: opts.email, subject: opts.title, text: opts.body });
}
