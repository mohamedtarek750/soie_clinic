/**
 * Reporting service: every dashboard number and chart series is computed
 * here, from Payments (revenue), Expenses, SalaryRecords and
 * CommissionEntries. Nothing financial is duplicated in extra tables.
 */
import { prisma } from "./db";
import { clinicDateStr, clinicTimeToUtc } from "./tz";

function dayRangeUtc(dateStr: string) {
  return { gte: clinicTimeToUtc(dateStr, 0), lt: clinicTimeToUtc(dateStr, 24 * 60) };
}

function monthRangeUtc(year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextY = month === 12 ? year + 1 : year;
  const nextM = month === 12 ? 1 : month + 1;
  const next = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
  return { gte: clinicTimeToUtc(first, 0), lt: clinicTimeToUtc(next, 0) };
}

async function paidSum(range?: { gte: Date; lt: Date }) {
  const r = await prisma.payment.aggregate({
    _sum: { amountCents: true },
    where: { status: "PAID", ...(range ? { paidAt: range } : {}) },
  });
  return r._sum.amountCents ?? 0;
}

export async function overviewStats() {
  const now = new Date();
  const todayStr = clinicDateStr(now);
  const today = dayRangeUtc(todayStr);
  const month = monthRangeUtc(Number(todayStr.slice(0, 4)), Number(todayStr.slice(5, 7)));

  const [
    todayRevenue,
    monthRevenue,
    totalRevenue,
    todayAppointments,
    upcoming,
    cancelled,
    completed,
    doctorCount,
    patientCount,
    lowStock,
    unhandledContacts,
  ] = await Promise.all([
    paidSum(today),
    paidSum(month),
    paidSum(),
    prisma.appointment.count({ where: { startsAt: today } }),
    prisma.appointment.count({ where: { startsAt: { gt: now }, status: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.appointment.count({ where: { status: "CANCELLED" } }),
    prisma.appointment.count({ where: { status: "COMPLETED" } }),
    prisma.doctor.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.$queryRaw<Array<{ id: string; name: string; stockQty: number; lowStockThreshold: number }>>`
      SELECT id, name, "stockQty", "lowStockThreshold"
      FROM "Product"
      WHERE "isActive" = true AND "stockQty" <= "lowStockThreshold"
      ORDER BY "stockQty" ASC
      LIMIT 10`,
    prisma.contactRequest.count({ where: { handledAt: null } }),
  ]);

  return {
    todayRevenue,
    monthRevenue,
    totalRevenue,
    todayAppointments,
    upcoming,
    cancelled,
    completed,
    doctorCount,
    patientCount,
    lowStock,
    unhandledContacts,
  };
}

/** Daily revenue for the last `days` clinic days. */
export async function revenueSeries(days = 14) {
  const out: Array<{ label: string; value: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600_000);
    const ds = clinicDateStr(d);
    out.push({ label: ds.slice(8), value: await paidSum(dayRangeUtc(ds)) });
  }
  return out;
}

/** Appointments per day (created ones regardless of status). */
export async function appointmentSeries(days = 14) {
  const out: Array<{ label: string; value: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600_000);
    const ds = clinicDateStr(d);
    const range = dayRangeUtc(ds);
    out.push({ label: ds.slice(8), value: await prisma.appointment.count({ where: { startsAt: range } }) });
  }
  return out;
}

export async function topServices(limit = 5) {
  const rows = await prisma.appointment.groupBy({
    by: ["serviceId"],
    where: { status: "COMPLETED" },
    _count: { serviceId: true },
    orderBy: { _count: { serviceId: "desc" } },
    take: limit,
  });
  const services = await prisma.service.findMany({
    where: { id: { in: rows.map((r) => r.serviceId) } },
    select: { id: true, name: true },
  });
  const name = new Map(services.map((s) => [s.id, s.name]));
  return rows.map((r) => ({ name: name.get(r.serviceId) ?? "—", count: r._count.serviceId }));
}

export async function topDoctors(limit = 5) {
  const rows = await prisma.appointment.groupBy({
    by: ["doctorId"],
    where: { status: "COMPLETED" },
    _count: { doctorId: true },
    orderBy: { _count: { doctorId: "desc" } },
    take: limit,
  });
  const doctors = await prisma.doctor.findMany({
    where: { id: { in: rows.map((r) => r.doctorId) } },
    select: { id: true, name: true },
  });
  const name = new Map(doctors.map((d) => [d.id, d.name]));
  return rows.map((r) => ({ name: name.get(r.doctorId) ?? "—", count: r._count.doctorId }));
}

/** Financial summary between two clinic dates (inclusive from, exclusive toNext). */
export async function financeSummary(fromStr: string, toStr: string) {
  const range = { gte: clinicTimeToUtc(fromStr, 0), lt: clinicTimeToUtc(toStr, 24 * 60) };

  const [payments, serviceRevenue, productRevenue, expenses, commissions, salaries] = await Promise.all([
    paidSum(range),
    prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: { status: "PAID", paidAt: range, appointmentId: { not: null } },
    }),
    prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: { status: "PAID", paidAt: range, productSaleId: { not: null } },
    }),
    prisma.expense.aggregate({ _sum: { amountCents: true }, where: { incurredAt: range } }),
    prisma.commissionEntry.aggregate({ _sum: { amountCents: true }, where: { createdAt: range } }),
    prisma.salaryRecord.aggregate({ _sum: { netCents: true }, where: { paidAt: { not: null, ...range } } }),
  ]);

  const revenue = payments;
  const expensesTotal = expenses._sum.amountCents ?? 0;
  const commissionsTotal = commissions._sum.amountCents ?? 0;
  const salariesTotal = salaries._sum.netCents ?? 0;

  return {
    revenue,
    serviceRevenue: serviceRevenue._sum.amountCents ?? 0,
    productRevenue: productRevenue._sum.amountCents ?? 0,
    expenses: expensesTotal,
    commissions: commissionsTotal,
    salaries: salariesTotal,
    netProfit: revenue - expensesTotal - commissionsTotal - salariesTotal,
  };
}
