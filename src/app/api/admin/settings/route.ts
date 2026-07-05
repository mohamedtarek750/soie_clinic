import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireRole } from "@/lib/http";
import { settingsSchema } from "@/lib/validation-admin";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const rows = await prisma.setting.findMany();
    return json({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");
    const input = await parseBody(req, settingsSchema);
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue;
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    audit({ userId: session.sub, action: "settings.update", entity: "Setting", meta: input, req });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
