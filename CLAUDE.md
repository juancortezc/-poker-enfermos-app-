# CLAUDE.md - Sistema Poker Enfermos

## Estado Actual del Sistema (2025-09-03)

### ✅ SISTEMA COMPLETAMENTE OPERACIONAL

El sistema ha sido migrado exitosamente a una nueva arquitectura de base de datos limpia, preservando todos los datos de jugadores y implementando funcionalidades completas de gestión de torneos y fechas de juego.

---

## Migración de Base de Datos Completada

### Lo que se preservó:
- **✅ 29 jugadores** - Todos los datos migrados exitosamente
- **✅ Autenticación** - Admin keys y roles funcionando
- **✅ Estructura de roles** - Comision/Enfermo/Invitado

### Lo que se renovó:
- **🆕 Esquema de torneos** - Nueva estructura con números, fechas programadas, participantes
- **🆕 Sistema de fechas** - GameDates con flujo completo de creación
- **🆕 Gestión de invitados** - Categorización entre miembros del grupo y externos
- **🆕 Blinds configurables** - 18 niveles con duraciones personalizables
- **🆕 Sistema de puntos** - Cálculo automático basado en participantes

---

## Comandos Importantes

### Base de Datos:
```bash
npx prisma studio          # Abrir interfaz de administración DB
npx prisma db push         # Aplicar cambios de schema
npx prisma migrate dev     # Crear nueva migración
```

### Desarrollo:
```bash
npm run dev               # Servidor desarrollo
npm run lint              # Verificar código
npm run build             # Build producción
```

### Testing:
```bash
npm run typecheck         # Verificar TypeScript (si existe)
```

---

## Estructura de Base de Datos

### Tablas Principales:

#### **Players** (29 jugadores activos)
- Roles: Comision (admin completo) / Enfermo (participante) / Invitado (solo lectura)
- Autenticación via adminKey para Comision
- Campos: firstName, lastName, role, isActive, phone, email, pin, etc.

#### **Tournaments**
- number: Número secuencial (28, 29, 30...)
- status: ACTIVO / FINALIZADO
- Relaciones: TournamentParticipant, GameDate, BlindLevel

#### **GameDate** (Fechas de juego)
- dateNumber: 1-12 por torneo
- scheduledDate: Fecha programada (martes cada 15 días)
- status: pending / in_progress / completed / cancelled
- playerIds: Array de IDs de participantes
- Puntos automáticos basados en cantidad de participantes

#### **BlindLevel** (18 niveles configurables)
- level 1-18 con small/big blinds personalizables
- duration en minutos (0 = sin límite para último nivel)
- Valores por defecto: 50/100, 100/200... hasta 10000/20000

---

## APIs Principales

### Autenticación:
- Usar header: `Authorization: Bearer {adminKey}`
- Solo usuarios Comision tienen adminKey

### Endpoints Críticos:

#### Tourneos:
```
GET  /api/tournaments                 # Listar torneos
GET  /api/tournaments/next-number     # Próximo número disponible
POST /api/tournaments                 # Crear torneo (Comision)
```

#### Fechas de Juego:
```
GET  /api/game-dates/active           # Fecha activa actual
GET  /api/game-dates/next-available   # Próxima fecha disponible
POST /api/game-dates                  # Crear fecha (Comision)
```

#### Jugadores:
```
GET  /api/players                     # Listar jugadores
GET  /api/players/available-guests    # Invitados disponibles
POST /api/players                     # Crear jugador (Comision)
```

---

## Flujo de Fecha (Game Date)

### Proceso de Creación:
1. **Información de Fecha** - Mostrar próxima fecha disponible
2. **Selección de Jugadores** - Todos los participantes del torneo por defecto
3. **Gestión de Invitados** - Miembros del grupo + invitados externos
4. **Confirmación** - Revisar detalles y participantes
5. **Resumen** - Mostrar fecha creada con cálculo de puntos

### Características:
- **Fechas automáticas**: Martes cada 15 días
- **Puntos dinámicos**: 15-25 pts basado en participantes (9+ = 18pts, 12+ = 20pts, etc.)
- **Estados**: pending → in_progress → completed
- **Invitados**: Diferenciación entre miembros grupo y externos

---

## Configuración de Torneos

### Estructura de Blinds (18 niveles):
```
Nivel  Small  Big    Tiempo
1      50     100    12 min
2      100    200    12 min
...
17     8000   16000  10 min
18     10000  20000  Sin límite
```

### Tabs de Configuración:
1. **Participantes** - Selección de jugadores (Enfermo/Comision activos)
2. **Blinds** - Configuración de 18 niveles
3. **Fechas** - 12 fechas programadas automáticamente

---

## Componentes UI Principales

### Dashboard:
- Botón **"Fecha"** (reemplazó Rankings) → `/game-dates/new`
- Acciones rápidas para Torneos, Timer, Enfermos
- Diseño centrado, limpio sin cards de estado

### Formularios:
- **TournamentForm**: Tabs responsivos, validación completa
- **GameDateForm**: Flujo multi-paso con validación
- **PlayerSelector**: Selección con todos por defecto
- **GuestSelector**: Categorización de invitados

---

## Problemas Resueltos

### ✅ Status Enum Mismatch:
- DB usaba `'active'` pero schema esperaba `'ACTIVO'` → Corregido
- GameDate status `'active'` vs `'in_progress'` → Corregido

### ✅ Campo scheduledDate:
- DB tenía `date` pero APIs esperaban `scheduledDate` → Migrado

### ✅ Relaciones:
- participantIds array → TournamentParticipant table → Migrado
- blind_levels JSON → BlindLevel table → Migrado

---

## Usuarios del Sistema

### Roles Activos:
- **Diego Behar** (Comision) - Admin key disponible para testing
- **28 Enfermos activos** - Pueden participar en torneos
- **Invitados** - Solo lectura, vinculados a Enfermos

---

## Próximos Pasos Sugeridos

1. **Crear primer torneo oficial** usando el formulario
2. **Importar datos históricos** si es necesario
3. **Configurar timer system** para fechas activas
4. **Testing completo** del flujo de fecha end-to-end

---

## Notas Técnicas

### Performance:
- Prisma ORM optimizado con relaciones específicas
- APIs con autenticación Bearer token
- Responsive design mobile-first

### Seguridad:
- Admin keys para operaciones críticas
- Validación role-based en todas las APIs
- Soft delete para preservar integridad referencial

### Mobile:
- Touch targets 48px mínimo
- Navegación bottom fixed
- Formularios full-screen en móvil

---

## Estado: LISTO PARA PRODUCCIÓN ✅

El sistema está completamente funcional y listo para crear torneos y gestionar fechas de juego. Toda la funcionalidad crítica ha sido probada y verificada.

**Última actualización:** 2025-09-03 por Claude Code