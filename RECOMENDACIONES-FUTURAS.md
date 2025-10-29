# 🚀 Recomendaciones Futuras - Poker Enfermos

**Última Auditoría**: 2025-10-29
**Próxima Auditoría Recomendada**: 2025-11-29 (1 mes)

---

## 🎯 Fase 2: Optimizaciones Medias (2-3 horas)

### 1. Verificar y Eliminar Endpoints Dudosos
**Prioridad**: 🟡 Media
**Impacto**: -200 líneas adicionales

```bash
# Endpoints a verificar:
GET  /api/tournaments/[id]        # PUT/DELETE methods
GET  /api/game-dates              # Not called directly?
POST /api/stats/parent-child/calculate/[tournamentId]
GET  /api/notifications/config
GET  /api/notifications/history
GET  /api/players/[id]/role       # GET method
```

**Acción**:
1. Buscar referencias en codebase
2. Verificar logs de producción si están disponibles
3. Eliminar si no se usan en 30+ días

---

### 2. Code Splitting para Admin Routes
**Prioridad**: 🟡 Media
**Impacto**: -50KB bundle principal

**Implementación**:
```typescript
// src/app/admin/layout.tsx
import dynamic from 'next/dynamic'

const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  loading: () => <LoadingState />,
  ssr: false // Admin no necesita SSR
})
```

**Páginas a optimizar**:
- `/admin/stats` (componentes pesados)
- `/admin/import` (solo Comisión)
- `/admin/propuestas` (solo Comisión)

---

### 3. Lazy Load Componentes Pesados
**Prioridad**: 🟡 Media
**Impacto**: -40KB initial bundle

```typescript
// Modals grandes
const PlayerDetailModal = dynamic(() =>
  import('./PlayerDetailModal'), { ssr: false }
)

// Charts
const RankingEvolutionChart = dynamic(() =>
  import('./RankingEvolutionChart'), { ssr: false }
)

// Stats components
const ParentChildDetailModal = dynamic(() =>
  import('./ParentChildDetailModal'), { ssr: false }
)
```

---

### 4. Optimizar Queries Prisma
**Prioridad**: 🟡 Media
**Impacto**: +20-30ms en APIs

**Archivo**: `src/lib/ranking-utils.ts:43-82`
```typescript
// ANTES
include: {
  tournamentParticipants: {
    include: { player: true }  // Trae TODOS los campos
  }
}

// DESPUÉS
include: {
  tournamentParticipants: {
    select: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          role: true
        }
      }
    }
  }
}
```

**Archivos a optimizar**:
- `src/lib/ranking-utils.ts`
- `src/app/api/eliminations/route.ts`
- `src/app/api/game-dates/[id]/route.ts`

---

### 5. Agregar useMemo a Componentes Críticos
**Prioridad**: 🟡 Media
**Impacto**: +30% render performance

**Componente**: `TournamentRankingTable.tsx`
```typescript
// Líneas 65-86: Cálculos sin memo
const sortedRanking = useMemo(() =>
  ranking.sort((a, b) => b.points - a.points),
  [ranking]
)

const positionColors = useMemo(() => ({
  1: 'bg-yellow-400',
  2: 'bg-gray-300',
  3: 'bg-amber-600'
}), [])
```

**Componentes a optimizar**:
- `TournamentRankingTable.tsx`
- `RankingEvolutionChart.tsx`
- `PlayerEliminationsTab.tsx`
- `AwardCard.tsx`

---

### 6. Optimizar SWR Configuration
**Prioridad**: 🟡 Media
**Impacto**: -50% requests duplicados

**Archivo**: `src/lib/swr-config.tsx`
```typescript
// ANTES
dedupingInterval: 5000,
revalidateOnFocus: true,

// DESPUÉS
dedupingInterval: 30000,  // 30 segundos
revalidateOnFocus: false,  // Solo en páginas críticas
revalidateOnMount: true,
```

**Excepciones** (mantener `revalidateOnFocus: true`):
- `/registro` (live updates)
- `/timer` (real-time)
- Dashboard (datos críticos)

---

### 7. Agregar loading="lazy" a Imágenes
**Prioridad**: 🟢 Baja
**Impacto**: +10-20% perceived performance

**Buscar y reemplazar en 21 archivos**:
```typescript
// ANTES
<Image src={...} alt={...} />

// DESPUÉS
<Image src={...} alt={...} loading="lazy" />
```

**Comando**:
```bash
# Buscar imágenes sin lazy loading
grep -r "<Image " src/ --include="*.tsx" | grep -v "loading="
```

---

## 🏗️ Fase 3: Mejoras Arquitecturales (1-2 semanas)

### 1. Service Layer
**Objetivo**: Separar lógica de negocio de API routes

```
src/services/
├── tournament.service.ts
├── player.service.ts
├── elimination.service.ts
└── stats.service.ts
```

**Beneficios**:
- Reutilización de código
- Testing más fácil
- Separación de concerns

---

### 2. Repository Pattern
**Objetivo**: Abstraer Prisma queries

```typescript
// src/repositories/tournament.repository.ts
export class TournamentRepository {
  async findActiveWithDetails() {
    return prisma.tournament.findFirst({
      where: { status: 'ACTIVO' },
      select: { /* solo campos necesarios */ }
    })
  }
}
```

**Beneficios**:
- Queries centralizadas
- Fácil de optimizar
- Mockeable para tests

---

### 3. Unit Tests
**Objetivo**: Cobertura básica de funciones críticas

```bash
npm install -D jest @types/jest ts-jest

# Tests a crear:
src/lib/__tests__/
├── ranking-utils.test.ts
├── tournament-utils.test.ts
├── permissions.test.ts
└── date-utils.test.ts
```

**Prioridad**: 🟡 Media (crítico para estabilidad)

---

### 4. E2E Tests
**Objetivo**: Tests de flujos críticos

```bash
npm install -D @playwright/test

# Tests a crear:
e2e/
├── login.spec.ts
├── create-game-date.spec.ts
├── register-elimination.spec.ts
└── view-ranking.spec.ts
```

**Prioridad**: 🟢 Baja (nice to have)

---

### 5. Error Tracking
**Objetivo**: Monitoreo de errores en producción

**Opción 1: Sentry** (Recomendado)
```bash
npm install @sentry/nextjs
```

**Opción 2: Vercel Error Tracking**
- Ya incluido en plan
- Menor configuración

**Beneficios**:
- Detectar errores antes que usuarios
- Stack traces completos
- Alertas en tiempo real

---

### 6. Performance Monitoring
**Objetivo**: Métricas de performance real

**Herramientas**:
- Vercel Analytics (ya disponible)
- Web Vitals tracking
- Custom metrics para APIs críticas

```typescript
// src/lib/analytics.ts
export function trackAPIPerformance(
  endpoint: string,
  duration: number
) {
  // Log to analytics service
}
```

---

### 7. Database Monitoring
**Objetivo**: Identificar slow queries

**Opciones**:
- Prisma Accelerate (caching layer)
- Supabase built-in monitoring
- Custom logging de queries lentas

```typescript
// prisma/middleware.ts
prisma.$use(async (params, next) => {
  const before = Date.now()
  const result = await next(params)
  const after = Date.now()

  if (after - before > 100) {
    console.warn(`Slow query: ${params.model}.${params.action} (${after - before}ms)`)
  }

  return result
})
```

---

## 📊 KPIs a Monitorear

### Performance
- Bundle size (target: <2MB)
- First Contentful Paint (target: <1.5s)
- Time to Interactive (target: <3s)
- API response times (target: <200ms p95)

### Código
- Líneas de código (baseline: 28,800)
- Test coverage (target: >60%)
- ESLint warnings (target: 0)
- TypeScript errors (target: 0)

### Usuario
- Bounce rate
- Session duration
- Error rate (target: <1%)
- Active users

---

## 🗓️ Cronograma Sugerido

### Mes 1 (Noviembre 2025)
- ✅ Fase 1 completada
- 🟡 Fase 2: 2-3 endpoints verificados
- 🟡 Code splitting inicial

### Mes 2 (Diciembre 2025)
- 🟡 Fase 2: Resto de optimizaciones
- 🟢 Lazy loading implementado
- 🟢 useMemo agregado

### Mes 3 (Enero 2026)
- 🟢 Service layer inicial
- 🟢 Unit tests básicos
- 🟢 Error tracking configurado

---

## 📝 Notas Importantes

### Mantenimiento Regular
- **Semanal**: Revisar métricas de Vercel Analytics
- **Mensual**: Auditoría rápida (30 min)
  - Buscar código duplicado
  - Revisar warnings de ESLint
  - Verificar bundle size
- **Trimestral**: Auditoría completa (como esta)

### Documentación
- Mantener CLAUDE.md actualizado
- Documentar decisiones arquitecturales
- README actualizado para nuevos devs

### Backup
- DB backups automáticos (Supabase/Vercel Postgres)
- Git branches protegidas (main)
- Pre-deploy tests (CI/CD)

---

## 🎓 Recursos Recomendados

### Performance
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Web.dev Performance](https://web.dev/performance/)
- [Vercel Analytics Docs](https://vercel.com/docs/analytics)

### Testing
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Guide](https://playwright.dev/docs/intro)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Architecture
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Repository Pattern](https://www.martinfowler.com/eaaCatalog/repository.html)
- [Service Layer Pattern](https://www.martinfowler.com/eaaCatalog/serviceLayer.html)

---

**Última Actualización**: 2025-10-29
**Próxima Revisión**: 2025-11-29

✨ *"Premature optimization is the root of all evil, but timely optimization is pure gold"*
