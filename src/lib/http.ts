import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { verifyCsrf } from "./csrf";
import { getSession, type SessionPayload } from "./session";
import { rateLimit, clientIp } from "./rate-limit";
import type { Role } from "@prisma/client";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, details: err.details ?? null }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 },
    );
  }
  console.error("[api]", err);
  return NextResponse.json({ error: "Something went wrong on our side." }, { status: 500 });
}

/** Parse + validate a JSON body against a zod schema. */
export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON.");
  }
  return schema.parse(body);
}

/** Guards for mutating endpoints: CSRF token + optional rate limit. */
export function assertCsrf(req: NextRequest) {
  if (!verifyCsrf(req)) throw new HttpError(403, "Invalid or missing CSRF token.");
}

export function assertRateLimit(req: NextRequest, route: string, limit: number, windowMs: number, extraKey = "") {
  const key = `${route}:${clientIp(req)}${extraKey ? ":" + extraKey : ""}`;
  const res = rateLimit(key, limit, windowMs);
  if (!res.ok) {
    throw new HttpError(429, `Too many attempts. Try again in ${res.retryAfterS}s.`);
  }
}

/** Session guards. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "You need to sign in first.");
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) throw new HttpError(403, "You do not have access to this resource.");
  return session;
}
