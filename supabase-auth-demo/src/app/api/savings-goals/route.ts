import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../middleware/auth';

const PostBodySchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  deadline: z.string().datetime().optional(),
});

const PatchBodySchema = z.object({
  goalId: z.number().int().positive(),
  addAmount: z.number().positive(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (_request, userId, supabase) => {
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('id, name, target_amount, saved_amount, deadline')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla savings_goals no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error listing savings goals:', error);
        return NextResponse.json({ success: false, error: 'Error listando metas de ahorro' }, { status: 500 });
      }

      const goals = (data || []).map((g: any) => {
        const target = Number(g.target_amount || 0);
        const saved = Number(g.saved_amount || 0);
        const progress = target > 0 ? (saved / target) * 100 : 0;
        const reached = saved >= target;
        return { ...g, target_amount: target, saved_amount: saved, progress, reached };
      });

      return NextResponse.json({ success: true, goals });
    } catch (error) {
      console.error('Error in GET /api/savings-goals:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const body = await request.json();
      const parsed = PostBodySchema.parse(body);

      const insertData: any = {
        user_id: userId,
        name: parsed.name,
        target_amount: parsed.targetAmount,
      };
      if (parsed.deadline) insertData.deadline = parsed.deadline;

      const { data, error } = await supabase
        .from('savings_goals')
        .insert(insertData)
        .select('id, name, target_amount, saved_amount, deadline, created_at')
        .single();

      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla savings_goals no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error creating savings goal:', error);
        return NextResponse.json({ success: false, error: 'Error creando meta de ahorro' }, { status: 500 });
      }

      return NextResponse.json({ success: true, goal: data }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.errors }, { status: 400 });
      }
      console.error('Error in POST /api/savings-goals:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const body = await request.json();
      const parsed = PatchBodySchema.parse(body);

      const { data: existing, error: e1 } = await supabase
        .from('savings_goals')
        .select('id, name, target_amount, saved_amount, deadline')
        .eq('id', parsed.goalId)
        .eq('user_id', userId)
        .single();
      if (e1) {
        if ((e1 as any).code === '42P01' || (e1 as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla savings_goals no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error fetching savings goal:', e1);
        return NextResponse.json({ success: false, error: 'Error consultando meta' }, { status: 500 });
      }
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Meta no encontrada' }, { status: 404 });
      }

      const newSaved = Number(existing.saved_amount || 0) + parsed.addAmount;
      const { data, error } = await supabase
        .from('savings_goals')
        .update({ saved_amount: newSaved })
        .eq('id', parsed.goalId)
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
        return NextResponse.json({ success: false, error: 'Error actualizando progreso' }, { status: 500 });
      }

      const reached = Number(data.saved_amount || 0) >= Number(data.target_amount || 0);
      return NextResponse.json({ success: true, goal: { ...data, reached } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Parámetros inválidos', details: error.errors }, { status: 400 });
      }
      console.error('Error in PATCH /api/savings-goals:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}