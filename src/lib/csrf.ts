import type { NextRequest } from "next/server";

/**
 * Double-submit-cookie CSRF protection.
 *
 * The middleware issues a random `soie_csrf` cookie (readable by JS).
 * Browser code echoes it back in the `x-csrf-token` header on every
 * mutating request; a cross-site attacker can make the browser SEND the
 * cookie but cannot READ it, so it cannot forge the matching header.
 */
export const CSRF_COOKIE = "soie_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function verifyCsrf(req: NextRequest): boolean {
  const cookie = req.cookies.get(CSRF_COOKIE)?.value;
  const header = req.headers.get(CSRF_HEADER);
  return Boolean(cookie && header && timingSafeEqual(cookie, header));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function newCsrfToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
