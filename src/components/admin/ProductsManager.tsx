"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sku: string | null;
  imageUrl: string | null;
  priceCents: number;
  stockQty: number;
  lowStockThreshold: number;
  isActive: boolean;
  soldQty: number;
  soldCents: number;
};

const egp = (cents: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(cents / 100);

export function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [selling, setSelling] = useState<Product | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ products: Product[] }>("/api/admin/products");
      setProducts(res.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      {error && <div className="form-alert form-alert--error">{error}</div>}
      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Retail catalogue</h2>
          <button className="btn btn--gold btn--sm" onClick={() => setEditing("new")}>Add product</button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Sold</th>
                <th>Sales</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku || "—"}</td>
                  <td>{egp(p.priceCents)}</td>
                  <td>
                    <span className={`badge ${p.stockQty <= p.lowStockThreshold ? "badge--cancelled" : "badge--completed"}`}>
                      {p.stockQty}
                    </span>
                  </td>
                  <td>{p.soldQty}</td>
                  <td>{egp(p.soldCents)}</td>
                  <td>
                    <span className={`badge ${p.isActive ? "badge--completed" : "badge--cancelled"}`}>
                      {p.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => setSelling(p)}>Sell</button>{" "}
                    <button className="btn btn--ghost btn--sm" onClick={() => setEditing(p)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ProductDialog
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); void load(); }}
        />
      )}
      {selling && (
        <SellDialog product={selling} onClose={() => setSelling(null)} onDone={() => { setSelling(null); void load(); }} />
      )}
    </>
  );
}

function ProductDialog({ product, onClose, onDone }: { product: Product | null; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [price, setPrice] = useState(String((product?.priceCents ?? 0) / 100));
  const [threshold, setThreshold] = useState(String(product?.lowStockThreshold ?? 5));
  const [initialStock, setInitialStock] = useState("0");
  const [adjustQty, setAdjustQty] = useState("");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  async function save() {
    setBusy(true);
    setError("");
    const body = {
      name,
      slug,
      sku,
      priceCents: Math.round(Number(price || "0") * 100),
      lowStockThreshold: Number(threshold || "5"),
      isActive,
      ...(product ? {} : { stockQty: Number(initialStock || "0") }),
    };
    try {
      if (product) await api(`/api/admin/products/${product.id}`, { method: "PATCH", body });
      else await api("/api/admin/products", { method: "POST", body });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setBusy(false);
    }
  }

  async function adjust() {
    if (!product || !adjustQty) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/products/${product.id}`, {
        method: "POST",
        body: { op: "adjust", qty: Number(adjustQty), type: Number(adjustQty) > 0 ? "PURCHASE" : "ADJUSTMENT", note: "" },
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!product) return;
    if (!window.confirm(`Delete ${product.name}? Products with sales history are disabled instead.`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/products/${product.id}`, { method: "DELETE" });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setBusy(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(31,28,24,.5)", display: "grid", placeItems: "center", padding: "1rem" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel" style={{ width: "min(560px, 100%)", maxHeight: "92vh", overflowY: "auto" }}>
        <div className="panel__head">
          <h2 className="panel__title">{product ? `Edit ${product.name}` : "Add product"}</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Close</button>
        </div>
        {error && <div className="form-alert form-alert--error">{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: "0 1rem" }}>
          <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>Slug</label><input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
          <div className="field"><label>SKU</label><input value={sku} onChange={(e) => setSku(e.target.value)} /></div>
          <div className="field"><label>Price (EGP)</label><input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="field"><label>Low-stock alert at</label><input type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></div>
          {!product && (
            <div className="field"><label>Initial stock</label><input type="number" min="0" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} /></div>
          )}
        </div>

        {product && (
          <div className="field">
            <label>Stock adjustment (current: {product.stockQty})</label>
            <div style={{ display: "flex", gap: ".6rem" }}>
              <input type="number" placeholder="+10 restock, -2 damage…" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn--ghost btn--sm" disabled={busy || !adjustQty || Number(adjustQty) === 0} onClick={adjust}>Apply</button>
            </div>
          </div>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: ".5rem", margin: ".4rem 0 1.2rem", fontSize: ".9rem", fontWeight: 600 }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>

        <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
          <button className="btn btn--gold" disabled={busy || !name || !slug} onClick={save}>
            {busy ? "Saving…" : "Save product"}
          </button>
          {product && <button className="btn btn--danger" disabled={busy} onClick={remove}>Delete</button>}
        </div>
      </div>
    </div>
  );
}

function SellDialog({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState("1");
  const [method, setMethod] = useState("CASH");

  async function sell() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/products/${product.id}`, { method: "POST", body: { op: "sell", qty: Number(qty), method } });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sale failed.");
      setBusy(false);
    }
  }

  const total = product.priceCents * Number(qty || "0");
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(31,28,24,.5)", display: "grid", placeItems: "center", padding: "1rem" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel" style={{ width: "min(420px, 100%)" }}>
        <div className="panel__head">
          <h2 className="panel__title">Sell {product.name}</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Close</button>
        </div>
        {error && <div className="form-alert form-alert--error">{error}</div>}
        <div className="field">
          <label>Quantity (in stock: {product.stockQty})</label>
          <input type="number" min="1" max={product.stockQty} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className="field">
          <label>Payment method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {["CASH", "CARD", "TRANSFER", "WALLET"].map((m) => (<option key={m}>{m}</option>))}
          </select>
        </div>
        <button className="btn btn--gold" disabled={busy || !qty || Number(qty) < 1} onClick={sell}>
          {busy ? "Recording…" : `Record sale · ${egp(total)}`}
        </button>
      </div>
    </div>
  );
}
