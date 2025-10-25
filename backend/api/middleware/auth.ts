import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }
  const token = auth.slice(7);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 });
  }

  return handler(req, data.user.id);
}