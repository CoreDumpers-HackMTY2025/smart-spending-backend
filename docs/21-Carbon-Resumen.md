# Carbon — Resumen de huella

Ubicación: `backend/api/carbon/summary/route.ts`

## Función

Calcula el resumen de huella de carbono del mes actual (o especificado), agregando por categoría y total.

## Parámetros

GET:
- `month?: number` (1–12, por defecto mes actual)
- `year?: number` (por defecto año actual)

## Respuesta
- `success: true`
- `summary: { total_kg, by_category: { category_id, categoryName?, carbon_kg }[] }`

## Errores
- 400 por parámetros inválidos.
- 500 por fallos de consulta.

## Código

```typescript
// backend/api/carbon/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const QuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(9999).optional(),
});

function monthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const url = new URL(_req.url);
      const qp = QuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
      const now = new Date();
      const month = qp.month ?? (now.getMonth() + 1);
      const year = qp.year ?? now.getFullYear();
      const { start, end } = monthRange(month, year);

      const { data, error } = await supabase
        .from('expenses')
        .select('category_id, carbon_kg, categories:categories(name)')
        .eq('user_id', userId)
        .gte('created_at', start)
        .lte('created_at', end);
      if (error) throw error;

      const byCatMap = new Map<number, { category_id: number; categoryName?: string; carbon_kg: number }>();
      let total_kg = 0;
      for (const e of data || []) {
        const catId = e.category_id || 0;
        const prev = byCatMap.get(catId) || { category_id: catId, categoryName: e.categories?.name || undefined, carbon_kg: 0 };
        prev.carbon_kg += e.carbon_kg || 0;
        byCatMap.set(catId, prev);
        total_kg += e.carbon_kg || 0;
      }

      const by_category = Array.from(byCatMap.values()).sort((a, b) => b.carbon_kg - a.carbon_kg);

      return NextResponse.json({ success: true, summary: { total_kg, by_category } });
    } catch (error) {
      console.error('Error in GET /api/carbon/summary:', error);
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

## Alineación Spendly v2 — Impacto Ambiental Urbano

- Comparativa urbana: el total y desglose por categoría se complementan con comparativas vs promedio de la ciudad (opt-in), promoviendo reducción consciente.
- Equivalencias tangibles: árboles, km en coche y kWh para comunicar impacto de forma clara.
- Notificaciones inteligentes: se conectan avisos cuando el total proyectado del mes supera metas personales o comunitarias.
- Transparencia: se muestran supuestos/factores de emisión y se mantiene un enfoque educativo.

### Mejoras v2 sugeridas
- Añadir `equivalences: { trees, carKm, electricity, flights }` en la respuesta.
- Exponer `cityAverageMonthlyKg` para comparativa directa y `trend` mensual.
- Conectar con `dashboard/projection` para un panel dual de gasto y CO2.

## Alineación Spendly v3 — Comparativa con Urban Data Hub

- `cityAverageMonthlyKg` y `trend`: exponer (opt-in) métricas agregadas por zona desde `analytics/energy` y `analytics/mobility`.
- `savingsPotential`: estimar reducción posible con rutas/acciones sostenibles basadas en datos urbanos.
- Gobierno: permitir agregaciones anónimas para panel B2G y simulación de políticas.

### Mejoras v3 sugeridas
- Añadir `cityMetric` con clasificación relativa por zona.
- Integrar con `civic-points` para premiar reducciones de CO2 sostenidas.