# Notifications — Listado

Ubicación: `backend/api/notifications/route.ts`

## Función

Genera notificaciones para el usuario sobre presupuestos, recomendaciones y logros.

## Parámetros

- `since?: ISO datetime` — filtra logros nuevos desde esa fecha.

## Proceso

1. Evalúa presupuestos (`budgets`) y genera avisos si ≥ 80% o ≥ 100% del límite.
2. Recupera recomendaciones no vistas (`recommendations.seen = false`).
3. Si `since` está presente, lista logros nuevos (`user_achievements >= since`).
4. Ordena por `createdAt` descendente y retorna count y timestamp.

## Respuesta

- `success: true`
- `notifications: { type, title, message, createdAt, meta }[]`
- `count`
- `timestamp`

## Errores

- 500 por fallos de consulta.

## Código

```typescript
// backend/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withAuth } from '../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const QuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const url = new URL(_req.url);
      const qp = QuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
      const since = qp.since ? new Date(qp.since) : null;

      const notifications: any[] = [];
      const nowISO = new Date().toISOString();

      // Presupuestos
      const { data: budgets } = await supabase
        .from('budgets')
        .select('category_id, limit_amount, spent_amount, month, year')
        .eq('user_id', userId);
      for (const b of budgets || []) {
        const percent = b.limit_amount > 0 ? (b.spent_amount / b.limit_amount) * 100 : 0;
        if (percent >= 80) {
          notifications.push({
            type: 'budget',
            title: percent >= 100 ? 'Presupuesto excedido' : 'Presupuesto cerca del límite',
            message: `Has usado ${percent.toFixed(0)}% del presupuesto en la categoría ${b.category_id}.`,
            createdAt: nowISO,
            meta: { categoryId: b.category_id, month: b.month, year: b.year, percent },
          });
        }
      }

      // Recomendaciones pendientes
      const { data: recs } = await supabase
        .from('recommendations')
        .select('id, title, category, expires_at, created_at, seen')
        .eq('user_id', userId)
        .eq('seen', false);
      for (const r of recs || []) {
        notifications.push({
          type: 'recommendation',
          title: r.title,
          message: `Tienes una recomendación pendiente en ${r.category}.`,
          createdAt: r.created_at,
          meta: { id: r.id, expiresAt: r.expires_at },
        });
      }

      // Logros nuevos desde 'since'
      if (since) {
        const { data: newAch } = await supabase
          .from('user_achievements')
          .select('achievement_id, unlocked_at, achievements:achievements(title, points)')
          .eq('user_id', userId)
          .gte('unlocked_at', since.toISOString());
        for (const a of newAch || []) {
          notifications.push({
            type: 'achievement',
            title: a.achievements?.title || 'Nuevo logro',
            message: `Has desbloqueado un logro por ${a.achievements?.points || 0} puntos.`,
            createdAt: a.unlocked_at,
            meta: { achievementId: a.achievement_id, points: a.achievements?.points || 0 },
          });
        }
      }

      notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({
        success: true,
        notifications,
        count: notifications.length,
        timestamp: nowISO,
      });
    } catch (error) {
      console.error('Error in GET /api/notifications:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}
```