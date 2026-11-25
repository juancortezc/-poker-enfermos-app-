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
- Componentes base (`src/components/ui`): CPButton, CPCard, CPHeader, Screen (con `tone` y `appBar`), Header, Typography, estados Loading/Error/Empty/Restricted. Úsalos; no los modifiques. Si necesitas cambiar uno, dilo en tu reporte.
- Componentes nuevos de tu área van en `apps/mobile/src/components/<tu-area>/`.
- Referencia de cada pantalla: su equivalente en `apps/web/src/app/<ruta>/page.tsx` y los componentes y hooks que usa. Mismos datos, mismos endpoints, mismas reglas por rol. La lógica pura va a `@poker/shared` si la web y la app la comparten (sin duplicar).

## Diseño
**Clean Poker**, el mismo diseño que la web en producción. La fuente única de los tokens es `packages/design` (`@poker/design`): colores (oscuro, claro `.cp-light` y papel `.cp-paper`), tipografía, radios, espaciado, elevaciones, movimiento y los bloques del home (`bento`). No copies valores: impórtalos.
- **Paleta:** superficies 0–4 (`#000`, `#2B2120`, `#382E2C`, `#483E3C`, `#584E4C` en oscuro; `#FAF7F2`, `#FFFFFF`, `#F3EDE4`, `#E7DED2`, `#CEC2B3` en claro). Rojo del club `#E53935` para rellenos y estados; como texto, `primaryLight` (`#FF6B6B` sobre oscuro, `#C62828` sobre papel). Informativo turquesa, positivo verde, lo negativo en naranja (nunca rojo), oro/plata/bronce solo para el podio, rosa solo para los malazos y el 7/2. Hay variantes de texto distintas para oscuro y para papel: respétalas.
- **Tipografía:** Archivo 800 (`font-display`, `fonts.display`) para títulos, rótulos y cifras; Inter para el cuerpo.
- **Forma:** radio 5 px en botones e inputs, 18 en tarjetas (`CPCard`), 20 en los bloques del home.
- **Tono por pantalla, como la web:** casi todo va en claro (`<Screen tone="light">`): Inicio, Tabla, Stats, Más, Podcast, perfil, jugador, fecha, calendario, contactos, multas, info, ayuda, reportes, compartir y Admin. En oscuro: la fecha en vivo, Timer, Registro, Propuestas, la lista de jugadores y los formularios de Comisión.
- **En código:** clases NativeWind con el nombre de la variable web (`bg-cp-surface-1`, `text-cp-on-surface-muted`, `border-cp-surface-border`, `text-cp-primary-light`); cambian solas con el tono. Para colores por JS, `useCP()` (de `@/theme/tone`) dentro de componentes; en la pantalla que monta `Screen`, `cpLight`/`cp` de `@/theme/colors`.
- Mobile-first, áreas táctiles de 44 pt o más, movimiento bajo "reducir movimiento" del sistema.

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
