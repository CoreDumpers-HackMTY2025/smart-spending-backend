"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

type Goal = {
  id: number;
  name: string;
  target_amount: number;
  saved_amount: number;
  deadline?: string | null;
  progress?: number;
  reached?: boolean;
};

export default function SavingsGoalsPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newTargetAmount, setNewTargetAmount] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [creating, setCreating] = useState(false);

  const [contrib, setContrib] = useState<Record<number, string>>({});
  const [contributingId, setContributingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editTargetAmount, setEditTargetAmount] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadGoals() {
    setLoading(true);
    setStatus(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para ver tus metas de ahorro.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/savings-goals", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error cargando metas");
      setGoals(json.goals || json.data || []);
    } catch (err: any) {
      setStatus(err.message || "Error cargando metas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const name = newName.trim();
    const targetAmount = Number(newTargetAmount);
    const deadline = newDeadline.trim();
    if (!name) {
      setStatus("Ingresa un nombre para la meta");
      return;
    }
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setStatus("El objetivo debe ser un número > 0");
      return;
    }
    try {
      setCreating(true);
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para crear metas.");
        return;
      }
      const body: any = { name, targetAmount };
      if (deadline) body.deadline = new Date(deadline).toISOString();
      const res = await fetch("/api/savings-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo crear la meta");
      const created: Goal = json.goal || json.data || json;
      setGoals((prev) => [created, ...prev]);
      setNewName("");
      setNewTargetAmount("");
      setNewDeadline("");
      setStatus("Meta creada");
    } catch (err: any) {
      setStatus(err.message || "Error creando meta");
    } finally {
      setCreating(false);
    }
  }

  function setContribValue(id: number, value: string) {
    setContrib((prev) => ({ ...prev, [id]: value }));
  }

  async function handleContribute(id: number) {
    const addAmount = Number(contrib[id]);
    if (isNaN(addAmount) || addAmount <= 0) {
      setStatus("El aporte debe ser un número > 0");
      return;
    }
    try {
      setContributingId(id);
      setStatus(null);
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para aportar.");
        return;
      }
      const res = await fetch("/api/savings-goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ goalId: id, addAmount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo actualizar");
      const updated: Goal = json.goal || json.data || json;
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setContribValue(id, "");
      setStatus("Aporte registrado");
    } catch (err: any) {
      setStatus(err.message || "Error registrando aporte");
    } finally {
      setContributingId(null);
    }
  }

  async function handleDelete(id: number) {
    try {
      setDeletingId(id);
      setStatus(null);
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para eliminar metas.");
        return;
      }
      const res = await fetch(`/api/savings-goals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo eliminar");
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setStatus("Meta eliminada");
    } catch (err: any) {
      setStatus(err.message || "Error eliminando meta");
    } finally {
      setDeletingId(null);
    }
  }

  const summary = goals.reduce(
    (acc, g) => {
      acc.total_target += g.target_amount || 0;
      acc.total_saved += g.saved_amount || 0;
      return acc;
    },
    { total_target: 0, total_saved: 0 }
  );
  const percent = summary.total_target > 0 ? (summary.total_saved / summary.total_target) * 100 : 0;

  const activeGoals = useMemo(() => goals.filter((g) => {
    const target = g.target_amount ?? 0;
    const saved = g.saved_amount ?? 0;
    return target === 0 || saved < target;
  }), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => {
    const target = g.target_amount ?? 0;
    const saved = g.saved_amount ?? 0;
    return target > 0 && saved >= target;
  }), [goals]);

  function startEditGoal(g: Goal) {
    setEditingId(g.id);
    setEditName(g.name);
    setEditTargetAmount(String(g.target_amount ?? ""));
    setEditDeadline(g.deadline ? new Date(g.deadline).toISOString().slice(0, 16) : "");
    setStatus(null);
  }

  function cancelEditGoal() {
    setEditingId(null);
    setEditName("");
    setEditTargetAmount("");
    setEditDeadline("");
  }

  async function saveInlineEdit() {
    if (!editingId) return;
    const name = editName.trim();
    const targetAmount = Number(editTargetAmount);
    const deadline = editDeadline.trim();
    if (!name) { setStatus("Ingresa un nombre para la meta"); return; }
    if (isNaN(targetAmount) || targetAmount <= 0) { setStatus("El objetivo debe ser un número > 0"); return; }
    try {
      setSavingEdit(true);
      const token = await getAccessToken();
      if (!token) { setStatus("Debes iniciar sesión para editar metas."); return; }
      const body: any = { name, targetAmount };
      if (deadline) body.deadline = new Date(deadline).toISOString();
      const res = await fetch(`/api/savings-goals/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo actualizar");
      const updated: Goal = json.goal || json.data || json;
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      cancelEditGoal();
      setStatus("Meta actualizada");
    } catch (err: any) {
      setStatus(err.message || "Error actualizando meta");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>Metas de ahorro</h1>
      <p>Crea objetivos de ahorro y registra tus aportes hasta llegar a la meta.</p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 600 }}>Objetivo total: ${summary.total_target.toFixed(2)}</div>
        <div>Ahorros: ${summary.total_saved.toFixed(2)}</div>
        <div>Progreso: {percent.toFixed(1)}%</div>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: `conic-gradient(#22c55e ${percent}%, #e5e5e5 0)`, position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 40, height: 40, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
            {percent.toFixed(0)}%
          </div>
        </div>
      </div>

      <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 16 }}>
        <input type="text" placeholder="Nombre de la meta" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ padding: 8 }} />
        <input type="number" min={0.01} step="0.01" placeholder="Objetivo" value={newTargetAmount} onChange={(e) => setNewTargetAmount(e.target.value)} style={{ padding: 8 }} />
        <input type="datetime-local" placeholder="Fecha límite" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} style={{ padding: 8 }} />
        <button type="submit" disabled={creating}>Guardar</button>
      </form>

      {status && <div style={{ marginBottom: 12, color: "#555" }}>{status}</div>}

      {loading ? (
        <div>Cargando...</div>
      ) : (activeGoals.length + completedGoals.length === 0) ? (
        <div>No tienes metas creadas.</div>
      ) : (
        <>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {activeGoals.map((g) => {
              const pct = g.target_amount > 0 ? Math.min(100, ((g.saved_amount || 0) / g.target_amount) * 100) : 0;
              return (
                <li key={g.id} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{g.name}</div>
  
                  {editingId === g.id ? (
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginTop: 8 }}>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ padding: 8 }} />
                      <input type="number" min={0.01} step="0.01" value={editTargetAmount} onChange={(e) => setEditTargetAmount(e.target.value)} style={{ padding: 8 }} />
                      <input type="datetime-local" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} style={{ padding: 8 }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={saveInlineEdit} disabled={savingEdit}>Guardar</button>
                        <button type="button" onClick={cancelEditGoal}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 12, marginTop: 6, alignItems: "center" }}>
                      <div>Objetivo: ${g.target_amount?.toFixed(2)}</div>
                      <div>Ahorros: ${g.saved_amount?.toFixed(2)}</div>
                      {g.deadline && <div>Fecha límite: {new Date(g.deadline).toLocaleString()}</div>}
                    </div>
                  )}
  
                  <div style={{ height: 8, background: "#eee", borderRadius: 4, marginTop: 8 }}>
                    <div style={{ width: `${pct}%`, height: 8, background: pct >= 100 ? "#22c55e" : pct >= 80 ? "#3b82f6" : "#6366f1", borderRadius: 4 }} />
                  </div>
  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, marginTop: 10 }}>
                    <input type="number" min={0.01} step="0.01" placeholder="Aportar" value={contrib[g.id] || ""} onChange={(e) => setContribValue(g.id, e.target.value)} style={{ padding: 8 }} />
                    <button type="button" onClick={() => handleContribute(g.id)} disabled={contributingId === g.id}>Aportar</button>
                    {editingId === g.id ? null : (
                      <button type="button" onClick={() => startEditGoal(g)}>Editar</button>
                    )}
                    <button type="button" onClick={() => handleDelete(g.id)} disabled={deletingId === g.id}>Eliminar</button>
                  </div>
                </li>
              );
            })}
          </ul>
  
          {completedGoals.length > 0 && (
            <>
              <h2 style={{ marginTop: 20 }}>Completadas</h2>
              <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
                {completedGoals.map((g) => {
                  const pct = g.target_amount > 0 ? Math.min(100, ((g.saved_amount || 0) / g.target_amount) * 100) : 0;
                  return (
                    <li key={g.id} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12, background: "#f9fafb" }}>
                      <div style={{ fontWeight: 600 }}>{g.name}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 6, alignItems: "center" }}>
                        <div>Objetivo: ${g.target_amount?.toFixed(2)}</div>
                        <div>Ahorros: ${g.saved_amount?.toFixed(2)}</div>
                        {g.deadline && <div>Fecha límite: {new Date(g.deadline).toLocaleString()}</div>}
                      </div>
                      <div style={{ height: 8, background: "#eee", borderRadius: 4, marginTop: 8 }}>
                        <div style={{ width: `${pct}%`, height: 8, background: "#22c55e", borderRadius: 4 }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 10 }}>
                        <input type="number" min={0.01} step="0.01" placeholder="Aportar" value={contrib[g.id] || ""} onChange={(e) => setContribValue(g.id, e.target.value)} style={{ padding: 8 }} disabled />
                        <button type="button" onClick={() => handleDelete(g.id)} disabled={deletingId === g.id}>Eliminar</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <a href="/expenses/new" style={{ textDecoration: "underline" }}>Registrar un gasto</a>
      </div>
    </div>
  );
}



async function saveInlineEdit() {
  if (!editingId) return;
  const name = editName.trim();
  const targetAmount = Number(editTargetAmount);
  const deadline = editDeadline.trim();
  if (!name) {
    setStatus("Ingresa un nombre para la meta");
    return;
  }
  if (isNaN(targetAmount) || targetAmount <= 0) {
    setStatus("El objetivo debe ser un número > 0");
    return;
  }
  try {
    setSavingEdit(true);
    const token = await getAccessToken();
    if (!token) {
      setStatus("Debes iniciar sesión para editar metas.");
      return;
    }
    const body: any = { name, targetAmount };
    if (deadline) body.deadline = deadline;
    const res = await fetch(`/api/savings-goals/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "No se pudo actualizar");
    const updated: Goal = json.goal || json.data || json;
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    cancelEditGoal();
    setStatus("Meta actualizada");
  } catch (err: any) {
    setStatus(err.message || "Error actualizando meta");
  } finally {
    setSavingEdit(false);
  }
}