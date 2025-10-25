import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../middleware/auth';

const PeriodSchema = z.object({
  period: z.enum(['7d', '30d', '90d']).optional(),
});

function getStartDate(period?: '7d' | '30d' | '90d'): Date {
  const d = new Date();
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const url = new URL(request.url);
      const qp = PeriodSchema.parse(Object.fromEntries(url.searchParams.entries()));
      const startDate = getStartDate(qp.period);

      // Seleccionar gastos de transporte: usamos transport_type no nulo
      let query = supabase
        .from('expenses')
        .select('id, amount, created_at, transport_type')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .not('transport_type', 'is', null);

      const { data, error } = await query;
      if (error) {
        if ((error as any).code === '42P01' || (error as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla expenses no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error cargando gastos de transporte:', error);
        return NextResponse.json({ success: false, error: 'Error cargando gastos de transporte' }, { status: 500 });
      }

      const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const byDay = dayNames.map((name) => ({ day: name, count: 0, amount: 0 }));
      const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0, amount: 0 }));
      const typeMap = new Map<string, { type: string; count: number; amount: number }>();
      const heatmap: { day: string; hours: { hour: number; amount: number; count: number }[] }[] =
        dayNames.map((name) => ({ day: name, hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, amount: 0, count: 0 })) }));

      let totalAmount = 0;
      let totalCount = 0;

      for (const e of data || []) {
        const date = new Date(e.created_at as string);
        const dayIdx = date.getDay();
        const hour = date.getHours();
        const amount = Number(e.amount || 0);
        const type = (e as any).transport_type || 'otros';

        byDay[dayIdx].count += 1;
        byDay[dayIdx].amount += amount;

        byHour[hour].count += 1;
        byHour[hour].amount += amount;

        const currentType = typeMap.get(type) || { type, count: 0, amount: 0 };
        currentType.count += 1;
        currentType.amount += amount;
        typeMap.set(type, currentType);

        heatmap[dayIdx].hours[hour].amount += amount;
        heatmap[dayIdx].hours[hour].count += 1;

        totalAmount += amount;
        totalCount += 1;
      }

      const byType = Array.from(typeMap.values()).sort((a, b) => b.amount - a.amount);

      return NextResponse.json({
        success: true,
        data: {
          period: qp.period || '30d',
          totals: { totalAmount: Number(totalAmount.toFixed(2)), totalCount },
          patterns: { byDay, byHour, byType },
          heatmap,
        },
      });
    } catch (error) {
      console.error('Error en GET /api/transport/heatmap:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}