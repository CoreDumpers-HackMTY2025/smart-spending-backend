# Middleware de Autenticación

Ubicación: `backend/api/middleware/auth.ts`

## Rol

- Valida el `Authorization: Bearer <token>`.
- Verifica el usuario mediante Supabase (`supabase.auth.getUser(token)`).
- Rechaza solicitudes no autorizadas con 401.
- Maneja errores internos con 500.

## Uso

El helper `withAuth(request, handler)` envuelve handlers de rutas.

- Extrae y valida el token.
- Obtiene `user.id` y lo pasa al `handler`.
- Retorna el resultado del `handler` o un error JSON.

## Errores comunes

- Token faltante o formato incorrecto: 401 `No autorizado - Token faltante`.
- Token inválido o usuario inexistente: 401 `No autorizado - Token inválido`.
- Excepción en proceso de auth: 500 `Error de autenticación`.

## Dependencias

- `@supabase/supabase-js`
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Código

```typescript
// backend/api/middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  try {
    // Obtener token del header Authorization
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado - Token faltante' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { error: 'No autorizado - Token inválido' },
        { status: 401 }
      );
    }

    // Ejecutar handler con userId
    return await handler(request, user.id);

  } catch (error) {
    console.error('Error en middleware auth:', error);
    return NextResponse.json(
      { error: 'Error de autenticación' },
      { status: 500 }
    );
  }
}
```