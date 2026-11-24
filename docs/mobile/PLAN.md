# Plan de desarrollo: Poker Enfermos para iOS y Android (Expo)

Fecha: 2026-11-24 · Rama de trabajo: `feat/mobile-expo` (en este mismo repo)

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Estructura | Monorepo en este repo: `apps/web` (Next.js actual: web + API), `apps/mobile` (Expo), `packages/shared` (tipos, cliente API, reglas de negocio) |
| Despliegue web | Proyecto Vercel **nuevo** apuntando a `apps/web` de la rama. El Vercel actual queda intacto hasta que decidas cambiar |
| Base de datos | Producción (Neon). Cambios de esquema **solo aditivos** (tablas/columnas nuevas, nunca borrar ni renombrar) |
| QA destructivo | En una **rama Neon** (copia desechable de producción). Contra producción solo lecturas |
| Alcance | App completa (paridad con las 33 pantallas) + login biométrico + Google + Apple |
| Google / Apple | Se vinculan desde el perfil tras entrar con PIN. Nada de emparejar por email automáticamente |
| Cuentas | Apple Developer de tu empresa (temporal) y Google Play temporal; luego se migra a cuentas propias |

## Arquitectura

- **Backend sin reescribir.** La app consume las 71 rutas de `/api` que ya existen. El login ya usa `Authorization: Bearer PIN:xxxx`, que funciona igual en móvil.
- **Lo que se agrega al backend:** `POST /api/auth/google`, `POST /api/auth/apple`, vincular/desvincular identidades, registro de push tokens de Expo, y un `GET /api/auth/me` liviano si no existe. Tablas nuevas: `PlayerIdentity` (provider, subject, playerId) y `PushDevice` (expoToken, playerId, platform).
- **Sesión en móvil:** al vincular Google/Apple o entrar con PIN, el servidor entrega un token de sesión propio (no se guarda el PIN en texto plano). El token se guarda en `expo-secure-store`; la biometría (`expo-local-authentication`) desbloquea ese token.
- **Stack móvil:** Expo SDK estable más reciente, Expo Router, TypeScript, SWR (mismo patrón que la web), NativeWind (Tailwind en RN, reutiliza la paleta Noir Jazz), Reanimated (sustituye framer-motion), gráficos con `victory-native` o `react-native-gifted-charts` (sustituye recharts), `expo-notifications` (sustituye web-push), `expo-keep-awake` (sustituye wake lock), `expo-sharing` (compartir imágenes de resultados).
- **Builds:** EAS Build en la nube (no depende de tu Mac) con perfiles `development`, `preview` (APK interno + TestFlight) y `production`. Builds locales posibles con Xcode y Android Studio para depurar.

## Fases

| Fase | Contenido | Criterio de salida |
|---|---|---|
| F0 · Preparación | Herramientas, rama, rama Neon, cuenta Expo, monitor | `eas whoami` OK, simulador iOS y emulador Android abren |
| F1 · Monorepo | Mover web a `apps/web`, workspaces, `packages/shared`, Vercel nuevo | Web compila, lint limpio, preview Vercel idéntica a producción |
| F2 · Base móvil | Expo Router, tema Noir Jazz, navegación inferior, cliente API, login PIN + biometría | Login funcional en ambos simuladores contra la API del preview |
| F3 · Jugador | Home, ranking, tabla, calendario, fecha, perfil, jugadores, contactos, multas, info, ayuda, podcast, más | Paridad visual y de datos con la web |
| F4 · En vivo | Timer, registro de eliminaciones, notificaciones push nativas, pantalla siempre encendida | Una fecha simulada completa en la rama Neon sin errores |
| F5 · Torneo | Propuestas T29 (votos, comentarios, cierre), stats, premios, P&H, reportes, compartir | Paridad con la web |
| F6 · Admin | Torneos (crear/editar/configurar), fechas (jugadores, invitados, confirmar), jugadores, importación | Flujo completo de Comisión en móvil |
| F7 · Google + Apple | Endpoints, vinculación en perfil, botones de login | Vincular y entrar con ambas en dispositivo real |
| F8 · Endurecer y publicar | Pasada QA final, íconos/splash, builds preview → TestFlight / Play interno | Builds instalados en tu teléfono |

F3, F4 y F5 pueden ir en paralelo una vez cerrada F2. F6 y F7 también pueden ir en paralelo entre sí.

## Agentes

| Agente | Área | Trabaja en |
|---|---|---|
| **Coordinador** (yo) | Plan, reparto, decisiones, monitor, hablar contigo | Todo, sin escribir features |
| **Infra** | Monorepo, workspaces, Vercel, EAS config, rama Neon | F0, F1 |
| **Backend** | Endpoints y tablas nuevas (aditivas), auth social, push tokens | F2 (sesión), F4 (push), F7 |
| **Mobile Core** | Esqueleto Expo, tema, navegación, auth, cliente API, componentes base | F2 |
| **Pantallas Jugador** | Pantallas de consulta | F3 |
| **En Vivo** | Timer, registro, notificaciones | F4 |
| **Torneo** | Propuestas, stats, premios, P&H | F5 |
| **Admin** | Pantallas de Comisión | F6 |
| **QA** | Revisa, limpia, optimiza; tests y pruebas adversariales en rama Neon; abre incidencias | Tras cada fase, en paralelo |
| **Release** | Commits (en español, como el historial), deploy Vercel, builds EAS. Solo publica si lint, tipos, tests y build están en verde | Al cierre de cada tarea |

Cada agente de pantallas trabaja en su propio worktree para no pisarse. El agente Release integra en `feat/mobile-expo`.

## Reglas para todos los agentes

1. Cero cambios destructivos en la base de producción. `prisma db push` solo con cambios aditivos revisados por QA, y primero en la rama Neon.
2. La web en producción no se toca: el Vercel actual sigue apuntando a `main`.
3. Lógica compartida en `packages/shared`; no duplicar reglas (puntaje ELIMINA 2, permisos, blinds).
4. Permisos por rol idénticos a la web (Comision / Enfermo / Invitado).
5. Nada de secretos en el repo; variables en EAS y Vercel.

## Lo que necesito de ti

| Cuándo | Qué |
|---|---|
| Ahora | Instalar **Xcode** desde la App Store (~15 GB) y abrirlo una vez para aceptar la licencia |
| Ahora | `eas login` (o crear una cuenta en expo.dev) |
| F0 | Acceso a Neon para crear la rama de QA: una API key de Neon, o crear tú la rama desde la consola |
| F8 | Datos del Apple Developer de tu empresa (Team ID; la firma se hace con `eas credentials`) y acceso a Google Play Console |
| F7 | Un proyecto en Google Cloud para los OAuth client IDs (iOS, Android, Web); te guío paso a paso |

## Riesgos

- **Esquema compartido con producción:** mitigado con cambios solo aditivos y prueba previa en la rama Neon.
- **Cuenta Apple de la empresa:** el bundle ID y el nombre del publicador quedan a nombre de la empresa. Migrar después es un trámite de transferencia de app en App Store Connect. Usaremos un bundle ID neutro (`com.pokerenfermos.app`).
- **Gráficos y animaciones:** recharts y framer-motion no existen en RN; se reescriben esas vistas.
- **Importación CSV/Excel en móvil:** se resuelve con selector de archivo y subida a la API existente.
