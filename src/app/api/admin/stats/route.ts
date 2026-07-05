import { errorResponse, json, requireRole } from "@/lib/http";
import { appointmentSeries, overviewStats, revenueSeries, topDoctors, topServices } from "@/lib/reports";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const [stats, revenue, appointments, services, doctors] = await Promise.all([
      overviewStats(),
      revenueSeries(14),
      appointmentSeries(14),
      topServices(5),
      topDoctors(5),
    ]);
    return json({ stats, revenue, appointments, topServices: services, topDoctors: doctors });
  } catch (err) {
    return errorResponse(err);
  }
}
