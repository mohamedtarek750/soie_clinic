import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireRole, HttpError } from "@/lib/http";
import { salaryUpsertSchema } from "@/lib/validation-admin";
import { audit } from "@/lib/audit";
import { clinicTimeToUtc } from "@/lib/tz";

/** Commission earned by a doctor within a clinic-time month. */
async function monthCommission(doctorId: string, year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextY = month === 12 ? year + 1 : year;
  const nextM = month === 12 ? 1 : month + 1;
  const next = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
  const agg = await prisma.commissionEntry.aggregate({
    _sum: { amountCents: true },
    where: { doctorId, createdAt: { gte: clinicTimeToUtc(first, 0), lt: clinicTimeToUtc(next, 0) } },
  });
  return agg._sum.amountCents ?? 0;
}

/** GET ?year&month → live payroll view for every active doctor. */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const q = req.nextUrl.searchParams;
    const year = Number(q.get("year"));
    const month = Number(q.get("month"));
    if (!year || !month || month < 1 || month > 12) throw new HttpError(422, "year and month are required.");

    const doctors = await prisma.doctor.findMany({ orderBy: { sortOrder: "asc" } });
    const records = await prisma.salaryRecord.findMany({ where: { year, month } });
    const recBy = new Map(records.map((r) => [r.doctorId, r]));

    const rows = await Promise.all(
      doctors.map(async (d) => {
        const commission = await monthCommission(d.id, year, month);
        const rec = recBy.get(d.id);
        const base = rec?.baseCents ?? d.monthlySalaryCents;
        const bonus = rec?.bonusCents ?? 0;
        const deductions = rec?.deductionsCents ?? 0;
        return {
          doctorId: d.id,
          doctor: d.name,
          isActive: d.isActive,
          baseCents: base,
          bonusCents: bonus,
          deductionsCents: deductions,
          commissionCents: commission,
          netCents: base + bonus + commission - deductions,
          paidAt: rec?.paidAt ?? null,
        };
      }),
    );
    return json({ year, month, rows });
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST → save bonus/deductions and optionally mark the month as paid. */
export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");
    const input = await parseBody(req, salaryUpsertSchema);

    const doctor = await prisma.doctor.findUnique({ where: { id: input.doctorId } });
    if (!doctor) throw new HttpError(404, "Doctor not found.");

    const commission = await monthCommission(input.doctorId, input.year, input.month);
    const base = doctor.monthlySalaryCents;
    const bonus = input.bonusCents ?? 0;
    const deductions = input.deductionsCents ?? 0;
    const net = base + bonus + commission - deductions;

    const record = await prisma.salaryRecord.upsert({
      where: { doctorId_year_month: { doctorId: input.doctorId, year: input.year, month: input.month } },
      update: {
        baseCents: base,
        bonusCents: bonus,
        deductionsCents: deductions,
        commissionCents: commission,
        netCents: net,
        paidAt: input.markPaid ? new Date() : undefined,
      },
      create: {
        doctorId: input.doctorId,
        year: input.year,
        month: input.month,
        baseCents: base,
        bonusCents: bonus,
        deductionsCents: deductions,
        commissionCents: commission,
        netCents: net,
        paidAt: input.markPaid ? new Date() : null,
      },
    });
    audit({ userId: session.sub, action: "salary.upsert", entity: "SalaryRecord", entityId: record.id, req });
    return json({ ok: true, netCents: net, paidAt: record.paidAt });
  } catch (err) {
    return errorResponse(err);
  }
}
