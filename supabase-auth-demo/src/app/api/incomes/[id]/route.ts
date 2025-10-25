import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../middleware/auth';

const IdParamSchema = z.object({
  id: z.string().transform((v) => Number(v)).refine((n) => Number.isInteger(n) && n > 0, 'ID inválido'),
});

const UpdateIncomeSchema = z.object({
  amount: z.number().positive().optional(),
  categoryId: z.number().int().optional(),
  source: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  receivedAt: z.string().datetime().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'Debe proporcionar al menos un campo a actualizar' });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);
      const body = await request.json();
      const validated = UpdateIncomeSchema.parse(body);

      const updatePayload: any = {};
      if (validated.amount !== undefined) updatePayload.amount = validated.amount;
      if (validated.categoryId !== undefined) updatePayload.category_id = validated.categoryId;
      if (validated.source !== undefined) updatePayload.source = validated.source;
      if (validated.description !== undefined) updatePayload.description = validated.description;
      if (validated.receivedAt !== undefined) updatePayload.created_at = validated.receivedAt;

      const { data, error } = await supabase
        .from('incomes')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select(`*, category:categories(id, name, color, icon)`) 
        .single();

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json({ success: false, error: 'Tabla incomes no existe. Ejecute la migración SQL para crearla.' }, { status: 503 });
        }
        console.error('Error updating income:', error);
        return NextResponse.json({ success: false, error: 'Error actualizando ingreso' }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ success: false, error: 'Ingreso no encontrado' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Datos inválidos', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error in PATCH /api/incomes/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);

      const { error } = await supabase
        .from('incomes')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json({ success: false, error: 'Tabla incomes no existe. Ejecute la migración SQL para crearla.' }, { status: 503 });
        }
        console.error('Error deleting income:', error);
        return NextResponse.json({ success: false, error: 'Error eliminando ingreso' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'ID inválido', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error in DELETE /api/incomes/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}