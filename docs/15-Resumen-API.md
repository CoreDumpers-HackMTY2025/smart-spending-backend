# Resumen de API REST Actualizada

## Total de Endpoints

- Total: 53 endpoints

## Por módulo

- Auth: 3
- Profile: 2
- Expenses: 9 (incluye `recurring`)
- Incomes: 4
- Categories: 2
- Budgets: 5
- Savings Goals: 5
- Dashboard: 4 (incluye `projection`)
- Carbon: 3
- Transport: 3 (incluye `heatmap`)
- Recommendations: 4 (incluye `generate`)
- Gamification: 3 (todos nuevos)
- Notifications: 1 (nuevo)
- Chat: 1

## Notas

- Módulos nuevos o extendidos: `recurring`, `projection`, `heatmap`, `generate`, `gamification/*`, `notifications`.
- Todos los endpoints siguen convenciones `ApiResponse` y manejo de errores consistente.

## Extensiones v2 — Plan de expansión para Ciudad Inteligente

- Integraciones (planificado): `integrations/whatsapp/webhook`, `integrations/bank/sync`, `integrations/ocr/scan`.
- Insights (planificado): `insights/mobility`, `insights/sustainability`.
- Objetivo: enriquecer decisiones con datos urbanos (GTFS, promedios de CO2, eventos locales) manteniendo privacidad.
- Prioridad: mantener compatibilidad con los 53 endpoints actuales y añadir campos opcionales para sostenibilidad.

## Extensiones v3 — Urban Data Economy Platform (planificado)

- Conectividad bancaria real (MX): `mx/connect-widget`, `mx/sync`, `mx/accounts/verify`.
- Urban Data Hub: `urban-data/mobility`, `urban-data/commercial`, `urban-data/energy` (opt-in, anónimo).
- Analytics B2B/B2G: `analytics/mobility|commercial|energy` para paneles y decisiones.
- Incentivos: `civic-points/earn|balance|redeem` para recompensas y beneficios.

Notas:
- v3 se construye respetando contratos actuales, agregando capacidades opcionales.
- Todo acceso a datos urbanos requiere consentimiento y anonimización.