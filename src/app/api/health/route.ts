import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, service: "soie-clinic", time: new Date().toISOString() });
}
