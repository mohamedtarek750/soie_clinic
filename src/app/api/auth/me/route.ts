import { prisma } from "@/lib/db";
import { errorResponse, json, requireSession } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, name: true, phone: true, role: true, emailVerifiedAt: true, createdAt: true },
    });
    return json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}
