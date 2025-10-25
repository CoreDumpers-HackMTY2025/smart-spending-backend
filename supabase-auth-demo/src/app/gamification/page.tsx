"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabaseClient';

type Achievement = {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  points: number;
  unlocked: boolean;
  unlockedAt?: string | null;
  progress: number; // 0-100
};

type Stats = {
  total: number;
  unlocked: number;
  points: { total: number; unlocked: number; percentage: number };
};

export default function GamificationPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const supabase = useMemo(() => getSupabase(), []);

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadAchievements() {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Debes iniciar sesión para ver tus logros.');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/gamification/achievements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error cargando logros');
      setAchievements(json.achievements || []);
      setStats(json.stats || null);
    } catch (err: any) {
      setError(err.message || 'Error cargando logros');
    } finally {
      setLoading(false);
    }
  }

  async function checkAchievements() {
    setChecking(true);
    setCheckMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setCheckMsg('Debes iniciar sesión para verificar logros.');
        setChecking(false);
        return;
      }
      const res = await fetch('/api/gamification/check', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error verificando logros');
      setCheckMsg(json.message || 'Verificación completada');
      // Reload achievements to reflect changes
      await loadAchievements();
    } catch (err: any) {
      setCheckMsg(err.message || 'Error verificando logros');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    loadAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Gamificación</h1>

      {loading && <p style={{ marginTop: 12 }}>Cargando logros...</p>}
      {error && <p style={{ marginTop: 12, color: 'red' }}>{error}</p>}

      {stats && (
        <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Logros desbloqueados</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{stats.unlocked} / {stats.total}</div>
          </div>
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Puntos</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{stats.points.unlocked} / {stats.points.total} ({stats.points.percentage}%)</div>
          </div>
          <div>
            <button
              onClick={checkAchievements}
              disabled={checking}
              style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, background: checking ? '#eee' : '#000', color: checking ? '#666' : '#fff', cursor: checking ? 'default' : 'pointer' }}
            >
              {checking ? 'Verificando...' : 'Revisar y desbloquear'}
            </button>
            {checkMsg && <div style={{ marginTop: 8, fontSize: 12 }}>{checkMsg}</div>}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {achievements.map((a) => (
          <div key={a.id} style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{a.description}</div>
              </div>
              <div style={{ fontSize: 12, color: a.unlocked ? '#0a0' : '#999' }}>
                {a.unlocked ? 'Desbloqueado' : 'Pendiente'}
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12 }}>Puntos: {a.points}</div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Progreso</div>
              <div style={{ height: 10, background: '#f5f5f5', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(a.progress, 100)}%`, height: '100%', background: '#222' }} />
              </div>
              {a.unlockedAt && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Desbloqueado: {new Date(a.unlockedAt).toLocaleString()}</div>}
            </div>
          </div>
        ))}
      </div>

      {achievements.length === 0 && !loading && !error && (
        <p style={{ marginTop: 12 }}>Aún no hay logros definidos.</p>
      )}
    </div>
  );
}