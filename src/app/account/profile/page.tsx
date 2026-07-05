import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { accountNav } from "@/lib/account-nav";
import { ProfileForm } from "@/components/account/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = (await getSession())!;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { name: true, email: true, phone: true, emailVerifiedAt: true, createdAt: true },
  });

  return (
    <Shell nav={accountNav} active="/account/profile" userName={session.name} title="My profile">
      <div className="panel" style={{ maxWidth: 520 }}>
        <ProfileForm
          name={user?.name ?? ""}
          email={user?.email ?? ""}
          phone={user?.phone ?? ""}
          verified={Boolean(user?.emailVerifiedAt)}
          memberSince={user?.createdAt.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) ?? ""}
        />
      </div>
    </Shell>
  );
}
