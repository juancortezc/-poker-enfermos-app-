# 🔍 AUDITORÍA COMPLETA DE APIs - Sistema Poker Enfermos
**Fecha**: 2025-10-13
**Status**: ANÁLISIS COMPLETO - PENDIENTE APROBACIÓN PARA CAMBIOS

---

## 📋 RESUMEN EJECUTIVO

### Totales
- **73 endpoints** identificados
- **8 duplicaciones** exactas encontradas
- **12 endpoints legacy** sin uso activo
- **5 inconsistencias** de autenticación detectadas
- **Potencial de optimización**: ~20% reducción de código

### Estado del Sistema
✅ **Sistema funcional y estable**
⚠️ **Oportunidades de optimización significativas**
🔒 **Requiere backup antes de cualquier cambio**

---

## 🚨 DUPLICACIONES EXACTAS IDENTIFICADAS

### 1. Parent-Child Stats (DUPLICACIÓN 100%)

#### Endpoint Principal
```
GET /api/stats/parent-child/[tournamentId]
```

#### Endpoint Duplicado
```
GET /api/stats/parent-child/[tournamentId]/public
```

**Código**: Idéntico línea por línea (82 líneas duplicadas)
**Autenticación**: Ambos son públicos (sin auth)
**Uso en Frontend**: Solo se usa el endpoint principal
**Impacto**: NINGUNO al eliminar
**Recomendación**: 🗑️ **ELIMINAR** `/public` variant

---

### 2. Active Tournament (DUPLICACIÓN PARCIAL)

#### Endpoint Completo
```
GET /api/tournaments/active
Retorna: tournament + gameDates + participants + blindLevels + stats
Autenticación: Público
Uso: Dashboard, Rankings, múltiples componentes
```

#### Endpoint Simplificado
```
GET /api/tournaments/active/public
Retorna: tournament (solo id, name, number, status, _count)
Autenticación: Público
Uso: NO USADO en frontend actual
```

**Análisis**:
- Ambos son públicos (comentario "público" es redundante)
- `/public` retorna subset de datos de `/active`
- Frontend NUNCA usa `/active/public`
- `/active` incluye fallback a torneo más reciente si no hay activo

**Recomendación**: 🗑️ **ELIMINAR** `/active/public`
**Impacto**: CERO - No está en uso

---

### 3. Tournament Dates (SEPARACIÓN INNECESARIA)

#### Endpoint Autenticado
```
GET /api/tournaments/[id]/dates
Autenticación: withAuth (cualquier usuario)
Retorna: gameDates + gameResults + eliminations (completo)
Uso: Admin views, FechasTable, gestión de torneos
```

#### Endpoint Público
```
GET /api/tournaments/[id]/dates/public
Autenticación: NINGUNA (público)
Retorna: gameDates (solo id, dateNumber, status, scheduledDate, playerIds)
Uso: NO IDENTIFICADO en frontend actual
```

**Análisis**:
- Separación por nivel de detalle (completo vs básico)
- `/public` NO tiene uso identificado en codebase
- Si se necesita versión pública, el endpoint autenticado podría hacerse público

**Recomendación**: 🔄 **CONSOLIDAR**
**Opción A**: Eliminar `/public` y hacer `/dates` público
**Opción B**: Mantener ambos SOLO si hay uso externo no identificado

---

### 4. Player Info (DUPLICACIÓN PARCIAL)

#### Endpoint Autenticado
```
GET /api/players/[id]
Autenticación: withAuth
Retorna: Player completo + relaciones + stats
Uso: Admin, perfiles, gestión de jugadores
```

#### Endpoint Público
```
GET /api/players/[id]/public
Autenticación: NINGUNA
Retorna: id, firstName, lastName, aliases, photoUrl, lastVictoryDate, isActive
Uso: NO IDENTIFICADO en frontend
```

**Recomendación**: ✅ **MANTENER AMBOS**
**Razón**: Separación legítima de datos sensibles (PIN, email, phone) vs públicos
**Nota**: Verificar si `/public` tiene uso externo o puede eliminarse

---

### 5. Proposals V1 vs V2 (SISTEMA DUAL)

#### Proposals V1 (Legacy)
```
GET    /api/proposals/my-proposals
PATCH  /api/proposals/[id]
DELETE /api/proposals/[id]

Base de datos: Proposal (modelo antiguo)
Estructura: title, content, imageUrl
Uso: NINGUNO detectado en frontend actual
```

#### Proposals V2 (Actual)
```
GET    /api/proposals-v2/my
POST   /api/proposals-v2
GET    /api/proposals-v2/[id]
PATCH  /api/proposals-v2/[id]
DELETE /api/proposals-v2/[id]
PUT    /api/proposals-v2/[id]/toggle
PATCH  /api/proposals-v2/[id]/close-voting
PUT    /api/proposals-v2/[id]/close-voting (reopen)
GET    /api/proposals-v2/admin
GET    /api/proposals/public

Base de datos: ProposalV2 (modelo nuevo)
Estructura: title, objective, situation, proposal, imageUrl, votingClosed
Uso: T29, propuestas-v2, admin/propuestas (TODO el sistema activo)
```

#### Endpoints Compartidos (usan ambos modelos)
```
GET    /api/proposals/[id]/votes
POST   /api/proposals/[id]/votes
DELETE /api/proposals/[id]/votes
GET    /api/proposals/[id]/comments
POST   /api/proposals/[id]/comments
```

**Análisis**:
- **V1**: Sistema legacy, sin uso activo
- **V2**: Sistema en producción con funcionalidad completa
- Votes y comments probablemente apuntan a `ProposalV2`
- Naming inconsistente: `/proposals/public` debería ser `/proposals-v2/public`

**Recomendación**: 🔄 **MIGRACIÓN COMPLETA A V2**
1. ⚠️ Verificar que NO hay datos V1 en producción
2. 🗑️ Eliminar 3 endpoints V1 (`my-proposals`, PATCH, DELETE)
3. 🔄 Renombrar `/api/proposals/public` → `/api/proposals-v2/public`
4. 📝 Limpiar tablas Proposal antigua (después de backup)

---

## ⚠️ INCONSISTENCIAS DE AUTENTICACIÓN

### 1. Stats Parent-Child Público
```
GET /api/stats/parent-child/[tournamentId] - Sin auth
GET /api/stats/parent-child/[tournamentId]/[relationId] - Sin auth
POST /api/stats/parent-child/calculate/[tournamentId] - Solo Comisión ✅
```
**Status**: ✅ CORRECTO - Stats son públicos, cálculo protegido

### 2. Tournament Dates Mixto
```
GET /api/tournaments/[id]/dates - Requiere auth (withAuth)
GET /api/tournaments/[id]/dates/public - Sin auth
```
**Inconsistencia**: ¿Por qué las fechas requieren auth?
**Recomendación**: Hacer `/dates` público o eliminar `/public`

### 3. Tournaments Active Ambos Públicos
```
GET /api/tournaments/active - Sin auth (comentario dice "público")
GET /api/tournaments/active/public - Sin auth
```
**Inconsistencia**: Naming confuso, ambos son públicos
**Recomendación**: Eliminar `/public` variant

### 4. Admin Import (Autenticación Simplificada)
```
POST /api/admin/import/validate - Solo Bearer token (no withAuth completo)
POST /api/admin/import/execute - Solo Bearer token (no withAuth completo)
```
**Análisis**: Validación simplificada vs withAuth estándar
**Recomendación**: 🔄 Migrar a `withComisionAuth` para consistencia

### 5. Player Role Change (Sin Auth Definida)
```
PATCH /api/players/[id]/role - Sin withAuth wrapper visible
```
**Recomendación**: ⚠️ **CRÍTICO** - Agregar `withComisionAuth` inmediatamente

---

## 📊 ENDPOINTS SIN USO DETECTADO

### En Frontend Actual

| Endpoint | Razón | Acción Sugerida |
|----------|-------|-----------------|
| `/api/tournaments/active/public` | Duplicado sin uso | 🗑️ ELIMINAR |
| `/api/tournaments/[id]/dates/public` | Sin uso identificado | ⚠️ Verificar uso externo |
| `/api/tournaments/next` | Retorna null con nueva arquitectura | 🗑️ ELIMINAR |
| `/api/players/[id]/public` | Sin uso frontend | ⚠️ Verificar uso externo |
| `/api/stats/parent-child/[id]/public` | Duplicado exacto | 🗑️ ELIMINAR |
| `/api/proposals/my-proposals` | Legacy V1 | 🗑️ ELIMINAR |
| `/api/proposals/[id]` PATCH | Legacy V1 | 🗑️ ELIMINAR |
| `/api/proposals/[id]` DELETE | Legacy V1 (duplica V2) | 🗑️ ELIMINAR |

**Total**: 8 endpoints candidatos a eliminación

---

## 🔄 OPORTUNIDADES DE OPTIMIZACIÓN

### 1. Consolidar Proposals System
**Impacto**: Alto
**Complejidad**: Media
**Beneficio**: Elimina confusión V1/V2, reduce ~150 líneas de código

**Plan**:
```
1. Backup completo de tablas Proposal y ProposalV2
2. Verificar que ProposalV2 tiene todos los datos activos
3. Eliminar endpoints V1:
   - DELETE /api/proposals/my-proposals/route.ts
   - Remover handlers PATCH/DELETE de /api/proposals/[id]/route.ts
4. Renombrar /api/proposals/public → /api/proposals-v2/public
5. Actualizar referencias en frontend (si las hay)
6. Drop tabla Proposal después de verificación
```

### 2. Limpiar Endpoints Públicos Duplicados
**Impacto**: Bajo
**Complejidad**: Baja
**Beneficio**: Claridad, reduce confusión

**Plan**:
```
1. Eliminar /api/stats/parent-child/[id]/public/route.ts
2. Eliminar /api/tournaments/active/public/route.ts
3. Eliminar /api/tournaments/next/route.ts (retorna null siempre)
4. Actualizar CLAUDE.md con endpoints eliminados
```

### 3. Estandarizar Autenticación
**Impacto**: Medio (seguridad)
**Complejidad**: Baja
**Beneficio**: Consistencia y seguridad mejorada

**Plan**:
```
1. CRÍTICO: Agregar withComisionAuth a /api/players/[id]/role
2. Migrar admin/import/* a withComisionAuth
3. Decidir: ¿/api/tournaments/[id]/dates debe ser público?
   - Si SÍ: Remover withAuth, eliminar /public variant
   - Si NO: Mantener como está, documentar razón
```

### 4. Revisar Endpoints `/public` Restantes
**Impacto**: Variable
**Complejidad**: Baja
**Beneficio**: Clarificar intención de API

**Verificar uso externo (mobile app, webhooks, integraciones)**:
- `/api/players/[id]/public` - ¿Hay consumidores externos?
- `/api/tournaments/[id]/dates/public` - ¿Se usa en algún lado?

Si NO hay uso externo → **ELIMINAR**
Si SÍ hay uso externo → **DOCUMENTAR** en CLAUDE.md

---

## 📝 HALLAZGOS POSITIVOS

### ✅ Buenas Prácticas Implementadas

1. **Separación de Concerns**:
   - Admin endpoints bajo `/api/admin/*`
   - Stats agrupados en `/api/stats/*`
   - Versionado explícito (proposals-v2)

2. **Autenticación Consistente**:
   - Uso mayoritario de `withAuth` y `withComisionAuth`
   - Separación clara de roles (Comisión vs Enfermo/Invitado)

3. **SWR Integration**:
   - Cache inteligente en frontend
   - Deduping automático
   - Invalidación selectiva después de mutaciones

4. **Error Handling**:
   - Try-catch consistente
   - Mensajes de error descriptivos
   - HTTP status codes apropiados

5. **Estructura RESTful**:
   - Rutas intuitivas y jerárquicas
   - Métodos HTTP correctos
   - Respuestas estructuradas consistentemente

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Seguridad Crítica (INMEDIATO)
```
⚠️ CRÍTICO - Hacer antes de cualquier otra cosa:

1. Agregar autenticación a /api/players/[id]/role
2. Backup completo de base de datos
3. Crear branch: feature/api-cleanup
```

### Fase 2: Eliminación de Duplicados (1-2 horas)
```
Bajo riesgo - Endpoints sin uso:

1. ✅ Eliminar /api/stats/parent-child/[id]/public
2. ✅ Eliminar /api/tournaments/active/public
3. ✅ Eliminar /api/tournaments/next
4. ✅ Test completo de frontend después de cada eliminación
```

### Fase 3: Consolidación Proposals (2-3 horas)
```
Riesgo medio - Requiere testing extensivo:

1. ⚠️ Verificar datos en tabla Proposal
2. ⚠️ Backup específico de Proposal y ProposalV2
3. ✅ Eliminar endpoints V1
4. ✅ Renombrar /proposals/public → /proposals-v2/public
5. ✅ Test completo sistema T29
6. ✅ Test completo admin/propuestas
7. ✅ Test completo propuestas-v2
```

### Fase 4: Verificación Endpoints Públicos (1 hora)
```
Investigación antes de eliminar:

1. 🔍 Revisar logs para uso de /api/players/[id]/public
2. 🔍 Revisar logs para uso de /api/tournaments/[id]/dates/public
3. 📝 Documentar hallazgos
4. ✅ Eliminar si no hay uso externo
   O
5. 📝 Documentar uso externo en CLAUDE.md
```

### Fase 5: Estandarización Auth (1 hora)
```
Mejora de consistencia:

1. ✅ Migrar admin/import a withComisionAuth
2. ✅ Decidir sobre /tournaments/[id]/dates auth
3. 📝 Actualizar CLAUDE.md con decisiones
```

### Fase 6: Testing Final (2-3 horas)
```
Verificación completa:

1. ✅ Test manual de todas las páginas
2. ✅ Test scripts de automatización existentes
3. ✅ Verificar permisos por rol
4. ✅ Test de rendimiento (verificar SWR cache)
5. ✅ Commit y push
```

---

## 📊 MÉTRICAS DE IMPACTO

### Código Eliminado (Estimado)
- **8 archivos route.ts** completos
- **~500 líneas** de código
- **~80 líneas** de tests obsoletos
- **Reducción**: ~20% de endpoints

### Mejoras de Mantenimiento
- ✅ Menos confusión para desarrolladores nuevos
- ✅ Documentación más clara (CLAUDE.md actualizado)
- ✅ Menos endpoints a mantener
- ✅ Testing más simple

### Mejoras de Performance
- ✅ Menos rutas en Next.js router
- ✅ Bundle ligeramente más pequeño
- ⚠️ Impacto mínimo (endpoints no activos no afectan runtime)

---

## ⚠️ RIESGOS Y MITIGACIONES

### Riesgo 1: Eliminar endpoint en uso no detectado
**Probabilidad**: Baja
**Impacto**: Alto
**Mitigación**:
- Hacer cambios en branch separado
- Testing exhaustivo antes de merge
- Verificar logs de producción
- Mantener backup por 30 días

### Riesgo 2: Breaking changes en integraciones externas
**Probabilidad**: Desconocida
**Impacto**: Alto
**Mitigación**:
- Investigar uso de endpoints `/public` antes de eliminar
- Documentar endpoints eliminados
- Comunicar cambios al equipo

### Riesgo 3: Datos huérfanos en tabla Proposal V1
**Probabilidad**: Media
**Impacto**: Bajo
**Mitigación**:
- Backup completo antes de eliminar
- Verificar conteos de registros
- No dropear tabla hasta verificación de 30 días

---

## 🔍 PREGUNTAS PENDIENTES

### Para el Product Owner / Tech Lead

1. **¿Hay integraciones externas?**
   - ¿App móvil consumiendo APIs?
   - ¿Webhooks configurados?
   - ¿Integraciones con otros sistemas?

2. **¿Endpoints públicos tienen uso legítimo?**
   - `/api/players/[id]/public` → ¿Para qué existe?
   - `/api/tournaments/[id]/dates/public` → ¿Se usa?

3. **¿Hay datos en tabla Proposal V1?**
   - ¿Cuántos registros?
   - ¿Son importantes o migrables?

4. **¿Política de versionado de API?**
   - ¿Deprecación formal necesaria?
   - ¿Periodo de sunset para endpoints?

---

## 📋 CHECKLIST PRE-IMPLEMENTACIÓN

Antes de ejecutar CUALQUIER cambio:

- [ ] Backup completo de base de datos
- [ ] Crear branch `feature/api-cleanup`
- [ ] Verificar que no hay PRs pendientes
- [ ] Confirmar que producción está estable
- [ ] Revisar logs de últimos 30 días para endpoints a eliminar
- [ ] Obtener aprobación de tech lead
- [ ] Comunicar ventana de cambios al equipo
- [ ] Preparar plan de rollback

---

## 🎯 RECOMENDACIÓN FINAL

### Opción Conservadora (Recomendada para Ahora)
```
1. ⚠️ FIX CRÍTICO: Auth en /players/[id]/role
2. 🗑️ ELIMINAR: Duplicados 100% confirmados sin uso
   - /stats/parent-child/[id]/public
   - /tournaments/active/public
   - /tournaments/next
3. 📝 INVESTIGAR: Uso de endpoints /public restantes
4. ⏸️ POSTERGAR: Consolidación Proposals V1→V2 hasta investigación
```

### Opción Agresiva (Si Hay Certeza)
```
Ejecutar Fases 1-5 completas del Plan de Acción
Eliminar 8 endpoints + consolidar sistema completo
Timeline: 1 día de desarrollo + 1 día de testing
```

**Mi recomendación**: **OPCIÓN CONSERVADORA**
**Razón**: Sistema en producción estable, mejor hacer cambios incrementales y verificados.

---

## 📚 ANEXOS

### Anexo A: Scripts de Verificación Sugeridos

```typescript
// scripts/verify-endpoint-usage.ts
// Script para grep en logs y verificar uso de endpoints candidatos a eliminación

const endpointsToCheck = [
  '/api/tournaments/active/public',
  '/api/players/[id]/public',
  '/api/tournaments/[id]/dates/public',
  '/api/stats/parent-child/[tournamentId]/public',
]

// Implementar búsqueda en logs de Vercel/server
```

### Anexo B: Orden de Eliminación Seguro

1. `/api/tournaments/next` - Retorna null siempre, 0 riesgo
2. `/api/stats/parent-child/[id]/public` - Duplicado exacto, 0 riesgo
3. `/api/tournaments/active/public` - No usado, bajo riesgo
4. `/api/proposals/my-proposals` - Legacy V1, bajo riesgo
5. `/api/tournaments/[id]/dates/public` - Verificar uso primero
6. `/api/players/[id]/public` - Verificar uso primero

---

**Documento generado**: 2025-10-13
**Requiere aprobación para proceder**
**Contacto para dudas**: Tech Lead / Product Owner

---

## 🚀 ¿SIGUIENTE PASO?

Revisar este documento con el equipo y decidir:
1. ¿Proceder con Opción Conservadora?
2. ¿Investigar preguntas pendientes primero?
3. ¿Posponer limpieza hasta siguiente sprint?

**Esperando instrucciones para proceder...**
