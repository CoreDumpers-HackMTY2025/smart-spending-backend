# Tipos Compartidos

Ubicación: `backend/api/types/index.ts`

## Interfaces

### ApiResponse<T>
- `success: boolean`
- `data?: T`
- `error?: string`
- `message?: string`

### PaginatedResponse<T>
- `data: T[]`
- `pagination: { page, limit, total, totalPages }`

### ValidationError
- `field: string`
- `message: string`

## Uso

- Unificar la forma de respuesta de la API.
- Facilitar manejo de paginación y mensajes.
- Integración con validadores como Zod para mapear errores a `ValidationError[]`.

## Código

```typescript
// backend/api/types/index.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}
```