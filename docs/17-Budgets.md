# Budgets — Gestión de presupuestos

Ubicación: `backend/api/budgets/route.ts`

## Función

Lista y actualiza presupuestos por categoría para el mes especificado, calculando totales y porcentaje usado.

## Parámetros

GET:
- `month?: number` (1–12, por defecto mes actual)
- `year?: number` (por defecto año actual)

POST:
- `categoryId: number`
- `limitAmount: number` (>= 0)
- `month?: number` (por defecto mes actual)
- `year?: number` (por defecto año actual)

## Respuesta (GET)
- `success: true`
- `budgets: { id, category_id, limit_amount, spent_amount, month, year, categoryName? }[]`
- `summary: { total_limit, total_spent, percent_used }`

## Respuesta (POST)
- `success: true`
- `budget: { id, category_id, limit_amount, spent_amount, month, year }`

## Errores
- 400 por parámetros inválidos.
- 500 por fallos de consulta o inserción.

## Código

```typescript
// backend/api/budgets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GetQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(9999).optional(),
});

const PostBodySchema = z.object({
  categoryId: z.number().int().positive(),
  limitAmount: z.number().min(0),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(9999).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const url = new URL(_req.url);
      const qp = GetQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
      const now = new Date();
      const month = qp.month ?? (now.getMonth() + 1);
      const year = qp.year ?? now.getFullYear();

      const { data, error } = await supabase
        .from('budgets')
        .select('id, category_id, limit_amount, spent_amount, month, year, categories:categories(name)')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year);

      if (error) throw error;

      const budgets = (data || []).map((b: any) => ({
        ...b,
        categoryName: b.categories?.name ?? null,
      }));

      const total_limit = budgets.reduce((s, x) => s + (x.limit_amount || 0), 0);
      const total_spent = budgets.reduce((s, x) => s + (x.spent_amount || 0), 0);
      const percent_used = total_limit > 0 ? (total_spent / total_limit) * 100 : 0;

      return NextResponse.json({
        success: true,
        budgets,
        summary: {
          total_limit,
          total_spent,
          percent_used,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/budgets:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const body = await _req.json();
      const parsed = PostBodySchema.parse(body);
      const now = new Date();
      const month = parsed.month ?? (now.getMonth() + 1);
      const year = parsed.year ?? now.getFullYear();

      const upsertData = {
        user_id: userId,
        category_id: parsed.categoryId,
        month,
        year,
        limit_amount: parsed.limitAmount,
      };

      const { data, error } = await supabase
        .from('budgets')
        .upsert(upsertData, { onConflict: 'user_id,category_id,month,year' })
        .select('id, user_id, category_id, month, year, limit_amount, spent_amount')
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, budget: data });
    } catch (error) {
      console.error('Error in POST /api/budgets:', error);
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}
```