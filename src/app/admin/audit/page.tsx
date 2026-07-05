import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { adminNav } from "@/lib/admin-nav";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(d);

export default async function AdminAuditPage() {
  const session = (await getSession())!;
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <Shell nav={adminNav} active="/admin/audit" userName={session.name} title="Audit log">
      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Last 200 events</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmt(l.createdAt)}</td>
                  <td>{l.user ? l.user.name : "—"}</td>
                  <td>
                    <span className="badge badge--gold">{l.action}</span>
                  </td>
                  <td>
                    {l.entity}
                    {l.entityId ? ` · ${l.entityId.slice(0, 10)}…` : ""}
                  </td>
                  <td>{l.ip ?? "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <p className="empty-note">No events yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
