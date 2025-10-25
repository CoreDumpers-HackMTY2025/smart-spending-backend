import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, userId: string, supabase: SupabaseClient) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }
  const token = auth.slice(7);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { success: false, error: 'Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY' },
      { status: 500 }
    );
  }

  // Crear cliente por-request con Authorization para que RLS use auth.uid()
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 });
  }

  return handler(req, data.user.id, supabase);
}