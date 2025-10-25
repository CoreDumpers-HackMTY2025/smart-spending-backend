# Categories — Gestión de categorías

Ubicación: `backend/api/categories/route.ts`

## Función

Lista y crea categorías de gasto/ingreso del usuario.

## Parámetros

GET:
- Sin parámetros.

POST:
- `name: string`
- `color?: string`
- `icon?: string`

## Respuesta (GET)
- `success: true`
- `categories: { id, name, color?, icon?, created_at }[]`

## Respuesta (POST)
- `success: true`
- `category: { id, name, color?, icon?, created_at }`

## Errores
- 400 por validación.
- 500 por fallos de consulta.

## Código

```typescript
// backend/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PostBodySchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color, icon, created_at')
        .eq('user_id', userId)
        .order('name');
      if (error) throw error;
      return NextResponse.json({ success: true, categories: data || [] });
    } catch (error) {
      console.error('Error in GET /api/categories:', error);
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, userId) => {
    try {
      const body = await _req.json();
      const parsed = PostBodySchema.parse(body);
      const toInsert = {
        user_id: userId,
        name: parsed.name,
        color: parsed.color || null,
        icon: parsed.icon || null,
      };
      const { data, error } = await supabase
        .from('categories')
        .insert(toInsert)
        .select('id, name, color, icon, created_at')
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, category: data });
    } catch (error) {
      console.error('Error in POST /api/categories:', error);
      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
  });
}

## Alineación Spendly v2 — Categorías Sostenibles

- Etiquetas ambientales: categorías y subcategorías pueden incluir `carbon_factor` y `sustainability_tag`.
- Visualización dual: colores e iconos reflejan impacto (ej. verde para bajo CO2).
- Conexión urbana: categorías de transporte pueden enlazar a rutas/servicios públicos cercanos.
- Educación: se muestran tips por categoría (ej. alternativas eco) en UI.

### Mejoras v2 sugeridas
- Extender modelo con `carbon_factor` y `priority` para recomendaciones.
- Añadir `icon_variants` según tema claro/oscuro.
- Integrar con `recommendations/generate` para consejos por categoría.

## Alineación Spendly v3 — Etiquetas Urban Data y MX

- `sourceTag`: opcionalmente marcar categorías con `mx_aggregation` si hay predominio de gastos sincronizados.
- `urbanTag`: etiquetas para correlación con datos urbanos (movilidad/comercio/energía).
- `benefitTag`: sugerir beneficios relevantes (canjeables) por categoría.

### Mejoras v3 sugeridas
- Añadir `policyTag` para conectar categorías con incentivos locales.
- Integrar con `civic-points` para mostrar acciones que acrediten puntos.