"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { StatusBadge } from "@/components/StatusBadge";
import { SlotPicker } from "@/components/account/SlotPicker";

type Row = {
  id: string;
  startsAt: string;
  status: string;
  notes: string | null;
  adminNotes: string | null;
  doctorId: string;
  serviceId: string;
  referredByDoctorId: string | null;
  patient: { name: string; email: string; phone: string | null };
  doctor: { name: string };
  service: { name: string; priceCents: number };
  payment: { amountCents: number; method: string } | null;
};

const STATUSES = ["", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"];

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));

const egp = (cents: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(cents / 100);

export function AppointmentsManager({ doctors }: { doctors: Array<{ id: string; name: string }> }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      if (doctorId) params.set("doctorId", doctorId);
      if (q) params.set("q", q);
      const res = await api<{ total: number; appointments: Row[] }>(`/api/admin/appointments?${params}`);
      setRows(res.appointments);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    }
  }, [page, status, doctorId, q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      {error && <div className="form-alert form-alert--error">{error}</div>}
      <div className="panel">
        <div className="panel__head" style={{ gap: ".6rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem" }}>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status filter"
              style={{ padding: ".5rem .8rem", border: "1px solid var(--line)", borderRadius: 10, background: "var(--ivory)" }}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "" ? "All statuses" : s}
                </option>
              ))}
            </select>
            <select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setPage(1); }} aria-label="Doctor filter"
              style={{ padding: ".5rem .8rem", border: "1px solid var(--line)", borderRadius: 10, background: "var(--ivory)" }}>
              <option value="">All doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Search patient…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ padding: ".5rem .8rem", border: "1px solid var(--line)", borderRadius: 10, background: "var(--ivory)" }}
            />
          </div>
          <span className="empty-note" style={{ padding: 0 }}>{total} total</span>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>When</th>
                <th>Patient</th>
                <th>Treatment</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Payment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmt(r.startsAt)}</td>
                  <td>
                    {r.patient.name}
                    <div className="empty-note" style={{ padding: 0, fontSize: ".74rem" }}>{r.patient.phone || r.patient.email}</div>
                  </td>
                  <td>{r.service.name}</td>
                  <td>{r.doctor.name}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.payment ? egp(r.payment.amountCents) : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => setDetail(r)}>Manage</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}><p className="empty-note">No appointments match these filters.</p></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > 25 && (
          <div style={{ display: "flex", gap: ".6rem", justifyContent: "center", marginTop: "1rem" }}>
            <button className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
            <span className="empty-note" style={{ padding: ".3rem 0" }}>Page {page} of {Math.ceil(total / 25)}</span>
            <button className="btn btn--ghost btn--sm" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        )}
      </div>

      {detail && (
        <ManageDialog
          row={detail}
          doctors={doctors}
          onClose={() => setDetail(null)}
          onDone={() => { setDetail(null); void load(); }}
        />
      )}
    </>
  );
}

function ManageDialog({
  row,
  doctors,
  onClose,
  onDone,
}: {
  row: Row;
  doctors: Array<{ id: string; name: string }>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(String(row.service.priceCents / 100));
  const [method, setMethod] = useState("CASH");
  const [notes, setNotes] = useState(row.adminNotes ?? "");
  const [referral, setReferral] = useState(row.referredByDoctorId ?? "");
  const [moveDoctor, setMoveDoctor] = useState(row.doctorId);
  const [moveStart, setMoveStart] = useState("");
  const [tab, setTab] = useState<"actions" | "move">("actions");

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/appointments/${row.id}`, { method: "PATCH", body });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
      setBusy(false);
    }
  }

  const open = row.status === "PENDING" || row.status === "CONFIRMED";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(31,28,24,.5)", display: "grid", placeItems: "center", padding: "1rem" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel" style={{ width: "min(620px, 100%)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="panel__head">
          <h2 className="panel__title">
            {row.service.name} — {row.patient.name}
          </h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Close</button>
        </div>
        <p className="empty-note" style={{ paddingTop: 0 }}>
          {fmt(row.startsAt)} · {row.doctor.name} · <StatusBadge status={row.status} />
          {row.notes ? ` · Patient note: “${row.notes}”` : ""}
        </p>
        {error && <div className="form-alert form-alert--error">{error}</div>}

        <div style={{ display: "flex", gap: ".5rem", marginBottom: "1rem" }}>
          <button className={`btn btn--sm ${tab === "actions" ? "btn--gold" : "btn--ghost"}`} onClick={() => setTab("actions")}>Actions</button>
          <button className={`btn btn--sm ${tab === "move" ? "btn--gold" : "btn--ghost"}`} onClick={() => setTab("move")} disabled={!open}>Reassign / move</button>
        </div>

        {tab === "actions" && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", marginBottom: "1.2rem" }}>
              {row.status === "PENDING" && (
                <button className="btn btn--gold btn--sm" disabled={busy} onClick={() => act({ action: "confirm" })}>Confirm</button>
              )}
              {open && (
                <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => act({ action: "no_show" })}>Mark no-show</button>
              )}
              {open && (
                <button className="btn btn--danger btn--sm" disabled={busy} onClick={() => act({ action: "cancel" })}>Cancel booking</button>
              )}
            </div>

            {open && (
              <div className="panel" style={{ background: "var(--linen)", marginBottom: "1rem" }}>
                <strong style={{ fontSize: ".85rem" }}>Complete & record payment</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", marginTop: ".6rem" }}>
                  <input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount in EGP"
                    style={{ width: 120, padding: ".5rem .7rem", border: "1px solid var(--line)", borderRadius: 10 }} />
                  <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method"
                    style={{ padding: ".5rem .7rem", border: "1px solid var(--line)", borderRadius: 10, background: "var(--ivory)" }}>
                    {["CASH", "CARD", "TRANSFER", "WALLET"].map((m) => (<option key={m}>{m}</option>))}
                  </select>
                  <button className="btn btn--gold btn--sm" disabled={busy}
                    onClick={() => act({ action: "complete", amountCents: Math.round(Number(amount) * 100), method })}>
                    Complete · {egp(Math.round(Number(amount || "0") * 100))}
                  </button>
                </div>
              </div>
            )}

            <div className="field">
              <label>Referred by (commission)</label>
              <div style={{ display: "flex", gap: ".6rem" }}>
                <select value={referral} onChange={(e) => setReferral(e.target.value)} style={{ flex: 1, padding: ".55rem .7rem", border: "1px solid var(--line)", borderRadius: 10, background: "var(--ivory)" }}>
                  <option value="">No referral</option>
                  {doctors.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
                <button className="btn btn--ghost btn--sm" disabled={busy}
                  onClick={() => act({ action: "referral", referredByDoctorId: referral || null })}>Save</button>
              </div>
            </div>

            <div className="field">
              <label>Internal notes</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <button className="btn btn--ghost btn--sm" style={{ justifySelf: "start" }} disabled={busy}
                onClick={() => act({ action: "notes", adminNotes: notes })}>Save notes</button>
            </div>
          </>
        )}

        {tab === "move" && (
          <>
            <div className="field">
              <label>Doctor</label>
              <select value={moveDoctor} onChange={(e) => { setMoveDoctor(e.target.value); setMoveStart(""); }}>
                {doctors.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
            <SlotPicker doctorId={moveDoctor} serviceId={row.serviceId} onPick={setMoveStart} disabled={busy} />
            <button className="btn btn--gold" style={{ marginTop: "1rem" }} disabled={busy || !moveStart}
              onClick={() => act({ action: "assign", doctorId: moveDoctor, startsAt: moveStart })}>
              Move appointment
            </button>
          </>
        )}
      </div>
    </div>
  );
}
