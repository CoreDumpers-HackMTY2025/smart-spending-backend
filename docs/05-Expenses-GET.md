# Expenses — GET /api/expenses

Ubicación: `backend/api/expenses/route.ts`

## Función

Lista gastos con filtros, orden y paginación.
- Filtra por `categoryId`, rango `startDate`/`endDate`, `minAmount`/`maxAmount`, `search` (merchant/description).
- Ordena por `date|amount|merchant` asc/desc.
- Pagina con `page` y `limit`; retorna `summary` (total, promedio, count).

## Parámetros

- `page?: number (default 1)`
- `limit?: number (default 20)`
- `categoryId?: uuid`
- `startDate?: ISO`
- `endDate?: ISO`
- `minAmount?: number`
- `maxAmount?: number`
- `search?: string`
- `sortBy?: 'date'|'amount'|'merchant'` (default `date`)
- `sortOrder?: 'asc'|'desc'` (default `desc`)

## Respuesta

- `success: true`
- `data: expense[]` con joins `category` y `subcategory`
- `pagination: { page, limit, total, totalPages }`
- `summary: { totalAmount, avgAmount, count }`

## Errores

- 400 por parámetros inválidos.
- 500 por errores de servidor.

## Código

```typescript
// backend/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withAuth } from '../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ListQuerySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.string().transform(Number).optional(),
  maxAmount: z.string().transform(Number).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'merchant']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const url = new URL(request.url);
      const params = Object.fromEntries(url.searchParams.entries());
      const qp = ListQuerySchema.parse(params);

      const page = qp.page && qp.page > 0 ? qp.page : 1;
      const limit = qp.limit && qp.limit > 0 ? qp.limit : 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('expenses')
        .select(`
          *,
          category:categories(id, name, slug, icon, color),
          subcategory:subcategories(id, name, slug)
        `, { count: 'exact' })
        .eq('user_id', userId);

      // Filtros
      if (qp.categoryId) query = query.eq('category_id', qp.categoryId);
      if (qp.startDate) query = query.gte('date', qp.startDate);
      if (qp.endDate) query = query.lte('date', qp.endDate);
      if (qp.minAmount) query = query.gte('amount', qp.minAmount);
      if (qp.maxAmount) query = query.lte('amount', qp.maxAmount);
      if (qp.search) query = query.or(`merchant.ilike.%${qp.search}%,description.ilike.%${qp.search}%`);

      // Orden
      const sortBy = qp.sortBy || 'date';
      const sortOrder = qp.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Paginación
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        console.error('Error listing expenses:', error);
        return NextResponse.json(
          { success: false, error: 'Error listando gastos' },
          { status: 500 }
        );
      }

      const totalAmount = (data || []).reduce((sum, e: any) => sum + (e.amount || 0), 0);
      const countItems = data?.length || 0;
      const avgAmount = countItems > 0 ? totalAmount / countItems : 0;

      return NextResponse.json({
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
        summary: {
          totalAmount,
          avgAmount: Number(avgAmount.toFixed(2)),
          count: count || 0,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Parámetros inválidos', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error in GET /api/expenses:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}
```

## Alineación Spendly v2 — Ciudad Inteligente

- Insights contextuales: los listados pueden enriquecer la vista con equivalencias de CO2 y resúmenes por zona/horas de mayor gasto (opt-in).
- Búsqueda inteligente: permitir filtros por `source` (`manual|whatsapp|bank_sync|ocr`) para medir fricción y calidad de captura.
- Heatmaps de consumo: este módulo se complementa con `transport/heatmap` para patrones temporales (día/hora) y tipos.
- Privacidad: agregaciones urbanas son anónimas y se realizan del lado del servidor.

### Mejoras v2 sugeridas
- Exponer `summary.co2Total` y `equivalences` si el cálculo de carbono está disponible.
- Añadir campo `source` en respuesta para mejorar analítica de captura.
- Preparar endpoints de exportación con metadatos de sostenibilidad (CSV/JSON).

## Alineación Spendly v3 — Origen MX y métricas urbanas

- Filtro `source` ampliado: incluir `mx_aggregation` para diferenciar gastos sincronizados desde MX.
- Métricas urbanas: exponer (opcional) `summary.co2Total`, `equivalences` y, si hay consentimiento, `cityMetric` con promedio urbano.
- Segmentación: permitir agrupar por `timeOfDay` y `dayOfWeek` para correlacionar con movilidad.

### Mejoras v3 sugeridas
- Añadir exportación con metadatos de urbanización (anónimos) para reportes B2B/B2G.
- Integrar con `urban-data/*` para alimentar analytics agregados.