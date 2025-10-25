import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../middleware/auth';

const IdParamSchema = z.object({ id: z.string().regex(/^\d+$/) });

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(50).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);
      const body = await request.json();
      const update = UpdateCategorySchema.parse(body);

      if (Object.keys(update).length === 0) {
        return NextResponse.json({ success: false, error: 'Sin cambios' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('categories')
        .update(update)
        .eq('id', Number(id))
        .eq('user_id', userId)
        .select('id, name, color, icon')
        .single();

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla categories no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        if ((error as any).code === '23505') {
          return NextResponse.json({ success: false, error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
        }
        console.error('Error updating category:', error);
        return NextResponse.json({ success: false, error: 'Error actualizando categoría' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Datos inválidos', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error in PATCH /api/categories/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (_request, userId, supabase) => {
    try {
      const { id } = IdParamSchema.parse(params);

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', Number(id))
        .eq('user_id', userId);

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla categories no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error deleting category:', error);
        return NextResponse.json({ success: false, error: 'Error eliminando categoría' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'ID inválido', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error in DELETE /api/categories/[id]:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}