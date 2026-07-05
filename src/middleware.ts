import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { CSRF_COOKIE, newCsrfToken } from "@/lib/csrf";

const SESSION_COOKIE = "soie_session";

async function readSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET!));
    return payload as { sub?: string; role?: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  // Every visitor gets a CSRF cookie; JS echoes it as a request header.
  if (!req.cookies.get(CSRF_COOKIE)) {
    res.cookies.set(CSRF_COOKIE, newCsrfToken(), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  const needsAuth = pathname.startsWith("/account") || pathname.startsWith("/admin");
  if (!needsAuth) return res;

  const session = await readSession(req);
  if (!session?.sub) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (pathname.startsWith("/admin") && session.role !== "ADMIN" && session.role !== "STAFF") {
    return NextResponse.redirect(new URL("/account", req.url));
  }
  return res;
}

export const config = {
  // Pages only; API routes enforce auth themselves (they must return JSON
  // errors, not redirects). Static assets skip the middleware entirely.
  matcher: ["/account/:path*", "/admin/:path*", "/login", "/register", "/forgot-password", "/reset-password"],
};
