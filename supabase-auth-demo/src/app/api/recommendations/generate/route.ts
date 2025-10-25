import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../middleware/auth';

const QuerySchema = z.object({
  focus: z.enum(['savings', 'eco', 'transport', 'health']).optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const url = new URL(request.url);
      const qp = QuerySchema.parse(Object.fromEntries(url.searchParams.entries()));

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data: expenses, error: e1 } = await supabase
        .from('expenses')
        .select('amount, category_id, carbon_kg, merchant, description, created_at')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (e1) {
        if ((e1 as any).code === '42P01' || (e1 as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla expenses no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error fetching expenses for recommendations:', e1);
        return NextResponse.json({ success: false, error: 'Error consultando gastos' }, { status: 500 });
      }

      const total = (expenses || []).reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
      const carbonTotal = (expenses || []).reduce((sum: number, x: any) => sum + Number(x.carbon_kg || 0), 0);

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ success: false, error: 'Falta OPENROUTER_API_KEY' }, { status: 500 });
      }

      const model = process.env.OPENROUTER_MODEL || 'openai/gpt-5-nano';
      const prompt = `Eres un asistente financiero y ambiental. Genera recomendaciones JSON con este esquema:\n[
  {
    "title": string,
    "description": string,
    "category": string,
    "potential_savings": number,
    "carbon_reduction": number,
    "action_steps": string[],
    "priority": "low" | "medium" | "high"
  }
]\nBasadas en los últimos 30 días: total=${total.toFixed(2)}, CO2=${carbonTotal.toFixed(2)}kg, focus=${qp.focus || 'general'}. Responde solo con JSON válido (sin markdown).`;

      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Responde solo con JSON válido.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('OpenRouter error:', errText);
        return NextResponse.json({ success: false, error: 'Error generando recomendaciones (IA)' }, { status: 502 });
      }

      const result = await resp.json();
      const content = result?.choices?.[0]?.message?.content ?? '[]';

      let items: any[] = [];
      try {
        items = JSON.parse(content);
        if (!Array.isArray(items)) items = [items];
      } catch (e) {
        console.error('Invalid JSON from OpenRouter:', e, content);
        items = [];
      }

      const toInsert = items.map((it) => ({
        user_id: userId,
        title: String(it.title || 'Recomendación'),
        description: String(it.description || ''),
        category: String(it.category || 'general'),
        potential_savings: Number(it.potential_savings || 0),
        carbon_reduction: Number(it.carbon_reduction || 0),
        action_steps: Array.isArray(it.action_steps) ? it.action_steps : [],
        priority: ['low', 'medium', 'high'].includes(it.priority) ? it.priority : 'medium',
        seen: false,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      const { data: saved, error: e2 } = await supabase
        .from('recommendations')
        .insert(toInsert)
        .select('*');

      if (e2) {
        if ((e2 as any).code === '42P01' || (e2 as any).code === 'PGRST205') {
          return NextResponse.json(
            { success: false, error: 'Tabla recommendations no existe. Ejecute la migración SQL para crearla.' },
            { status: 503 }
          );
        }
        console.error('Error inserting recommendations:', e2);
        return NextResponse.json({ success: false, error: 'Error guardando recomendaciones' }, { status: 500 });
      }

      return NextResponse.json({ success: true, recommendations: saved || [] });
    } catch (error) {
      console.error('Error in POST /api/recommendations/generate:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}