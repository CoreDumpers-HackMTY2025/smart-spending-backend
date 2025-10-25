import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../middleware/auth';

const IdParamSchema = z.object({ id: z.string().regex(/^\d+$/) });

const UpdateSubscriptionSchema = z.object({
  amount: z.number().positive().optional(),
  merchant: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  categoryId: z.number().int().optional(),
  everyN: z.number().int().positive().optional(),
  unit: z.enum(['day', 'week', 'month', 'year']).optional(),
  startDate: z.string().datetime().optional(),
  nextChargeAt: z.string().datetime().optional(),
  active: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'Debe proporcionar al menos un campo a actualizar' });

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);
      const body = await request.json();
      const validated = UpdateSubscriptionSchema.parse(body);

      const update: any = {};
      if (validated.amount !== undefined) update.amount = validated.amount;
      if (validated.merchant !== undefined) update.merchant = validated.merchant;
      if (validated.description !== undefined) update.description = validated.description;
      if (validated.categoryId !== undefined) update.category_id = validated.categoryId;
      if (validated.active !== undefined) update.active = validated.active;

      // Manejo de fechas e intervalo
      const startDate = validated.startDate ? new Date(validated.startDate) : undefined;
      const everyN = validated.everyN;
      const unit = validated.unit as ('day'|'week'|'month'|'year'|undefined);

      if (startDate !== undefined) update.start_date = startDate.toISOString();
      if (everyN !== undefined) update.every_n = everyN;
      if (unit !== undefined) update.unit = unit;

      // Recalcular next_charge_at si corresponde
      if (validated.nextChargeAt) {
        update.next_charge_at = new Date(validated.nextChargeAt).toISOString();
      } else {
        if ((startDate || everyN !== undefined || unit !== undefined)) {
          // Obtener valores actuales si faltan para calcular
          const { data: current, error: currentErr } = await supabase
            .from('subscriptions')
            .select('start_date, every_n, unit')
            .eq('id', Number(id))
            .eq('user_id', userId)
            .single();
          if (currentErr) {
            if ((currentErr as any).code === '42P01' || (currentErr as any).code === 'PGRST205') {
              return NextResponse.json({ success: false, error: 'Tabla subscriptions no existe. Ejecute la migración SQL para crearla.' }, { status: 503 });
            }
            console.error('Error reading current subscription:', currentErr);
            return NextResponse.json({ success: false, error: 'Error leyendo suscripción' }, { status: 500 });
          }
          const baseStart = startDate ?? new Date(current.start_date);
          const baseEveryN = everyN ?? current.every_n;
          const baseUnit = (unit ?? current.unit) as 'day'|'week'|'month'|'year';
          update.next_charge_at = addInterval(baseStart, baseEveryN, baseUnit).toISOString();
        }
      }

      if (Object.keys(update).length === 0) {
        return NextResponse.json({ success: false, error: 'Sin cambios' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .update(update)
        .eq('id', Number(id))
        .eq('user_id', userId)
        .select(`*, category:categories(id, name, color, icon)`) 
        .single();

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json({ success: false, error: 'Tabla subscriptions no existe. Ejecute la migración SQL para crearla.' }, { status: 503 });
        }
        console.error('Error updating subscription:', error);
        return NextResponse.json({ success: false, error: 'Error actualizando suscripción' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Datos inválidos', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error in PATCH /api/subscriptions/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (_request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);

      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', Number(id))
        .eq('user_id', userId);

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json({ success: false, error: 'Tabla subscriptions no existe. Ejecute la migración SQL para crearla.' }, { status: 503 });
        }
        console.error('Error deleting subscription:', error);
        return NextResponse.json({ success: false, error: 'Error eliminando suscripción' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'ID inválido', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error in DELETE /api/subscriptions/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}