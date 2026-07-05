import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, assertRateLimit, errorResponse, json, parseBody } from "@/lib/http";
import { contactSchema } from "@/lib/validation";

/** Public contact form endpoint. */
export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    assertRateLimit(req, "contact", 5, 15 * 60_000);
    const input = await parseBody(req, contactSchema);
    await prisma.contactRequest.create({
      data: {
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        message: input.message,
      },
    });
    return json({ ok: true, message: "Thank you — our team will get back to you shortly." }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
