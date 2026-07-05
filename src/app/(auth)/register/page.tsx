"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { AuthCard } from "@/components/AuthCard";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: {
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          password: form.get("password"),
        },
      });
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Create your account" sub="Book and manage appointments at Soie Clinic.">
      {error && <div className="form-alert form-alert--error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" autoComplete="name" required minLength={2} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <button className="btn btn--gold" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
      <div className="auth-links">
        <span>
          Already with us? <a href="/login">Sign in</a>
        </span>
        <a href="/">← Back to the website</a>
      </div>
    </AuthCard>
  );
}
