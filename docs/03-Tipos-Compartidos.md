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

## Extensiones v2 — Tipos para Ciudad Inteligente y Sostenibilidad

```typescript
// Sugeridos para enriquecer respuestas (documentación, opcional en implementación)
export interface CityMetric {
  zone?: string;          // Zona/vecindario (opt-in)
  cityAverage?: number;   // Promedio urbano para comparativas
  trend?: 'up'|'down'|'flat';
}

export interface SustainabilityScore {
  co2Kg: number;
  equivalences?: { trees?: number; carKm?: number; electricity?: number; flights?: number };
}

export interface SmartNotification {
  type: 'alert'|'suggestion'|'achievement'|'reminder';
  title: string;
  message: string;
  priority?: 'low'|'medium'|'high';
  createdAt: string;
  meta?: Record<string, any>;
}

export interface TransportPattern {
  byDay: { day: string; count: number; amount: number }[];
  byHour: { hour: number; count: number; amount: number }[];
  byType: { type: string; count: number; amount: number }[];
}

export interface ProjectionSummary {
  estimatedTotal: number;
  lastMonthTotal: number;
  percentChange: number;
  spendingPace: 'on_track'|'slowing'|'fast';
  co2Estimated?: number;
  cityMetric?: CityMetric;
}
```

## Extensiones v3 — Tipos para MX, Urban Data y CivicPoints

```typescript
export interface MXWidgetInfo {
  url: string;
  expiresAt: string;
}

export interface ConsentPreferences {
  mobility_data?: boolean;
  commercial_data?: boolean;
  energy_data?: boolean;
}

export interface UrbanMobilityRecord {
  timestamp: string;
  transportType: string; // rideshare | public | bike
  amountRange: string;   // 0-50, 50-100, etc.
  originGrid?: { gridLat: number; gridLng: number };
  destinationGrid?: { gridLat: number; gridLng: number };
  timeOfDay: string;     // 06:00-09:00, etc.
  dayOfWeek: number;     // 0..6
}

export interface UrbanCommercialRecord {
  timestamp: string;
  category: string;
  subcategory?: string;
  amountRange: string;
  merchantType?: string;
  neighborhood?: string;
  timeOfDay: string;
}

export interface UrbanEnergyRecord {
  timestamp: string;
  consumptionKwh: number;
  neighborhood?: string;
  housingType?: string;
}

export interface UrbanAnalyticsResponse {
  zone: string;
  metrics: Record<string, any>;
  heatmap?: any;
}

export interface CivicPointsBalance {
  userId: string;
  balance: number;
  level: number;
}

export interface BenefitItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  provider: string;
  category: string;
}

export interface Voucher {
  code: string;
  benefitId: string;
  issuedAt: string;
  expiresAt?: string;
}
```