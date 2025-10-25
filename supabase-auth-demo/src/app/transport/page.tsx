"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabaseClient';

type Period = '7d' | '30d' | '90d';

type HeatmapCell = { hour: number; amount: number; count: number };

type HeatmapRow = { day: string; hours: HeatmapCell[] };

type PatternDay = { day: string; count: number; amount: number };

type PatternHour = { hour: number; count: number; amount: number };

type PatternType = { type: string; count: number; amount: number };

export default function TransportPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<{ totalAmount: number; totalCount: number } | null>(null);
  const [byDay, setByDay] = useState<PatternDay[]>([]);
  const [byHour, setByHour] = useState<PatternHour[]>([]);
  const [byType, setByType] = useState<PatternType[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapRow[]>([]);

  async function getAccessToken(): Promise<string | null> {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadData(p: Period) {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Debes iniciar sesión para ver el mapa de calor de transporte.');
        setLoading(false);
        return;
      }
      const url = `/api/transport/heatmap?period=${encodeURIComponent(p)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error cargando datos de transporte');
      setTotals(json.data?.totals || { totalAmount: 0, totalCount: 0 });
      setByDay(json.data?.patterns?.byDay || []);
      setByHour(json.data?.patterns?.byHour || []);
      setByType(json.data?.patterns?.byType || []);
      setHeatmap(json.data?.heatmap || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando datos de transporte');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const maxCellAmount = useMemo(() => {
    let maxVal = 0;
    for (const row of heatmap) {
      for (const cell of row.hours) {
        maxVal = Math.max(maxVal, cell.amount);
      }
    }
    return maxVal || 1;
  }, [heatmap]);

  function colorFor(val: number) {
    const ratio = Math.min(val / maxCellAmount, 1);
    const hue = 200; // azul
    const lightness = 90 - ratio * 50; // más oscuro con más valor
    return `hsl(${hue}, 80%, ${lightness}%)`;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Transporte: Mapa de Calor</h1>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
        <span>Periodo:</span>
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #ccc',
              background: period === p ? '#000' : '#fff',
              color: period === p ? '#fff' : '#000',
              cursor: 'pointer',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {loading && <p style={{ marginTop: 12 }}>Cargando datos...</p>}
      {error && <p style={{ marginTop: 12, color: 'red' }}>{error}</p>}

      {totals && (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>Total de viajes: {totals.totalCount}</p>
          <p style={{ margin: 0 }}>Gasto total en transporte: ${totals.totalAmount.toFixed(2)}</p>
        </div>
      )}

      {/* By Type */}
      {byType.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>Por tipo</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {byType.map((t) => (
              <div key={t.type} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 8, minWidth: 160 }}>
                <div style={{ fontWeight: 600 }}>{t.type}</div>
                <div style={{ fontSize: 12 }}>Viajes: {t.count}</div>
                <div style={{ fontSize: 12 }}>Monto: ${t.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap grid */}
      {heatmap.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>Mapa de calor (día vs hora)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(24, 1fr)`, gap: 4 }}>
            <div></div>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ textAlign: 'center', fontSize: 11 }}>{h}</div>
            ))}
            {heatmap.map((row) => (
              <React.Fragment key={row.day}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{row.day}</div>
                {row.hours.map((cell) => (
                  <div
                    key={`${row.day}-${cell.hour}`}
                    title={`Hora ${cell.hour}: $${cell.amount.toFixed(2)} — ${cell.count} viajes`}
                    style={{
                      height: 18,
                      borderRadius: 4,
                      background: colorFor(cell.amount),
                      border: '1px solid #eee',
                    }}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* By Day and By Hour summaries */}
      {(byDay.length > 0 || byHour.length > 0) && (
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {byDay.length > 0 && (
            <div>
              <h2 style={{ fontSize: 18 }}>Por día</h2>
              {byDay.map((d) => (
                <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 90 }}>{d.day}</div>
                  <div style={{ flex: 1, background: '#f5f5f5', borderRadius: 6, overflow: 'hidden' }}>
                    <div
                      style={{ width: `${Math.min((d.amount / (totals?.totalAmount || 1)) * 100, 100)}%`, background: '#222', height: 10 }}
                    />
                  </div>
                  <div style={{ width: 160, fontSize: 12 }}>
                    ${d.amount.toFixed(2)} ({d.count} viajes)
                  </div>
                </div>
              ))}
            </div>
          )}
          {byHour.length > 0 && (
            <div>
              <h2 style={{ fontSize: 18 }}>Por hora</h2>
              {byHour.map((h) => (
                <div key={h.hour} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 40 }}>{h.hour}</div>
                  <div style={{ flex: 1, background: '#f5f5f5', borderRadius: 6, overflow: 'hidden' }}>
                    <div
                      style={{ width: `${Math.min((h.amount / (totals?.totalAmount || 1)) * 100, 100)}%`, background: '#222', height: 10 }}
                    />
                  </div>
                  <div style={{ width: 160, fontSize: 12 }}>
                    ${h.amount.toFixed(2)} ({h.count} viajes)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}