# Gamification — Leaderboard

Ubicación: `backend/api/gamification/leaderboard/route.ts`

## Función

Construye un ranking de usuarios por puntos de logros y retorna la posición del usuario actual.

## Proceso

1. Agrega puntos por usuario desde `user_achievements` join `achievements(points)`.
2. Ordena de mayor a menor y calcula `rank`.
3. Carga `profiles` para mostrar `name` (preferencia: `full_name`, luego `username`).
4. Incluye la entrada del usuario actual (`me`).

## Respuesta

- `success: true`
- `leaderboard: { rank, userId, name, points }[]`
- `me: { rank, userId, name, points } | null`

## Errores

- 500 por fallos de consulta o armado del ranking.

## Código

```typescript
// backend/api/gamification/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const { data: userAch, error } = await supabase
        .from('user_achievements')
        .select('user_id, achievement_id, achievements:achievements(points)')
        .order('user_id');
      if (error)
        return NextResponse.json(
          { success: false, error: 'Error cargando logros de usuarios' },
          { status: 500 }
        );

      const pointsByUser = new Map<string, number>();
      for (const row of userAch || []) {
        const uid = row.user_id;
        const points = row.achievements?.points || 0;
        pointsByUser.set(uid, (pointsByUser.get(uid) || 0) + points);
      }

      const users = Array.from(pointsByUser.entries())
        .map(([uid, pts]) => ({ user_id: uid, points: pts }))
        .sort((a, b) => b.points - a.points);

      const userIds = users.map((u) => u.user_id);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, username, full_name')
          .in('user_id', userIds);
        profiles = profs || [];
      }

      const ranking = users.map((u, idx) => {
        const p = profiles.find((pr) => pr.user_id === u.user_id);
        return {
          rank: idx + 1,
          userId: u.user_id,
          name: p?.full_name || p?.username || 'Usuario',
          points: u.points,
        };
      });

      const me = ranking.find((r) => r.userId === userId) || null;
      return NextResponse.json({ success: true, leaderboard: ranking, me });
    } catch (error) {
      console.error('Error in GET /api/gamification/leaderboard:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}
```