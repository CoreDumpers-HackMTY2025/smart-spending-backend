# Expenses — POST /api/expenses

Ubicación: `backend/api/expenses/route.ts`

## Función

Crea un gasto con validación estricta y lógica de negocio adicional:
- Valida el cuerpo con Zod (`amount`, `categoryId`, `subcategoryId?`, `description?`, `merchant?`, `date`, `paymentMethod?`, `notes?`).
- Calcula huella de carbono (`carbon_kg`) según `category`/`subcategory`.
- Inserta el gasto y retorna datos con `category` y `subcategory` asociados.
- Actualiza gasto del presupuesto mensual via RPC `update_budget_spent`.
- Genera `budgetWarning` al superar 80% o 100% del límite.
- Dispara verificación de logros (`/api/gamification/check`).

## Entrada (Zod)

- `amount: number > 0`
- `categoryId: uuid`
- `subcategoryId?: uuid`
- `description?: string (<= 500)`
- `merchant?: string (<= 200)`
- `date: ISO datetime`
- `paymentMethod?: 'cash'|'card'|'transfer'`
- `notes?: string (<= 1000)`

## Respuesta

- `success: true`
- `data: expense` con joins de `categories` y `subcategories`
- `carbonImpact: { kg, equivalents: { trees, drivingKm } }`
- `budgetWarning?: { exceeded, percentUsed, message }`

## Errores

- 400 por errores de validación Zod (mapeados a `details: ValidationError[]`).
- 500 por errores de base de datos o cálculo.

## Dependencias

- `@supabase/supabase-js`, `zod`
- RPC: `update_budget_spent`
- Endpoint interno: `POST /api/gamification/check`

## Código

```typescript
// backend/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { withAuth } from '../middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CreateExpenseSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  categoryId: z.string().uuid('ID de categoría inválido'),
  subcategoryId: z.string().uuid('ID de subcategoría inválido').optional(),
  description: z.string().max(500, 'Descripción muy larga').optional(),
  merchant: z.string().max(200, 'Nombre de comercio muy largo').optional(),
  date: z.string().datetime('Fecha inválida'),
  paymentMethod: z.enum(['cash', 'card', 'transfer']).optional(),
  notes: z.string().max(1000, 'Notas muy largas').optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const body = await request.json();
      
      // Validar datos
      const validatedData = CreateExpenseSchema.parse(body);

      // Obtener factor de carbono
      let carbonFactor = 0;
      
      if (validatedData.subcategoryId) {
        const { data: subcategory } = await supabase
          .from('subcategories')
          .select('carbon_factor')
          .eq('id', validatedData.subcategoryId)
          .single();
        
        carbonFactor = subcategory?.carbon_factor || 0;
      } else {
        const { data: category } = await supabase
          .from('categories')
          .select('carbon_factor')
          .eq('id', validatedData.categoryId)
          .single();
        
        carbonFactor = category?.carbon_factor || 0;
      }

      // Calcular huella de carbono
      const carbonKg = validatedData.amount * carbonFactor;

      // Crear gasto
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: userId,
          amount: validatedData.amount,
          category_id: validatedData.categoryId,
          subcategory_id: validatedData.subcategoryId,
          description: validatedData.description,
          merchant: validatedData.merchant,
          date: validatedData.date,
          carbon_kg: carbonKg,
          payment_method: validatedData.paymentMethod,
          notes: validatedData.notes,
        })
        .select(`
          *,
          category:categories(id, name, slug, icon, color),
          subcategory:subcategories(id, name, slug)
        `)
        .single();

      if (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json(
          { success: false, error: 'Error creando gasto' },
          { status: 500 }
        );
      }

      // Actualizar presupuesto si existe
      const expenseDate = new Date(validatedData.date);
      const month = expenseDate.getMonth() + 1;
      const year = expenseDate.getFullYear();

      await supabase.rpc('update_budget_spent', {
        p_user_id: userId,
        p_category_id: validatedData.categoryId,
        p_month: month,
        p_year: year,
        p_amount: validatedData.amount,
      });

      // Verificar si excede presupuesto
      const { data: budget } = await supabase
        .from('budgets')
        .select('limit_amount, spent_amount')
        .eq('user_id', userId)
        .eq('category_id', validatedData.categoryId)
        .eq('month', month)
        .eq('year', year)
        .single();

      let budgetWarning = null;
      if (budget && budget.spent_amount >= budget.limit_amount * 0.8) {
        const percentUsed = (budget.spent_amount / budget.limit_amount) * 100;
        budgetWarning = {
          exceeded: budget.spent_amount >= budget.limit_amount,
          percentUsed: percentUsed.toFixed(1),
          message: budget.spent_amount >= budget.limit_amount
            ? `⚠️ Has excedido tu presupuesto en esta categoría`
            : `⚠️ Has usado el ${percentUsed.toFixed(0)}% de tu presupuesto`,
        };
      }

      // Verificar achievements
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/gamification/check`, {
        method: 'POST',
        headers: {
          'Authorization': request.headers.get('authorization')!,
          'Content-Type': 'application/json',
        },
      });

      return NextResponse.json({
        success: true,
        data,
        carbonImpact: {
          kg: carbonKg.toFixed(2),
          equivalents: {
            trees: Math.ceil(carbonKg / 7),
            drivingKm: Math.round(carbonKg / 0.12),
          },
        },
        budgetWarning,
      }, { status: 201 });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Datos inválidos', 
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      console.error('Error in POST /api/expenses:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}

## Alineación Spendly v2 — Ciudad Inteligente

- Recopilación invisible: este endpoint convive con entradas automáticas por WhatsApp Bot, sincronización bancaria (mock) y OCR de tickets.
- Doble impacto: se calculan equivalencias de CO2 y pueden dispararse consejos de movilidad (ej. transporte público vs ride-hailing) mediante notificaciones.
- Contexto urbano: los avisos de presupuesto pueden considerar eventos de ciudad (picos de transporte, festividades) para recomendaciones más útiles.
- Privacidad: los datos urbanos (promedios de zona, líneas de transporte) se usan solo para enriquecer sugerencias y nunca exponen información personal.

### Mejoras v2 sugeridas
- Enviar `event_type` en metadatos del gasto (opcional) para correlacionar con patrones urbanos.
- Registrar `source` del gasto (`manual|whatsapp|bank_sync|ocr`) para analítica de fricción.
- Añadir `carbon_equivalences` con más unidades (kWh, km auto, árboles) y comparativa vs promedio urbano.

## Alineación Spendly v3 — Integración MX y datos urbanos

- `source` extendido: incluir `mx_aggregation` para gastos provenientes de sincronización bancaria real (MX).
- Enriquecimiento: si hay datos de ubicación, discretizar a cuadrículas (500m) y usar rangos de monto para proteger privacidad en recolección urbana.
- Consentimiento: sólo se recolectan datos urbanos (movilidad/comercial) si el usuario tiene opt-in activo.
- CivicPoints: registrar acciones `mobility_share` o `commercial_share` para otorgar puntos al usuario.

### Mejoras v3 sugeridas
- Adjuntar `locationGrid` y `amountRange` en metadatos (cuando aplique).
- Integrar pipeline de enriquecimiento (categoría + CO2) previo a inserción desde MX.
- Sincronizar con `urban-data/*` para aportar a analytics agregados (opt-in).