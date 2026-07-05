import type { NextRequest } from "next/server";
import { errorResponse, json, HttpError } from "@/lib/http";
import { getAvailableSlots } from "@/lib/slots";
import { clinicTimeLabel } from "@/lib/tz";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const doctorId = q.get("doctorId");
    const serviceId = q.get("serviceId");
    const date = q.get("date");
    if (!doctorId || !serviceId || !date) {
      throw new HttpError(422, "doctorId, serviceId and date are required.");
    }
    const slots = await getAvailableSlots(doctorId, serviceId, date);
    return json({
      slots: slots.map((s) => ({ startsAt: s.startsAt.toISOString(), label: clinicTimeLabel(s.startsAt) })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
