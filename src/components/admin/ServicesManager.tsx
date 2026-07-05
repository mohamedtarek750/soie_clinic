"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string;
  durationMin: number;
  priceCents: number;
  isActive: boolean;
  doctors: string[];
  appointmentCount: number;
};

const egp = (cents: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(cents / 100);

export function ServicesManager({ allDoctors }: { allDoctors: Array<{ id: string; name: string }> }) {
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Service | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ services: Service[] }>("/api/admin/services");
      setServices(res.services);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      {error && <div className="form-alert form-alert--error">{error}</div>}
      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Treatment menu</h2>
          <button className="btn btn--gold btn--sm" onClick={() => setEditing("new")}>Add service</button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Duration</th>
                <th>Price</th>
                <th>Doctors</th>
                <th>Bookings</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.durationMin} min</td>
                  <td>{egp(s.priceCents)}</td>
                  <td>{s.doctors.length}</td>
                  <td>{s.appointmentCount}</td>
                  <td>
                    <span className={`badge ${s.isActive ? "badge--completed" : "badge--cancelled"}`}>
                      {s.isActive ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => setEditing(s)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ServiceDialog
          service={editing === "new" ? null : editing}
          allDoctors={allDoctors}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); void load(); }}
        />
      )}
    </>
  );
}

function ServiceDialog({
  service,
  allDoctors,
  onClose,
  onDone,
}: {
  service: Service | null;
  allDoctors: Array<{ id: string; name: string }>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(service?.name ?? "");
  const [slug, setSlug] = useState(service?.slug ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [duration, setDuration] = useState(String(service?.durationMin ?? 60));
  const [price, setPrice] = useState(String((service?.priceCents ?? 0) / 100));
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [doctorIds, setDoctorIds] = useState<string[]>(service?.doctors ?? []);

  async function save() {
    setBusy(true);
    setError("");
    const body = {
      name,
      slug,
      description,
      durationMin: Number(duration),
      priceCents: Math.round(Number(price || "0") * 100),
      isActive,
      doctorIds,
    };
    try {
      if (service) await api(`/api/admin/services/${service.id}`, { method: "PATCH", body });
      else await api("/api/admin/services", { method: "POST", body });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!service) return;
    if (!window.confirm(`Delete ${service.name}? Services with booking history are disabled instead.`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/services/${service.id}`, { method: "DELETE" });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setBusy(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(31,28,24,.5)", display: "grid", placeItems: "center", padding: "1rem" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel" style={{ width: "min(560px, 100%)", maxHeight: "92vh", overflowY: "auto" }}>
        <div className="panel__head">
          <h2 className="panel__title">{service ? `Edit ${service.name}` : "Add service"}</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Close</button>
        </div>
        {error && <div className="form-alert form-alert--error">{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: "0 1rem" }}>
          <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>Slug</label><input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
          <div className="field"><label>Duration (minutes)</label><input type="number" min="10" max="480" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          <div className="field"><label>Price (EGP)</label><input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </div>
        <div className="field"><label>Description</label><textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>

        <div className="field">
          <label>Performing doctors</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem .9rem" }}>
            {allDoctors.map((d) => (
              <label key={d.id} style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".84rem" }}>
                <input
                  type="checkbox"
                  checked={doctorIds.includes(d.id)}
                  onChange={(e) => setDoctorIds(e.target.checked ? [...doctorIds, d.id] : doctorIds.filter((x) => x !== d.id))}
                />
                {d.name}
              </label>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: ".5rem", margin: ".4rem 0 1.2rem", fontSize: ".9rem", fontWeight: 600 }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Enabled (bookable)
        </label>

        <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
          <button className="btn btn--gold" disabled={busy || !name || !slug} onClick={save}>
            {busy ? "Saving…" : "Save service"}
          </button>
          {service && (
            <button className="btn btn--danger" disabled={busy} onClick={remove}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}
