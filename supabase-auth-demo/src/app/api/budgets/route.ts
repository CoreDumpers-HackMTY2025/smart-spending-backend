import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../middleware/auth';

const GetQuerySchema = z.object({
  month: z.string().transform((v) => Number(v)).refine((n) => Number.isInteger(n) && n >= 1 && n <= 12, {
    message: 'Mes inválido',
  }).optional(),
  year: z.string().transform((v) => Number(v)).refine((n) => Number.isInteger(n) && n >= 2000 && n <= 9999, {
    message: 'Año inválido',
  }).optional(),
});

const PostBodySchema = z.object({
  categoryId: z.number().int().positive(),
  limitAmount: z.number().min(0),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(9999).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const url = new URL(request.url);
      const params = Object.fromEntries(url.searchParams.entries());
      const qp = GetQuerySchema.parse(params);
      const now = new Date();
      const month = qp.month ?? now.getMonth() + 1;
      const year = qp.year ?? now.getFullYear();

      const { data, error } = await supabase
        .from('budgets')
        .select('id, category_id, limit_amount, spent_amount, month, year, category:categories(id, name, color, icon)')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year)
        .order('category_id', { ascending: true });

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla budgets no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error listing budgets:', error);
        return NextResponse.json({ success: false, error: 'Error listando presupuestos' }, { status: 500 });
      }

      const budgets = (data || []).map((b: any) => ({
        id: b.id,
        category_id: b.category_id,
        limit_amount: Number(b.limit_amount || 0),
        spent_amount: Number(b.spent_amount || 0),
        month: b.month,
        year: b.year,
        category: b.category || null,
      }));

      const total_limit = budgets.reduce((s: number, x: any) => s + (x.limit_amount || 0), 0);
      const total_spent = budgets.reduce((s: number, x: any) => s + (x.spent_amount || 0), 0);
      const percent_used = total_limit > 0 ? (total_spent / total_limit) * 100 : 0;

      return NextResponse.json({
        success: true,
        budgets,
        summary: { total_limit, total_spent, percent_used },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Parámetros inválidos', details: error.errors }, { status: 400 });
      }
      console.error('Error in GET /api/budgets:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const body = await request.json();
      const parsed = PostBodySchema.parse(body);
      const now = new Date();
      const month = parsed.month ?? now.getMonth() + 1;
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

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla budgets no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error creating/upserting budget:', error);
        return NextResponse.json({ success: false, error: 'Error creando presupuesto' }, { status: 500 });
      }

      return NextResponse.json({ success: true, budget: data }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.errors }, { status: 400 });
      }
      console.error('Error in POST /api/budgets:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}