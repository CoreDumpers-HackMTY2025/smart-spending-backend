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
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at')
        .eq('id', userId)
        .single();

      return NextResponse.json({ success: true, user: { id: userId, profile } });
    } catch (error) {
      console.error('Error in GET /api/auth:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}