import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../middleware/auth';

const ListQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  categoryId: z.string().transform((v) => Number(v)).optional(),
  sort: z.enum(['created_at', 'amount']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.string().transform(Number).optional(),
  pageSize: z.string().transform(Number).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const url = new URL(request.url);
      const params = Object.fromEntries(url.searchParams.entries());
      const qp = ListQuerySchema.parse(params);

      const page = qp.page && qp.page > 0 ? qp.page : 1;
      const pageSize = qp.pageSize && qp.pageSize > 0 ? qp.pageSize : 20;
      const fromIdx = (page - 1) * pageSize;
      const toIdx = fromIdx + pageSize - 1;

      let query = supabase
        .from('incomes')
        .select(`*, category:categories(id, name, color, icon)`, { count: 'exact' })
        .eq('user_id', userId);

      if (qp.start) query = query.gte('created_at', qp.start);
      if (qp.end) query = query.lte('created_at', qp.end);
      if (qp.categoryId) query = query.eq('category_id', qp.categoryId);

      const sortBy = qp.sort || 'created_at';
      const sortOrder = qp.order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      query = query.range(fromIdx, toIdx);

      const { data, error, count } = await query;
      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla incomes no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error listing incomes:', error);
        return NextResponse.json(
          { success: false, error: 'Error listando ingresos' },
          { status: 500 }
        );
      }

      const totalAmount = (data || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

      return NextResponse.json({
        success: true,
        data: data || [],
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
        summary: {
          totalAmount: Number(totalAmount.toFixed(2)),
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
      console.error('Error in GET /api/incomes:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}

const CreateIncomeSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  categoryId: z.number().int().optional(),
  source: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  receivedAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const body = await request.json();
      const validated = CreateIncomeSchema.parse(body);

      const insertPayload: any = {
        user_id: userId,
        amount: validated.amount,
      };
      if (validated.categoryId !== undefined) insertPayload.category_id = validated.categoryId;
      if (validated.source) insertPayload.source = validated.source;
      if (validated.description) insertPayload.description = validated.description;
      if (validated.receivedAt) insertPayload.created_at = validated.receivedAt;

      const { data, error } = await supabase
        .from('incomes')
        .insert(insertPayload)
        .select(`*, category:categories(id, name, color, icon)`)
        .single();

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla incomes no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error creating income:', error);
        return NextResponse.json({ success: false, error: 'Error creando ingreso' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Datos inválidos',
            details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
          },
          { status: 400 }
        );
      }
      console.error('Error in POST /api/incomes:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}