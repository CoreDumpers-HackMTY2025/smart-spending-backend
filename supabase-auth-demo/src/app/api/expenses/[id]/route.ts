import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../middleware/auth';

const IdParamSchema = z.object({ id: z.string().transform((v) => Number(v)).refine((n) => Number.isInteger(n) && n > 0, 'ID inválido') });

const UpdateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  categoryId: z.number().int().optional(),
  merchant: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  transportType: z.string().max(50).optional(),
  carbonKg: z.number().min(0).optional(),
  createdAt: z.string().datetime().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'Debe proporcionar al menos un campo a actualizar' });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);
      const body = await request.json();
      const validated = UpdateExpenseSchema.parse(body);

      const updatePayload: any = {};
      if (validated.amount !== undefined) updatePayload.amount = validated.amount;
      if (validated.categoryId !== undefined) updatePayload.category_id = validated.categoryId;
      if (validated.merchant !== undefined) updatePayload.merchant = validated.merchant;
      if (validated.description !== undefined) updatePayload.description = validated.description;
      if (validated.transportType !== undefined) updatePayload.transport_type = validated.transportType;
      if (validated.carbonKg !== undefined) updatePayload.carbon_kg = validated.carbonKg;
      if (validated.createdAt !== undefined) updatePayload.created_at = validated.createdAt;

      const { data, error } = await supabase
        .from('expenses')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select(`
          *,
          category:categories(id, name, color, icon)
        `)
        .single();

      if (error) {
        console.error('Error updating expense:', error);
        return NextResponse.json({ success: false, error: 'Error actualizando gasto' }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ success: false, error: 'Gasto no encontrado' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Datos inválidos', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error in PATCH /api/expenses/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting expense:', error);
        return NextResponse.json({ success: false, error: 'Error eliminando gasto' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'ID inválido', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error in DELETE /api/expenses/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}