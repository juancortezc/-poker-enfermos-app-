# Poker Enfermos — app móvil (Expo)

App iOS/Android que consume la API de la web (`/api` de Next.js). Plan general en `docs/mobile/PLAN.md`.

## Arrancar

```bash
npm install
npx expo start          # requiere un development build (hay módulos nativos: secure-store, local-authentication)
npm run typecheck       # tsc --noEmit
npm run lint
npx expo-doctor
```

La API se toma de `EXPO_PUBLIC_API_URL` (en `apps/mobile/.env.local` o en las variables de EAS); por defecto, producción: `https://poker-enfermos.vercel.app`.

## Estructura

- `src/app/` — rutas (Expo Router)
  - `(tabs)/` — barra inferior: Inicio, Tabla, Podcast, Estadísticas, Más (igual que `CPBottomNav` de la web)
  - `(jugador)/`, `(envivo)/`, `(torneo)/` — stacks por área
  - `(admin)/` — solo Comisión (se corta en el `_layout`)
  - `login.tsx`, `unlock.tsx` — clave y desbloqueo biométrico
- `src/contexts/AuthContext.tsx` — sesión: `useAuth()` con `user`, `role`, `can(feature)`, biometría
- `src/lib/api.ts` — `apiFetch` / `fetcher` con `Authorization: Bearer PIN:<clave>`
- `src/lib/swr.tsx` — `SWRProvider`, `swrKeys`, `mutateRelated` (mismas keys que la web)
- Permisos por rol y reglas de la clave: vienen de `@poker/shared` (`packages/shared`), los mismos que usa la web
- `src/components/ui/` — `NoirButton`, `NoirCard`, `Screen`, `Header`, `Typography`, estados de carga/error/vacío
- Estilos: NativeWind v4, tokens `noir-*` en `tailwind.config.js` (espejo en `src/theme/colors.ts`)

## Builds

`eas.json` define `development` (dev client, interno), `preview` (interno, APK en Android) y `production`.
