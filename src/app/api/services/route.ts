import { prisma } from "@/lib/db";
import { errorResponse, json } from "@/lib/http";

/** Public: active services for the booking flow. */
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, durationMin: true, priceCents: true },
    });
    return json({ services });
  } catch (err) {
    return errorResponse(err);
  }
}
