import { prisma } from "@/lib/db";
import { errorResponse, json } from "@/lib/http";

/** Public: active doctors with their offered services and working days. */
export async function GET() {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        specialty: true,
        photoUrl: true,
        schedules: { select: { weekday: true, startMinute: true, endMinute: true } },
        services: { select: { serviceId: true } },
      },
    });
    return json({
      doctors: doctors.map((d) => ({
        ...d,
        services: d.services.map((s) => s.serviceId),
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
