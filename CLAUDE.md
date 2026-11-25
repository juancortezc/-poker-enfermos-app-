# CLAUDE.md - Sistema Poker Enfermos

## 🚀 Quick Reference

### Stack
- **Frontend**: React, TypeScript, Next.js, TailwindCSS
- **Backend**: Node.js, Prisma ORM, PostgreSQL
- **Design**: Clean Poker (Archivo/Inter, rojo del club `#E53935`; tokens en `packages/design`)

### Core Commands
```bash
npm run dev               # Development server
npm run build             # Production build
npm run lint              # ESLint (100% clean)
npx prisma studio         # DB admin interface
npx prisma db push        # Apply schema changes
```

### Testing Scripts
```bash
npx tsx scripts/test-permission-system.ts   # Permission validation
npx tsx scripts/test-api-optimization.ts    # API optimization tests
npx tsx scripts/test-frontend-pages.ts      # Frontend pages verification
```

---

## 📊 Database Schema

### Key Tables
- **Players**: 29 active (Comision/Enfermo/Invitado roles)
- **Tournaments**: PROXIMO → ACTIVO → FINALIZADO states
- **GameDate**: pending → CREATED → in_progress → completed
- **BlindLevel**: 18 levels (50/100 to 10000/20000): 12 min levels 1-6, dinner break (manual pause) after level 6, 16 min levels 7-14, 10 min levels 15-17, level 18 open. Single source: `packages/shared/src/blinds.ts`
- **Eliminations**: Position-based point system (max 30pts)
- **TournamentWinners**: Historical podium tracking

---

## 🔑 Critical APIs

### Authentication
```
Header: Authorization: Bearer {adminKey}
```

### Core Endpoints
```
# Players (Public)
GET  /api/players                                        # Public - Player directory with filters

# Tournaments
GET  /api/tournaments/active
POST /api/tournaments/[id]/activate
POST /api/tournaments/[id]/complete

# Game Dates
GET  /api/game-dates/active
PUT  /api/game-dates/[id]  # action: 'start'|'update'
GET  /api/game-dates/[id]/live-status

# Timer Control (Auth: Comision only)
GET  /api/timer/game-date/[id]
POST /api/timer/game-date/[id]/pause
POST /api/timer/game-date/[id]/resume
POST /api/timer/game-date/[id]/level-up

# Eliminations
POST /api/eliminations
GET  /api/eliminations/game-date/[id]

# Rankings & Results
GET  /api/tournaments/[id]/ranking
GET  /api/tournaments/winners
GET  /api/tournaments/podium-stats
GET  /api/stats/awards/[tournamentId]                    # Tournament awards (8 categories)
GET  /api/stats/parent-child/[tournamentId]              # P&H relations (active only)
GET  /api/stats/parent-child/[tournamentId]/[relationId] # P&H relation detail with eliminations

# Proposals System (T29) - V2 Only
GET    /api/proposals-v2/public               # Public proposals for T29
GET    /api/proposals-v2/my                   # User's own proposals
GET    /api/proposals-v2/admin                # Admin view (Commission only)
POST   /api/proposals-v2                      # Create proposal
PATCH  /api/proposals-v2/[id]                 # Edit proposal
DELETE /api/proposals-v2/[id]                 # Delete proposal
PATCH  /api/proposals-v2/[id]/toggle          # Activate/deactivate proposal
PATCH  /api/proposals-v2/[id]/close-voting    # Close voting (Commission only)
PUT    /api/proposals-v2/[id]/close-voting    # Reopen voting (Commission only)
POST   /api/proposals/[id]/votes              # Vote on proposal
DELETE /api/proposals/[id]/votes              # Remove vote
POST   /api/proposals/[id]/comments           # Comment on proposal
GET    /api/proposals/[id]/comments           # Get comments
```

---

## ⚡ Key Features

### ELIMINA 2 System ✅
- Calculates best 10 of 12 dates automatically
- Dual score display (final vs total)
- Historical data imported (Torneo 28)

### Timer System ✅
- Auto-starts with game date
- Role-based control (Comision: full, Enfermo: read-only)
- Real-time countdown with blind levels

### Notifications ✅
- Native Web Notifications API
- Sound & vibration support
- User preferences in localStorage
- Types: Timer warnings, eliminations, winner

### Permission System ✅
- Granular role-based access
- Visual lock indicators for restricted features
- 21 automated tests passing

### Import System ✅
- CSV drag & drop interface
- Validation preview
- Transactional imports
- Historical data support

### Proposals Management System ✅
- Complete CRUD operations for T29 proposals
- Role-based permissions (users edit own, Commission manages all)
- Structured proposal format: título, objetivo, situación, propuesta, imagen
- Real-time updates with loading indicators
- Public display in T29 section with voting and comments
- Voting closure system: Commission can close/reopen voting
- Disabled voting & comments when votingClosed = true

### Tournament Awards System ✅
- 8 award categories per tournament: Varón, Gay, Podios, Victorias, 7/2, Sin Podio, Faltas, Mesas Finales
- Ranking by points (not position) for accurate results
- Participant filtering (only registered tournament players)
- Faltas calculated as total dates minus dates played
- Tournament selector (T28 onwards) in stats page
- PokerNew-themed award cards with gradient backgrounds
- Separate "Premios" and "P&H" subtabs in admin stats

---

## 🛠️ Component Structure

### Key Pages
- `/` - Dashboard with ranking widget
- `/registro` - Live elimination tracking
- `/timer` - Blind level timer
- `/admin` - Role-based admin panel
- `/admin/resultados` - Historical results (3 tabs)
- `/admin/stats` - Statistics with P&H and Premios subtabs
- `/admin/propuestas` - Commission proposals management
- `/propuestas-v2` - User proposal management
- `/t29` - Tournament 29 proposals display and participation
- `/game-dates/config` - Single-page date configuration

### Core Components
- `TimerDisplay` - Real-time blind countdown
- `EliminationForm` - Live elimination entry
- `TournamentRankingTable` - ELIMINA 2 scoring
- `PlayerSelector/GuestSelector` - Participant management
- `ProposalForm` - Create/edit proposals with validation
- `ProposalCard` - Display proposals with expand/collapse
- `VotingButtons` - Proposal voting interface
- `AwardCard` - Display tournament award categories with rankings
- `ParentChildCard` - Clickable P&H relation cards
- `ParentChildDetailModal` - Modal with elimination history details
- `NoirButton` / `RankCard` / `BottomNav` - Noir Jazz UI core components

---

## 🎨 Clean Poker Design System

**Fuente única: `packages/design` (`@poker/design`).** Web y app leen de ahí; no se copian valores. `toCssVariables(tone)` genera las variables `--cp-*` con los nombres de la web, y `packages/design/tests/web-parity.test.ts` falla si se separan de `apps/web/src/styles/clean-poker-tokens.css`.

- **Superficies 0–4:** oscuro `#000000` `#2B2120` `#382E2C` `#483E3C` `#584E4C`; claro (`.cp-light`) `#FAF7F2` `#FFFFFF` `#F3EDE4` `#E7DED2` `#CEC2B3`. Papel `#FBF7F2` con tinta `#1D1615` para bloques que celebran.
- **Texto:** `#F5EFE6` / `#C9BFBA` / `#9A8F8B` sobre oscuro; `#17120F` / `#574C49` / `#786B66` en claro.
- **Rojo del club `#E53935`:** rellenos, bordes, estados. Como texto no llega a 4.5:1: `primary-light` `#FF6B6B` sobre oscuro, `#C62828` sobre papel.
- **Roles de color:** info `#5BC8C0` (frío, lo informativo); positivo `#6ECB71`; lo negativo en naranja `#E8863C`, nunca rojo; oro/plata/bronce `#E8C158` `#C9C6C2` `#C08A54` solo podio (sobre papel `#8A6508` `#6E6A67` `#8B5E2F`); rosa `#EC4899` solo malazos y 7/2.
- **Tipografía:** Archivo 800 para display, títulos, rótulos y cifras (tracking negativo); Inter para el cuerpo. Piso de 12 px.
- **Forma:** radio 5 px (botones, inputs), 18 en tarjetas claras, 20 en los bloques bento del home (papel, negro, rosa, verde, oro). Elevaciones 1 y 2 por tono.
- **Tono:** casi toda la app va en claro (`tone="light"`); fecha en vivo, timer, registro y propuestas en oscuro.
- **Movimiento:** 150/250 ms; entrada escalonada y cifras que cuentan en el home, siempre bajo `prefers-reduced-motion`.

---

## 📱 User Roles & Access

| Feature | Comision | Enfermo | Invitado |
|---------|----------|---------|----------|
| Timer Control | ✅ | 🔒 | 🔒 |
| Eliminations | ✅ | 🔒 | 🔒 |
| Tournament Mgmt | ✅ | 🔒 | 🔒 |
| Manage All Proposals | ✅ | 🔒 | 🔒 |
| Close/Reopen Voting | ✅ | 🔒 | 🔒 |
| Create/Edit Own Proposals | ✅ | ✅ | ✅ |
| Vote on Proposals | ✅* | ✅* | ✅* |
| View Rankings | ✅ | ✅ | ✅ |
| View Calendar | ✅ | ✅ | ✅ |
| Profile Access | ✅ | ✅ | 🔒 |

\* Voting/commenting disabled when proposal voting is closed

---

## 🚨 Recent Updates

### Latest (2025-12-09) - Fase 2 Performance Optimizations COMPLETA
**Optimizaciones Completadas:**
- ✅ **React useMemo**: TournamentRankingTable y RankingEvolutionChart (verificados)
- ✅ **Lazy Loading Imágenes**: 6 componentes optimizados
- ✅ **Dynamic Imports**: 3 modales pesados (PlayerDetail, ParentChildDetail, PodiumResults)
- ✅ **SWR Config**: dedupingInterval 30s, revalidateOnFocus false
- ✅ **Endpoints Audit**: 6/8 en uso verificado, 2/8 candidatos a eliminar
- ✅ **Prisma Queries**: Verificadas como ya optimizadas con select
- ✅ **Technical Docs**: Sistema completo con botón TÉCNICO

📦 **Impacto Total**: -50KB bundle inicial, +15-20% First Paint, -50% requests SWR, +30% render speed

### Previous (2025-10-29) - Auditoría Completa (Fase 1)
**Fase 1 - Crítica:**
- ✅ **Code Cleanup**: Eliminados archivos duplicados y funciones no usadas
- ✅ **API Optimization**: 4 endpoints adicionales eliminados (historical, by-number, podium-stats, date-awards)
- ✅ **N+1 Query Fix**: Optimización crítica en `/api/stats/awards` (50-100ms mejora)
- ✅ **Pages Cleanup**: 4 páginas huérfanas eliminadas (admin/points, live, club-1000, game-dates/new)
- ✅ **Bundle Reduction**: html2canvas y jspdf eliminados (~200KB reducción)
- ✅ **Documentation**: 7 archivos MD obsoletos archivados en `docs/archive/`

📉 **Total Impact**: ~1,200 líneas eliminadas, -280KB bundle, +50-100ms API speed

### Previous (2025-10-13)
- ✅ **API Optimization**: 8 endpoints eliminados (duplicados y legacy)
- ✅ **Security Fix**: Endpoint `/players/[id]/role` ahora requiere auth Comisión
- ✅ **Proposals V1→V2**: Sistema completamente migrado (V1 eliminado)
- ✅ **Auth Estandarizada**: `admin/import` endpoints usan `withComisionAuth`
- ✅ **Testing Suite**: Scripts automatizados para API y frontend
- ✅ **Documentación**: `docs/API-PUBLIC-ENDPOINTS.md` con política de revisión
- 📉 **Código Limpio**: ~600 líneas eliminadas, arquitectura más consistente

### Previous (2025-10-11)
- ✅ New 12-level blinds structure (down from 18 levels)
- ✅ Longer durations: 25min early levels, 20min mid-levels, 15min final
- ✅ 30-minute dinner break after level 3 (manual timer pause)
- ✅ Max blinds reduced to 2500/5000 (from 10000/20000)
- ✅ Backend API, frontend form, and presets synchronized
- ✅ Estimated duration: 4-5 hours with dinner break

### Previous (2025-10-08)
- ✅ P&H Detail Modal System with elimination history
- ✅ Clickable P&H cards with hover effects
- ✅ Fixed P&H stats calculation errors (recalculated T28)
- ✅ New API endpoint for relation details
- ✅ PokerNew-themed modal with timeline view

### Previous (2025-10-07)
- ✅ Tournament Awards System with 8 categories
- ✅ Award rankings by points with participant filtering
- ✅ Faltas calculation (total dates - dates played)
- ✅ Tournament selector (T28+) in stats page
- ✅ PokerNew-themed award cards with gradients
- ✅ Voting closure system for T29 proposals
- ✅ Commission can close/reopen voting via admin panel
- ✅ "Cerrada" badge displayed on closed proposals

### Previous (2025-10-03)
- ✅ Complete T29 Proposals Management System implemented
- ✅ PokerNew Design System with sophisticated dark theme
- ✅ User and Commission proposal interfaces
- ✅ Real-time loading indicators and microanimations
- ✅ Role-based permissions and ownership validation
- ✅ Structured proposal format with image support

### Previous (2025-09-23)
- ✅ Results section with interactive tabs & tooltips
- ✅ Dead code removed (500+ lines)
- ✅ ESLint 100% error-free
- ✅ Client-auth library created
- ✅ Excel table styling restored

### Production Status
- **Code Quality**: ESLint clean, TypeScript safe
- **Features**: All core systems operational
- **Testing**: Automated tests passing
- **Performance**: Mobile-optimized
- **Security**: Role-based auth implemented

---

## 💡 Development Notes

### Principles
- Mobile-first design
- Minimal code, maximum impact
- Always validate with user before major changes
- Use existing patterns & libraries

### Common Tasks
```bash
# Import historical data
npx tsx scripts/import-historical-csv.ts t28f01.csv

# Analyze tournament data
npx tsx scripts/analyze-tournament-28.ts

# Fix participant lists
npx tsx scripts/fix-gamedate-participants.ts
```

### Key Files
- `lib/permissions.ts` - Access control logic
- `lib/client-auth.ts` - Frontend authentication
- `prisma/schema.prisma` - Database structure

---

**Status**: PRODUCTION READY ✅
**Last Update**: 2025-10-13
**Design System**: PokerNew v1.0
**API Audit**: Completada - Ver AUDITORIA-API.md y OPTIMIZACION-COMPLETADA.md
