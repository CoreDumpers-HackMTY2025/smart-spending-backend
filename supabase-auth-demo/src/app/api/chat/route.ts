import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../middleware/auth';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId, supabase) => {
    try {
      const body = await request.json();
      const { messages } = BodySchema.parse(body);

      // Contexto del usuario (últimos 30 días)
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data: expenses, error: e1 } = await supabase
        .from('expenses')
        .select('amount, carbon_kg, merchant, transport_type, created_at')
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
        console.error('Error obteniendo gastos para chat:', e1);
      }

      const totalAmount = (expenses || []).reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
      const totalCarbon = (expenses || []).reduce((sum: number, x: any) => sum + Number(x.carbon_kg || 0), 0);
      const count = (expenses || []).length;
      const merchants: Record<string, number> = {};
      for (const e of expenses || []) {
        const m = (e.merchant || 'Desconocido').trim();
        merchants[m] = (merchants[m] || 0) + 1;
      }
      const topMerchant = Object.entries(merchants).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      const systemContext = `Eres un asistente financiero amigable. Responde de forma breve y clara.
Contexto del usuario (últimos 30 días): total=$${totalAmount.toFixed(2)}, transacciones=${count}, CO2=${totalCarbon.toFixed(2)}kg, comercio frecuente=${topMerchant}.
Consejos prácticos, tono casual, sin promesas ni garantías. Si el usuario te pide cálculos, sé explícito sobre supuestos.`;

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ success: false, error: 'Falta OPENROUTER_API_KEY' }, { status: 500 });
      }
      const model = process.env.OPENROUTER_MODEL || 'openai/gpt-5-nano';

      // Construir mensajes para OpenRouter
      const payloadMessages = [
        { role: 'system', content: systemContext },
        ...messages,
      ];

      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages: payloadMessages }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('OpenRouter chat error:', errText);
        return NextResponse.json({ success: false, error: 'Error generando respuesta (IA)' }, { status: 502 });
      }

      const result = await resp.json();
      const message = result?.choices?.[0]?.message;
      const content = message?.content || 'Sin respuesta';

      return NextResponse.json({ success: true, message: { role: 'assistant', content } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Parámetros inválidos', details: error.errors },
          { status: 400 }
        );
      }
      console.error('Error en POST /api/chat:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}