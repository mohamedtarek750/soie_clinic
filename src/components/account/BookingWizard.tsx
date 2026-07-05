"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { SlotPicker } from "./SlotPicker";

type Doctor = { id: string; name: string; specialty: string; services: string[] };
type Service = { id: string; name: string; durationMin: number; priceCents: number };

const price = (cents: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(cents / 100);

export function BookingWizard({ doctors, services }: { doctors: Doctor[]; services: Service[] }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const availableDoctors = useMemo(
    () => (serviceId ? doctors.filter((d) => d.services.includes(serviceId)) : doctors),
    [doctors, serviceId],
  );
  const service = services.find((s) => s.id === serviceId);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api("/api/appointments", {
        method: "POST",
        body: { doctorId, serviceId, startsAt, notes },
      });
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      {error && <div className="form-alert form-alert--error">{error}</div>}

      <div className="field">
        <label htmlFor="bk-service">Treatment</label>
        <select
          id="bk-service"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setStartsAt("");
          }}
        >
          <option value="">Choose a treatment…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.durationMin} min · {price(s.priceCents)}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="bk-doctor">Doctor</label>
        <select
          id="bk-doctor"
          value={doctorId}
          onChange={(e) => {
            setDoctorId(e.target.value);
            setStartsAt("");
          }}
          disabled={!serviceId}
        >
          <option value="">Choose a doctor…</option>
          {availableDoctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {d.specialty}
            </option>
          ))}
        </select>
      </div>

      <SlotPicker
        doctorId={doctorId || null}
        serviceId={serviceId || null}
        onPick={setStartsAt}
        disabled={busy}
      />

      <div className="field" style={{ marginTop: "1rem" }}>
        <label htmlFor="bk-notes">Anything we should know? (optional)</label>
        <textarea id="bk-notes" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <button className="btn btn--gold" disabled={busy || !doctorId || !serviceId || !startsAt} onClick={submit}>
        {busy ? "Booking…" : service ? `Request ${service.name}` : "Request appointment"}
      </button>
      <p className="empty-note" style={{ marginTop: ".6rem" }}>
        Your request is held as pending until our team confirms it. You will find updates here and in your email.
      </p>
    </div>
  );
}
