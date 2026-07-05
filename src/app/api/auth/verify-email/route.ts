import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/passwords";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const row = token
    ? await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } })
    : null;

  if (!row || row.purpose !== "email_verify" || row.usedAt || row.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?verified=0", req.url));
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  return NextResponse.redirect(new URL("/login?verified=1", req.url));
}
