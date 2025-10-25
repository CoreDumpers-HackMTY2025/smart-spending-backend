import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../middleware/auth';

const CreateSubscriptionSchema = z.object({
  amount: z.number().positive('Monto debe ser > 0'),
  merchant: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  categoryId: z.number().int().optional(),
  everyN: z.number().int().positive().default(1),
  unit: z.enum(['day', 'week', 'month', 'year']),
  startDate: z.string().datetime().optional(),
  active: z.boolean().optional(),
});

const ListQuerySchema = z.object({
  active: z.string().transform((v) => v === 'true').optional(),
});

function addInterval(date: Date, everyN: number, unit: 'day'|'week'|'month'|'year') {
  const d = new Date(date);
  switch (unit) {
    case 'day': d.setDate(d.getDate() + everyN); break;
    case 'week': d.setDate(d.getDate() + everyN * 7); break;
    case 'month': d.setMonth(d.getMonth() + everyN); break;
    case 'year': d.setFullYear(d.getFullYear() + everyN); break;
  }
  return d;
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const url = new URL(request.url);
      const params = Object.fromEntries(url.searchParams.entries());
      const qp = ListQuerySchema.parse(params);

      let query = supabase
        .from('subscriptions')
        .select(`*, category:categories(id, name, color, icon)`, { count: 'exact' })
        .eq('user_id', userId)
        .order('next_charge_at', { ascending: true });

      if (qp.active !== undefined) query = query.eq('active', qp.active);

      const { data, error } = await query;
      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json({ success: false, error: 'Tabla subscriptions no existe. Ejecute la migración SQL para crearla.' }, { status: 503 });
        }
        console.error('Error listing subscriptions:', error);
        return NextResponse.json({ success: false, error: 'Error listando suscripciones' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Parámetros inválidos', details: error.errors }, { status: 400 });
      }
      console.error('Error in GET /api/subscriptions:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const body = await request.json();
      const validated = CreateSubscriptionSchema.parse(body);

      const start = validated.startDate ? new Date(validated.startDate) : new Date();
      const nextCharge = addInterval(start, validated.everyN, validated.unit);

      const insertPayload: any = {
        user_id: userId,
        amount: validated.amount,
        every_n: validated.everyN,
        unit: validated.unit,
        start_date: start.toISOString(),
        next_charge_at: nextCharge.toISOString(),
        active: validated.active ?? true,
      };
      if (validated.categoryId !== undefined) insertPayload.category_id = validated.categoryId;
      if (validated.merchant) insertPayload.merchant = validated.merchant;
      if (validated.description) insertPayload.description = validated.description;

      const { data, error } = await supabase
        .from('subscriptions')
        .insert(insertPayload)
        .select(`*, category:categories(id, name, color, icon)`) 
        .single();

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json({ success: false, error: 'Tabla subscriptions no existe. Ejecute la migración SQL para crearla.' }, { status: 503 });
        }
        console.error('Error creating subscription:', error);
        return NextResponse.json({ success: false, error: 'Error creando suscripción' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.errors }, { status: 400 });
      }
      console.error('Error in POST /api/subscriptions:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}