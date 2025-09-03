# Poker Enfermos

Next.js 14 poker tournament management application with TypeScript, Tailwind CSS, Prisma ORM, and PWA capabilities.

## Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Enfermo Design System
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Custom admin key authentication
- **Real-time**: Socket.IO (planned)
- **PWA**: next-pwa with service workers

## Database Schema

**Players** - Core entity with roles (Comision/Enfermo/Invitado), 4-digit PINs, contact info, aliases, and inviter relationships
**Tournaments** - Tournament management with dates and settings
**GameResults** - Player performance tracking
**Eliminations** - Knockout tracking with eliminator/victim relationships
**TimerStates** - Tournament timer management

## Authentication & Permissions

- **Admin Key**: Simple bearer token authentication
- **Comision**: Full CRUD access to all features
- **Enfermo**: Read-only access to view data
- **Invitado**: Read-only access, must be linked to an Enfermo

## API Routes

```
GET    /api/players           - List players (filtered, searchable)
POST   /api/players           - Create player (Comision only)
GET    /api/players/[id]      - Get player details
PUT    /api/players/[id]      - Update player (Comision only)
DELETE /api/players/[id]      - Soft delete player (Comision only)
POST   /api/auth/login        - Authenticate with admin key
```

## Enfermo Design System

### Color Palette
```css
--poker-dark: #1A1A1A      /* Primary background */
--poker-card: #242424      /* Elevated surfaces */
--poker-red: #E10600       /* F1 accent - buttons, active states */
--poker-cyan: #00D2BE      /* Live updates, aliases, highlights */
--poker-green: #16a34a     /* Success states, Enfermo badges */
--poker-text: rgba(255,255,255,0.9)   /* Primary text */
--poker-muted: rgba(255,255,255,0.6)  /* Secondary text */
```

### Typography
- **Base Size**: 16px minimum for accessibility
- **Time Displays**: 20px minimum 
- **Font Stack**: Geist Sans (primary), Geist Mono (code)
- **Line Height**: 1.6 default for readability

### Layout Principles
- **Mobile-First**: All interfaces designed for 375px+ mobile screens
- **Single Screen View**: Minimize scrolling - everything fits in viewport when possible
- **Touch Targets**: 48px minimum height for interactive elements
- **Circular Avatars**: Player photos always circular, 48px standard size
- **Card Spacing**: 16px padding inside cards, 8px between cards

### Component Patterns
- **Cards**: `bg-poker-card` with subtle border, hover states
- **Badges**: Role-based colors (red=Comision, green=Enfermo, blue=Invitado)
- **Buttons**: `bg-poker-red` primary, ghost variants for secondary actions
- **Inputs**: Dark backgrounds with cyan focus states
- **Tabs**: Active in red, inactive in gray with rounded corners

### Animations
- **Entry**: Staggered fade-in with 50ms delays
- **Live Indicators**: Pulsing green dots for real-time status
- **Transitions**: 200ms ease-in-out for smooth interactions
- **Loading**: Spinning red border on gray background

### Mobile Responsiveness
- **Bottom Navigation**: Fixed navbar with 4 main sections
- **Header**: Sticky with logo, user info, live status
- **Content**: Scrollable when needed, single-column layout
- **Forms**: Full-screen modals on mobile
- **Search**: Integrated in header, full-width on mobile

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
- **Search & Filter**: Real-time search across names and aliases
- **Inviter System**: Invitados linked to Enfermos who invite them
- **Circular Photos**: Profile images always displayed as circles
- **Responsive Design**: Mobile-first with desktop optimization
- **Real-time Updates**: Live status indicators throughout UI
- **PWA Ready**: Installable app with offline capabilities