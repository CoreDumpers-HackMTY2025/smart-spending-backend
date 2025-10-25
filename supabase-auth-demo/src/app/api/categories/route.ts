import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../middleware/auth';

const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100),
  color: z.string().max(50).optional(),
  icon: z.string().max(50).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId, supabase) => {
    try {
      let { data: cats, error } = await supabase
        .from('categories')
        .select('id, name, color, icon')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla categories no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error listing categories:', error);
        return NextResponse.json({ success: false, error: 'Error listando categorías' }, { status: 500 });
      }

      if (!cats || cats.length === 0) {
        // Crear una categoría por defecto si el usuario no tiene
        const { error: insErr } = await supabase
          .from('categories')
          .insert({ user_id: userId, name: 'General' });
        if (insErr) {
          // Si falla por carrera/duplicado, ignorar y continuar
          console.warn('No se pudo crear categoría por defecto:', insErr);
        }
        const { data: cats2 } = await supabase
          .from('categories')
          .select('id, name, color, icon')
          .eq('user_id', userId)
          .order('name', { ascending: true });
        cats = cats2 || [];
      }

      return NextResponse.json({ success: true, data: cats });
    } catch (error) {
      console.error('Error in GET /api/categories:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const body = await request.json();
      const validated = CreateCategorySchema.parse(body);
      const name = validated.name.trim();

      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: userId, name, color: validated.color ?? null, icon: validated.icon ?? null })
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
        console.error('Error creating category:', error);
        return NextResponse.json({ success: false, error: 'Error creando categoría' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.errors }, { status: 400 });
      }
      console.error('Error in POST /api/categories:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}