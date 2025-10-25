import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      // Buscar perfil en tabla local
      let { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at, updated_at')
        .eq('id', userId)
        .single();

      // Si no existe, intentar obtener del token y crear
      if (!profile) {
        const authHeader = _req.headers.get('authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
        if (token) {
          const { data: authUser } = await supabase.auth.getUser(token);
          const email = authUser?.user?.email || null;
          const full_name = (authUser?.user?.user_metadata as any)?.full_name || null;
          const avatar_url = (authUser?.user?.user_metadata as any)?.avatar_url || null;

          const { data: inserted } = await supabase
            .from('profiles')
            .insert({ id: userId, email, full_name, avatar_url })
            .select('id, email, full_name, avatar_url, created_at, updated_at')
            .single();
          profile = inserted || null;
        }
      }

      // Si aún no hay perfil, responder básico
      if (!profile) {
        return NextResponse.json({ success: true, user: { id: userId }, profile: null });
      }

      return NextResponse.json({ success: true, user: { id: userId }, profile });
    } catch (error) {
      console.error('Error in GET /api/profiles:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}