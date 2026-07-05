"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  handledAt: string | null;
  createdAt: string;
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

export function InboxManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api<{ contacts: Contact[] }>("/api/admin/contacts");
      setContacts(res.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle(id: string) {
    try {
      await api(`/api/admin/contacts/${id}`, { method: "PATCH", body: {} });
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Contact requests</h2>
      </div>
      {error && <div className="form-alert form-alert--error">{error}</div>}
      {contacts.length === 0 ? (
        <p className="empty-note">No messages yet. The public contact endpoint feeds this inbox.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Received</th><th>From</th><th>Message</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmt(c.createdAt)}</td>
                  <td>
                    {c.name}
                    <div className="empty-note" style={{ padding: 0, fontSize: ".74rem" }}>{c.phone || c.email || "—"}</div>
                  </td>
                  <td style={{ maxWidth: 420 }}>{c.message}</td>
                  <td>
                    {c.handledAt ? <span className="badge badge--completed">Handled</span> : <span className="badge badge--pending">New</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => toggle(c.id)}>
                      {c.handledAt ? "Reopen" : "Mark handled"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
