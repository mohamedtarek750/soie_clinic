import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { adminNav } from "@/lib/admin-nav";
import { ProductsManager } from "@/components/admin/ProductsManager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const session = (await getSession())!;
  return (
    <Shell nav={adminNav} active="/admin/products" userName={session.name} title="Products & inventory">
      <ProductsManager />
    </Shell>
  );
}
