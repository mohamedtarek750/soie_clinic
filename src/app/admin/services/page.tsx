import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { adminNav } from "@/lib/admin-nav";
import { prisma } from "@/lib/db";
import { ServicesManager } from "@/components/admin/ServicesManager";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const session = (await getSession())!;
  const doctors = await prisma.doctor.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
  return (
    <Shell nav={adminNav} active="/admin/services" userName={session.name} title="Services">
      <ServicesManager allDoctors={doctors} />
    </Shell>
  );
}
