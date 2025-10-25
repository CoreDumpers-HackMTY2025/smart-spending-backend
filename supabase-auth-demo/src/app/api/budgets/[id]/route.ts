import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../middleware/auth';

const IdParamSchema = z.object({
  id: z.string().transform((v) => Number(v)).refine((n) => Number.isInteger(n) && n > 0, 'ID inválido'),
});

const UpdateBudgetSchema = z.object({
  limitAmount: z.number().min(0).optional(),
  categoryId: z.number().int().positive().optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(9999).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'Debe proporcionar al menos un campo a actualizar' });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);
      const body = await request.json();
      const update = UpdateBudgetSchema.parse(body);

      const payload: any = {};
      if (update.limitAmount !== undefined) payload.limit_amount = update.limitAmount;
      if (update.categoryId !== undefined) payload.category_id = update.categoryId;
      if (update.month !== undefined) payload.month = update.month;
      if (update.year !== undefined) payload.year = update.year;

      const { data, error } = await supabase
        .from('budgets')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select('id, user_id, category_id, month, year, limit_amount, spent_amount')
        .single();

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla budgets no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        if ((error as any).code === '23505') {
          return NextResponse.json({ success: false, error: 'Ya existe un presupuesto para esa categoría/mes/año' }, { status: 409 });
        }
        console.error('Error updating budget:', error);
        return NextResponse.json({ success: false, error: 'Error actualizando presupuesto' }, { status: 500 });
      }

      return NextResponse.json({ success: true, budget: data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.errors }, { status: 400 });
      }
      console.error('Error in PATCH /api/budgets/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (_request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);

      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla budgets no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error deleting budget:', error);
        return NextResponse.json({ success: false, error: 'Error eliminando presupuesto' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'ID inválido', details: error.errors }, { status: 400 });
      }
      console.error('Error in DELETE /api/budgets/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}