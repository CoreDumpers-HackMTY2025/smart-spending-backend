# Documentación de la API y MCP

Esta carpeta organiza el contenido del documento original en subdocumentos temáticos, separando claramente la API REST y la integración con el servidor MCP.

## Índice

- [00 — Introducción](./00-Introduccion.md)
- [01 — Estructura de la API](./01-Estructura-API.md)
- [02 — Middleware de Autenticación](./02-Middleware-Autenticacion.md)
- [03 — Tipos Compartidos](./03-Tipos-Compartidos.md)
- [04 — Expenses: POST /api/expenses](./04-Expenses-POST.md)
- [05 — Expenses: GET /api/expenses](./05-Expenses-GET.md)
- [06 — Expenses: Gastos Recurrentes](./06-Expenses-Recurrentes.md)
- [07 — Dashboard: Proyección del Mes](./07-Dashboard-Proyeccion.md)
- [08 — Transport: Mapa de Calor](./08-Transport-Heatmap.md)
- [09 — Gamification: Achievements](./09-Gamification-Achievements.md)
- [10 — Gamification: Check](./10-Gamification-Check.md)
- [11 — Gamification: Leaderboard](./11-Gamification-Leaderboard.md)
- [12 — Notifications](./12-Notifications.md)
- [13 — Chat: Integración con MCP](./13-Chat-MCP-Integracion.md)
- [14 — Recommendations: Generate](./14-Recommendations-Generate.md)
- [15 — Resumen de API](./15-Resumen-API.md)
- [16 — Features Implementadas](./16-Features-Implementadas.md)

## Alcance

- API REST en `backend/api/*` con módulos: auth, profile, expenses, incomes, categories, budgets, savings-goals, dashboard, carbon, recommendations, transport, gamification, notifications, chat.
- Integración MCP y OpenAI para el chat y herramientas del servidor MCP.

## Convenciones

- Respuestas: `ApiResponse` y `PaginatedResponse`.
- Autenticación: Header `Authorization: Bearer <token>` (Supabase).
- Validación: Zod en endpoints de creación/actualización.
- Errores: Respuestas JSON con `success: false` y `error` descriptivo.