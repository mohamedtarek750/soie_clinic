import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { adminNav } from "@/lib/admin-nav";
import { FinanceManager } from "@/components/admin/FinanceManager";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  const session = (await getSession())!;
  return (
    <Shell nav={adminNav} active="/admin/finance" userName={session.name} title="Finance">
      <FinanceManager />
    </Shell>
  );
}
