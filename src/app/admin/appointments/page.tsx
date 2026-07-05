import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { adminNav } from "@/lib/admin-nav";
import { prisma } from "@/lib/db";
import { AppointmentsManager } from "@/components/admin/AppointmentsManager";

export const dynamic = "force-dynamic";

export default async function AdminAppointmentsPage() {
  const session = (await getSession())!;
  const doctors = await prisma.doctor.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
  return (
    <Shell nav={adminNav} active="/admin/appointments" userName={session.name} title="Appointments">
      <AppointmentsManager doctors={doctors} />
    </Shell>
  );
}
