import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../middleware/auth';

const QuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(9999).optional(),
});

function monthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const url = new URL(request.url);
      const qp = QuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
      const now = new Date();
      const month = qp.month ?? (now.getMonth() + 1);
      const year = qp.year ?? now.getFullYear();
      const { start, end } = monthRange(month, year);

      const { data, error } = await supabase
        .from('expenses')
        .select(`category_id, carbon_kg, category:categories(name)`) // join para nombre de categoría
        .eq('user_id', userId)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla expenses no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error querying expenses for carbon summary:', error);
        return NextResponse.json({ success: false, error: 'Error consultando gastos' }, { status: 500 });
      }

      const byCatMap = new Map<number, { category_id: number; categoryName?: string; carbon_kg: number }>();
      let total_kg = 0;
      for (const e of (data || []) as any[]) {
        const catId = e.category_id != null ? Number(e.category_id) : 0;
        const prev = byCatMap.get(catId) || {
          category_id: catId,
          categoryName: e.category?.name ?? undefined,
          carbon_kg: 0,
        };
        const kg = e.carbon_kg != null ? Number(e.carbon_kg) : 0;
        prev.carbon_kg += kg;
        byCatMap.set(catId, prev);
        total_kg += kg;
      }

      const by_category = Array.from(byCatMap.values()).sort((a, b) => b.carbon_kg - a.carbon_kg);

      return NextResponse.json({ success: true, summary: { total_kg, by_category, month, year } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Parámetros inválidos', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error in GET /api/carbon/summary:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}