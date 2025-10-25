# Savings Goals — Metas de ahorro

Ubicación: `backend/api/savings-goals/route.ts`

## Función

Lista y crea metas de ahorro, y permite actualizar el progreso acumulado.

## Parámetros

GET:
- Sin parámetros.

POST:
- `name: string`
- `targetAmount: number` (> 0)
- `deadline?: ISO datetime`

PATCH:
- `goalId: number`
- `addAmount: number` (> 0) — monto a sumar a `saved_amount`

## Respuesta (GET)
- `success: true`
- `goals: { id, name, target_amount, saved_amount, deadline?, progress, reached }[]`

## Respuesta (POST)
- `success: true`
- `goal: { id, name, target_amount, saved_amount, deadline?, created_at }`

## Respuesta (PATCH)
- `success: true`
- `goal: { id, name, target_amount, saved_amount, deadline?, reached }`

## Errores
- 400 por validación.
- 404 si la meta no existe (PATCH).
- 500 por fallos de consulta.

## Código

```typescript
// backend/api/savings-goals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PostBodySchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  deadline: z.string().datetime().optional(),
});

const PatchBodySchema = z.object({
  goalId: z.number().int().positive(),
  addAmount: z.number().positive(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('id, name, target_amount, saved_amount, deadline')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const goals = (data || []).map((g) => {
        const progress = g.target_amount > 0 ? (g.saved_amount / g.target_amount) * 100 : 0;
        const reached = g.saved_amount >= g.target_amount;
        return { ...g, progress, reached };
      });

      return NextResponse.json({ success: true, goals });
    } catch (error) {
      console.error('Error in GET /api/savings-goals:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const body = await _req.json();
      const parsed = PostBodySchema.parse(body);
      const toInsert = {
        user_id: userId,
        name: parsed.name,
        target_amount: parsed.targetAmount,
        saved_amount: 0,
        deadline: parsed.deadline || null,
      };
      const { data, error } = await supabase
        .from('savings_goals')
        .insert(toInsert)
        .select('id, name, target_amount, saved_amount, deadline, created_at')
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, goal: data });
    } catch (error) {
      console.error('Error in POST /api/savings-goals:', error);
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const body = await _req.json();
      const parsed = PatchBodySchema.parse(body);

      const { data: existing, error: e1 } = await supabase
        .from('savings_goals')
        .select('id, user_id, saved_amount, target_amount, name, deadline')
        .eq('user_id', userId)
        .eq('id', parsed.goalId)
        .single();
      if (e1) throw e1;
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Meta no encontrada' }, { status: 404 });
      }

      const newSaved = (existing.saved_amount || 0) + parsed.addAmount;
      const { data, error } = await supabase
        .from('savings_goals')
        .update({ saved_amount: newSaved })
        .eq('id', parsed.goalId)
        .eq('user_id', userId)
        .select('id, name, target_amount, saved_amount, deadline')
        .single();
      if (error) throw error;

      const reached = data.saved_amount >= data.target_amount;
      return NextResponse.json({ success: true, goal: { ...data, reached } });
    } catch (error) {
      console.error('Error in PATCH /api/savings-goals:', error);
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

## Alineación Spendly v2 — Metas con Impacto

- Doble objetivo: además del ahorro monetario, se permite fijar metas de reducción de CO2.
- Sugerencias: el sistema recomienda acciones (meal-prep, movilidad sostenible) para acercar al objetivo.
- Conexión urbana: retos de comunidad/vecindario (opt-in) para metas compartidas.
- Celebración: se integran logros al completar hitos ambientales o financieros.

### Mejoras v2 sugeridas
- Añadir campos opcionales `co2_target` y `co2_saved`.
- Incluir `recommendedActions: string[]` en respuesta GET según patrón del usuario.
- Conectar con `gamification/check` para otorgar logros al alcanzar hitos.

## Alineación Spendly v3 — Ahorro automático MX y recompensas

- Auto ahorro MX: sugerir aportes automáticos (vía datos bancarios sincronizados) hacia metas.
- CivicPoints: otorgar puntos por contribuciones sostenibles (`eco_action`) y alcanzar hitos.
- Panel urbano: mostrar impacto de metas en métricas urbanas (opt-in).

### Mejoras v3 sugeridas
- Integrar con `mx/accounts/verify` para validar cuentas destino (IAV).
- Exponer `civic_points_gain` estimado por contribución.