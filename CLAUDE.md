# CLAUDE.md - Sistema Poker Enfermos

## 🚀 Quick Reference

### Stack
- **Frontend**: React, TypeScript, Next.js, TailwindCSS
- **Backend**: Node.js, Prisma ORM, PostgreSQL
- **Design**: Mobile-First, Enfermos Design System (Rojo #E10600, Negro, Gris)

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
npx tsx scripts/test-permission-system.ts  # Permission validation
```

---

## 📊 Database Schema

### Key Tables
- **Players**: 29 active (Comision/Enfermo/Invitado roles)
- **Tournaments**: PROXIMO → ACTIVO → FINALIZADO states
- **GameDate**: pending → CREATED → in_progress → completed
- **BlindLevel**: 18 levels (50/100 to 10000/20000)
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

---

## 🛠️ Component Structure

### Key Pages
- `/` - Dashboard with ranking widget
- `/registro` - Live elimination tracking
- `/timer` - Blind level timer
- `/admin` - Role-based admin panel
- `/admin/resultados` - Historical results (3 tabs)
- `/game-dates/config` - Single-page date configuration

### Core Components
- `TimerDisplay` - Real-time blind countdown
- `EliminationForm` - Live elimination entry
- `TournamentRankingTable` - ELIMINA 2 scoring
- `PlayerSelector/GuestSelector` - Participant management

---

## 📱 User Roles & Access

| Feature | Comision | Enfermo | Invitado |
|---------|----------|---------|----------|
| Timer Control | ✅ | 🔒 | 🔒 |
| Eliminations | ✅ | 🔒 | 🔒 |
| Tournament Mgmt | ✅ | 🔒 | 🔒 |
| View Rankings | ✅ | ✅ | ✅ |
| View Calendar | ✅ | ✅ | ✅ |
| Profile Access | ✅ | ✅ | 🔒 |

---

## 🚨 Recent Updates

### Latest (2025-09-23)
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
**Last Update**: 2025-09-23