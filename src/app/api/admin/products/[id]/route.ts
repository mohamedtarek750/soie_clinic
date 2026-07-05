import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, errorResponse, json, parseBody, requireRole, HttpError } from "@/lib/http";
import { productUpdateSchema, stockAdjustSchema, productSellSchema } from "@/lib/validation-admin";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const input = await parseBody(req, productUpdateSchema);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found.");

    await prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        sku: input.sku === "" ? null : input.sku,
        imageUrl: input.imageUrl === "" ? null : input.imageUrl,
        priceCents: input.priceCents,
        lowStockThreshold: input.lowStockThreshold,
        isActive: input.isActive,
      },
    });
    audit({ userId: session.sub, action: "product.update", entity: "Product", entityId: id, req });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST = stock adjustment or sale, discriminated by `op`. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN", "STAFF");
    const { id } = await ctx.params;
    const raw = (await req.json()) as { op?: string };
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found.");

    if (raw.op === "adjust") {
      const input = stockAdjustSchema.parse(raw);
      if (product.stockQty + input.qty < 0) throw new HttpError(422, "Stock cannot go negative.");
      await prisma.$transaction([
        prisma.product.update({ where: { id }, data: { stockQty: { increment: input.qty } } }),
        prisma.stockMove.create({
          data: { productId: id, type: input.type, qty: input.qty, note: input.note || null, createdById: session.sub },
        }),
      ]);
      audit({ userId: session.sub, action: "product.stock", entity: "Product", entityId: id, meta: { qty: input.qty }, req });
      return json({ ok: true });
    }

    if (raw.op === "sell") {
      const input = productSellSchema.parse(raw);
      if (product.stockQty < input.qty) throw new HttpError(422, `Only ${product.stockQty} in stock.`);
      const totalCents = product.priceCents * input.qty;
      await prisma.$transaction(async (tx) => {
        const sale = await tx.productSale.create({
          data: { productId: id, qty: input.qty, unitPriceCents: product.priceCents, totalCents },
        });
        await tx.payment.create({
          data: { productSaleId: sale.id, amountCents: totalCents, method: input.method, recordedById: session.sub },
        });
        await tx.product.update({ where: { id }, data: { stockQty: { decrement: input.qty } } });
        await tx.stockMove.create({
          data: { productId: id, type: "SALE", qty: -input.qty, createdById: session.sub },
        });
      });
      audit({ userId: session.sub, action: "product.sell", entity: "Product", entityId: id, meta: { qty: input.qty, totalCents }, req });
      return json({ ok: true });
    }

    throw new HttpError(422, "op must be 'adjust' or 'sell'.");
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertCsrf(req);
    const session = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const sales = await prisma.productSale.count({ where: { productId: id } });
    if (sales > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      audit({ userId: session.sub, action: "product.disable", entity: "Product", entityId: id, req });
      return json({ ok: true, deactivated: true, message: "Product has sales history, so it was disabled instead of deleted." });
    }
    await prisma.product.delete({ where: { id } });
    audit({ userId: session.sub, action: "product.delete", entity: "Product", entityId: id, req });
    return json({ ok: true, deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
