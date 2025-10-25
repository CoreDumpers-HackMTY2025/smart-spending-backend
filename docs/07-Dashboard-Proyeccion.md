# Dashboard — Proyección Mensual

Ubicación: `backend/api/dashboard/projection/route.ts`

## Función

Proyecta el gasto total del mes en curso, compara con el mes anterior y clasifica el ritmo de gasto.

## Cálculo

- `startOfMonth` y `endOfMonth` del mes actual.
- `daysInMonth` y `currentDay` para estimaciones.
- `totalSpentSoFar` suma de `expenses.amount` del mes actual.
- `estimatedTotal = (totalSpentSoFar / currentDay) * daysInMonth`.
- `lastMonthTotal` suma de `expenses.amount` del mes anterior.
- `% change = (estimatedTotal - lastMonthTotal)/lastMonthTotal * 100`.
- `spendingPace`: `on_track`, `slowing`, `fast` (comparación vs promedio diario del mes anterior).

## Respuesta

- `success: true`
- `data.currentMonth`: `start`, `end`, `day`, `daysInMonth`, `spentSoFar`, `dailyAvg`
- `data.projection`: `estimatedTotal`, `lastMonthTotal`, `percentChange`, `spendingPace`
- `data.recommendations: string[]`

## Errores

- 500 por fallos al cargar gastos o calcular proyección.

## Código

```typescript
// backend/api/dashboard/projection/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}
function daysInMonth(date: Date): number {
  return endOfMonth(date).getDate();
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const currentDay = now.getDate();
      const dim = daysInMonth(now);

      const { data: currentExpenses, error: curErr } = await supabase
        .from('expenses')
        .select('amount, date')
        .eq('user_id', userId)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

      if (curErr) {
        console.error(curErr);
        return NextResponse.json(
          { success: false, error: 'Error cargando gastos del mes' },
          { status: 500 }
        );
      }

      const totalSpentSoFar = (currentExpenses || []).reduce(
        (s, e: any) => s + (e.amount || 0),
        0
      );
      const dailyAvg = currentDay > 0 ? totalSpentSoFar / currentDay : 0;
      const estimatedTotal = dailyAvg * dim;

      const lastMonthDate = new Date(start);
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastStart = startOfMonth(lastMonthDate);
      const lastEnd = endOfMonth(lastMonthDate);

      const { data: lastExpenses, error: lastErr } = await supabase
        .from('expenses')
        .select('amount, date')
        .eq('user_id', userId)
        .gte('date', lastStart.toISOString())
        .lte('date', lastEnd.toISOString());

      if (lastErr) {
        console.error(lastErr);
        return NextResponse.json(
          { success: false, error: 'Error cargando gastos del mes anterior' },
          { status: 500 }
        );
      }

      const lastMonthTotal = (lastExpenses || []).reduce(
        (s, e: any) => s + (e.amount || 0),
        0
      );

      const percentChange =
        lastMonthTotal > 0
          ? ((estimatedTotal - lastMonthTotal) / lastMonthTotal) * 100
          : 100;

      let spendingPace: 'on_track' | 'slowing' | 'fast' = 'on_track';
      const lastMonthDailyAvg =
        lastMonthTotal / daysInMonth(lastMonthDate);
      if (dailyAvg > lastMonthDailyAvg * 1.15) spendingPace = 'fast';
      else if (dailyAvg < lastMonthDailyAvg * 0.85) spendingPace = 'slowing';

      const recommendations: string[] = [];
      if (spendingPace === 'fast')
        recommendations.push(
          'Reduce gastos discrecionales esta semana para volver al ritmo.'
        );
      if (percentChange > 10)
        recommendations.push(
          'Revisa suscripciones y pagos fijos; podrían explicar el aumento.'
        );
      if (estimatedTotal > lastMonthTotal)
        recommendations.push(
          'Ajusta tu presupuesto mensual si tus hábitos cambiaron.'
        );

      return NextResponse.json({
        success: true,
        data: {
          currentMonth: {
            start: start.toISOString(),
            end: end.toISOString(),
            day: currentDay,
            daysInMonth: dim,
            spentSoFar: Number(totalSpentSoFar.toFixed(2)),
            dailyAvg: Number(dailyAvg.toFixed(2)),
          },
          projection: {
            estimatedTotal: Number(estimatedTotal.toFixed(2)),
            lastMonthTotal: Number(lastMonthTotal.toFixed(2)),
            percentChange: Number(percentChange.toFixed(2)),
            spendingPace,
          },
          recommendations,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/dashboard/projection:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}
```