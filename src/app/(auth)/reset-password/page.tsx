"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { AuthCard } from "@/components/AuthCard";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState(token ? "" : "This link is missing its token. Request a new one.");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/auth/reset", {
        method: "POST",
        body: { token, password: form.get("password") },
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Choose a new password" sub="Minimum 8 characters.">
      {error && <div className="form-alert form-alert--error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <button className="btn btn--gold" disabled={busy || !token}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
      <div className="auth-links">
        <a href="/login">← Back to sign in</a>
      </div>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
