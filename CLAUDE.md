# CLAUDE.md - Sistema Poker Enfermos

## 🤝 Filosofía de Desarrollo y Colaboración

### Perfil del Desarrollador
Eres un desarrollador fullstack senior, experto en:
- **React & TypeScript** - Construcción de interfaces reactivas y type-safe
- **Prisma & Node.js** - Backend robusto con ORM moderno
- **Desarrollo de Apps Potentes** - Máximo resultado con código mínimo

### Principios Fundamentales
- **Mobile-First UX** - La experiencia móvil es clave para la calidad del producto final
- **APIs Robustas** - Dominio profundo de APIs, funciones TypeScript custom, manejo de errores
- **Testing Riguroso** - Pruebas exhaustivas antes de aprobación
- **Código Eficiente** - Lograr más con menos, sin sacrificar claridad

### Metodología de Trabajo
- **Partnership** - Trabajamos como socios, no como cliente-proveedor
- **Coordinación Constante** - Siempre requerir alineación para entender:
  - La experiencia deseada
  - La lógica de negocio
  - El output esperado
- **Comunicación Clara** - Ser extremadamente claro y práctico
- **Explicaciones Visuales** - Proveer diagramas y ejemplos visuales cuando sea posible
- **Mejora Continua** - Siempre sugerir mejores formas de lograr los objetivos

### Enfoque de Desarrollo
```
Usuario → Experiencia → Lógica → Implementación → Testing → Refinamiento
```

---

## Estado Actual del Sistema (2025-09-05)

### ✅ SISTEMA COMPLETAMENTE OPERACIONAL

El sistema ha sido migrado exitosamente a una nueva arquitectura de base de datos limpia, preservando todos los datos de jugadores e implementando funcionalidades completas de gestión de torneos y fechas de juego. 

**Últimas actualizaciones:**
- 🆕 Sistema de gestión de torneos con vista general (TournamentOverview)
- 🆕 Configuración de fechas de juego single-page (GameDateConfigPage)
- 🆕 Estados de torneo: PROXIMO → ACTIVO → FINALIZADO
- 🆕 Navbar dinámico con botón Registro condicional

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

## Sistema de Gestión de Torneos (NEW)

### TournamentOverview - Vista General:
- **Torneo Activo**: 4 cards interactivos (Participantes, Próxima Fecha, Fecha Inicio, Fecha Fin)
- **Próximo Torneo**: Sección con botón Crear/Editar según existencia
- **Botón ACTIVAR**: Habilitado solo cuando no hay torneo activo
- **Estados**: PROXIMO → ACTIVO → FINALIZADO
- **Restricciones**: Solo 1 torneo ACTIVO y 1 PROXIMO permitidos

### Flujo de Torneo Completo:
1. **Creación**: Siempre como PROXIMO desde `/tournaments/new`
2. **Activación**: PROXIMO → ACTIVO cuando no hay torneo activo
3. **Completar**: Via "Fecha Fin" con opciones:
   - Modificar fecha final
   - Terminar torneo (requiere escribir "CONFIRMO")
4. **Cancelación**: Botón X rojo con confirmación escrita

### APIs de Torneo:
```
GET  /api/tournaments/active          # Torneo activo actual
GET  /api/tournaments/next            # Próximo torneo (PROXIMO)
POST /api/tournaments/[id]/activate   # Activar torneo PROXIMO
POST /api/tournaments/[id]/complete   # Completar/modificar torneo
```

---

## Configuración de Fechas (NEW)

### GameDateConfigPage - Single Page:
- **Dropdown de fechas**: Solo fechas no completadas del torneo activo
- **Toggle Enfermos/Invitados**: Con contadores de participantes
- **Selección por defecto**: Participantes del torneo pre-seleccionados
- **Date picker**: Modificar fecha programada
- **Botón ACTIVAR**: Crea y activa la fecha de juego

### Flujo de Configuración:
1. **Dashboard** → Botón "Fecha" → `/game-dates/config`
2. **Seleccionar fecha** del dropdown (carga participantes por defecto)
3. **Toggle entre tabs**:
   - Enfermos: Participantes del torneo + adicionales
   - Invitados: Todos los invitados disponibles
4. **CREAR invitado**: Navega con `returnTo` para preservar estado
5. **ACTIVAR**: Crea GameDate con participantes seleccionados

### Navbar Dinámico:
- **Botón Registro**: Aparece solo cuando hay fecha activa
- **Solo para Comision**: Control de acceso por rol
- **Actualización automática**: Check cada 30 segundos

---

## Componentes UI Principales

### Dashboard:
- Botón **"Fecha"** → `/game-dates/config` (nueva página single-page)
- Botón **"Torneos"** → `/tournaments/overview` (vista general)
- Acciones rápidas para Timer, Enfermos (Admin)
- Diseño centrado, limpio sin cards de estado

### Formularios:
- **TournamentForm**: Tabs responsivos, validación completa, sin iconos en móvil
- **GameDateConfigPage**: Single-page para configuración de fechas (NEW)
- **TournamentOverview**: Vista general con cards interactivos (NEW)
- **TournamentStartPage**: Creación simplificada de torneos
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

## Mejoras Recientes (2025-09-05)

### Sistema de Eliminaciones:
- ✅ **Página de Registro** (`/registro`): Interfaz completa para registrar eliminaciones en vivo
- ✅ **APIs de eliminaciones**: POST, GET, PUT con validaciones completas
- ✅ **Auto-completado**: Cuando position = 2, se declara ganador automáticamente
- ✅ **Tabla de puntos corregida**: Lógica correcta con máximo 30 puntos por fecha
- ✅ **Botón dinámico**: "Registro" aparece en navbar solo cuando hay fecha activa

### Sistema de Ranking:
- ✅ **Tabla de puntos nueva**: Implementada según especificaciones exactas
- ✅ **Ranking por torneo**: Solo jugadores registrados, excluye invitados
- ✅ **TournamentRankingTable**: Componente elegante con fechas dinámicas
- ✅ **Widget Dashboard**: Top 5 jugadores en vista compacta
- ✅ **Página completa**: `/ranking` con tabla completa y scroll horizontal
- ✅ **Admin puntos**: `/admin/points` para gestión de tabla de puntos

### Torneos:
- ✅ **Estados de torneo**: PROXIMO → ACTIVO → FINALIZADO
- ✅ **Vista general**: TournamentOverview con cards interactivos
- ✅ **Restricciones**: Solo 1 ACTIVO y 1 PROXIMO permitidos
- ✅ **Flujo completo**: Crear → Activar → Completar/Cancelar
- ✅ **Mobile UX**: Tabs sin iconos
- ✅ **Tabla de blinds móvil**: Formato compacto tipo Excel (50/100 - 12min)

### Fechas de Juego:
- ✅ **Single-page config**: Reemplaza flujo multi-paso
- ✅ **Toggle Enfermos/Invitados**: Con contadores visuales
- ✅ **Date picker integrado**: Modificar fechas programadas
- ✅ **Estado preservado**: Return navigation para crear invitados
- ✅ **Navbar dinámico**: Botón Registro condicional

### APIs Nuevas:
```
GET  /api/tournaments/active
GET  /api/tournaments/next  
POST /api/tournaments/[id]/activate
POST /api/tournaments/[id]/complete
GET  /api/game-dates/available-dates
POST /api/eliminations
GET  /api/eliminations/game-date/[id]
PUT  /api/eliminations/[id]
GET  /api/game-dates/[id]/live-status
GET  /api/tournaments/[id]/ranking
```

---

## Próximos Pasos Sugeridos

1. **Implementar página Registro** para fecha activa
2. **Sistema de Timer** integrado con fecha activa
3. **Rankings y estadísticas** de torneos
4. **Notificaciones** para cambios de fecha

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

El sistema está completamente funcional con gestión avanzada de torneos, configuración de fechas single-page, y navegación dinámica. Toda la funcionalidad crítica ha sido probada y verificada con datos reales.

**Última actualización:** 2025-09-05 por Claude Code