# Incomes — Ingresos del usuario

Ubicación: `backend/api/incomes/route.ts`

## Función

Lista y crea ingresos del usuario, con filtros de fecha, paginación y ordenamiento.

## Parámetros

GET:
- `start?: ISO datetime`
- `end?: ISO datetime`
- `categoryId?: number`
- `sort?: 'created_at' | 'amount'`
- `order?: 'asc' | 'desc'` (default: `desc`)
- `page?: number` (default: 1)
- `pageSize?: number` (default: 20)

POST:
- `amount: number` (> 0)
- `categoryId?: number`
- `source?: string`
- `description?: string`
- `receivedAt?: ISO datetime` (default: now)

## Respuesta (GET)
- `success: true`
- `data: { id, amount, category_id?, source?, description?, created_at }[]`
- `page, pageSize, total, totalAmount`

## Respuesta (POST)
- `success: true`
- `income: { id, amount, category_id?, source?, description?, created_at }`

## Errores
- 400 por validación.
- 500 por fallos de consulta.

## Código

```typescript
// backend/api/incomes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GetQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  categoryId: z.coerce.number().int().optional(),
  sort: z.enum(['created_at', 'amount']).optional(),
  order: z.enum(['asc', 'desc']).default('desc').optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const PostBodySchema = z.object({
  amount: z.number().positive(),
  categoryId: z.number().int().optional(),
  source: z.string().optional(),
  description: z.string().optional(),
  receivedAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const url = new URL(_req.url);
      const qp = GetQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
      const from = qp.start ? new Date(qp.start).toISOString() : undefined;
      const to = qp.end ? new Date(qp.end).toISOString() : undefined;

      let query = supabase
        .from('incomes')
        .select('id, amount, category_id, source, description, created_at', { count: 'exact' })
        .eq('user_id', userId);

      if (from) query = query.gte('created_at', from);
      if (to) query = query.lte('created_at', to);
      if (qp.categoryId) query = query.eq('category_id', qp.categoryId);

      query = query.order(qp.sort || 'created_at', { ascending: qp.order === 'asc' });
      const startRange = (qp.page - 1) * qp.pageSize;
      const endRange = startRange + qp.pageSize - 1;
      query = query.range(startRange, endRange);

      const { data, error, count } = await query;
      if (error) throw error;

      const totalAmount = (data || []).reduce((s, x) => s + (x.amount || 0), 0);

      return NextResponse.json({
        success: true,
        data: data || [],
        page: qp.page,
        pageSize: qp.pageSize,
        total: count || 0,
        totalAmount,
      });
    } catch (error) {
      console.error('Error in GET /api/incomes:', error);
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
        amount: parsed.amount,
        category_id: parsed.categoryId || null,
        source: parsed.source || null,
        description: parsed.description || null,
        created_at: parsed.receivedAt || new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('incomes')
        .insert(toInsert)
        .select('id, amount, category_id, source, description, created_at')
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, income: data });
    } catch (error) {
      console.error('Error in POST /api/incomes:', error);
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}
```