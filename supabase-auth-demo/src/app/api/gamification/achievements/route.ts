import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../middleware/auth';

async function hasAnyExpense(userId: string, supabase: any): Promise<boolean> {
  const { data, error } = await supabase
    .from('expenses')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  if (error) return false;
  return (data || []).length > 0;
}

async function weekStreakProgress(userId: string, supabase: any): Promise<number> {
  const now = new Date();
  const start = new Date();
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('expenses')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString());
  if (error) return 0;
  const daysWithExpense = new Set<number>();
  for (const e of data || []) {
    const d = new Date(e.created_at);
    const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    daysWithExpense.add(key);
  }
  const progressDays = Math.min(7, daysWithExpense.size);
  return Math.round((progressDays / 7) * 100);
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId, supabase) => {
    try {
      const { data: achievements, error: achErr } = await supabase
        .from('achievements')
        .select('id, slug, title, description, points')
        .order('points', { ascending: false });
      if (achErr) {
        console.error('Error cargando achievements:', achErr);
        return NextResponse.json({ success: false, error: 'Error cargando logros' }, { status: 500 });
      }

      const { data: userAch, error: uaErr } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId);
      if (uaErr) {
        console.error('Error cargando user_achievements:', uaErr);
        return NextResponse.json({ success: false, error: 'Error cargando estado de logros' }, { status: 500 });
      }

      const unlockedSet = new Set((userAch || []).map((a: any) => a.achievement_id));
      const list: any[] = [];
      let pointsTotal = 0;
      let pointsUnlocked = 0;

      for (const a of achievements || []) {
        pointsTotal += a.points || 0;
        const unlocked = unlockedSet.has(a.id);
        if (unlocked) pointsUnlocked += a.points || 0;

        let progress = 0;
        if (a.slug === 'first-expense') {
          progress = (await hasAnyExpense(userId, supabase)) ? 100 : 0;
        } else if (a.slug === 'week-streak') {
          progress = await weekStreakProgress(userId, supabase);
        } else {
          progress = unlocked ? 100 : 0;
        }

        const unlockedAt = (userAch || []).find((u: any) => u.achievement_id === a.id)?.unlocked_at || null;

        list.push({
          id: a.id,
          slug: a.slug,
          title: a.title,
          description: a.description,
          points: a.points,
          unlocked,
          unlockedAt,
          progress,
        });
      }

      const stats = {
        total: (achievements || []).length,
        unlocked: unlockedSet.size,
        points: {
          total: pointsTotal,
          unlocked: pointsUnlocked,
          percentage: pointsTotal > 0 ? Number(((pointsUnlocked / pointsTotal) * 100).toFixed(2)) : 0,
        },
      };

      return NextResponse.json({ success: true, achievements: list, stats });
    } catch (error) {
      console.error('Error en GET /api/gamification/achievements:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}