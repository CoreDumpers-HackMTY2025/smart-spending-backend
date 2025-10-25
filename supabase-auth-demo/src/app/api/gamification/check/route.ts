import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../middleware/auth';

async function ensureAchievement(userId: string, slug: string, supabase: any) {
  const { data: ach } = await supabase.from('achievements').select('id, slug').eq('slug', slug).single();
  if (!ach) return null;
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)
    .eq('achievement_id', ach.id)
    .limit(1);
  if ((existing || []).length > 0) return null;
  const { data: inserted, error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: ach.id, unlocked_at: new Date().toISOString() })
    .select('achievement_id')
    .single();
  if (error) {
    console.error('Error inserting achievement', slug, error);
    return null;
  }
  return { slug, achievementId: inserted.achievement_id };
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, userId, supabase) => {
    try {
      const now = new Date();
      const start = new Date();
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      const newlyUnlocked: { slug: string; achievementId: string }[] = [];

      // first-expense: al menos 1 gasto
      const { data: anyExpense } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      if ((anyExpense || []).length > 0) {
        const r = await ensureAchievement(userId, 'first-expense', supabase);
        if (r) newlyUnlocked.push(r);
      }

      // week-streak: gasto en 7 días consecutivos (últimos 7)
      const { data: lastWeekExpenses } = await supabase
        .from('expenses')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', start.toISOString());
      const daysWithExpense = new Set<number>();
      for (const e of lastWeekExpenses || []) {
        const d = new Date(e.created_at);
        const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
        daysWithExpense.add(key);
      }
      if (daysWithExpense.size >= 7) {
        const r = await ensureAchievement(userId, 'week-streak', supabase);
        if (r) newlyUnlocked.push(r);
      }

      // eco-warrior: ≥ 3 gastos con transport_type en última semana
      const { data: eco } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', userId)
        .not('transport_type', 'is', null)
        .gte('created_at', start.toISOString());
      if ((eco || []).length >= 3) {
        const r = await ensureAchievement(userId, 'eco-warrior', supabase);
        if (r) newlyUnlocked.push(r);
      }

      return NextResponse.json({
        success: true,
        unlocked: newlyUnlocked,
        count: newlyUnlocked.length,
        message: newlyUnlocked.length > 0 ? '¡Nuevos logros desbloqueados!' : 'Sin nuevos logros por ahora',
      });
    } catch (error) {
      console.error('Error en POST /api/gamification/check:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}