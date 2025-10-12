# Poker Enfermos

Next.js 14 poker tournament management application with TypeScript, Tailwind CSS, Prisma ORM, and PWA capabilities.

## Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Noir Jazz Design System (Cinzel + Inter)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Custom admin key authentication
- **Real-time**: Socket.IO (planned)
- **PWA**: next-pwa with service workers

## Database Schema

**Players** - Core entity with roles (Comision/Enfermo/Invitado), 4-digit PINs, contact info, aliases, and inviter relationships
**Tournaments** - Tournament management with number, dates, participants, and blind levels
**GameDates** - Individual game nights with player selection, guest management, and status tracking
**TournamentParticipants** - Many-to-many relationship between tournaments and players
**BlindLevels** - Configurable blind structures per tournament (18 levels with custom durations)
**GameResults** - Player performance tracking with points system
**Eliminations** - Knockout tracking with eliminator/victim relationships and positions
**TournamentRankings** - Tournament leaderboards with accumulated points
**TimerStates** - Tournament timer management with pause/resume functionality

## Game Date Management System

**Fecha (Game Night) Creation Workflow:**
1. **Date Information** - Display next available date for active tournament
2. **Player Selection** - Select from registered tournament participants (all selected by default)
3. **Guest Management** - Add group members not in tournament + external guests
4. **Confirmation** - Review participants and game details
5. **Summary** - Show created game date with points calculation

**Features:**
- Automatic date calculation (Tuesdays, 15 days apart)
- Points system based on participant count (15-25 points for winner)
- Guest categorization (group members vs external invites)
- Active date detection and editing capabilities

## Authentication & Permissions

- **Admin Key**: Simple bearer token authentication
- **Comision**: Full CRUD access to all features, tournament management, game date creation
- **Enfermo**: Read-only access to view data, participate in tournaments
- **Invitado**: Read-only access, must be linked to an Enfermo

## API Routes

### Players
```
GET    /api/players                    - List players (filtered, searchable)
POST   /api/players                    - Create player (Comision only)
GET    /api/players/[id]               - Get player details
PUT    /api/players/[id]               - Update player (Comision only)
DELETE /api/players/[id]               - Soft delete player (Comision only)
GET    /api/players/available-guests   - Get available guests for tournaments
POST   /api/auth/login                 - Authenticate with admin key
```

### Tournaments
```
GET    /api/tournaments                - List tournaments with optional status filter
POST   /api/tournaments                - Create tournament (Comision only)
GET    /api/tournaments/[id]           - Get tournament details
PUT    /api/tournaments/[id]           - Update tournament (Comision only)
GET    /api/tournaments/next-number    - Get next available tournament number
```

### Game Dates
```
GET    /api/game-dates/active          - Get current active game date
GET    /api/game-dates/next-available  - Get next available date for active tournament
POST   /api/game-dates                 - Create new game date (Comision only)
```

## Noir Jazz Design System

### Palette & Tokens
```css
--bg: #1F1410;         /* Primary background (deep brown) */
--bg-elev: #2A1A14;    /* Elevated surfaces */
--paper: #3A231A;      /* Textured panels */
--text: #F3E6C5;       /* Headings & body copy */
--muted: #D7C59A;      /* Secondary text/detail */
--accent: #E0B66C;     /* Buttons, highlights, glows */
--accent-2: #A9441C;   /* Emphasis, alerts */
--line: #3C2219;       /* Borders */
```

### Typography
- **Display**: Cinzel (400–700) for headings, nav labels, hero overlines
- **Body**: Inter (400–700) for paragraphs, UI controls
- **Base Size**: 18px for accessibility (optimized for +50 audience)
- **Tracking**: Use `tracking-[0.18em+]` on overlines/badges to mirror Art Deco feel

### Layout Principles
- Noir lounge mood — warm lighting, layered gradients, paper/noise textures
- Rounded corners (`1rem+`), thick borders with golden glows on marquee elements
- Touch targets ≥48px; high-contrast focus outlines in `#E0B66C`
- Mobile-first: persistent bottom navigation with custom PNG icons

### Component Patterns
- **Buttons**: `NoirButton` variants (primary=gold gradient, ghost=transparent outline)
- **Cards**: `noir-card` backgrounds with subtle radial highlights and metallic frames for podiums
- **Rankings**: `RankCard` top-three frames (gold/silver/bronze SVG overlays)
- **Modals / Menus**: Backdrop blur, layered parchment panels, consistent Cinzel headings
- **Inputs**: Dark paper surfaces with amber focus rings; placeholder text desaturated ivory

### Animations
- Gentle translate/opacity on hover (`transition 220ms ease`)
- Pulsing glows for active nav, loaders with golden spinners
- Staggered entrance for ranking grids and proposal cards

### Assets
- **Textures**: `/public/textures/paper.jpg`, `/public/textures/noise.png`
- **Icons**: Noir Jazz PNG set under `/public/icons/nav-*.png` and favicons
- **Frames**: Metal SVG frames (`/public/svgs/frame-*.svg`) for podium/highlight cards
- **Watermark**: `watermark-JD-5D.svg` (reserved for special layouts)

## Development Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run lint       # ESLint check
npx prisma studio  # Database admin UI
npx prisma migrate dev  # Run migrations
```

## Project Structure

```
src/
├── app/                 # Next.js 14 App Router
│   ├── api/            # API routes with authentication
│   ├── players/        # Players management page
│   └── layout.tsx      # Root layout with providers
├── components/
│   ├── players/        # Player management components
│   ├── ui/            # shadcn/ui components
│   └── AppLayout.tsx   # Main app wrapper
├── contexts/          # React contexts (Auth, PlayerSearch)
├── lib/               # Utilities (auth, prisma, utils)
└── hooks/             # Custom React hooks
```

## Key Features

- **Player Management**: CRUD operations with role-based permissions
- **Tournament System**: Complete tournament lifecycle from creation to completion
- **Game Date Creation**: Multi-step workflow for organizing game nights
- **Blind Level Management**: Configurable 18-level blind structures with custom durations
- **Guest Management**: Support for group members and external guests
- **Points Calculation**: Automatic winner points based on participant count (15-25 pts)
- **Search & Filter**: Real-time search across names and aliases
- **Inviter System**: Invitados linked to Enfermos who invite them
- **Circular Photos**: Profile images always displayed as circles
- **Responsive Design**: Mobile-first with desktop optimization
- **Real-time Updates**: Live status indicators throughout UI
- **PWA Ready**: Installable app with offline capabilities

## Recent Updates (2025-09-03)

### Database Migration & Schema Alignment
- **✅ Complete database reset** with new Prisma schema structure
- **✅ Player data preserved** - All 29 players successfully migrated
- **✅ Clean architecture** for tournaments and game dates
- **✅ Fixed API endpoints** to use correct field names and enum values
- **✅ Tournament status**: Now uses `ACTIVO/FINALIZADO` enum properly
- **✅ Game date status**: Fixed `in_progress` vs `active` mismatch
- **✅ Field mappings**: `scheduledDate`, `dateNumber`, proper relationships

### New Tournament Features
- **Tournament Creation**: Proper number sequence, blind levels, participant management
- **Date Picker**: Native HTML5 date input with dark theme, auto-calculation for Tuesdays
- **Tab Navigation**: Participants → Blinds → Dates workflow
- **Mobile Optimization**: Responsive buttons, proper spacing, touch-friendly interface

### Game Date Management
- **Fecha Button**: Replaced Rankings with game night creation
- **Multi-step Flow**: Date info → Player selection → Guest management → Confirmation → Summary  
- **Smart Defaults**: All tournament participants selected by default
- **Guest Categories**: Group members not in tournament + external guests
- **Points System**: Dynamic calculation based on total participants
