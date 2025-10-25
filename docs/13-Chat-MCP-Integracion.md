# Chat — Integración MCP + OpenAI

Ubicación: `backend/api/chat/route.ts`

## Función

Orquesta OpenAI con herramientas de servidores MCP, ejecutando llamadas a herramientas y devolviendo la respuesta final.

## Variables de entorno

- `OPENAI_API_KEY`
- `MCP_SERVER_PATH` (ruta al binario MCP)

## Consideraciones

- El sistema añade reglas y el `userId`.
- El `tool_choice` es `auto` para permitir a OpenAI invocar herramientas.
- El transporte MCP debe mantenerse vivo entre llamadas.

## Código

```typescript
// backend/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { withAuth } from '../middleware/auth';
import { spawn } from 'child_process';

// Cliente OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Zod schemas
const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema),
});

// MCP Client mínimo (STDIO)
class MCPClient {
  private proc: ReturnType<typeof spawn> | null = null;
  private buffer = '';

  constructor(private serverPath: string) {}

  async start() {
    if (this.proc) return;
    this.proc = spawn(this.serverPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.on('data', (d) => { this.buffer += d.toString(); });
    this.proc.stderr.on('data', (d) => { console.error('[MCP STDERR]', d.toString()); });
  }

  async listTools(): Promise<{ name: string; description?: string }[]> {
    this.buffer = '';
    this.proc?.stdin.write(JSON.stringify({ type: 'list_tools' }) + '\n');
    await new Promise((r) => setTimeout(r, 120));
    const out = this.buffer.trim();
    try { return JSON.parse(out)?.tools || []; } catch { return []; }
  }

  async callTool(name: string, args: any): Promise<string> {
    this.buffer = '';
    this.proc?.stdin.write(JSON.stringify({ type: 'call_tool', name, args }) + '\n');
    await new Promise((r) => setTimeout(r, 200));
    const out = this.buffer.trim();
    return out || '';
  }
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const body = await _req.json();
      const { messages } = BodySchema.parse(body);

      // Inicia MCP
      const mcp = new MCPClient(process.env.MCP_SERVER_PATH!);
      await mcp.start();
      const tools = await mcp.listTools();

      const systemRules = `Eres un asistente MCP. Usa herramientas cuando sea pertinente. userId=${userId}`;

      // Mapea herramientas MCP para OpenAI
      const toolSpecs = tools.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description || 'MCP tool',
          parameters: { type: 'object', properties: {}, additionalProperties: true },
        },
      }));

      let aiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemRules },
        ...messages,
      ];

      // Bucle hasta obtener mensaje final
      for (let i = 0; i < 3; i++) {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          tool_choice: 'auto',
          messages: aiMessages,
          tools: toolSpecs,
        });

        const msg = completion.choices[0].message;

        // Si no hay tool_calls, es respuesta final
        if (!msg.tool_calls || msg.tool_calls.length === 0) {
          return NextResponse.json({ success: true, message: msg });
        }

        // Ejecuta tool_calls via MCP
        for (const tc of msg.tool_calls) {
          const name = tc.function.name;
          let args: any = {};
          try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
          const toolResult = await mcp.callTool(name, args);
          aiMessages.push({ role: 'tool', tool_call_id: tc.id!, content: toolResult });
        }

        // Añade el mensaje del asistente con tool_calls
        aiMessages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
      }

      // Si aún no se obtuvo final
      return NextResponse.json({ success: true, message: { role: 'assistant', content: 'No se pudo obtener respuesta final.' } });
    } catch (error) {
      console.error('Error in POST /api/chat:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}
```