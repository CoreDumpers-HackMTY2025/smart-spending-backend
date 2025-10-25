# Recommendations — Generación con OpenAI

Ubicación: `backend/api/recommendations/generate/route.ts`

## Función

Genera recomendaciones personalizadas en JSON usando OpenAI basadas en gastos de los últimos 30 días.

## Parámetros

- `focus?: 'savings' | 'eco' | 'transport' | 'health'`

## Código

```typescript
// backend/api/recommendations/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { withAuth } from '../../middleware/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const QuerySchema = z.object({
  focus: z.enum(['savings', 'eco', 'transport', 'health']).optional(),
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const url = new URL(_req.url);
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

      if (e1) throw e1;

      const total = (expenses || []).reduce((sum, x) => sum + (x.amount || 0), 0);
      const carbonTotal = (expenses || []).reduce((sum, x) => sum + (x.carbon_kg || 0), 0);

      const prompt = `Eres un asistente financiero y ambiental. Genera recomendaciones JSON con este esquema:
{
  "title": string,
  "description": string,
  "category": string,
  "potential_savings": number,
  "carbon_reduction": number,
  "action_steps": string[],
  "priority": "low" | "medium" | "high"
}
Basadas en los últimos 30 días: total=${total.toFixed(2)}, CO2=${carbonTotal.toFixed(2)}kg, focus=${qp.focus || 'general'}.
Asegúrate de devolver un array JSON. Evita texto adicional.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Responde solo con JSON válido.' },
          { role: 'user', content: prompt },
        ],
      });

      const content = completion.choices[0].message.content || '[]';
      let items: any[] = [];
      try {
        items = JSON.parse(content);
        if (!Array.isArray(items)) items = [items];
      } catch {
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

      if (e2) throw e2;

      return NextResponse.json({ success: true, recommendations: saved || [] });
    } catch (error) {
      console.error('Error in POST /api/recommendations/generate:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}
```