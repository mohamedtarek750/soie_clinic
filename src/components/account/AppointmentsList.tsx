"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { StatusBadge } from "@/components/StatusBadge";
import { SlotPicker } from "./SlotPicker";

type Appt = {
  id: string;
  doctorId: string;
  serviceId: string;
  startsAt: string;
  status: string;
  doctor: string;
  service: string;
  durationMin: number;
};

function fmt(dateIso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateIso));
}

export function AppointmentsList({ upcoming, past }: { upcoming: Appt[]; past: Appt[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [rescheduling, setRescheduling] = useState<Appt | null>(null);

  async function cancel(a: Appt) {
    if (!window.confirm(`Cancel your ${a.service} on ${fmt(a.startsAt)}?`)) return;
    setBusyId(a.id);
    setError("");
    try {
      await api(`/api/appointments/${a.id}/cancel`, { method: "POST", body: {} });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed.");
    } finally {
      setBusyId("");
    }
  }

  function Table({ rows, withActions }: { rows: Appt[]; withActions: boolean }) {
    if (rows.length === 0) return <p className="empty-note">Nothing here yet.</p>;
    return (
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>When</th>
              <th>Treatment</th>
              <th>Doctor</th>
              <th>Status</th>
              {withActions && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{fmt(a.startsAt)}</td>
                <td>{a.service}</td>
                <td>{a.doctor}</td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
                {withActions && (
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => setRescheduling(a)} disabled={busyId === a.id}>
                      Reschedule
                    </button>{" "}
                    <button className="btn btn--ghost btn--sm" onClick={() => cancel(a)} disabled={busyId === a.id}>
                      Cancel
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {error && <div className="form-alert form-alert--error">{error}</div>}
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Upcoming</h2>
        </div>
        <Table rows={upcoming} withActions />
      </section>
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">History</h2>
        </div>
        <Table rows={past} withActions={false} />
      </section>

      {rescheduling && (
        <RescheduleDialog appt={rescheduling} onClose={() => setRescheduling(null)} onDone={() => { setRescheduling(null); router.refresh(); }} />
      )}
    </>
  );
}

function RescheduleDialog({ appt, onClose, onDone }: { appt: Appt; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function choose(startsAt: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/appointments/${appt.id}/reschedule`, { method: "POST", body: { startsAt } });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reschedule failed.");
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(31,28,24,.5)",
        display: "grid",
        placeItems: "center",
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel" style={{ width: "min(560px, 100%)", maxHeight: "88vh", overflowY: "auto" }}>
        <div className="panel__head">
          <h2 className="panel__title">Move: {appt.service}</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Close
          </button>
        </div>
        {error && <div className="form-alert form-alert--error">{error}</div>}
        <SlotPicker doctorId={appt.doctorId} serviceId={appt.serviceId} onPick={choose} disabled={busy} />
      </div>
    </div>
  );
}
