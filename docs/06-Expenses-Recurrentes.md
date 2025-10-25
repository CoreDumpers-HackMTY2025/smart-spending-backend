# Expenses — Recurrentes

Ubicación: `backend/api/expenses/recurring/route.ts`

## Función

Detecta patrones de gastos recurrentes en los últimos 3 meses y genera una lista de suscripciones estimadas y un resumen.

## Proceso

1. Carga gastos del usuario de los últimos 90 días.
2. Agrupa por `merchant` y/o `description` normalizados.
3. Filtra grupos con al menos 3 ocurrencias y varianza de monto baja.
4. Calcula intervalo promedio (días) y frecuencia mensual.
5. Estima próximo cargo según última fecha + intervalo promedio.
6. Construye `subscriptions` con `amount`, `merchant`, `nextChargeDate`, `confidence`.
7. Retorna `summary` (count, totalMonthly, topMerchants).

## Respuesta

- `success: true`
- `subscriptions: { merchant, description?, amount, averageIntervalDays, frequencyPerMonth, nextChargeDate, confidence }[]`
- `summary: { count, totalMonthly, topMerchants: { merchant, count }[] }`

## Errores

- 500 por fallos al procesar datos o cargar gastos.

## Código

```typescript
// backend/api/expenses/recurring/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeText(t?: string) {
  return (t || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (_request, userId) => {
    try {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);

      const { data, error } = await supabase
        .from('expenses')
        .select('id, amount, merchant, description, date')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString());

      if (error) {
        console.error('Error loading expenses:', error);
        return NextResponse.json(
          { success: false, error: 'Error cargando gastos' },
          { status: 500 }
        );
      }

      const groups = new Map<string, any[]>();
      for (const e of data || []) {
        const key = normalizeText(e.merchant) || normalizeText(e.description);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(e);
      }

      const subscriptions: any[] = [];
      for (const [key, entries] of groups.entries()) {
        entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const amounts = entries.map(e => e.amount);
        const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
        const variance = amounts.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);

        if (entries.length < 3) continue;
        if (stdDev > avg * 0.25) continue; // varianza alta, poco consistente

        const intervals: number[] = [];
        for (let i = 1; i < entries.length; i++) {
          const prev = new Date(entries[i - 1].date);
          const curr = new Date(entries[i].date);
          const days = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          intervals.push(days);
        }
        const avgInterval = intervals.length > 0
          ? Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length)
          : 30;
        const frequencyPerMonth = Number((30 / avgInterval).toFixed(2));

        const lastDate = new Date(entries[entries.length - 1].date);
        const nextChargeDate = new Date(lastDate);
        nextChargeDate.setDate(nextChargeDate.getDate() + avgInterval);

        const confidence = Math.max(0.5, Math.min(0.95, 1 - (stdDev / (avg || 1))));

        subscriptions.push({
          merchant: entries[entries.length - 1].merchant || key,
          description: entries[entries.length - 1].description || undefined,
          amount: Number(avg.toFixed(2)),
          averageIntervalDays: avgInterval,
          frequencyPerMonth,
          nextChargeDate: nextChargeDate.toISOString(),
          confidence: Number(confidence.toFixed(2)),
        });
      }

      subscriptions.sort((a, b) => b.confidence - a.confidence);

      const totalMonthly = subscriptions
        .reduce((s, sub) => s + sub.amount * sub.frequencyPerMonth, 0);

      const topCounts = Array.from(groups.entries())
        .map(([merchant, entries]) => ({ merchant, count: entries.length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return NextResponse.json({
        success: true,
        subscriptions,
        summary: {
          count: subscriptions.length,
          totalMonthly: Number(totalMonthly.toFixed(2)),
          topMerchants: topCounts,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/expenses/recurring:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}
```