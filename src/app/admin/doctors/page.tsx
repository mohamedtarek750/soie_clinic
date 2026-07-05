import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { adminNav } from "@/lib/admin-nav";
import { prisma } from "@/lib/db";
import { DoctorsManager } from "@/components/admin/DoctorsManager";

export const dynamic = "force-dynamic";

export default async function AdminDoctorsPage() {
  const session = (await getSession())!;
  const services = await prisma.service.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
  return (
    <Shell nav={adminNav} active="/admin/doctors" userName={session.name} title="Doctors">
      <DoctorsManager allServices={services} />
    </Shell>
  );
}
