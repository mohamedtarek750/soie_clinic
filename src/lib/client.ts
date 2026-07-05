"use client";

/** Browser-side API helper: JSON + CSRF header on every mutation. */
export function csrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)soie_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export async function api<T = unknown>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const method = init?.method ?? "GET";
  const res = await fetch(path, {
    ...init,
    method,
    headers: {
      ...(init?.body !== undefined ? { "content-type": "application/json" } : {}),
      ...(method !== "GET" ? { "x-csrf-token": csrfToken() } : {}),
      ...init?.headers,
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}
