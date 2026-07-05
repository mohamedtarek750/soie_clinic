"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { AuthCard } from "@/components/AuthCard";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await api<{ message: string }>("/api/auth/forgot", {
        method: "POST",
        body: { email: form.get("email") },
      });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Reset your password" sub="We will email you a secure reset link.">
      {message && <div className="form-alert form-alert--ok">{message}</div>}
      {error && <div className="form-alert form-alert--error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <button className="btn btn--gold" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <div className="auth-links">
        <a href="/login">← Back to sign in</a>
      </div>
    </AuthCard>
  );
}
