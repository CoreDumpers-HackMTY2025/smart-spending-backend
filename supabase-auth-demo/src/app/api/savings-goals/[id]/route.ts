import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../middleware/auth';

const IdParamSchema = z.object({
  id: z.string().transform((v) => Number(v)).refine((n) => Number.isInteger(n) && n > 0, 'ID inválido'),
});

const UpdateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  deadline: z.string().datetime().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'Debe proporcionar al menos un campo a actualizar' });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);
      const body = await request.json();
      const update = UpdateGoalSchema.parse(body);

      const payload: any = {};
      if (update.name !== undefined) payload.name = update.name;
      if (update.targetAmount !== undefined) payload.target_amount = update.targetAmount;
      if (update.deadline !== undefined) payload.deadline = update.deadline;

      const { data, error } = await supabase
        .from('savings_goals')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select('id, name, target_amount, saved_amount, deadline')
        .single();

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla savings_goals no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error updating savings goal:', error);
        return NextResponse.json({ success: false, error: 'Error actualizando meta' }, { status: 500 });
      }

      const reached = Number(data.saved_amount || 0) >= Number(data.target_amount || 0);
      return NextResponse.json({ success: true, goal: { ...data, reached } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.errors }, { status: 400 });
      }
      console.error('Error in PATCH /api/savings-goals/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (_request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);

      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla savings_goals no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error deleting savings goal:', error);
        return NextResponse.json({ success: false, error: 'Error eliminando meta' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'ID inválido', details: error.errors }, { status: 400 });
      }
      console.error('Error in DELETE /api/savings-goals/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}