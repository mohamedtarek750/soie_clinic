import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { adminNav } from "@/lib/admin-nav";
import { InboxManager } from "@/components/admin/InboxManager";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const session = (await getSession())!;
  return (
    <Shell nav={adminNav} active="/admin/inbox" userName={session.name} title="Inbox">
      <InboxManager />
    </Shell>
  );
}
