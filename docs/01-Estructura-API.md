# Estructura de la API

Árbol de carpetas actualizado para los módulos y rutas.

```
backend/api/
├── auth/
│   ├── login/route.ts
│   ├── register/route.ts
│   └── logout/route.ts
├── profile/
│   ├── route.ts
│   └── stats/route.ts
├── expenses/
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── bulk/route.ts
│   ├── export/route.ts
│   └── recurring/route.ts          # NUEVO
├── incomes/
│   ├── route.ts
│   └── [id]/route.ts
├── categories/
│   ├── route.ts
│   └── [id]/subcategories/route.ts
├── budgets/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── current/route.ts
├── savings-goals/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── [id]/contribute/route.ts
├── dashboard/
│   ├── overview/route.ts
│   ├── analytics/route.ts
│   ├── projection/route.ts         # NUEVO
│   └── trends/route.ts
├── carbon/
│   ├── footprint/route.ts
│   ├── breakdown/route.ts
│   └── compare/route.ts
├── recommendations/
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── [id]/apply/route.ts
│   └── generate/route.ts           # NUEVO
├── transport/
│   ├── compare/route.ts
│   ├── history/route.ts
│   └── heatmap/route.ts            # NUEVO
├── gamification/
│   ├── achievements/route.ts       # NUEVO
│   ├── check/route.ts              # NUEVO
│   └── leaderboard/route.ts        # NUEVO
├── notifications/
│   └── route.ts                    # NUEVO
└── chat/
    └── route.ts
```