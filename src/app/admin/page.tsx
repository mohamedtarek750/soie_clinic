import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { adminNav } from "@/lib/admin-nav";
import { appointmentSeries, overviewStats, revenueSeries, topDoctors, topServices } from "@/lib/reports";
import { BarChart } from "@/components/charts/BarChart";
import { egp } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const session = (await getSession())!;
  const [stats, revenue, appointments, services, doctors] = await Promise.all([
    overviewStats(),
    revenueSeries(14),
    appointmentSeries(14),
    topServices(5),
    topDoctors(5),
  ]);

  const cards = [
    { label: "Today's revenue", value: egp(stats.todayRevenue) },
    { label: "This month", value: egp(stats.monthRevenue) },
    { label: "Total revenue", value: egp(stats.totalRevenue) },
    { label: "Today's appointments", value: stats.todayAppointments },
    { label: "Upcoming", value: stats.upcoming },
    { label: "Completed", value: stats.completed },
    { label: "Cancelled", value: stats.cancelled },
    { label: "Active doctors", value: stats.doctorCount },
    { label: "Patients", value: stats.patientCount },
    { label: "Unhandled messages", value: stats.unhandledContacts },
  ];

  return (
    <Shell nav={adminNav} active="/admin" userName={session.name} title="Overview">
      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-card__label">{c.label}</div>
            <div className="stat-card__value">{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: "1.2rem" }}>
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Revenue — last 14 days</h2>
          </div>
          <BarChart data={revenue.map((r) => ({ ...r, value: r.value / 100 }))} formatValue={(v) => egp(v * 100)} />
        </section>
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Appointments — last 14 days</h2>
          </div>
          <BarChart data={appointments} />
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Best selling services</h2>
          </div>
          {services.length === 0 ? (
            <p className="empty-note">No completed appointments yet.</p>
          ) : (
            <table className="data">
              <tbody>
                {services.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="badge badge--gold">{s.count} completed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Top doctors</h2>
          </div>
          {doctors.length === 0 ? (
            <p className="empty-note">No completed appointments yet.</p>
          ) : (
            <table className="data">
              <tbody>
                {doctors.map((d) => (
                  <tr key={d.name}>
                    <td>{d.name}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="badge badge--gold">{d.count} completed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Low stock</h2>
            <a className="btn btn--ghost btn--sm" href="/admin/products">
              Manage products
            </a>
          </div>
          {stats.lowStock.length === 0 ? (
            <p className="empty-note">All products are comfortably stocked.</p>
          ) : (
            <table className="data">
              <tbody>
                {stats.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="badge badge--cancelled">{p.stockQty} left</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </Shell>
  );
}
