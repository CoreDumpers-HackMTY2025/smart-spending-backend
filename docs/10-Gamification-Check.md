# Gamification — Check

Ubicación: `backend/api/gamification/check/route.ts`

## Función

Evalúa condiciones y desbloquea logros basados en actividad reciente del usuario.

## Reglas de ejemplo

- `first-expense`: usuario con al menos 1 gasto.
- `week-streak`: gasto en los 7 días consecutivos más recientes.
- `eco-warrior`: ≥ 3 gastos en categoría `transport` en la última semana.

## Proceso

1. Carga datos requeridos (gastos recientes, categoría `transport`).
2. Verifica cada regla; si cumple y no está desbloqueado, inserta `user_achievements`.
3. Retorna logros nuevos desbloqueados y contador.

## Respuesta

- `success: true`
- `unlocked: { slug, achievementId }[]`
- `count`
- `message`

## Errores

- 500 por fallos de consulta o inserción.

## Código

```typescript
// backend/api/gamification/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function ensureAchievement(userId: string, slug: string) {
  const { data: ach } = await supabase.from('achievements').select('id, slug').eq('slug', slug).single();
  if (!ach) return null;
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', ach.id)
    .limit(1);
  if ((existing || []).length > 0) return null;
  const { data: inserted, error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: ach.id, unlocked_at: new Date().toISOString() })
    .select('achievement_id')
    .single();
  if (error) {
    console.error('Error inserting achievement', slug, error);
    return null;
  }
  return { slug, achievementId: inserted.achievement_id };
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const newlyUnlocked: { slug: string; achievementId: string }[] = [];

      // first-expense: al menos 1 gasto
      const { data: anyExpense } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      if ((anyExpense || []).length > 0) {
        const r = await ensureAchievement(userId, 'first-expense');
        if (r) newlyUnlocked.push(r);
      }

      // week-streak: gasto en 7 días consecutivos
      const now = new Date();
      const start = new Date();
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const { data: lastWeekExpenses } = await supabase
        .from('expenses')
        .select('date')
        .eq('user_id', userId)
        .gte('date', start.toISOString());
      const daysWithExpense = new Set<number>();
      for (const e of lastWeekExpenses || []) {
        const d = new Date(e.date);
        const key = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
        daysWithExpense.add(key);
      }
      if (daysWithExpense.size >= 7) {
        const r = await ensureAchievement(userId, 'week-streak');
        if (r) newlyUnlocked.push(r);
      }

      // eco-warrior: 3 gastos en categoría 'transport' en la última semana
      const { data: transportCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'transport')
        .single();
      if (transportCategory) {
        const { data: eco } = await supabase
          .from('expenses')
          .select('id')
          .eq('user_id', userId)
          .eq('category_id', transportCategory.id)
          .gte('date', start.toISOString());
        if ((eco || []).length >= 3) {
          const r = await ensureAchievement(userId, 'eco-warrior');
          if (r) newlyUnlocked.push(r);
        }
      }

      return NextResponse.json({
        success: true,
        unlocked: newlyUnlocked,
        count: newlyUnlocked.length,
        message: newlyUnlocked.length > 0 ? '¡Nuevos logros desbloqueados!' : 'Sin nuevos logros por ahora',
      });
    } catch (error) {
      console.error('Error in POST /api/gamification/check:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}
```