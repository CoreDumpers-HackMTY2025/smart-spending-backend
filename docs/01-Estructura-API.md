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

## Extensiones v2 — Integraciones y Servicios Urbanos (planificado)

Para la visión Spendly v2 se contemplan módulos adicionales enfocados en sostenibilidad y conexión con la ciudad. Estos endpoints pueden vivir en módulos dedicados y activarse según el despliegue:

```
backend/api/
├── integrations/
│   ├── bank/sync/route.ts           # Sincronización bancaria (mock/demo)
│   ├── whatsapp/webhook/route.ts    # Webhook de WhatsApp Bot
│   └── ocr/scan/route.ts            # OCR de tickets
├── insights/
│   ├── mobility/route.ts            # Patrones de movilidad y sugerencias
│   └── sustainability/route.ts      # Métricas de huella y equivalencias
```

Notas:
- Integraciones pueden usar colas/eventos internos para mantener procesos no bloqueantes.
- Los endpoints de `insights` agregan datos por usuario y zona (opt-in) respetando privacidad.
- La ruta de `transport/heatmap` se puede enriquecer con datos abiertos (horarios, líneas, paradas).

## Extensiones v3 — Urban Data Hub, MX y CivicPoints (planificado)

Para la versión 3.0 se agregan módulos orientados a economía de datos urbanos y conexión bancaria real:

```
backend/api/
├── mx/
│   ├── connect-widget/route.ts      # Genera URL del widget de MX
│   ├── sync/route.ts                # Sincroniza transacciones vía MX
│   └── accounts/verify/route.ts     # Verificación instantánea (IAV)
├── urban-data/
│   ├── mobility/route.ts            # Recolección anónima de movilidad (opt-in)
│   ├── commercial/route.ts          # Actividad comercial discretizada (opt-in)
│   └── energy/route.ts              # Consumo energético agregado (opt-in)
├── analytics/
│   ├── mobility/route.ts            # Analytics agregados por zona/hora
│   ├── commercial/route.ts          # Tendencias de consumo por categoría
│   └── energy/route.ts              # Demanda, emisiones y ahorro potencial
├── civic-points/
│   ├── earn/route.ts                # Acreditación de puntos por acciones
│   ├── balance/route.ts             # Consultar saldo de CivicPoints
│   └── redeem/route.ts              # Canje de beneficios y vouchers
```

Notas v3:
- Todos los endpoints de `urban-data/*` requieren consentimiento y anonimizan usuario/ubicación.
- `mx/*` expone conectividad real a cuentas y transacciones, con seguridad reforzada.
- `analytics/*` son APIs B2B/B2G orientadas a paneles y toma de decisiones.
- `civic-points/*` habilita el sistema de incentivos ciudadano.