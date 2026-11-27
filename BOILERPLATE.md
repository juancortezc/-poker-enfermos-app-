# Boilerplate de Poker Enfermos

Arquitectura y convenciones de este repo. **Es obligatorio leerlo antes de planificar, escribir un brief o tocar código**, sea una persona o un agente. Si algo de lo que vas a hacer se aparta de lo que dice aquí, dilo explícitamente en el plan o en el reporte (qué, por qué y qué haría falta para alinearlo). No se salta en silencio.

Hay dos niveles:

1. **Lo vigente** (secciones 1 a 6): lo que el código ya cumple. Todo cambio nuevo lo sigue.
2. **Pendiente / diferido** (sección 7): el objetivo que todavía no se aplica, con su estado actual. No se migra a escondidas dentro de otra tarea; cada punto es una tarea propia y se decide con el usuario.

El anexo guarda las plantillas del objetivo para cuando toque cada migración.

---

## 1. Monorepo

npm workspaces (`apps/*`, `packages/*`), un solo `package-lock.json` en la raíz. React fijado a 19.3.0 con `overrides` en el `package.json` raíz.

```
poker2027/
├── apps/
│   ├── web/                  # Next.js 16 (App Router): la web y TODA la API (/api)
│   │   ├── prisma/           # schema.prisma (Prisma 6, PostgreSQL en Neon)
│   │   ├── src/app/          # páginas y rutas /api/**/route.ts
│   │   ├── src/lib/          # prisma, api-auth, errors/, http.ts, api-client.ts...
│   │   ├── src/proxy.ts      # CORS (en Next 16 `middleware` se llama `proxy`)
│   │   └── src/{domain,application,infrastructure}/  # capas parciales (ver 7.4)
│   └── mobile/               # Expo SDK 58, RN 0.88, Expo Router (src/app), NativeWind 4, SWR
├── packages/
│   ├── shared/               # @poker/shared: lógica pura y esquemas Zod
│   └── design/               # @poker/design: tokens Clean Poker
└── package.json              # workspaces y scripts de la raíz
```

Scripts de la raíz: `npm run dev:web`, `build:web`, `lint:web`, `test` (todos los workspaces), `typecheck` (todos los workspaces). Las dependencias de la app móvil se instalan con `npx expo install <pkg>` dentro de `apps/mobile`.

### `@poker/shared` (`packages/shared`)
Lógica pura compartida por la web y la app: sin Next, sin React, sin DOM, sin Prisma. Se importa desde `@poker/shared`.
- `src/schemas/`: esquemas Zod de entrada (body y query) de la API, por área (`auth`, `players`, `tournaments`, `game-dates`, `eliminations`, `timer`, `proposals`, `multas`, `stats`, `push`, ...). La API los usa para validar y la app para sus formularios.
- Reglas de negocio: `standings`, `tournament-stats`, `ranking`, `scoring`, `points`, `blinds` (única fuente de los niveles), `timer-engine`, `permissions`, `pin-rules`, `phrases`, `player-name`, `player-details`, `game-dates`, `tournament-validation`, `csv`, `ics`, `birthday`, `types`.

### `@poker/design` (`packages/design`)
Tokens Clean Poker (colores por tono oscuro/claro/papel, tipografía, escala, radios, elevaciones, movimiento, bloques `bento` del home). `toCssVariables(tone)` / `cssVariableMap(tone)` generan las variables `--cp-*` con los nombres de la web. `packages/design/tests/web-parity.test.ts` falla si se separan de `apps/web/src/styles/clean-poker-tokens.css`.

---

## 2. Regla de reparto: nada se duplica entre web y app

- **Lógica y validación compartidas van en `@poker/shared`.** Si la web y la app calculan o validan lo mismo (puntos, tabla, estadísticas, reglas de PIN, nombres, frases, esquemas de entrada), vive en `packages/shared` y ambas lo importan. No se copia una función de `apps/web` a `apps/mobile` ni al revés: así no pueden divergir.
- **Los tokens de diseño se leen de `@poker/design`.** Ni la web ni la app copian valores de color, radio o tipografía. Si falta un token, se agrega al paquete.
- Lo que depende de Prisma, Next o React Native se queda en su app.

---

## 3. Convenciones de la API (vigentes)

Todas las rutas viven en `apps/web/src/app/api/**/route.ts`.

### Errores: `AppError` + `withErrorHandler`
Carpeta `apps/web/src/lib/errors/` (se importa de `@/lib/errors`):
- `app-error.ts`: clase `AppError` (status, `code` estable, `errors[]`, `details`, `errorId`). Fábricas: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `validation`, `tooManyRequests`, `internal`, `unavailable`.
- `error-handler.ts`: `withErrorHandler(handler)` y `errorResponse(error, url)`. Convierte `AppError` en su status; `ZodError` en 422 `VALIDATION_ERROR` con `errors[]`; Prisma `P2025` en 404 y `P2002` en 409 `DUPLICATE`; cualquier otra cosa en 500 con mensaje fijo (el detalle solo va en `debug` y solo en development). Es genérico en el contexto, así conserva el tipo de `params` de Next 16.
- `types.ts`: `ErrorDetail`, `ErrorResponse`, `SuccessResponse<T>`.

**Toda ruta exporta sus handlers envueltos en `withErrorHandler`** (hoy, las 74). Los errores se lanzan, no se devuelven a mano.

### Formato de respuesta
- Correcta: `{ success: true, data }`.
- Error: `{ success: false, error: { code, message, errors?, details?, errorId, timestamp, path } }`. `code` es estable (los clientes deciden con él), `message` va en español y se puede mostrar, `errorId` sirve para buscar en los logs.

### Helpers de ruta (`apps/web/src/lib/http.ts`)
- `ok(data, status | init)`: respuesta correcta.
- `parseBody(request, schema)`, `parseQuery(request, schema)`, `parseParams(await params, schema)`: validan con Zod (body no JSON: 400 `INVALID_JSON`).

### Validación
Esquemas Zod 4 en `packages/shared/src/schemas/`, mensajes en español. Nada de validar a mano lo que puede validar un esquema.

### Autenticación (actual)
`Authorization: Bearer PIN:<clave>` (o la adminKey), validado en `apps/web/src/lib/api-auth.ts` (bcrypt con caché en memoria). Al inicio de cada handler: `requireUser(request)` o `requireComision(request)` (lanzan `AppError` 401/403). `withAuth` / `withComisionAuth` siguen existiendo y se combinan por dentro con `withErrorHandler`.

### Plantilla de ruta
```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireComision } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseParams } from '@/lib/http'
import { idParamsSchema, entityInputSchema } from '@poker/shared' // entityInputSchema: el de tu área

export const PATCH = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireComision(request)
    const { id } = parseParams(await params, idParamsSchema)
    const input = await parseBody(request, entityInputSchema)

    const entity = await prisma.entity.findUnique({ where: { id } })
    if (!entity) throw AppError.notFound('No existe', 'ENTITY_NOT_FOUND')

    return ok(await prisma.entity.update({ where: { id }, data: input }))
  }
)
```

### Clientes: siempre por el desenvolvedor
Ningún cliente hace `await res.json()` a pelo sobre la API: pasa por el desenvolvedor, que entiende el formato nuevo y el viejo mientras convivan.
- Web: `apps/web/src/lib/api-client.ts` → `readApiJson(res)` (reemplazo de `res.json()`, no lanza; el error sale aplanado con `error` como texto), `parseApiResponse(res)` y `apiFetch(url)` (lanzan `ApiError`), `unwrapApiBody(body)`.
- Móvil: `apps/mobile/src/lib/api.ts` → `apiFetch(path, init)` (manda la credencial, desenvuelve `data`, lanza `ApiError` con `code`, `errorId`, `errors`, `details`; 401 cierra sesión, 403 no) y `fetcher` para SWR.

---

## 4. Orden de despliegue cuando cambia el formato de respuesta

**Primero la app móvil, después la API.** La web se despliega junto con la API (mismo Vercel) y no tiene ese problema; la app instalada en los teléfonos sí. Por eso:

1. Publicar la versión de la app cuyo cliente (`apiFetch`) acepta el formato viejo y el nuevo, y esperar a que esté instalada.
2. Recién entonces desplegar la API con el formato nuevo.
3. Quitar la compatibilidad con el formato viejo solo cuando ninguna versión en uso lo necesite.

---

## 5. Diseño

Clean Poker. Fuente única: `@poker/design`. Detalle de paleta, tipografía, forma y tono por pantalla en `CLAUDE.md` y `docs/mobile/AGENT-BRIEF.md`. Web: variables `--cp-*` de `clean-poker-tokens.css`. App: clases NativeWind con el mismo nombre de variable y `useCP()` para colores por JS.

---

## 6. Convenciones generales

1. **Errores**: `AppError` y `withErrorHandler` en todas las rutas.
2. **Validación**: Zod para la entrada, esquemas en `@poker/shared`, mensajes en español.
3. **Respuestas API**: `{ success: true, data }` o `ErrorResponse`.
4. **Compartido**: lógica pura y validación en `@poker/shared`; tokens en `@poker/design`.
5. **Base de datos**: Prisma; snake_case para columnas nuevas con `@map`, camelCase en TypeScript. Cambios de esquema solo aditivos y probados primero en la rama Neon de QA (nunca contra producción).
6. **Autenticación**: verificar sesión al inicio de cada handler; **autorización**: verificar rol cuando haga falta.
7. **Componentes web**: `"use client"` solo cuando sea necesario.
8. **TypeScript estricto**; alias `@/*` → `./src/*` en cada app.
9. **Antes de reportar**: `npm run typecheck`, `npm test`, `npm run lint:web` en verde (y lo que pida el brief del área).

---

## 7. Pendiente / diferido

Objetivo del boilerplate que **aún no se aplica**. Decisión del usuario: primero Zod + errores + formato (hecho); lo demás queda para después. Cada punto es una tarea propia. Mientras tanto, el código nuevo sigue el estado actual y no introduce una tercera forma.

| # | Objetivo | Estado actual |
|---|----------|---------------|
| 7.1 | **NextAuth.js 5** (Google OAuth + Credentials, sesión JWT, usuarios pre-registrados) | PIN propio: `Bearer PIN:<clave>` / adminKey validados en `apps/web/src/lib/api-auth.ts`; la app guarda la clave en SecureStore. |
| 7.2 | **UUID v7** para todos los IDs (ordenables por tiempo) | `Player` usa `cuid()`; el resto de tablas, `Int autoincrement()`. `errorId` usa `crypto.randomUUID()` (v4). No hay dependencia `uuid`. |
| 7.3 | **Prisma 7** con `@prisma/adapter-pg` y `prisma.config.ts` | Prisma 6.15, `apps/web/prisma/schema.prisma`, cliente en `apps/web/src/lib/prisma.ts`. |
| 7.4 | **Módulos Clean Architecture** (`src/modules/<módulo>/{domain,application,infrastructure}`, repositorios y casos de uso) | Parcial: `apps/web/src/{domain,application,infrastructure}` para player, tournament y elimination, usado solo por las rutas de eliminaciones. El resto de rutas usa Prisma directo + `src/lib`; la lógica pura está en `@poker/shared`. |
| 7.5 | **`src/config/env.ts`**: validar el entorno con Zod al arrancar | No existe; se lee `process.env` directamente (la app, `EXPO_PUBLIC_API_URL`). |
| 7.6 | **pnpm** como gestor | npm workspaces con `package-lock.json`. |

---

## Anexo: plantillas del objetivo

Referencia para cuando se haga cada migración de la sección 7. No es el estado actual del repo.

### env.ts (7.5)
```typescript
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXTAUTH_URL: z.url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Variables de entorno inválidas:", result.error.issues);
    throw new Error("Invalid environment variables");
  }
  return result.data;
}

export const env = validateEnv();
```

### Prisma 7 client singleton (7.3)
```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/config/env";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### NextAuth 5 (7.1)
```typescript
// src/lib/auth/auth.config.ts
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { env } from "@/config/env";
import { verifyPassword } from "./password"; // bcrypt.compare, SALT_ROUNDS = 12
import { prisma } from "@/lib/prisma";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }),
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email as string } });
        if (!user?.password) return null;
        if (!(await verifyPassword(credentials.password as string, user.password))) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    // Solo usuarios pre-registrados y activos
    async signIn({ user }) {
      const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
      return !!dbUser && dbUser.status === "ACTIVE";
    },
    async jwt({ token, user }) {
      if (user) Object.assign(token, { id: user.id, role: user.role, status: user.status });
      return token;
    },
    async session({ session, token }) {
      if (session.user) Object.assign(session.user, { id: token.id, role: token.role, status: token.status });
      return session;
    },
  },
  session: { strategy: "jwt" },
};
```
La protección de páginas va en `src/proxy.ts` (Next 16), no en `middleware.ts`. La app móvil necesitará un flujo propio (token para la API), a definir en esa tarea. El esquema Prisma necesitará los modelos de NextAuth (`User`, `Account`, `Session`, `VerificationToken`) con IDs UUID v7 y columnas `@map` en snake_case.

### Módulo Clean Architecture (7.4)
```
src/modules/<módulo>/
├── domain/
│   ├── entities/        # interfaces puras TypeScript
│   └── repositories/    # contratos (IEntityRepository)
├── application/
│   ├── dto/             # re-exporta o extiende esquemas de @poker/shared
│   └── use-cases/       # lógica que necesita repositorio; lanza AppError
└── infrastructure/
    └── repositories/    # implementaciones Prisma (id: uuidv7())
```
```typescript
export class CreateEntityUseCase {
  constructor(private readonly repository: IEntityRepository) {}

  async execute(dto: CreateEntityDto): Promise<Entity> {
    if (await this.repository.findByName(dto.name)) {
      throw AppError.conflict("Ya existe una entidad con este nombre", "ENTITY_EXISTS");
    }
    return this.repository.create(dto);
  }
}
```
La ruta queda igual que la plantilla de la sección 3, pero llama al caso de uso en lugar de a Prisma. La lógica pura sigue yendo a `@poker/shared`; el módulo solo agrega lo que depende de la base.
