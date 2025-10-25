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

## Visión v2.0 — Spendly Ciudad Inteligente

La documentación se actualiza para alinearse con la versión 2.0 (Spendly — Frictionless Smart Spending), poniendo foco en sostenibilidad y conexión con ciudades inteligentes.

### Pilares v2
- Recopilación invisible: integración bancaria simulada, WhatsApp Bot y OCR para tickets.
- Doble impacto: cada gasto muestra efecto financiero y ambiental (CO2, equivalencias).
- IA proactiva: recomendaciones y alertas contextuales en el momento justo.
- Integración urbana: uso de datos abiertos (movilidad, calidad del aire, transporte público) para enriquecer decisiones.

### Conexión con la ciudad
- Movilidad: heatmaps y patrones de transporte cruzados con horarios y rutas públicas.
- Medio ambiente: comparativas de huella vs promedio urbano y metas de reducción.
- Notificaciones inteligentes: recordatorios según rutina urbana y eventos locales.
- KPIs urbanos: métricas agregadas por zona/vecindario (opt-in) y participación ciudadana.

### Componentes clave nuevos o extendidos
- Integraciones: `webhook/whatsapp`, `sync/bank` (mock), `ocr/scan`.
- Motor de recomendaciones IA con foco `savings|eco|transport|health` y contexto urbano.
- Gamificación con logros de sostenibilidad y retos de movilidad.

### Principios de sostenibilidad
- Transparencia automática del impacto ambiental.
- Incentivos para alternativas más limpias (transporte público, bicicleta, meal-prep).
- Compatibilidad con metas personales y comunitarias.

## Visión v3.0 — Urban Data Economy Platform

Spendly evoluciona a una plataforma de economía de datos urbanos que integra conexión bancaria real con **MX Platform**, consentimiento granular y un **Urban Data Hub** para transformar datos financieros y de movilidad en valor económico y social.

### Propuesta de valor triple
- Ciudadanos: finanzas automáticas + recompensas (CivicPoints) por compartir datos anónimos.
- Empresas: acceso a paneles y APIs de datos agregados por zona/hora para optimizar operaciones.
- Gobiernos: dashboard urbano para políticas basadas en evidencia e identificación de zonas de incentivo.

### Arquitectura v3 (tres capas)
- Capa de recopilación: conexión bancaria real (MX), WhatsApp, OCR, sensores IoT (opt-in).
- Urban Data Hub: agregación, anonimización y analytics (movilidad, actividad comercial, energía).
- Incentivos: sistema de CivicPoints, catálogo de beneficios y vouchers con trazabilidad.

### Privacidad y ética
- Consentimiento explícito y revocable por tipo de dato.
- Anonimización (hash de usuario, cuadrículas de ubicación), discretización de montos.
- Auditoría y transparencia del uso de datos, alineado a mejores prácticas (GDPR-like).