"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

type Category = { id: number; name: string; color?: string | null; icon?: string | null };

type Income = {
  id: number;
  amount: number;
  category_id: number | null;
  category?: Category | null;
  source: string | null;
  description: string | null;
  created_at: string;
};

export default function IncomesPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  // Filtros
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");
  const [sort, setSort] = useState<"created_at" | "amount">("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // Formulario de nuevo ingreso
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [receivedAt, setReceivedAt] = useState("");

  // Edición rápida
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editSource, setEditSource] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editReceivedAt, setEditReceivedAt] = useState<string>("");

  useEffect(() => {
    loadCategories();
    loadIncomes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function loadIncomes() {
    setLoading(true);
    setStatus(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setStatus("No autenticado. Inicia sesión.");
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      if (startDate) params.set("start", new Date(startDate).toISOString());
      if (endDate) params.set("end", new Date(endDate).toISOString());
      if (filterCategoryId) params.set("categoryId", String(Number(filterCategoryId)));
      if (sort) params.set("sort", sort);
      if (order) params.set("order", order);
      const res = await fetch(`/api/incomes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 503 && json?.error?.includes("Tabla incomes no existe")) {
          setStatus("La tabla incomes no existe. Ejecuta la migración SQL en Supabase y vuelve a intentar.");
        } else {
          setStatus(json?.error ?? "Error listando ingresos");
        }
        setIncomes([]);
      } else {
        setIncomes(json.data || []);
      }
    } catch (err: any) {
      setStatus(err?.message ?? "Error listando ingresos");
    } finally {
      setLoading(false);
    }
  }

  async function createIncome() {
    setCreating(true);
    setStatus(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const payload: any = { amount: Number(amount) };
      if (categoryId) payload.categoryId = Number(categoryId);
      if (source) payload.source = source;
      if (description) payload.description = description;
      if (receivedAt) payload.receivedAt = new Date(receivedAt).toISOString();
      const res = await fetch("/api/incomes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 503 && json?.error?.includes("Tabla incomes no existe")) {
          setStatus("La tabla incomes no existe. Ejecuta la migración SQL y vuelve a intentar.");
        } else {
          setStatus(json?.error ?? "Error creando ingreso");
        }
      } else {
        setStatus("Ingreso creado");
        // limpiar
        setAmount("");
        setSource("");
        setDescription("");
        setCategoryId("");
        setReceivedAt("");
        // recargar
        await loadIncomes();
      }
    } catch (err: any) {
      setStatus(err?.message ?? "Error creando ingreso");
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(i: Income) {
    setEditingId(i.id);
    setEditAmount(String(i.amount ?? ""));
    setEditSource(i.source ?? "");
    setEditDescription(i.description ?? "");
    setEditCategoryId(i.category_id ? String(i.category_id) : "");
    setEditReceivedAt(i.created_at ? new Date(i.created_at).toISOString().slice(0, 16) : "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAmount("");
    setEditSource("");
    setEditDescription("");
    setEditCategoryId("");
    setEditReceivedAt("");
  }

  async function saveEdit(id: number) {
    setStatus(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const payload: any = {};
      if (editAmount) payload.amount = Number(editAmount);
      if (editSource || editSource === "") payload.source = editSource;
      if (editDescription || editDescription === "") payload.description = editDescription;
      if (editCategoryId) payload.categoryId = Number(editCategoryId);
      if (editReceivedAt) payload.receivedAt = new Date(editReceivedAt).toISOString();

      const res = await fetch(`/api/incomes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 503 && json?.error?.includes("Tabla incomes no existe")) {
          setStatus("La tabla incomes no existe. Ejecuta la migración SQL y vuelve a intentar.");
        } else {
          setStatus(json?.error ?? "Error actualizando ingreso");
        }
      } else {
        setStatus("Ingreso actualizado");
        setEditingId(null);
        await loadIncomes();
      }
    } catch (err: any) {
      setStatus(err?.message ?? "Error actualizando ingreso");
    }
  }

  async function deleteIncome(id: number) {
    setStatus(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/incomes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 503 && json?.error?.includes("Tabla incomes no existe")) {
          setStatus("La tabla incomes no existe. Ejecuta la migración SQL y vuelve a intentar.");
        } else {
          setStatus(json?.error ?? "Error eliminando ingreso");
        }
      } else {
        setStatus("Ingreso eliminado");
        await loadIncomes();
      }
    } catch (err: any) {
      setStatus(err?.message ?? "Error eliminando ingreso");
    }
  }

  const totalAmount = incomes.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const envMissing = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f172a",
      color: "#e2e8f0",
      padding: 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 1000,
        background: "#111827",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Ingresos</h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
          Administra tus ingresos: lista, filtra, crea, edita y elimina.
        </p>

        {envMissing && (
          <div role="alert" style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#0b1220",
            color: "#fbbf24",
            fontSize: 13,
          }}>
            Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <a href="/expenses" style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#0b1220",
            color: "#93c5fd",
            fontSize: 13,
            textDecoration: "none",
          }}>Gastos</a>
          <a href="/subscriptions" style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#0b1220",
            color: "#93c5fd",
            fontSize: 13,
            textDecoration: "none",
          }}>Suscripciones</a>
          <a href="/categories" style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#0b1220",
            color: "#93c5fd",
            fontSize: 13,
            textDecoration: "none",
          }}>Categorías</a>
        </div>

        {/* Filtros */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 8,
          marginBottom: 16,
        }}>
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ fontSize: 12, opacity: 0.75 }}>Desde</label>
            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ fontSize: 12, opacity: 0.75 }}>Hasta</label>
            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, opacity: 0.75 }}>Categoría</label>
            <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>
              <option value="">Todas</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, opacity: 0.75 }}>Ordenar por</label>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>
              <option value="created_at">Fecha</option>
              <option value="amount">Monto</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, opacity: 0.75 }}>Orden</label>
            <select value={order} onChange={(e) => setOrder(e.target.value as any)}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={loadIncomes} disabled={loading}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>
            {loading ? "Cargando..." : "Aplicar filtros"}
          </button>
          <div style={{ marginLeft: "auto", fontSize: 13, opacity: 0.8 }}>
            Total: <strong style={{ color: "#93c5fd" }}>{totalAmount.toFixed(2)}</strong>
          </div>
        </div>

        {/* Creación rápida */}
        <div style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 12,
          border: "1px solid #334155",
          background: "#0b1220",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8 }}>
            <div>
              <label style={{ fontSize: 12, opacity: 0.75 }}>Monto</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, opacity: 0.75 }}>Fuente</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Salario, freelance..."
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 12, opacity: 0.75 }}>Descripción</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notas"
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, opacity: 0.75 }}>Categoría</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>
                <option value="">(Opcional)</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, opacity: 0.75 }}>Fecha recibida</label>
              <input type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={createIncome} disabled={creating || !amount}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: creating ? "#1f2937" : "#0b1220", color: "#e2e8f0" }}>
              {creating ? "Creando..." : "Agregar ingreso"}
            </button>
            {status && (
              <div style={{ marginLeft: 8, fontSize: 13, opacity: 0.8 }}>{status}</div>
            )}
          </div>
        </div>

        {/* Lista */}
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.7fr 0.8fr 1.2fr 0.6fr",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid #334155",
            fontSize: 12,
            opacity: 0.8,
          }}>
            <div>Fecha</div>
            <div>Monto</div>
            <div>Fuente</div>
            <div>Descripción</div>
            <div>Acciones</div>
          </div>
          {incomes.length === 0 && (
            <div style={{ padding: 12, fontSize: 13, opacity: 0.8 }}>No hay ingresos.</div>
          )}
          {incomes.map(i => (
            <div key={i.id} style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.7fr 0.8fr 1.2fr 0.6fr",
              gap: 8,
              padding: "8px 12px",
              borderBottom: "1px solid #1f2937",
              alignItems: "center",
            }}>
              <div style={{ fontSize: 13 }}>
                {editingId === i.id ? (
                  <input type="datetime-local" value={editReceivedAt} onChange={(e) => setEditReceivedAt(e.target.value)}
                    style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
                ) : (
                  new Date(i.created_at).toLocaleString()
                )}
              </div>
              <div>
                {editingId === i.id ? (
                  <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                    style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
                ) : (
                  <span style={{ fontSize: 13, color: "#93c5fd" }}>{Number(i.amount).toFixed(2)}</span>
                )}
              </div>
              <div>
                {editingId === i.id ? (
                  <input value={editSource} onChange={(e) => setEditSource(e.target.value)}
                    style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
                ) : (
                  <span style={{ fontSize: 13 }}>{i.source || ""}</span>
                )}
              </div>
              <div>
                {editingId === i.id ? (
                  <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                    style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
                ) : (
                  <span style={{ fontSize: 13 }}>{i.description || ""}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {editingId === i.id ? (
                  <>
                    <button onClick={() => saveEdit(i.id)}
                      style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", fontSize: 12 }}>Guardar</button>
                    <button onClick={cancelEdit}
                      style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", fontSize: 12 }}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => beginEdit(i)}
                      style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", fontSize: 12 }}>Editar</button>
                    <button onClick={() => deleteIncome(i.id)}
                      style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #7f1d1d", background: "#1f2937", color: "#fecaca", fontSize: 12 }}>Eliminar</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}