# Formato de la API (`apps/web/src/app/api`)

## Respuestas
- Éxito: `{ "success": true, "data": ... }` con `ok(data, status?)` de `@/lib/http`.
- Error: `{ "success": false, "error": { code, message, errors?, details?, errorId, timestamp, path } }`.
  `code` es estable (los clientes deciden con él), `message` va en español, `details` lleva extras
  (p. ej. `hint`, `retryAfterSeconds`), `debug` solo aparece en development.

## Errores (`@/lib/errors`)
Toda ruta se exporta envuelta: `export const GET = withErrorHandler(async (request, { params }) => ...)`.
- `throw AppError.badRequest|unauthorized|forbidden|notFound|conflict|validation|internal(...)`.
- `ZodError` → 422 `VALIDATION_ERROR` con `errors[]` (`field`, `message`, `code`).
- Prisma P2025 → 404 `NOT_FOUND`; P2002 → 409 `DUPLICATE`.
- Body que no es JSON → 400 `INVALID_JSON` (`parseBody`/`readJson`).
- Cualquier otro error → 500 `INTERNAL_ERROR`, sin el mensaje interno.
- Auth: 401 `UNAUTHORIZED` (el cliente cierra sesión), 403 `FORBIDDEN`, 503 `AUTH_UNAVAILABLE` (no se pudo validar; no cierra sesión).
- Eliminaciones y timer conservan sus status y códigos de dominio (409 `POSITION_ALREADY_TAKEN`, `GAME_DATE_NOT_IN_PROGRESS`, ...).

## Validación
Los esquemas Zod de body y query viven en `packages/shared/src/schemas/` (uno por área) y se exportan
desde `@poker/shared`, para que la app móvil valide sus formularios con las mismas reglas.
En la ruta: `parseBody(request, schema)`, `parseQuery(request, schema)`, `parseParams(await params, schema)`.

## Excepciones (el body de éxito no cambia)
- `GET /api/stats/tournament-report/[tournamentId]`: descarga xlsx. Sus errores sí usan el formato nuevo.
- `GET /api/cron/birthdays`: lo llama Vercel Cron; conserva `{ success, checked, birthdays, results }`.

## Compatibilidad de clientes
Los clientes aceptan los dos formatos (API vieja con el body a secas y `{ error: "texto" }`, y la nueva):
- Web: `@/lib/api-client` (`readApiJson` en lugar de `res.json()`, `parseApiResponse`, `apiFetch`, `ApiError`).
- Móvil: `apps/mobile/src/lib/api.ts` (`apiFetch`/`fetcher` desenvuelven; `ApiError` con `code`, `errorId`, `details`).
