# Mejoras en Sistema de Creación de Torneos

**Fecha:** 2025-10-08
**Problema:** Error al intentar crear Torneo 29

## Verificaciones Realizadas

### 1. Estado de Base de Datos
✅ **T28 está FINALIZADO** - No bloqueará creación de T29
✅ **No hay torneos ACTIVOS** - No hay restricción por torneo activo
✅ **T29 no existe** - No hay registros parciales bloqueando

### 2. Revisión de Código
✅ **Campo participantIds existe en schema** - Línea 61 de schema.prisma
✅ **Validaciones del API funcionan correctamente**
✅ **Estructura del formulario es correcta**

## Mejoras Implementadas

### 1. Sincronización de Blind Levels

**Problema:**
Discrepancia entre backend y frontend en duración del nivel 12.

**Antes:**
```typescript
// Backend (route.ts)
{ level: 12, smallBlind: 2000, bigBlind: 4000, duration: 16 }

// Frontend (TournamentForm.tsx)
{ level: 12, smallBlind: 2000, bigBlind: 4000, duration: 10 }
```

**Después:**
```typescript
// Ambos ahora usan duration: 10
{ level: 12, smallBlind: 2000, bigBlind: 4000, duration: 10 }
```

**Archivo modificado:**
`src/app/api/tournaments/route.ts` - Línea 190

---

### 2. Mejor Manejo de Errores

**Problema:**
Cuando falla la creación, el error no se muestra claramente.

**Mejoras implementadas:**

```typescript
// Logging detallado en consola
console.error('❌ Error creating tournament:', {
  status: response.status,
  statusText: response.statusText,
  error: errorMessage,
  submitData: {
    number: submitData.number,
    datesCount: submitData.gameDates.length,
    participantsCount: submitData.participantIds.length,
    blindLevelsCount: submitData.blindLevels.length
  }
})

// Toast notification para usuario
toast.error(errorMsg)
```

**Archivo modificado:**
`src/components/tournaments/TournamentForm.tsx` - Líneas 323-357

---

## Cómo Crear el Torneo 29

### Paso 1: Acceder al Menú
1. Ir a `/tournaments` (menú Torneos)
2. Click en "Nuevo Torneo"

### Paso 2: Confirmar Número
1. Verás el número 29 auto-sugerido
2. Click en "Continuar"

### Paso 3: Configurar Torneo
1. **Participantes:** Todos los Enfermos y Comisión activos estarán pre-seleccionados
2. **Fechas:**
   - Ingresa la primera fecha
   - Las otras 11 se generarán automáticamente (lunes cada 2 semanas)
   - Puedes ajustar manualmente cualquier fecha
3. **Blind Levels:** Ya están configurados por defecto (18 niveles)

### Paso 4: Guardar
1. Click en "Crear Torneo"
2. El sistema validará:
   - Número de torneo único
   - 12 fechas completas
   - Al menos 1 participante
   - No hay otro torneo ACTIVO
3. Si todo es correcto, se creará y redirigirá a `/tournaments`

---

## Posibles Errores y Soluciones

### Error: "Ya existe un torneo con el número 29"

**Causa:** Hay un registro de T29 en la base de datos.

**Solución:**
```bash
# Verificar si existe T29
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const t29 = await prisma.tournament.findUnique({ where: { number: 29 } });
console.log(t29 ? 'T29 existe' : 'T29 no existe');
await prisma.\$disconnect();
"

# Si existe y es un registro erróneo, eliminarlo (solo Admin)
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
await prisma.tournament.delete({ where: { number: 29 } });
console.log('T29 eliminado');
await prisma.\$disconnect();
"
```

---

### Error: "Ya existe un torneo activo"

**Causa:** Hay otro torneo con status ACTIVO.

**Solución:**
```bash
# Ver torneos activos
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const active = await prisma.tournament.findMany({
  where: { status: 'ACTIVO' },
  select: { number: true, name: true, status: true }
});
console.log('Torneos ACTIVOS:', active);
await prisma.\$disconnect();
"

# Si T28 u otro debe finalizarse:
# Ir a /admin/tournaments, seleccionar el torneo, y marcarlo como FINALIZADO
```

---

### Error: "Debe programar exactamente 12 fechas"

**Causa:** Alguna fecha quedó vacía o inválida.

**Solución:**
1. Revisar que las 12 fechas tengan valores
2. Usar el selector de fecha, no escribir manualmente
3. Si persiste, recargar la página y volver a intentar

---

### Error: "Debe seleccionar al menos un participante"

**Causa:** Se deseleccionaron todos los participantes.

**Solución:**
1. En la pestaña "Participantes", seleccionar al menos un jugador
2. Por defecto, todos los Enfermos y Comisión activos vienen pre-seleccionados

---

## Debug Mode

Si el error persiste después de estas mejoras, el sistema ahora logea información detallada en la consola del navegador:

### Abrir DevTools
1. F12 o Click derecho → Inspeccionar
2. Pestaña "Console"

### Buscar el error
Aparecerá con este formato:
```
❌ Error creating tournament: {
  status: 400,
  statusText: "Bad Request",
  error: "Mensaje de error específico",
  submitData: {
    number: 29,
    datesCount: 12,
    participantsCount: 19,
    blindLevelsCount: 18
  }
}
```

---

## Testing

### Comandos Útiles

```bash
# Verificar estado del sistema
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const tournaments = await prisma.tournament.findMany({
  select: { number: true, status: true }
});
console.log('Torneos:', tournaments);

const t29 = await prisma.tournament.findUnique({ where: { number: 29 } });
console.log('T29:', t29 ? 'Existe' : 'No existe');

await prisma.\$disconnect();
"

# Verificar jugadores activos
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const players = await prisma.player.findMany({
  where: {
    isActive: true,
    role: { in: ['Enfermo', 'Comision'] }
  },
  select: { firstName: true, lastName: true, role: true }
});

console.log(\`Jugadores activos: \${players.length}\`);
await prisma.\$disconnect();
"
```

---

## Archivos Modificados

1. **src/app/api/tournaments/route.ts**
   - Línea 190: Corrección duración blind level 12

2. **src/components/tournaments/TournamentForm.tsx**
   - Líneas 323-357: Mejor logging y manejo de errores
   - Línea 357: Toast notification para errores

---

## Recomendaciones

### Para el Usuario
1. **Siempre revisar la consola** si hay error
2. **Copiar el mensaje de error completo** antes de reportar
3. **Verificar que T28 esté FINALIZADO** antes de crear T29

### Para Desarrollo Futuro
1. **Agregar validación de fechas solapadas**: Evitar fechas que coincidan entre torneos
2. **Guardar drafts automáticos**: Ya existe para calendario, extender a participantes
3. **Preview antes de crear**: Mostrar resumen de configuración antes de guardar
4. **Permitir edición post-creación**: Actualmente solo se puede crear, no editar estructura básica

---

**Status**: ✅ MEJORADO
**Build**: ✅ Compilando correctamente
**Ready**: ✅ Listo para crear T29
