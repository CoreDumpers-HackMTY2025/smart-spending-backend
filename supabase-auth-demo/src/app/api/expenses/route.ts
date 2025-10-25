import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../middleware/auth';

const ListQuerySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  categoryId: z.string().transform((v) => Number(v)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.string().transform(Number).optional(),
  maxAmount: z.string().transform(Number).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['created_at', 'amount', 'merchant']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
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
          category:categories(id, name, color, icon)
        `, { count: 'exact' })
        .eq('user_id', userId);

      if (qp.categoryId) query = query.eq('category_id', qp.categoryId);
      if (qp.startDate) query = query.gte('created_at', qp.startDate);
      if (qp.endDate) query = query.lte('created_at', qp.endDate);
      if (qp.minAmount) query = query.gte('amount', qp.minAmount);
      if (qp.maxAmount) query = query.lte('amount', qp.maxAmount);
      if (qp.search) query = query.or(`merchant.ilike.%${qp.search}%,description.ilike.%${qp.search}%`);

      const sortBy = qp.sortBy || 'created_at';
      const sortOrder = qp.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        console.error('Error listing expenses:', error);
        return NextResponse.json(
          { success: false, error: 'Error listando gastos' },
          { status: 500 }
        );
      }

      const totalAmount = (data || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
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
          totalAmount: Number(totalAmount.toFixed(2)),
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

const CreateExpenseSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  categoryId: z.number().int().optional(),
  merchant: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  transportType: z.string().max(50).optional(),
  carbonKg: z.number().min(0).optional(),
  createdAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const body = await request.json();
      const validated = CreateExpenseSchema.parse(body);

      const insertPayload: any = {
        user_id: userId,
        amount: validated.amount,
        carbon_kg: validated.carbonKg ?? 0,
      };
      if (validated.categoryId !== undefined) insertPayload.category_id = validated.categoryId;
      if (validated.merchant) insertPayload.merchant = validated.merchant;
      if (validated.description) insertPayload.description = validated.description;
      if (validated.transportType) insertPayload.transport_type = validated.transportType;
      if (validated.createdAt) insertPayload.created_at = validated.createdAt;

      const { data, error } = await supabase
        .from('expenses')
        .insert(insertPayload)
        .select(`
          *,
          category:categories(id, name, color, icon)
        `)
        .single();

      if (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json({ success: false, error: 'Error creando gasto' }, { status: 500 });
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
      console.error('Error in POST /api/expenses:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}