"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

type Category = { id: number; name: string; color?: string | null; icon?: string | null };

type Subscription = {
  id: number;
  merchant: string | null;
  description: string | null;
  category_id: number | null;
  category?: Category | null;
  amount: number;
  every_n: number;
  unit: "day" | "week" | "month" | "year";
  start_date: string;
  next_charge_at: string;
  active: boolean;
  created_at: string;
};

export default function SubscriptionsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [search, setSearch] = useState("");

  // Formulario de nueva suscripción
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [everyN, setEveryN] = useState("1");
  const [unit, setUnit] = useState<"day" | "week" | "month" | "year">("month");
  const [startDate, setStartDate] = useState("");

  // Edición rápida
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editEveryN, setEditEveryN] = useState<string>("");
  const [editUnit, setEditUnit] = useState<"day" | "week" | "month" | "year">("month");
  const [editStartDate, setEditStartDate] = useState<string>("");

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
      if (res.ok) setCategories(json.data || []);
    } catch {}
  }

  async function loadSubscriptions() {
    setLoading(true);
    setStatus(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para ver tus suscripciones.");
        setLoading(false);
        return;
      }
      const url = new URL("/api/subscriptions", window.location.origin);
      if (filterActive) url.searchParams.set("active", filterActive);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error cargando suscripciones");
      }
      setSubscriptions(json.data || []);
    } catch (err: any) {
      setStatus(err.message || "Error cargando suscripciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
    loadSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterActive]);

  function filteredSubs() {
    const q = search.trim().toLowerCase();
    if (!q) return subscriptions;
    return subscriptions.filter((s) => {
      const m = (s.merchant || "").toLowerCase();
      const d = (s.description || "").toLowerCase();
      return m.includes(q) || d.includes(q);
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    const n = parseInt(everyN, 10);
    if (!amt || amt <= 0 || !Number.isFinite(amt)) {
      setStatus("Monto inválido");
      return;
    }
    if (!Number.isInteger(n) || n <= 0) {
      setStatus("Intervalo inválido");
      return;
    }
    try {
      setCreating(true);
      setStatus(null);
      const token = await getAccessToken();
      if (!token) throw new Error("No autenticado");
      const payload: any = {
        amount: amt,
        everyN: n,
        unit,
      };
      if (merchant.trim()) payload.merchant = merchant.trim();
      if (description.trim()) payload.description = description.trim();
      if (categoryId) payload.categoryId = Number(categoryId);
      if (startDate) payload.startDate = new Date(startDate).toISOString();

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo crear la suscripción");
      const created: Subscription = json.data || json;
      setSubscriptions((prev) => [created, ...prev]);
      // Reset
      setAmount("");
      setMerchant("");
      setDescription("");
      setCategoryId("");
      setEveryN("1");
      setUnit("month");
      setStartDate("");
      setStatus("Suscripción creada");
    } catch (err: any) {
      setStatus(err.message || "Error creando suscripción");
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(s: Subscription) {
    setEditingId(s.id);
    setEditAmount(String(s.amount));
    setEditEveryN(String(s.every_n));
    setEditUnit(s.unit);
    const dtLocal = new Date(s.start_date);
    // form input datetime-local expects format yyyy-MM-ddTHH:mm
    const pad = (x: number) => String(x).padStart(2, "0");
    const local = `${dtLocal.getFullYear()}-${pad(dtLocal.getMonth() + 1)}-${pad(dtLocal.getDate())}T${pad(dtLocal.getHours())}:${pad(dtLocal.getMinutes())}`;
    setEditStartDate(local);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAmount("");
    setEditEveryN("");
    setEditUnit("month");
    setEditStartDate("");
  }

  async function submitEdit(id: number) {
    const amt = editAmount ? Number(editAmount) : undefined;
    const n = editEveryN ? parseInt(editEveryN, 10) : undefined;
    try {
      setStatus(null);
      const token = await getAccessToken();
      if (!token) throw new Error("No autenticado");
      const payload: any = {};
      if (amt !== undefined) payload.amount = amt;
      if (n !== undefined) payload.everyN = n;
      if (editUnit) payload.unit = editUnit;
      if (editStartDate) payload.startDate = new Date(editStartDate).toISOString();

      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo actualizar");
      const updated: Subscription = json.data || json;
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setStatus("Suscripción actualizada");
      cancelEdit();
    } catch (err: any) {
      setStatus(err.message || "Error actualizando suscripción");
    }
  }

  async function toggleActive(s: Subscription) {
    try {
      setStatus(null);
      const token = await getAccessToken();
      if (!token) throw new Error("No autenticado");
      const res = await fetch(`/api/subscriptions/${s.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !s.active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo actualizar estado");
      const updated: Subscription = json.data || json;
      setSubscriptions((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
    } catch (err: any) {
      setStatus(err.message || "Error cambiando estado");
    }
  }

  async function deleteSub(id: number) {
    if (!confirm("¿Eliminar suscripción?")) return;
    try {
      setStatus(null);
      const token = await getAccessToken();
      if (!token) throw new Error("No autenticado");
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo eliminar");
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      setStatus("Suscripción eliminada");
    } catch (err: any) {
      setStatus(err.message || "Error eliminando suscripción");
    }
  }

  const envMissing = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const list = filteredSubs();

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
        maxWidth: 900,
        background: "#111827",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Suscripciones</h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
          Administra tus suscripciones recurrentes. Crea, edita, activa/desactiva y elimina.
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

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <a href="/expenses" style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            color: "#e2e8f0",
          }}>Gastos</a>
          <a href="/categories" style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            color: "#e2e8f0",
          }}>Categorías</a>
        </div>

        {status && (
          <div style={{ marginBottom: 12, color: "#93c5fd" }}>{status}</div>
        )}

        {/* Filtros y búsqueda */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as any)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>
            <option value="">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
          <input type="text" placeholder="Buscar por comercio o descripción" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
          <button onClick={loadSubscriptions} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>Actualizar</button>
        </div>

        {/* Formulario de creación */}
        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          <input type="number" step="0.01" placeholder="Monto" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
          <input type="text" placeholder="Comercio (ej. Spotify)" value={merchant} onChange={(e) => setMerchant(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
          <input type="text" placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
          <input type="number" min={1} placeholder="Cada N" value={everyN} onChange={(e) => setEveryN(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
          <select value={unit} onChange={(e) => setUnit(e.target.value as any)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>
            <option value="day">día</option>
            <option value="week">semana</option>
            <option value="month">mes</option>
            <option value="year">año</option>
          </select>
          <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }} />
          <button type="submit" disabled={creating} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: creating ? "#0b1220" : "#1e293b", color: "#e2e8f0" }}>
            {creating ? "Creando..." : "Agregar suscripción"}
          </button>
        </form>

        {/* Listado */}
        {loading ? (
          <div>Cargando...</div>
        ) : list.length === 0 ? (
          <div>No hay suscripciones aún.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {list.map((s) => (
              <li key={s.id} style={{ border: "1px solid #334155", borderRadius: 8, padding: 12, background: "#0b1220" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 600 }}>{s.merchant || s.description || `Suscripción #${s.id}`}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{s.active ? "Activa" : "Inactiva"}</div>
                </div>
                <div style={{ fontSize: 12, color: "#93c5fd" }}>Monto: ${s.amount.toFixed(2)}</div>
                <div style={{ fontSize: 12, color: "#93c5fd" }}>Categoría: {s.category?.name ?? "-"}</div>
                <div style={{ fontSize: 12, color: "#93c5fd" }}>Cada: {s.every_n} {s.unit}</div>
                <div style={{ fontSize: 12, color: "#93c5fd" }}>Próximo cobro: {new Date(s.next_charge_at).toLocaleString()}</div>

                {editingId === s.id ? (
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                    <input type="number" step="0.01" placeholder="Monto" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#06101e", color: "#e2e8f0" }} />
                    <input type="number" min={1} placeholder="Cada N" value={editEveryN} onChange={(e) => setEditEveryN(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#06101e", color: "#e2e8f0" }} />
                    <select value={editUnit} onChange={(e) => setEditUnit(e.target.value as any)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#06101e", color: "#e2e8f0" }}>
                      <option value="day">día</option>
                      <option value="week">semana</option>
                      <option value="month">mes</option>
                      <option value="year">año</option>
                    </select>
                    <input type="datetime-local" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#06101e", color: "#e2e8f0" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => submitEdit(s.id)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0" }}>Guardar</button>
                      <button onClick={cancelEdit} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#e2e8f0" }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => beginEdit(s)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#e2e8f0" }}>Editar</button>
                    <button onClick={() => toggleActive(s)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: s.active ? "#1e293b" : "transparent", color: "#e2e8f0" }}>{s.active ? "Desactivar" : "Activar"}</button>
                    <button onClick={() => deleteSub(s.id)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#ef4444" }}>Eliminar</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 24 }}>
          <a href="/expenses/new" style={{ textDecoration: "underline" }}>Registrar un gasto</a>
        </div>
      </div>
    </main>
  );
}