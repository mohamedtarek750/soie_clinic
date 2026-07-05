import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { accountNav } from "@/lib/account-nav";
import { AppointmentsList } from "@/components/account/AppointmentsList";

export default async function AccountPage() {
  const session = (await getSession())!;
  const appointments = await prisma.appointment.findMany({
    where: { patientId: session.sub },
    orderBy: { startsAt: "desc" },
    take: 100,
    select: {
      id: true,
      startsAt: true,
      status: true,
      doctorId: true,
      serviceId: true,
      doctor: { select: { name: true } },
      service: { select: { name: true, durationMin: true } },
    },
  });

  const upcoming = appointments.filter(
    (a) => (a.status === "PENDING" || a.status === "CONFIRMED") && a.startsAt > new Date(),
  );
  const past = appointments.filter((a) => !upcoming.includes(a));

  const serialize = (list: typeof appointments) =>
    list.map((a) => ({
      id: a.id,
      doctorId: a.doctorId,
      serviceId: a.serviceId,
      startsAt: a.startsAt.toISOString(),
      status: a.status,
      doctor: a.doctor.name,
      service: a.service.name,
      durationMin: a.service.durationMin,
    }));

  return (
    <Shell
      nav={accountNav}
      active="/account"
      userName={session.name}
      title="My appointments"
      actions={
        <a className="btn btn--gold btn--sm" href="/account/book">
          Book a visit
        </a>
      }
    >
      <AppointmentsList upcoming={serialize(upcoming)} past={serialize(past)} />
    </Shell>
  );
}
