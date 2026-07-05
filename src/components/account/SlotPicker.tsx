"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";

type SlotDto = { startsAt: string; label: string };

/** Date input + live availability grid for a doctor + service pair. */
export function SlotPicker({
  doctorId,
  serviceId,
  onPick,
  disabled,
}: {
  doctorId: string | null;
  serviceId: string | null;
  onPick: (startsAtIso: string) => void;
  disabled?: boolean;
}) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<SlotDto[] | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bounds = useMemo(() => {
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    return { min: fmt(new Date()), max: fmt(new Date(Date.now() + 60 * 24 * 3600_000)) };
  }, []);

  useEffect(() => {
    setSlots(null);
    setSelected("");
    setError("");
    if (!date || !doctorId || !serviceId) return;
    let stale = false;
    setLoading(true);
    api<{ slots: SlotDto[] }>(
      `/api/availability?doctorId=${encodeURIComponent(doctorId)}&serviceId=${encodeURIComponent(serviceId)}&date=${date}`,
    )
      .then((res) => !stale && setSlots(res.slots))
      .catch((err) => !stale && setError(err instanceof Error ? err.message : "Could not load times."))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [date, doctorId, serviceId]);

  return (
    <div>
      <div className="field">
        <label htmlFor="slot-date">Date</label>
        <input
          id="slot-date"
          type="date"
          min={bounds.min}
          max={bounds.max}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={disabled || !doctorId || !serviceId}
        />
      </div>
      {!doctorId || !serviceId ? (
        <p className="empty-note">Choose a doctor and treatment first.</p>
      ) : !date ? (
        <p className="empty-note">Pick a date to see available times.</p>
      ) : loading ? (
        <p className="empty-note">Checking availability…</p>
      ) : error ? (
        <div className="form-alert form-alert--error">{error}</div>
      ) : slots && slots.length === 0 ? (
        <p className="empty-note">No free times that day. Try another date.</p>
      ) : (
        <div className="slot-grid" role="group" aria-label="Available times">
          {slots?.map((s) => (
            <button
              key={s.startsAt}
              type="button"
              className={`slot-btn${selected === s.startsAt ? " is-selected" : ""}`}
              disabled={disabled}
              onClick={() => {
                setSelected(s.startsAt);
                onPick(s.startsAt);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
