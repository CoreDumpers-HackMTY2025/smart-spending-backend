"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

const supabase = getSupabase();

type RecItem = {
  id?: string;
  title: string;
  description: string;
  category: string;
  potential_savings: number;
  carbon_reduction: number;
  action_steps: string[];
  priority: "low" | "medium" | "high";
  created_at?: string;
};

export default function RecommendationsPage() {
  const [focus, setFocus] = useState<"savings" | "eco" | "transport" | "health" | "general">("general");
  const [recs, setRecs] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [envMissing, setEnvMissing] = useState(false);

  useEffect(() => {
    setEnvMissing(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }, []);

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function generateRecommendations() {
    setLoading(true);
    setStatus(null);
    setRecs([]);
    try {
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para generar recomendaciones.");
        return;
      }
      const params = new URLSearchParams();
      if (focus !== "general") params.set("focus", focus);
      const res = await fetch(`/api/recommendations/generate?${params.toString()}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error generando recomendaciones");
      setRecs(json.recommendations || json.data || []);
      setStatus(`Se generaron ${json.recommendations?.length ?? 0} recomendaciones.`);
    } catch (err: any) {
      setStatus(err.message || "Error generando recomendaciones");
    } finally {
      setLoading(false);
    }
  }

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
        maxWidth: 960,
        background: "#111827",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Recomendaciones con IA</h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
          Genera sugerencias personalizadas basadas en tus gastos de los últimos 30 días.
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
          <select value={focus} onChange={(e) => setFocus(e.target.value as any)} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>
            <option value="general">General</option>
            <option value="savings">Ahorro</option>
            <option value="eco">Ecológico</option>
            <option value="transport">Transporte</option>
            <option value="health">Salud</option>
          </select>
          <button onClick={generateRecommendations} disabled={loading} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: loading ? "#1f2937" : "#0b1220", color: "#e2e8f0" }}>Generar</button>
        </div>

        {status && (
          <div style={{ marginBottom: 12, color: "#93c5fd" }}>{status}</div>
        )}

        {loading ? (
          <div>Generando…</div>
        ) : recs.length === 0 ? (
          <div>No hay recomendaciones aún.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {recs.map((r, idx) => (
              <li key={r.id ?? idx} style={{ border: "1px solid #334155", borderRadius: 8, padding: 12, background: "#0b1220" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: 16 }}>{r.title}</strong>
                  <span style={{ fontSize: 12, padding: "2px 6px", borderRadius: 6, background: r.priority === "high" ? "#ef4444" : r.priority === "medium" ? "#f59e0b" : "#22c55e", color: "#0b1220" }}>{r.priority.toUpperCase()}</span>
                </div>
                <div style={{ marginBottom: 8 }}>{r.description}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#93c5fd", marginBottom: 8 }}>
                  <span>Potencial ahorro: ${r.potential_savings.toFixed(2)}</span>
                  <span>Reducción CO₂: {r.carbon_reduction.toFixed(2)} kg</span>
                  <span>Categoría: {r.category}</span>
                </div>
                {r.action_steps?.length ? (
                  <div>
                    <div style={{ fontSize: 13, marginBottom: 6 }}>Pasos sugeridos:</div>
                    <ol style={{ margin: 0, paddingLeft: 16 }}>
                      {r.action_steps.map((step, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <a href="/expenses" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", color: "#e2e8f0" }}>Ver gastos</a>
          <a href="/carbon" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", color: "#e2e8f0" }}>Panel de Carbono</a>
        </div>
      </div>
    </main>
  );
}