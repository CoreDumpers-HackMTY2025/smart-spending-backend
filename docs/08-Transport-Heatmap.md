# Transport — Heatmap

Ubicación: `backend/api/transport/heatmap/route.ts`

## Función

Genera estadísticas y un heatmap de gastos de transporte por día, hora y tipo.

## Parámetros

- `period?: '7d'|'30d'|'90d'` (default `30d`)

## Proceso

1. Determina `startDate` según `period`.
2. Obtiene `category_id` para `transport`.
3. Carga gastos `expenses` del usuario en esa categoría y periodo, con join `subcategories`.
4. Agrupa y calcula patrones:
   - `byDay` (domingo..sábado): `count`, `amount`.
   - `byHour` (0..23): `count`, `amount`.
   - `byType` (slug de subcategoría o `otros`): `count`, `amount`.
5. Construye `heatmap` { day, hours[{hour, amount, count}] }.
6. Retorna `totals` y `patterns`.

## Respuesta

- `success: true`
- `data.period`
- `data.totals: { totalAmount, totalCount }`
- `data.patterns: { byDay, byHour, byType }`
- `data.heatmap`

## Errores

- 404 si no se encuentra la categoría de transporte.
- 500 por errores de consulta o proceso.

## Código

```typescript
// backend/api/transport/heatmap/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withAuth } from '../../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PeriodSchema = z.object({
  period: z.enum(['7d', '30d', '90d']).optional(),
});

function getStartDate(period?: '7d' | '30d' | '90d'): Date {
  const d = new Date();
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const url = new URL(_req.url);
      const qp = PeriodSchema.parse(Object.fromEntries(url.searchParams.entries()));
      const startDate = getStartDate(qp.period);

      const { data: transportCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'transport')
        .single();

      if (!transportCategory) {
        return NextResponse.json(
          { success: false, error: 'Categoría transporte no encontrada' },
          { status: 404 }
        );
      }

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id, amount, date,
          subcategory:subcategories(slug, name)
        `)
        .eq('user_id', userId)
        .eq('category_id', transportCategory.id)
        .gte('date', startDate.toISOString());

      if (error) {
        console.error('Error loading transport expenses:', error);
        return NextResponse.json(
          { success: false, error: 'Error cargando gastos de transporte' },
          { status: 500 }
        );
      }

      const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const byDay = dayNames.map((name) => ({ day: name, count: 0, amount: 0 }));
      const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0, amount: 0 }));
      const typeMap = new Map<string, { type: string, count: number, amount: number }>();
      const heatmap: { day: string; hours: { hour: number; amount: number; count: number }[] }[] =
        dayNames.map((name) => ({ day: name, hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, amount: 0, count: 0 })) }));

      let totalAmount = 0;
      let totalCount = 0;

      for (const e of data || []) {
        const date = new Date(e.date);
        const dayIdx = date.getDay();
        const hour = date.getHours();
        const amount = e.amount || 0;
        const type = e.subcategory?.slug || 'otros';

        byDay[dayIdx].count += 1;
        byDay[dayIdx].amount += amount;

        byHour[hour].count += 1;
        byHour[hour].amount += amount;

        const currentType = typeMap.get(type) || { type, count: 0, amount: 0 };
        currentType.count += 1;
        currentType.amount += amount;
        typeMap.set(type, currentType);

        heatmap[dayIdx].hours[hour].amount += amount;
        heatmap[dayIdx].hours[hour].count += 1;

        totalAmount += amount;
        totalCount += 1;
      }

      const byType = Array.from(typeMap.values()).sort((a, b) => b.amount - a.amount);

      return NextResponse.json({
        success: true,
        data: {
          period: qp.period || '30d',
          totals: { totalAmount: Number(totalAmount.toFixed(2)), totalCount },
          patterns: { byDay, byHour, byType },
          heatmap,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/transport/heatmap:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}
```

## Alineación Spendly v2 — Movilidad Inteligente

- Open Data: se puede enriquecer el heatmap con datos GTFS (horarios, líneas, paradas) para ofrecer alternativas en tiempo real.
- Patrones urbanos: cruza picos por día/hora con rutas frecuentes del usuario para sugerir transporte público o modos activos.
- Impacto ambiental: el mapa refleja no solo monto, también CO2 por franja horaria, resaltando oportunidades de reducción.
- Privacidad: todas las agregaciones se realizan a nivel usuario y/o zona (opt-in) sin exponer información sensible.

### Mejoras v2 sugeridas
- Añadir `heatmapCO2` paralelo: `{ day, hours[{hour, co2Kg, count}] }`.
- Incluir `topRoutes` y `potentialSavings` en `patterns` con estimaciones.
- Conectar con `recommendations/generate` para acciones inmediatas ("desafío: transporte público 3/5 días").

## Alineación Spendly v3 — Movilidad con Urban Data Hub

- Datos urbanos: si hay consentimiento, correlacionar patrón personal con analytics agregados por zona (`analytics/mobility`).
- Sugestión activa: ofrecer rutas alternativas con impacto económico y ambiental estimado (ahorro y CO2) por hora.
- CivicPoints: registrar `eco_action` al detectar uso sostenido de transporte público.

### Mejoras v3 sugeridas
- Exponer `heatmapCO2` y `cityComparison` para ver posición relativa vs zona.
- Integrar matriz Origen-Destino (O-D) anónima para recomendaciones.