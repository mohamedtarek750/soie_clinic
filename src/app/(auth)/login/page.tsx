"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { AuthCard } from "@/components/AuthCard";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const verified = params.get("verified");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await api<{ user: { role: string } }>("/api/auth/login", {
        method: "POST",
        body: { email: form.get("email"), password: form.get("password") },
      });
      const next = params.get("next");
      const fallback = res.user.role === "ADMIN" || res.user.role === "STAFF" ? "/admin" : "/account";
      router.push(next && next.startsWith("/") ? next : fallback);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Welcome back" sub="Sign in to manage your appointments.">
      {verified === "1" && <div className="form-alert form-alert--ok">Email verified. You can sign in.</div>}
      {verified === "0" && (
        <div className="form-alert form-alert--error">That verification link is invalid or expired.</div>
      )}
      {error && <div className="form-alert form-alert--error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn btn--gold" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="auth-links">
        <a href="/forgot-password">Forgot your password?</a>
        <span>
          New to Soie? <a href="/register">Create an account</a>
        </span>
        <a href="/">← Back to the website</a>
      </div>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
