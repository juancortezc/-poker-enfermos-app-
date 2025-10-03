# CLAUDE.md - Sistema Poker Enfermos

## 🚀 Quick Reference

### Stack
- **Frontend**: React, TypeScript, Next.js, TailwindCSS
- **Backend**: Node.js, Prisma ORM, PostgreSQL
- **Design**: Mobile-First, PokerNew Design System (Sophisticated Dark Theme)

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

# Proposals System (T29)
GET  /api/proposals/public           # Public proposals for T29
GET  /api/proposals-v2/my           # User's own proposals
GET  /api/proposals-v2/admin        # Admin view (Commission only)
POST /api/proposals-v2              # Create proposal
PATCH /api/proposals-v2/[id]        # Edit proposal
DELETE /api/proposals-v2/[id]       # Delete proposal
PATCH /api/proposals-v2/[id]/toggle # Activate/deactivate proposal
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

---

## 🛠️ Component Structure

### Key Pages
- `/` - Dashboard with ranking widget
- `/registro` - Live elimination tracking
- `/timer` - Blind level timer
- `/admin` - Role-based admin panel
- `/admin/resultados` - Historical results (3 tabs)
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

---

## 📱 User Roles & Access

| Feature | Comision | Enfermo | Invitado |
|---------|----------|---------|----------|
| Timer Control | ✅ | 🔒 | 🔒 |
| Eliminations | ✅ | 🔒 | 🔒 |
| Tournament Mgmt | ✅ | 🔒 | 🔒 |
| Manage All Proposals | ✅ | 🔒 | 🔒 |
| Create/Edit Own Proposals | ✅ | ✅ | ✅ |
| Vote on Proposals | ✅ | ✅ | ✅ |
| View Rankings | ✅ | ✅ | ✅ |
| View Calendar | ✅ | ✅ | ✅ |
| Profile Access | ✅ | ✅ | 🔒 |

---

## 🚨 Recent Updates

### Latest (2025-10-03)
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

## 🎨 PokerNew Design System

### Color Palette
**Layered Dark Backgrounds:**
- Primary: `#201c30 → #1b1c2b → #131422` (main layouts)
- Secondary: `#1b1d2f → #181a2c → #121321` (cards and panels)
- Accents: Emerald (`#10b981`) and Rose (`#f43f5e`) variants

**Hero CTA Gradient:**
- `from-poker-red via-[#ff5d8f] to-[#ff9f6a]`
- Shadow: `0 14px 30px rgba(255,93,143,0.35)`
- Hover: `0 18px 40px rgba(255,93,143,0.45)`

**Borders:**
- Standard: `border-white/10` to `border-white/15`
- Interactive: `border-white/20` with hover `border-white/35`
- Accent: `border-poker-red/40` for highlights

### Typography
**Hierarchy:**
- Titles: `text-xl/2xl font-semibold tracking-tight`
- Section Labels: `text-xs uppercase tracking-[0.24em]` with accent colors
- Body Text: `text-sm text-white/70` with `leading-relaxed`
- Badges: `uppercase tracking-[0.16-0.2em]` for modern look

### Button System
**Primary CTAs:**
- `variant="ghost"` with custom gradients
- `rounded-full` with deep shadows
- Hover: `hover:-translate-y-0.5` microanimation

**Secondary Actions:**
- `border border-white/15 text-white/70`
- Hover: increased contrast and border opacity

**States:**
- Disabled: `from-neutral-700 to-neutral-700/70` no shadow
- Loading: Spinner with `border-white/80`

### Card System
**Structure:**
- Border: `border-white/12`
- Background: Gradients with optional `backdrop-blur`
- Shadow: `0 18px 40px rgba(11,12,32,0.35)`
- Hover: `hover:-translate-y-1 hover:border-poker-red/60`

**Content Layout:**
- Minimal padding: `p-5` for content areas
- Sections: `space-y-4` between elements
- Headers: Gradient overlay `from-white/8`

### Microanimations
- Card hover: `hover:-translate-y-1` with shadow enhancement
- Button hover: `hover:-translate-y-0.5` for CTAs
- Vote buttons: Same translate effect on interaction
- Loading states: Standard spinner with brand colors

### State Patterns
**Loading:**
- Card with tinted gradient background
- Spinner: `h-8 w-8 border-b-2 border-poker-red`

**Error:**
- Rose gradient: `from-rose-500/15 via-[#191a2c] to-[#10111b]`
- Text: `text-rose-200`

**Empty:**
- Dark card with accent icon
- Copy: `text-sm text-white/55`
- CTA: Hero gradient button

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
**Last Update**: 2025-10-03
**Design System**: PokerNew v1.0