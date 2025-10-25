"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

const supabase = getSupabase();

type CatSummary = {
  category_id: number;
  categoryName?: string;
  carbon_kg: number;
};

type CarbonSummary = {
  total_kg: number;
  by_category: CatSummary[];
  month?: number;
  year?: number;
};

export default function CarbonPage() {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [summary, setSummary] = useState<CarbonSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);

  const envMissing = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  const equivalents = useMemo(() => {
    const total = summary?.total_kg || 0;
    const carKm = total / 0.2; // ~0.2 kg CO2e por km de auto
    const trees = total / 21; // ~21 kg CO2 por árbol/año
    const kwh = total / 0.45; // ~0.45 kg CO2 por kWh promedio
    const gasoline = total / 2.31; // ~2.31 kg CO2 por litro de nafta
    return { carKm, trees, kwh, gasoline };
  }, [summary]);

  async function loadSummary() {
    setLoading(true);
    setStatus(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para ver tu resumen de carbono.");
        setSummary(null);
        return;
      }
      const params = new URLSearchParams({ month: String(month), year: String(year) });
      const res = await fetch(`/api/carbon/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error cargando resumen de carbono");
      }
      setSummary(json.summary || json.data || null);
    } catch (err: any) {
      setStatus(err.message || "Error cargando resumen de carbono");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!envMissing) loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envMissing, month, year]);

  function changeMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
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
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Huella de Carbono</h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
          Resumen mensual por categorías y total.
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

        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <button onClick={() => changeMonth(-1)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>Mes anterior</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <strong style={{ fontSize: 14 }}>{new Date(year, month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" })}</strong>
          </div>
          <button onClick={() => changeMonth(1)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>Mes siguiente</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{new Date(0, m - 1).toLocaleString(undefined, { month: "long" })}</option>
            ))}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ padding: 8, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", width: 120 }} />
          <button onClick={loadSummary} disabled={loading} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: loading ? "#1f2937" : "#0b1220", color: "#e2e8f0" }}>Actualizar</button>
        </div>

        {status && (
          <div style={{ marginBottom: 12, color: "#93c5fd" }}>{status}</div>
        )}

        {loading ? (
          <div>Cargando…</div>
        ) : summary ? (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <div style={{ border: "1px solid #334155", borderRadius: 8, padding: 12, background: "#0b1220" }}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>Total del mes</h2>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.total_kg.toFixed(2)} kg CO₂e</div>
              <small style={{ display: "block", marginTop: 6, opacity: 0.8 }}>
                Estimación basada en los gastos con campo de carbono.
              </small>
              <div style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: 14, marginBottom: 6 }}>Equivalencias aproximadas</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                  <li>Auto: ≈ {equivalents.carKm.toFixed(0)} km</li>
                  <li>Árboles para compensar en 1 año: ≈ {equivalents.trees.toFixed(1)}</li>
                  <li>Electricidad: ≈ {equivalents.kwh.toFixed(0)} kWh</li>
                  <li>Nafta: ≈ {equivalents.gasoline.toFixed(1)} litros</li>
                </ul>
                <small style={{ display: "block", marginTop: 6, opacity: 0.7 }}>
                  Valores de referencia genéricos; pueden variar según contexto.
                </small>
              </div>
            </div>

            <div style={{ border: "1px solid #334155", borderRadius: 8, padding: 12, background: "#0b1220" }}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>Por categoría</h2>
              {summary.by_category.length === 0 ? (
                <div>No hay datos de carbono para este mes.</div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                  {summary.by_category.map((c) => (
                    <li key={`${c.category_id}-${c.categoryName ?? 'uncat'}`} style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{c.categoryName ?? "Sin categoría"}</span>
                        <strong>{c.carbon_kg.toFixed(2)} kg</strong>
                      </div>
                      {/* Barra proporcional */}
                      <div style={{ height: 10, background: "#1f2937", borderRadius: 6 }}>
                        <div style={{
                          width: `${summary.total_kg > 0 ? Math.min(100, (c.carbon_kg / summary.total_kg) * 100) : 0}%`,
                          height: 10,
                          background: "#22c55e",
                          borderRadius: 6,
                        }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : (
          <div>No hay datos para mostrar.</div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <a href="/expenses" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", color: "#e2e8f0" }}>Ver gastos</a>
          <a href="/expenses/new" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", color: "#e2e8f0" }}>Agregar gasto</a>
        </div>
      </div>
    </main>
  );
}