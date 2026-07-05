import type { NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { assertCsrf, errorResponse, json, requireRole, HttpError } from "@/lib/http";
import { audit } from "@/lib/audit";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/** Image upload for doctor portraits and product photos → /uploads/… */
export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(422, "Attach a file field named 'file'.");
    const ext = TYPES[file.type];
    if (!ext) throw new HttpError(422, "Only JPEG, PNG or WebP images are allowed.");
    if (file.size > MAX_BYTES) throw new HttpError(422, "Image must be 3 MB or smaller.");

    const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

    const url = `/uploads/${name}`;
    audit({ userId: session.sub, action: "upload.image", entity: "Upload", entityId: name, req });
    return json({ ok: true, url }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
