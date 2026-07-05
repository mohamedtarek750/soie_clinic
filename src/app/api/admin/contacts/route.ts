import { prisma } from "@/lib/db";
import { errorResponse, json, requireRole } from "@/lib/http";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const contacts = await prisma.contactRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return json({ contacts });
  } catch (err) {
    return errorResponse(err);
  }
}
