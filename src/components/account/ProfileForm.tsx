"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function ProfileForm({
  name,
  email,
  phone,
  verified,
  memberSince,
}: {
  name: string;
  email: string;
  phone: string;
  verified: boolean;
  memberSince: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/account/profile", {
        method: "PATCH",
        body: { name: form.get("name"), phone: form.get("phone") },
      });
      setMessage("Profile saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {message && <div className="form-alert form-alert--ok">{message}</div>}
      {error && <div className="form-alert form-alert--error">{error}</div>}
      <div className="field">
        <label>Email</label>
        <input value={email} disabled />
        <span className="empty-note" style={{ padding: 0 }}>
          {verified ? "Verified" : "Not verified yet — check your inbox"} · Member since {memberSince}
        </span>
      </div>
      <div className="field">
        <label htmlFor="pf-name">Full name</label>
        <input id="pf-name" name="name" defaultValue={name} required minLength={2} />
      </div>
      <div className="field">
        <label htmlFor="pf-phone">Phone</label>
        <input id="pf-phone" name="phone" type="tel" defaultValue={phone} />
      </div>
      <button className="btn btn--gold" disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
