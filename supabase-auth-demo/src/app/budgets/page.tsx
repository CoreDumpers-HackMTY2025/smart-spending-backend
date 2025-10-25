"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

type Category = { id: number; name: string; color?: string | null; icon?: string | null };

type Budget = {
  id: number;
  category_id: number;
  limit_amount: number;
  spent_amount: number;
  month: number;
  year: number;
  category?: { id: number; name: string; color?: string | null; icon?: string | null } | null;
};

export default function BudgetsPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());

  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [newLimitAmount, setNewLimitAmount] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLimitAmount, setEditLimitAmount] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadCategories() {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (res.ok) setCategories(json.data || []);
    } catch {}
  }

  async function loadBudgets() {
    setLoading(true);
    setStatus(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para ver tus presupuestos.");
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({ month: String(month), year: String(year) });
      const res = await fetch(`/api/budgets?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error cargando presupuestos");
      setBudgets(json.budgets || json.data || []);
    } catch (err: any) {
      setStatus(err.message || "Error cargando presupuestos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  async function handleCreateBudget(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const categoryId = Number(newCategoryId);
    const limitAmount = Number(newLimitAmount);
    if (!categoryId || isNaN(categoryId)) {
      setStatus("Selecciona una categoría válida");
      return;
    }
    if (isNaN(limitAmount) || limitAmount < 0) {
      setStatus("El límite debe ser un número >= 0");
      return;
    }
    try {
      setCreating(true);
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para crear presupuestos.");
        return;
      }
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ categoryId, limitAmount, month, year }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo crear presupuesto");
      const created: Budget = json.budget || json.data || json;
      setBudgets((prev) => {
        const idx = prev.findIndex(
          (b) => b.category_id === created.category_id && b.month === created.month && b.year === created.year
        );
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = created;
          return copy;
        }
        return [...prev, created];
      });
      setNewCategoryId("");
      setNewLimitAmount("");
      setStatus("Presupuesto guardado");
    } catch (err: any) {
      setStatus(err.message || "Error creando presupuesto");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(b: Budget) {
    setEditingId(b.id);
    setEditLimitAmount(String(b.limit_amount ?? ""));
    setStatus(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLimitAmount("");
  }

  async function saveEdit() {
    if (!editingId) return;
    const limitAmount = Number(editLimitAmount);
    if (isNaN(limitAmount) || limitAmount < 0) {
      setStatus("El límite debe ser un número >= 0");
      return;
    }
    try {
      setSavingEdit(true);
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para editar presupuestos.");
        return;
      }
      const res = await fetch(`/api/budgets/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ limitAmount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo actualizar presupuesto");
      const updated: Budget = json.budget || json.data || json;
      setBudgets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      cancelEdit();
      setStatus("Presupuesto actualizado");
    } catch (err: any) {
      setStatus(err.message || "Error actualizando presupuesto");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      setDeletingId(id);
      setStatus(null);
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para eliminar presupuestos.");
        return;
      }
      const res = await fetch(`/api/budgets/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo eliminar presupuesto");
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      setStatus("Presupuesto eliminado");
    } catch (err: any) {
      setStatus(err.message || "Error eliminando presupuesto");
    } finally {
      setDeletingId(null);
    }
  }

  const summary = useMemo(() => {
    const total_limit = budgets.reduce((s, x) => s + (x.limit_amount || 0), 0);
    const total_spent = budgets.reduce((s, x) => s + (x.spent_amount || 0), 0);
    const percent_used = total_limit > 0 ? (total_spent / total_limit) * 100 : 0;
    return { total_limit, total_spent, percent_used };
  }, [budgets]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <h1>Presupuestos</h1>
      <p>Define límites por categoría y mes; se actualizan automáticamente con tus gastos.</p>

      <div style={{ display: "grid", gridTemplateColumns: "140px 140px auto", gap: 8, marginBottom: 16 }}>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ padding: 8 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{`Mes ${m}`}</option>
          ))}
        </select>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ padding: 8 }} />
        <button onClick={loadBudgets}>Actualizar</button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 600 }}>Total límite: ${summary.total_limit.toFixed(2)}</div>
        <div>Gastado: ${summary.total_spent.toFixed(2)}</div>
        <div>Uso: {summary.percent_used.toFixed(1)}%</div>
      </div>

      <form onSubmit={handleCreateBudget} style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 8, marginBottom: 16 }}>
        <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} style={{ padding: 8 }}>
          <option value="">Selecciona categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input type="number" min={0} step="0.01" placeholder="Límite" value={newLimitAmount} onChange={(e) => setNewLimitAmount(e.target.value)} style={{ padding: 8 }} />
        <button type="submit" disabled={creating}>Guardar</button>
      </form>

      {status && <div style={{ marginBottom: 12, color: "#555" }}>{status}</div>}

      {loading ? (
        <div>Cargando...</div>
      ) : budgets.length === 0 ? (
        <div>No hay presupuestos para el periodo seleccionado.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {budgets.map((b) => {
            const remaining = (b.limit_amount || 0) - (b.spent_amount || 0);
            const percent = b.limit_amount > 0 ? Math.min(100, ((b.spent_amount || 0) / b.limit_amount) * 100) : 0;
            return (
              <li key={b.id} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 600 }}>{b.category?.name ?? `Categoría ${b.category_id}`}</div>

                {editingId === b.id ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
                    <input type="number" min={0} step="0.01" value={editLimitAmount} onChange={(e) => setEditLimitAmount(e.target.value)} style={{ padding: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={saveEdit} disabled={savingEdit}>Guardar</button>
                      <button type="button" onClick={cancelEdit}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
                    <div>Límite: ${b.limit_amount?.toFixed(2)}</div>
                    <div>Gastado: ${b.spent_amount?.toFixed(2)}</div>
                    <div>Disponible: ${remaining.toFixed(2)}</div>
                  </div>
                )}

                <div style={{ height: 8, background: "#eee", borderRadius: 4, marginTop: 8 }}>
                  <div style={{ width: `${percent}%`, height: 8, background: percent >= 100 ? "#ef4444" : percent >= 80 ? "#f59e0b" : "#22c55e", borderRadius: 4 }} />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {editingId === b.id ? null : (
                    <button type="button" onClick={() => startEdit(b)}>Editar límite</button>
                  )}
                  <button type="button" onClick={() => handleDelete(b.id)} disabled={deletingId === b.id}>Eliminar</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div style={{ marginTop: 24 }}>
        <a href="/expenses/new" style={{ textDecoration: "underline" }}>Registrar un gasto</a>
      </div>
    </div>
  );
}