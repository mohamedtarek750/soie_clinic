import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { accountNav } from "@/lib/account-nav";
import { BookingWizard } from "@/components/account/BookingWizard";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const session = (await getSession())!;
  const [doctors, services] = await Promise.all([
    prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, specialty: true, services: { select: { serviceId: true } } },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, durationMin: true, priceCents: true },
    }),
  ]);

  return (
    <Shell nav={accountNav} active="/account/book" userName={session.name} title="Book a visit">
      <BookingWizard
        doctors={doctors.map((d) => ({ ...d, services: d.services.map((s) => s.serviceId) }))}
        services={services}
      />
    </Shell>
  );
}
