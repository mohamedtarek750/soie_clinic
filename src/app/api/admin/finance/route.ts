import type { NextRequest } from "next/server";
import { errorResponse, json, requireRole, HttpError } from "@/lib/http";
import { financeSummary } from "@/lib/reports";
import { prisma } from "@/lib/db";
import { clinicDateStr } from "@/lib/tz";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const q = req.nextUrl.searchParams;
    const today = clinicDateStr(new Date());
    const from = q.get("from") || today.slice(0, 8) + "01";
    const to = q.get("to") || today;
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) throw new HttpError(422, "from/to must be YYYY-MM-DD.");

    const [summary, expenses, commissions] = await Promise.all([
      financeSummary(from, to),
      prisma.expense.findMany({
        orderBy: { incurredAt: "desc" },
        take: 50,
        include: { recordedBy: { select: { name: true } } },
      }),
      prisma.commissionEntry.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          doctor: { select: { name: true } },
          appointment: { select: { service: { select: { name: true } }, startsAt: true } },
        },
      }),
    ]);
    return json({
      from,
      to,
      summary,
      expenses,
      commissions: commissions.map((c) => ({
        id: c.id,
        doctor: c.doctor.name,
        service: c.appointment.service.name,
        when: c.appointment.startsAt,
        pct: Number(c.pct),
        amountCents: c.amountCents,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
