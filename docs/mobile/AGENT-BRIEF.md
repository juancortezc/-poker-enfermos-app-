# Brief común para los agentes de la app móvil

Léelo entero antes de empezar. También `docs/mobile/PLAN.md` y `CLAUDE.md`.

## Repo
- Monorepo npm en `/Users/jac/Apps/JAC/Poker/poker2027`, rama de integración `feat/mobile-expo` (en GitHub `origin`).
- `apps/web`: Next.js 16 (web + las 71 rutas de `/api`). Antes de tocar config de Next, lee `node_modules/next/dist/docs/`.
- `apps/mobile`: Expo SDK 58, RN 0.88, React 19.3, Expo Router (`src/app/`), NativeWind 4, SWR, TypeScript estricto.
- `packages/shared` (`@poker/shared`): tipos, permisos, pin-rules, puntos, blinds (18 niveles, única fuente), timer-engine, helpers de ranking. Pruebas: `npm test`.

## Si trabajas en un worktree
Al empezar: `git fetch origin && git checkout -b <tu-rama> origin/feat/mobile-expo && npm install`. Nunca hagas checkout de `feat/mobile-expo` (está en uso). No hagas push ni merge: el coordinador integra.

## App móvil: lo que ya existe
- Rutas placeholder por área: `(tabs)`, `(jugador)`, `(envivo)`, `(torneo)`, `(admin)`. Cada agente solo reemplaza las pantallas de su área.
- `src/lib/api.ts` (`apiFetch`, `fetcher`; manda `Authorization: Bearer PIN:<clave>`), `src/lib/swr.tsx` (`swrKeys`, `mutateRelated`), `src/contexts/AuthContext.tsx` (`useAuth()` → `user`, `role`, `can(feature)`).
- Componentes base: NoirButton, NoirCard, Screen, Header, Typography, estados Loading/Error/Empty/Restricted. Úsalos; no los modifiques. Si necesitas cambiar uno, dilo en tu reporte.
- Componentes nuevos de tu área van en `apps/mobile/src/components/<tu-area>/`.
- Referencia de cada pantalla: su equivalente en `apps/web/src/app/<ruta>/page.tsx` y los componentes y hooks que usa. Mismos datos, mismos endpoints, mismas reglas por rol. La lógica pura va a `@poker/shared` si la web y la app la comparten (sin duplicar).

## Diseño
Noir Jazz (ver CLAUDE.md): fondo `#1F1410`, oro `#E0B66C`, cobre `#A9441C`, texto `#F3E6C5`, muted `#D7C59A`, bordes `#3C2219`; Cinzel en títulos, Inter en el cuerpo. Mobile-first, áreas táctiles de 44 pt o más, transiciones de 200 ms.

## Dependencias
Instala solo con `npx expo install <pkg>` dentro de `apps/mobile`. Prefiere lo que ya está. Lista en tu reporte toda dependencia nueva.

## Base de datos: regla absoluta
- La API y `.env` apuntan a **producción**. Prohibido escribir en producción: nada de `prisma db push/migrate` con `.env`, nada de POST/PUT/PATCH/DELETE contra `poker-enfermos.vercel.app`.
- Para cualquier escritura o cambio de esquema usa la rama Neon de QA: `DATABASE_URL` de `/Users/jac/Apps/JAC/Poker/poker2027/.env.qa`. Ejemplo, desde `apps/web`: `(set -a; source /Users/jac/Apps/JAC/Poker/poker2027/.env.qa; set +a; npx prisma db push)` (la variable exportada tiene prioridad sobre `apps/web/.env`). Antes de ejecutar, comprueba que el host contenga `ep-noisy-bread`.
- Cambios de esquema: solo aditivos (tablas y columnas nuevas opcionales). Nunca borrar ni renombrar.

## Verificación antes de reportar (todo verde)
`npm run typecheck`, `npm test`, `npm run lint:web` (0 errores), y en apps/mobile: `npx expo lint`, `npx expo export --platform android` y `--platform ios`. Si tocaste la web: `npm run build:web` y después restaura `apps/web/public/sw.js` y los `workbox-*.js` como estaban (no se commitean).

## Commits
Pequeños, en español, al estilo de `git log --oneline -15`, terminando con:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
Nunca commitees `.env*`, `apps/web/public/sw.js`, `AGENTS.md` de la raíz, `docs/mobile/tracker/*`, `NUEVOS_PINS_POKER_ENFERMOS.txt` ni `enfermos.json`.

## Reporte final (español, breve)
Qué quedó hecho, por pantalla o endpoint; resultado de cada verificación; tu rama y commits (sha + mensaje); dependencias nuevas; problemas y decisiones para el coordinador.
