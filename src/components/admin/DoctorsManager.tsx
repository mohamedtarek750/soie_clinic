"use client";

import { useCallback, useEffect, useState } from "react";
import { api, csrfToken } from "@/lib/client";

type Schedule = { weekday: number; startMinute: number; endMinute: number };
type Doctor = {
  id: string;
  name: string;
  slug: string;
  specialty: string;
  bio: string;
  photoUrl: string | null;
  instagramUrl: string | null;
  isActive: boolean;
  monthlySalaryCents: number;
  commissionPct: number;
  schedules: Schedule[];
  services: string[];
  appointmentCount: number;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const egp = (cents: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(cents / 100);

export function DoctorsManager({ allServices }: { allServices: Array<{ id: string; name: string }> }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Doctor | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ doctors: Doctor[] }>("/api/admin/doctors");
      setDoctors(res.doctors);
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
          <h2 className="panel__title">Team</h2>
          <button className="btn btn--gold btn--sm" onClick={() => setEditing("new")}>Add doctor</button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Specialty</th>
                <th>Days</th>
                <th>Salary</th>
                <th>Commission</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={d.id}>
                  <td>
                    {d.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.photoUrl} alt="" width={38} height={38} style={{ borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <span className="badge badge--gold">{d.name.slice(0, 2)}</span>
                    )}
                  </td>
                  <td>{d.name}</td>
                  <td>{d.specialty}</td>
                  <td>{d.schedules.length}/7</td>
                  <td>{egp(d.monthlySalaryCents)}</td>
                  <td>{d.commissionPct}%</td>
                  <td>
                    <span className={`badge ${d.isActive ? "badge--completed" : "badge--cancelled"}`}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => setEditing(d)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <DoctorDialog
          doctor={editing === "new" ? null : editing}
          allServices={allServices}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); void load(); }}
        />
      )}
    </>
  );
}

function DoctorDialog({
  doctor,
  allServices,
  onClose,
  onDone,
}: {
  doctor: Doctor | null;
  allServices: Array<{ id: string; name: string }>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(doctor?.name ?? "");
  const [slug, setSlug] = useState(doctor?.slug ?? "");
  const [specialty, setSpecialty] = useState(doctor?.specialty ?? "");
  const [bio, setBio] = useState(doctor?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(doctor?.photoUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(doctor?.instagramUrl ?? "");
  const [salary, setSalary] = useState(String((doctor?.monthlySalaryCents ?? 0) / 100));
  const [commission, setCommission] = useState(String(doctor?.commissionPct ?? 0));
  const [isActive, setIsActive] = useState(doctor?.isActive ?? true);
  const [serviceIds, setServiceIds] = useState<string[]>(doctor?.services ?? []);
  const [days, setDays] = useState<Array<{ on: boolean; start: string; end: string }>>(
    DAYS.map((_, i) => {
      const s = doctor?.schedules.find((x) => x.weekday === i);
      return s ? { on: true, start: toTime(s.startMinute), end: toTime(s.endMinute) } : { on: false, start: "10:00", end: "23:00" };
    }),
  );

  async function uploadPhoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/uploads", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken() },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    setPhotoUrl(data.url);
  }

  async function save() {
    setBusy(true);
    setError("");
    const body = {
      name,
      slug,
      specialty,
      bio,
      photoUrl,
      instagramUrl,
      monthlySalaryCents: Math.round(Number(salary || "0") * 100),
      commissionPct: Number(commission || "0"),
      isActive,
      serviceIds,
      schedules: days
        .map((d, weekday) => ({ weekday, startMinute: toMin(d.start), endMinute: toMin(d.end), on: d.on }))
        .filter((d) => d.on)
        .map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute })),
    };
    try {
      if (doctor) await api(`/api/admin/doctors/${doctor.id}`, { method: "PATCH", body });
      else await api("/api/admin/doctors", { method: "POST", body });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!doctor) return;
    if (!window.confirm(`Delete ${doctor.name}? Profiles with appointment history are deactivated instead.`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/doctors/${doctor.id}`, { method: "DELETE" });
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
      <div className="panel" style={{ width: "min(680px, 100%)", maxHeight: "92vh", overflowY: "auto" }}>
        <div className="panel__head">
          <h2 className="panel__title">{doctor ? `Edit ${doctor.name}` : "Add doctor"}</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Close</button>
        </div>
        {error && <div className="form-alert form-alert--error">{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: "0 1rem" }}>
          <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>Slug</label><input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="dr-name" /></div>
          <div className="field"><label>Specialty</label><input value={specialty} onChange={(e) => setSpecialty(e.target.value)} /></div>
          <div className="field"><label>Instagram URL</label><input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} /></div>
          <div className="field"><label>Monthly salary (EGP)</label><input type="number" min="0" value={salary} onChange={(e) => setSalary(e.target.value)} /></div>
          <div className="field"><label>Referral commission %</label><input type="number" min="0" max="100" step="0.5" value={commission} onChange={(e) => setCommission(e.target.value)} /></div>
        </div>
        <div className="field"><label>Bio</label><textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} /></div>

        <div className="field">
          <label>Profile photo</label>
          <div style={{ display: "flex", alignItems: "center", gap: ".8rem" }}>
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" width={54} height={54} style={{ borderRadius: "50%", objectFit: "cover" }} />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f).catch((err) => setError(err.message));
              }}
            />
          </div>
        </div>

        <div className="field">
          <label>Working days & hours</label>
          <div style={{ display: "grid", gap: ".4rem" }}>
            {DAYS.map((day, i) => (
              <div key={day} style={{ display: "flex", alignItems: "center", gap: ".6rem", fontSize: ".85rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: ".4rem", width: 110, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={days[i].on}
                    onChange={(e) => setDays(days.map((d, j) => (j === i ? { ...d, on: e.target.checked } : d)))}
                  />
                  {day}
                </label>
                <input type="time" value={days[i].start} disabled={!days[i].on}
                  onChange={(e) => setDays(days.map((d, j) => (j === i ? { ...d, start: e.target.value } : d)))}
                  style={{ padding: ".3rem .5rem", border: "1px solid var(--line)", borderRadius: 8 }} />
                <span>→</span>
                <input type="time" value={days[i].end} disabled={!days[i].on}
                  onChange={(e) => setDays(days.map((d, j) => (j === i ? { ...d, end: e.target.value } : d)))}
                  style={{ padding: ".3rem .5rem", border: "1px solid var(--line)", borderRadius: 8 }} />
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Offered treatments</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem .9rem" }}>
            {allServices.map((s) => (
              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".84rem" }}>
                <input
                  type="checkbox"
                  checked={serviceIds.includes(s.id)}
                  onChange={(e) =>
                    setServiceIds(e.target.checked ? [...serviceIds, s.id] : serviceIds.filter((x) => x !== s.id))
                  }
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: ".5rem", margin: ".4rem 0 1.2rem", fontSize: ".9rem", fontWeight: 600 }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (bookable by patients)
        </label>

        <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
          <button className="btn btn--gold" disabled={busy || !name || !slug || !specialty} onClick={save}>
            {busy ? "Saving…" : "Save doctor"}
          </button>
          {doctor && (
            <button className="btn btn--danger" disabled={busy} onClick={remove}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}
