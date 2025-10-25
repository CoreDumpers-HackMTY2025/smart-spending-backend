# Gamification — Achievements

Ubicación: `backend/api/gamification/achievements/route.ts`

## Función

Lista los logros disponibles y el estado del usuario (desbloqueados, fechas y progreso), y resume puntos.

## Proceso

- Carga `achievements` (catálogo: `id`, `slug`, `title`, `description`, `points`).
- Carga `user_achievements` del usuario (desbloqueados y fecha).
- Marca cada logro como `unlocked`, `unlockedAt` y `progress`:
  - `first-expense`: 100% si existe al menos 1 gasto.
  - `week-streak`: porcentaje según días con gasto de los últimos 7.
  - Otros: 100% si está desbloqueado, 0% si no.
- Calcula `stats`: total, desbloqueados, puntos totales y porcentaje.

## Respuesta

- `success: true`
- `achievements: { id, slug, title, description, points, unlocked, unlockedAt, progress }[]`
- `stats: { total, unlocked, points: { total, unlocked, percentage } }`

## Errores

- 500 por fallos de consulta o proceso.

## Código

```typescript
// backend/api/gamification/achievements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function hasAnyExpense(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('expenses')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  return (data || []).length > 0;
}

async function weekStreakProgress(userId: string): Promise<number> {
  const now = new Date();
  const start = new Date();
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('expenses')
    .select('date')
    .eq('user_id', userId)
    .gte('date', start.toISOString());
  const daysWithExpense = new Set<number>();
  for (const e of data || []) {
    const d = new Date(e.date);
    const key = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
    daysWithExpense.add(key);
  }
  const progress = Math.min(7, daysWithExpense.size);
  return Math.round((progress / 7) * 100);
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const { data: achievements, error: achErr } = await supabase
        .from('achievements')
        .select('id, slug, title, description, points')
        .order('points', { ascending: false });
      if (achErr)
        return NextResponse.json(
          { success: false, error: 'Error cargando logros' },
          { status: 500 }
        );

      const { data: userAch } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId);

      const unlockedSet = new Set((userAch || []).map((a) => a.achievement_id));
      const list: any[] = [];
      let pointsTotal = 0;
      let pointsUnlocked = 0;

      for (const a of achievements || []) {
        pointsTotal += a.points || 0;
        const unlocked = unlockedSet.has(a.id);
        if (unlocked) pointsUnlocked += a.points || 0;

        let progress = 0;
        if (a.slug === 'first-expense') {
          progress = (await hasAnyExpense(userId)) ? 100 : 0;
        } else if (a.slug === 'week-streak') {
          progress = await weekStreakProgress(userId);
        } else {
          progress = unlocked ? 100 : 0;
        }

        const unlockedAt = (userAch || []).find((u) => u.achievement_id === a.id)?.unlocked_at || null;

        list.push({
          id: a.id,
          slug: a.slug,
          title: a.title,
          description: a.description,
          points: a.points,
          unlocked,
          unlockedAt,
          progress,
        });
      }

      const stats = {
        total: (achievements || []).length,
        unlocked: unlockedSet.size,
        points: {
          total: pointsTotal,
          unlocked: pointsUnlocked,
          percentage: pointsTotal > 0 ? Number(((pointsUnlocked / pointsTotal) * 100).toFixed(2)) : 0,
        },
      };

      return NextResponse.json({ success: true, achievements: list, stats });
    } catch (error) {
      console.error('Error in GET /api/gamification/achievements:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}
```