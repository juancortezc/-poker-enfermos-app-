# Deuda Técnica - Poker Enfermos

Documento que registra la deuda técnica identificada y el plan para abordarla.

## Estado: En proceso de migración a Arquitectura Hexagonal

Ver plan completo en: `~/.claude/plans/woolly-drifting-axolotl.md`

---

## Deuda Crítica

### 1. `typescript.ignoreBuildErrors = true`
**Archivo**: `next.config.ts`
**Impacto**: Alto - Oculta errores de TypeScript en producción
**Estado**: Pendiente
**Acción**: Desactivar y corregir todos los errores TypeScript

### 2. Lógica de negocio en API routes
**Ubicación**: `src/app/api/*`
**Impacto**: Alto - Testing difícil, código acoplado
**Estado**: En proceso (Fase 1 del plan hexagonal)
**Acción**: Extraer a capa de aplicación con use cases

### 3. Acoplamiento directo a Prisma
**Ubicación**: Todo el código
**Impacto**: Medio - Sin abstracción de persistencia
**Estado**: En proceso (Fase 1 del plan hexagonal)
**Acción**: Crear repositorios como puertos de salida

---

## Deuda Media

### 4. Duplicación V1/V2 de Propuestas
**Archivos**:
- `prisma/schema.prisma` (Proposal y ProposalV2)
- `src/app/api/proposals/*` y `src/app/api/proposals-v2/*`
**Impacto**: Medio - Código duplicado, confusión
**Estado**: Pendiente
**Acción**: Deprecar V1 completamente, eliminar código legacy

### 5. Rutas huérfanas
**Ubicación**:
- `/game-dates/new` (no usada, se usa `/game-dates/config`)
- `/mis-propuestas` (duplica `/propuestas-v2`)
**Impacto**: Bajo - Confusión en routing
**Estado**: Pendiente
**Acción**: Eliminar o redirigir rutas no usadas

### 6. Magic numbers parcialmente centralizados
**Ubicación**: `src/lib/ranking-utils.ts`, `src/lib/tournament-utils.ts`
**Impacto**: Bajo - Ya documentados pero no usando constantes
**Estado**: Parcialmente resuelto
**Acción**: Migrar a usar `src/lib/constants/scoring.ts`

---

## Deuda Resuelta (Fase 0)

### ✅ Archivos sueltos en raíz
**Fecha**: 2025-01-07
**Acción**: Organizados en `data/imports/`, `docs/screenshots/`, `docs/pdfs/`

### ✅ Scripts sin organizar (201 archivos)
**Fecha**: 2025-01-07
**Acción**: Reorganizados en `scripts/active/` y `scripts/archive/`

### ✅ Constantes de puntuación
**Fecha**: 2025-01-07
**Acción**: Creado `src/lib/constants/scoring.ts`

---

## Próximos Pasos

1. **Fase 1**: Migrar bounded context "Elimination" a arquitectura hexagonal
2. **Fase 2**: Migrar bounded context "Ranking"
3. **Fase 3**: Migrar bounded context "Tournament"
4. Continuar según plan en `woolly-drifting-axolotl.md`
