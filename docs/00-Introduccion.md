# Introducción

Este conjunto de documentos divide y explica las distintas fases y módulos de la API REST y la integración con el servidor MCP, basados en el documento "Actualización Completa de la API REST".

## Objetivos

- Centralizar y clarificar el comportamiento de cada endpoint.
- Separar responsabilidades por módulo.
- Documentar la integración MCP/OpenAI para el chat.
- Ofrecer una vista resumida y navegable por secciones.

## Alcance

- API REST en Next.js (rutas en `backend/api/*`).
- Autenticación y autorización con Supabase.
- Lógica de negocio: gastos, presupuestos, gamificación, notificaciones.
- IA/MCP: generación de recomendaciones y chat con herramientas.

## Variables de entorno clave

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_API_URL`
- `OPENAI_API_KEY`
- `MCP_SERVER_PATH` (opcional)

## Convenciones de respuesta

- `ApiResponse<T>`: `success`, `data`, `error`, `message`.
- `PaginatedResponse<T>`: `data`, `pagination` con `page`, `limit`, `total`, `totalPages`.
- Validación con Zod en creación/edición de recursos.