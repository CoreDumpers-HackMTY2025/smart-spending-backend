"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

type Expense = {
  id: string;
  amount: number;
  merchant: string | null;
  description: string | null;
  category_id: string | null;
  category_name?: string | null;
  transport_type: string | null;
  carbon_kg: number | null;
  created_at: string;
};

type Category = { id: string; name: string };

export default function ExpensesListPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | "">("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [sort, setSort] = useState("created_at.desc");

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadCategories() {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch("/api/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        const cats = (json.data || []) as Category[];
        setCategories(cats);
      }
    } catch {}
  }

  async function loadExpenses() {
    setLoading(true);
    setStatus(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para ver tus gastos.");
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryId) params.set("category_id", String(categoryId));
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (minAmount) params.set("min", minAmount);
      if (maxAmount) params.set("max", maxAmount);
      if (sort) params.set("sort", sort);

      const res = await fetch(`/api/expenses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error cargando gastos");
      }
      // json.data: asumimos que el API devuelve lista de gastos
      setExpenses(json.data || []);
    } catch (err: any) {
      setStatus(err.message || "Error cargando gastos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, dateFrom, dateTo, minAmount, maxAmount, sort]);

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <h1>Gastos</h1>
      <div style={{ marginBottom: 8 }}>
        <a href="/expenses/new" style={{ textDecoration: "underline" }}>Registrar nuevo gasto</a>
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
          <input
            type="text"
            placeholder="Buscar por comercio o descripción"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: 8 }}
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ padding: 8 }}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: 8 }} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: 8 }} />
          <input type="number" placeholder="Mín $" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} style={{ padding: 8 }} />
          <input type="number" placeholder="Máx $" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} style={{ padding: 8 }} />
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: 8 }}>
            <option value="created_at.desc">Más recientes</option>
            <option value="created_at.asc">Más antiguos</option>
            <option value="amount.desc">Monto mayor</option>
            <option value="amount.asc">Monto menor</option>
          </select>
        </div>
      </div>

      {status && (
        <div style={{ marginBottom: 12, color: "#555" }}>{status}</div>
      )}

      <div style={{ marginBottom: 12, fontWeight: 600 }}>Total: ${total.toFixed(2)}</div>

      {loading ? (
        <div>Cargando...</div>
      ) : expenses.length === 0 ? (
        <div>No hay gastos que coincidan con los filtros.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {expenses.map((e) => (
            <li key={e.id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {e.merchant || e.description || "Gasto"}
                    {e.category_name ? (
                      <span style={{ marginLeft: 8, fontSize: 12, color: "#777" }}>({e.category_name})</span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12, color: "#777" }}>
                    {new Date(e.created_at).toLocaleString()}
                    {e.transport_type ? ` · Transporte: ${e.transport_type}` : ""}
                    {e.carbon_kg ? ` · CO₂: ${e.carbon_kg} kg` : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>${e.amount.toFixed(2)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}