"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Summary = {
  revenue: number;
  serviceRevenue: number;
  productRevenue: number;
  expenses: number;
  commissions: number;
  salaries: number;
  netProfit: number;
};
type ExpenseRow = {
  id: string;
  category: string;
  description: string;
  amountCents: number;
  incurredAt: string;
  recordedBy: { name: string } | null;
};
type CommissionRow = { id: string; doctor: string; service: string; when: string; pct: number; amountCents: number };
type SalaryRow = {
  doctorId: string;
  doctor: string;
  isActive: boolean;
  baseCents: number;
  bonusCents: number;
  deductionsCents: number;
  commissionCents: number;
  netCents: number;
  paidAt: string | null;
};

const egp = (cents: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(cents / 100);
const cairoDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

const EXPENSE_CATEGORIES = ["RENT", "UTILITIES", "SUPPLIES", "MARKETING", "MAINTENANCE", "SALARIES", "OTHER"];

export function FinanceManager() {
  const today = cairoDate(new Date());
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [error, setError] = useState("");

  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [salaries, setSalaries] = useState<SalaryRow[]>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api<{ summary: Summary; expenses: ExpenseRow[]; commissions: CommissionRow[] }>(
        `/api/admin/finance?from=${from}&to=${to}`,
      );
      setSummary(res.summary);
      setExpenses(res.expenses);
      setCommissions(res.commissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    }
  }, [from, to]);

  const loadSalaries = useCallback(async () => {
    try {
      const res = await api<{ rows: SalaryRow[] }>(`/api/admin/salaries?year=${year}&month=${month}`);
      setSalaries(res.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payroll load failed.");
    }
  }, [year, month]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadSalaries(); }, [loadSalaries]);

  const cards = summary
    ? [
        { label: "Revenue", value: egp(summary.revenue) },
        { label: "Service sales", value: egp(summary.serviceRevenue) },
        { label: "Product sales", value: egp(summary.productRevenue) },
        { label: "Expenses", value: egp(summary.expenses) },
        { label: "Commissions", value: egp(summary.commissions) },
        { label: "Salaries paid", value: egp(summary.salaries) },
        { label: "Net profit", value: egp(summary.netProfit) },
      ]
    : [];

  return (
    <>
      {error && <div className="form-alert form-alert--error">{error}</div>}

      <div className="panel" style={{ marginBottom: "1.2rem" }}>
        <div className="panel__head">
          <h2 className="panel__title">Period</h2>
          <div style={{ display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              style={{ padding: ".45rem .7rem", border: "1px solid var(--line)", borderRadius: 10 }} />
            <span>→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              style={{ padding: ".45rem .7rem", border: "1px solid var(--line)", borderRadius: 10 }} />
          </div>
        </div>
        <div className="stat-grid" style={{ marginBottom: 0 }}>
          {cards.map((c) => (
            <div className="stat-card" key={c.label}>
              <div className="stat-card__label">{c.label}</div>
              <div className="stat-card__value">{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(430px, 100%), 1fr))", gap: "1.2rem" }}>
        <ExpensesPanel expenses={expenses} onChange={load} />
        <section className="panel">
          <div className="panel__head"><h2 className="panel__title">Recent commissions</h2></div>
          {commissions.length === 0 ? (
            <p className="empty-note">No commissions yet. They appear automatically when a referred appointment is completed.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Doctor</th><th>Service</th><th>Date</th><th>%</th><th>Amount</th></tr></thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id}>
                      <td>{c.doctor}</td><td>{c.service}</td><td>{fmtDay(c.when)}</td><td>{c.pct}%</td><td>{egp(c.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="panel" style={{ marginTop: "1.2rem" }}>
        <div className="panel__head">
          <h2 className="panel__title">Payroll</h2>
          <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              style={{ padding: ".45rem .7rem", border: "1px solid var(--line)", borderRadius: 10, background: "var(--ivory)" }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (<option key={m} value={m}>{new Date(2026, m - 1).toLocaleString("en", { month: "long" })}</option>))}
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 90, padding: ".45rem .7rem", border: "1px solid var(--line)", borderRadius: 10 }} />
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Doctor</th><th>Base</th><th>Bonus</th><th>Deductions</th><th>Commission</th><th>Net</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {salaries.map((s) => (
                <SalaryRowView key={s.doctorId} row={s} year={year} month={month} onChange={loadSalaries} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ExpensesPanel({ expenses, onChange }: { expenses: ExpenseRow[]; onChange: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("SUPPLIES");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  async function add() {
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/expenses", {
        method: "POST",
        body: { category, description, amountCents: Math.round(Number(amount) * 100) },
      });
      setDescription("");
      setAmount("");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add expense.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api(`/api/admin/expenses/${id}`, { method: "DELETE" });
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <section className="panel">
      <div className="panel__head"><h2 className="panel__title">Expenses</h2></div>
      {error && <div className="form-alert form-alert--error">{error}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginBottom: "1rem" }}>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          style={{ padding: ".5rem .7rem", border: "1px solid var(--line)", borderRadius: 10, background: "var(--ivory)" }}>
          {EXPENSE_CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
        </select>
        <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
          style={{ flex: 1, minWidth: 140, padding: ".5rem .7rem", border: "1px solid var(--line)", borderRadius: 10 }} />
        <input type="number" placeholder="EGP" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
          style={{ width: 110, padding: ".5rem .7rem", border: "1px solid var(--line)", borderRadius: 10 }} />
        <button className="btn btn--gold btn--sm" disabled={busy || !description || !amount} onClick={add}>Add</button>
      </div>
      <div className="table-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
        <table className="data">
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td><span className="badge badge--gold">{e.category}</span></td>
                <td>{e.description}</td>
                <td>{fmtDay(e.incurredAt)}</td>
                <td>{egp(e.amountCents)}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => remove(e.id)}>✕</button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (<tr><td><p className="empty-note">No expenses recorded.</p></td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SalaryRowView({ row, year, month, onChange }: { row: SalaryRow; year: number; month: number; onChange: () => void }) {
  const [bonus, setBonus] = useState(String(row.bonusCents / 100));
  const [deductions, setDeductions] = useState(String(row.deductionsCents / 100));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBonus(String(row.bonusCents / 100));
    setDeductions(String(row.deductionsCents / 100));
  }, [row]);

  async function save(markPaid: boolean) {
    setBusy(true);
    try {
      await api("/api/admin/salaries", {
        method: "POST",
        body: {
          doctorId: row.doctorId,
          year,
          month,
          bonusCents: Math.round(Number(bonus || "0") * 100),
          deductionsCents: Math.round(Number(deductions || "0") * 100),
          markPaid,
        },
      });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  const net = row.baseCents + Math.round(Number(bonus || "0") * 100) + row.commissionCents - Math.round(Number(deductions || "0") * 100);

  return (
    <tr>
      <td>{row.doctor}{!row.isActive && " (inactive)"}</td>
      <td>{egp(row.baseCents)}</td>
      <td><input type="number" min="0" value={bonus} onChange={(e) => setBonus(e.target.value)} style={{ width: 90, padding: ".3rem .5rem", border: "1px solid var(--line)", borderRadius: 8 }} /></td>
      <td><input type="number" min="0" value={deductions} onChange={(e) => setDeductions(e.target.value)} style={{ width: 90, padding: ".3rem .5rem", border: "1px solid var(--line)", borderRadius: 8 }} /></td>
      <td>{egp(row.commissionCents)}</td>
      <td><strong>{egp(net)}</strong></td>
      <td>{row.paidAt ? <span className="badge badge--completed">Paid</span> : <span className="badge badge--pending">Unpaid</span>}</td>
      <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
        <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => save(false)}>Save</button>{" "}
        <button className="btn btn--gold btn--sm" disabled={busy || Boolean(row.paidAt)} onClick={() => save(true)}>Mark paid</button>
      </td>
    </tr>
  );
}
