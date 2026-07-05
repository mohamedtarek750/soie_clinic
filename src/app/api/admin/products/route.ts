import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireRole, HttpError } from "@/lib/http";
import { productCreateSchema } from "@/lib/validation-admin";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const [products, sales] = await Promise.all([
      prisma.product.findMany({ orderBy: { name: "asc" } }),
      prisma.productSale.groupBy({
        by: ["productId"],
        _sum: { qty: true, totalCents: true },
      }),
    ]);
    const salesBy = new Map(sales.map((s) => [s.productId, s._sum]));
    return json({
      products: products.map((p) => ({
        ...p,
        soldQty: salesBy.get(p.id)?.qty ?? 0,
        soldCents: salesBy.get(p.id)?.totalCents ?? 0,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");
    const input = await parseBody(req, productCreateSchema);

    const exists = await prisma.product.findUnique({ where: { slug: input.slug } });
    if (exists) throw new HttpError(409, "A product with this slug already exists.");

    const product = await prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description ?? "",
        sku: input.sku || null,
        imageUrl: input.imageUrl || null,
        priceCents: input.priceCents,
        stockQty: input.stockQty ?? 0,
        lowStockThreshold: input.lowStockThreshold ?? 5,
        isActive: input.isActive ?? true,
      },
    });
    if (product.stockQty > 0) {
      await prisma.stockMove.create({
        data: { productId: product.id, type: "PURCHASE", qty: product.stockQty, note: "Initial stock", createdById: session.sub },
      });
    }
    audit({ userId: session.sub, action: "product.create", entity: "Product", entityId: product.id, req });
    return json({ ok: true, id: product.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
