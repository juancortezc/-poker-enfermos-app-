# Next.js Clean Architecture Boilerplate

Este documento describe la arquitectura completa de un proyecto Next.js con Clean Architecture y Domain-Driven Design. Usa este prompt para recrear la estructura en futuros proyectos.

---

## Prompt para Crear el Boilerplate

```
Crea un proyecto Next.js 16+ con las siguientes características y arquitectura:

## Stack Tecnológico

- Next.js 16+ (App Router)
- TypeScript 5
- PostgreSQL con Prisma 7
- NextAuth.js 5 (beta) con Google OAuth y Credentials
- Zod 4 para validación
- React Hook Form 7
- Tailwind CSS 4
- Lucide React para iconos
- pnpm como gestor de paquetes
- UUIDs v7 para todos los IDs (time-sortable)

## Estructura de Carpetas

```
proyecto/
├── app/                          # Next.js App Router
│   ├── api/                      # API endpoints (RESTful)
│   │   ├── auth/[...nextauth]/   # NextAuth handlers
│   │   └── [module]/             # Rutas por módulo
│   ├── login/                    # Página de login
│   ├── (dashboard)/              # Route group protegido
│   │   ├── layout.tsx            # Layout con sidebar y header
│   │   ├── dashboard/page.tsx    # Página principal
│   │   └── [module]/             # Páginas por módulo
│   ├── layout.tsx                # Root layout (providers)
│   └── page.tsx                  # Landing page
│
├── src/
│   ├── config/
│   │   └── env.ts                # Validación de environment con Zod
│   │
│   ├── lib/
│   │   ├── prisma/
│   │   │   └── client.ts         # Prisma client singleton
│   │   ├── auth/
│   │   │   ├── auth.config.ts    # Configuración NextAuth
│   │   │   ├── auth.ts           # Instancia NextAuth
│   │   │   ├── prisma-adapter.ts # Adapter personalizado con UUID
│   │   │   └── password.ts       # Utilidades bcrypt
│   │   └── errors/
│   │       ├── types.ts          # Interfaces ErrorResponse
│   │       ├── app-error.ts      # Clase AppError
│   │       └── error-handler.ts  # withErrorHandler wrapper
│   │
│   ├── components/
│   │   ├── layout/               # Sidebar, Header, LogoutButton
│   │   ├── providers/            # ThemeProvider
│   │   └── ui/                   # Button, Card, Input, Modal, Table, etc.
│   │
│   └── modules/                  # Módulos de dominio
│       └── [module]/
│           ├── domain/
│           │   ├── entities/     # Interfaces puras TypeScript
│           │   └── repositories/ # Contratos de repositorio
│           ├── application/
│           │   ├── dto/          # Schemas Zod de validación
│           │   └── use-cases/    # Lógica de negocio
│           └── infrastructure/
│               └── repositories/ # Implementaciones Prisma
│
├── prisma/
│   ├── schema.prisma             # Esquema de base de datos
│   ├── migrations/               # Migraciones
│   └── seed.ts                   # Datos iniciales
│
├── prisma.config.ts              # Configuración Prisma (en raíz)
├── middleware.ts                 # Protección de rutas NextAuth
├── next.config.ts
├── tsconfig.json
└── .env.example
```

## Configuración de TypeScript

tsconfig.json debe incluir:
- Path alias: "@/*" → "./src/*"
- Strict mode habilitado
- Target: ES2017

## Validación de Environment (src/config/env.ts)

```typescript
import { z } from "zod/v4";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXTAUTH_URL: z.url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.format());
    throw new Error("Invalid environment variables");
  }
  return result.data;
}

export const env = validateEnv();
```

## Sistema de Errores (src/lib/errors/)

### types.ts
```typescript
export interface ErrorDetail {
  field: string;
  message: string;
  code?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: ErrorDetail[];
    errorId: string;
    timestamp: string;
    path: string;
  };
  debug?: {
    description: string;
    stack?: string;
    context?: Record<string, unknown>;
  };
}
```

### app-error.ts
```typescript
import { v7 as uuidv7 } from "uuid";
import { ErrorDetail } from "./types";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors?: ErrorDetail[];
  public readonly errorId: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors?: ErrorDetail[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.errorId = uuidv7();
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code = "BAD_REQUEST") {
    return new AppError(message, 400, code);
  }

  static unauthorized(message: string, code = "UNAUTHORIZED") {
    return new AppError(message, 401, code);
  }

  static forbidden(message: string, code = "FORBIDDEN") {
    return new AppError(message, 403, code);
  }

  static notFound(message: string, code = "NOT_FOUND") {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = "CONFLICT") {
    return new AppError(message, 409, code);
  }

  static validation(errors: ErrorDetail[], message = "Validation failed") {
    return new AppError(message, 422, "VALIDATION_ERROR", errors);
  }

  static internal(message: string, code = "INTERNAL_ERROR") {
    return new AppError(message, 500, code);
  }
}
```

### error-handler.ts
```typescript
import { NextResponse } from "next/server";
import { ZodError } from "zod/v4";
import { AppError } from "./app-error";
import { ErrorResponse } from "./types";
import { env } from "@/config/env";
import { v7 as uuidv7 } from "uuid";

type Handler = (request: Request, context?: unknown) => Promise<Response>;

export function withErrorHandler(handler: Handler): Handler {
  return async (request: Request, context?: unknown) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return createErrorResponse(error, request.url);
    }
  };
}

function createErrorResponse(error: unknown, url: string): NextResponse {
  const path = new URL(url).pathname;
  const isDev = env.NODE_ENV === "development";

  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        errors: error.errors,
        errorId: error.errorId,
        timestamp: new Date().toISOString(),
        path,
      },
    };

    if (isDev) {
      response.debug = {
        description: error.message,
        stack: error.stack,
      };
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    const errors = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    const response: ErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        errors,
        errorId: uuidv7(),
        timestamp: new Date().toISOString(),
        path,
      },
    };

    return NextResponse.json(response, { status: 422 });
  }

  // Unknown error
  const response: ErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      errorId: uuidv7(),
      timestamp: new Date().toISOString(),
      path,
    },
  };

  if (isDev && error instanceof Error) {
    response.debug = {
      description: error.message,
      stack: error.stack,
    };
  }

  console.error("Unhandled error:", error);
  return NextResponse.json(response, { status: 500 });
}
```

## Prisma Client Singleton (src/lib/prisma/client.ts)

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/config/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

## Autenticación NextAuth (src/lib/auth/)

### auth.config.ts
```typescript
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { env } from "@/config/env";
import { verifyPassword } from "./password";
import { prisma } from "@/lib/prisma";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;
        const isValid = await verifyPassword(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Verificar que el usuario existe y está activo
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
      });
      if (!dbUser) return false;
      if (dbUser.status !== "ACTIVE") return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
};
```

### password.ts
```typescript
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
```

## Middleware de Protección (middleware.ts)

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/people") ||
    req.nextUrl.pathname.startsWith("/tribes");
  const isOnLogin = req.nextUrl.pathname.startsWith("/login");

  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isOnLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

## Estructura de Módulo (Clean Architecture)

### domain/entities/[entity].entity.ts
```typescript
export enum EntityStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface Entity {
  id: string;
  name: string;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEntityInput {
  name: string;
}

export interface UpdateEntityInput {
  name?: string;
  status?: EntityStatus;
}
```

### domain/repositories/[entity].repository.ts
```typescript
import { Entity, CreateEntityInput, UpdateEntityInput } from "../entities";

export interface IEntityRepository {
  findById(id: string): Promise<Entity | null>;
  findByName(name: string): Promise<Entity | null>;
  findAll(): Promise<Entity[]>;
  create(input: CreateEntityInput): Promise<Entity>;
  update(id: string, input: UpdateEntityInput): Promise<Entity>;
  delete(id: string): Promise<void>;
}
```

### application/dto/[entity].dto.ts
```typescript
import { z } from "zod/v4";

export const createEntityDto = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
});

export const updateEntityDto = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateEntityDto = z.infer<typeof createEntityDto>;
export type UpdateEntityDto = z.infer<typeof updateEntityDto>;
```

### application/use-cases/create-[entity].use-case.ts
```typescript
import { IEntityRepository } from "../../domain/repositories";
import { Entity } from "../../domain/entities";
import { CreateEntityDto } from "../dto";
import { AppError } from "@/lib/errors";

export class CreateEntityUseCase {
  constructor(private readonly repository: IEntityRepository) {}

  async execute(dto: CreateEntityDto): Promise<Entity> {
    const existing = await this.repository.findByName(dto.name);
    if (existing) {
      throw AppError.conflict("Ya existe una entidad con este nombre", "ENTITY_EXISTS");
    }

    return this.repository.create(dto);
  }
}
```

### infrastructure/repositories/prisma-[entity].repository.ts
```typescript
import { v7 as uuidv7 } from "uuid";
import { prisma } from "@/lib/prisma";
import { IEntityRepository } from "../../domain/repositories";
import { Entity, CreateEntityInput, UpdateEntityInput } from "../../domain/entities";

export class PrismaEntityRepository implements IEntityRepository {
  async findById(id: string): Promise<Entity | null> {
    return prisma.entity.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<Entity | null> {
    return prisma.entity.findFirst({ where: { name } });
  }

  async findAll(): Promise<Entity[]> {
    return prisma.entity.findMany({ orderBy: { createdAt: "desc" } });
  }

  async create(input: CreateEntityInput): Promise<Entity> {
    return prisma.entity.create({
      data: {
        id: uuidv7(),
        ...input,
      },
    });
  }

  async update(id: string, input: UpdateEntityInput): Promise<Entity> {
    return prisma.entity.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.entity.delete({ where: { id } });
  }
}
```

### index.ts (exportaciones)
```typescript
// src/modules/[module]/index.ts
export * from "./domain";
export * from "./application";
export * from "./infrastructure";

// src/modules/[module]/domain/index.ts
export * from "./entities";
export * from "./repositories";

// src/modules/[module]/application/index.ts
export * from "./dto";
export * from "./use-cases";

// src/modules/[module]/infrastructure/index.ts
export * from "./repositories";
```

## Patrón de API Routes

```typescript
import { NextResponse } from "next/server";
import { withErrorHandler, AppError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { createEntityDto } from "@/modules/entities";
import { CreateEntityUseCase } from "@/modules/entities";
import { PrismaEntityRepository } from "@/modules/entities";

// GET /api/entities
export const GET = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user) {
    throw AppError.unauthorized("No autenticado", "UNAUTHENTICATED");
  }

  const repository = new PrismaEntityRepository();
  const entities = await repository.findAll();

  return NextResponse.json({ success: true, data: entities });
});

// POST /api/entities
export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user) {
    throw AppError.unauthorized("No autenticado", "UNAUTHENTICATED");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    throw AppError.forbidden("No autorizado", "FORBIDDEN");
  }

  const body = await request.json();
  const dto = createEntityDto.parse(body);

  const repository = new PrismaEntityRepository();
  const useCase = new CreateEntityUseCase(repository);
  const entity = await useCase.execute(dto);

  return NextResponse.json({ success: true, data: entity }, { status: 201 });
});
```

## Esquema Prisma Base

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserStatus {
  ACTIVE
  INACTIVE

  @@map("user_status")
}

enum UserRole {
  SUPER_ADMIN
  USER

  @@map("user_role")
}

model User {
  id            String     @id @default(uuid()) @map("id")
  email         String     @unique @map("email")
  name          String?    @map("name")
  password      String?    @map("password")
  image         String?    @map("image")
  status        UserStatus @default(ACTIVE) @map("status")
  role          UserRole   @default(USER) @map("role")
  emailVerified DateTime?  @map("email_verified")
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")

  accounts Account[]
  sessions Session[]

  @@map("users")
}

model Account {
  id                String  @id @default(uuid()) @map("id")
  userId            String  @map("user_id")
  type              String  @map("type")
  provider          String  @map("provider")
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @map("refresh_token")
  access_token      String? @map("access_token")
  expires_at        Int?    @map("expires_at")
  token_type        String? @map("token_type")
  scope             String? @map("scope")
  id_token          String? @map("id_token")
  session_state     String? @map("session_state")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(uuid()) @map("id")
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime @map("expires")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String   @map("identifier")
  token      String   @unique @map("token")
  expires    DateTime @map("expires")

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

## Scripts package.json

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

## Dependencias Principales

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^7.0.0",
    "@prisma/adapter-pg": "^7.0.0",
    "pg": "^8.16.0",
    "next-auth": "^5.0.0-beta.30",
    "@auth/prisma-adapter": "^3.0.0",
    "zod": "^4.0.0",
    "react-hook-form": "^7.0.0",
    "@hookform/resolvers": "^5.0.0",
    "bcryptjs": "^3.0.0",
    "uuid": "^13.0.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/bcryptjs": "^3.0.0",
    "@types/pg": "^8.0.0",
    "@types/uuid": "^10.0.0",
    "typescript": "^5.0.0",
    "prisma": "^7.0.0",
    "tailwindcss": "^4.0.0",
    "tsx": "^4.0.0"
  }
}
```
```

---

## Checklist para Nuevo Proyecto

1. [ ] Crear proyecto: `pnpm create next-app@latest`
2. [ ] Instalar dependencias listadas
3. [ ] Configurar TypeScript con path alias
4. [ ] Crear estructura de carpetas
5. [ ] Configurar validación de environment
6. [ ] Crear sistema de errores
7. [ ] Configurar Prisma con PostgreSQL
8. [ ] Configurar NextAuth con providers
9. [ ] Crear middleware de protección
10. [ ] Crear componentes UI base
11. [ ] Crear primer módulo siguiendo Clean Architecture
12. [ ] Agregar seed de usuario admin

---

## Convenciones Importantes

1. **IDs**: Siempre UUID v7 (time-sortable)
2. **Base de datos**: snake_case para columnas, camelCase en TypeScript
3. **Errores**: Usar `AppError` y `withErrorHandler` en todas las rutas
4. **Validación**: Zod para DTOs con mensajes en español
5. **Respuestas API**: Formato `{ success: true, data: ... }` o `ErrorResponse`
6. **Usuarios**: Pre-registrados antes de OAuth
7. **Módulos**: Separación estricta domain/application/infrastructure
8. **Componentes**: "use client" solo cuando sea necesario
9. **Autenticación**: Verificar sesión al inicio de cada handler
10. **Autorización**: Verificar rol cuando sea necesario
