# Public API Endpoints - Documentación

## Propósito

Estos endpoints están disponibles sin autenticación para permitir integraciones futuras, widgets públicos, o acceso de solo lectura a información no sensible.

## Endpoints Públicos Mantenidos

### 1. GET `/api/players/[id]/public`

**Propósito**: Información pública de jugador (sin datos sensibles)

**Retorna**:
```typescript
{
  id: string
  firstName: string
  lastName: string
  aliases: string | null
  photoUrl: string | null
  lastVictoryDate: Date | null
  isActive: boolean
}
```

**Excluye**: PIN, email, phone, birthDate

**Casos de uso potenciales**:
- Perfil público compartible (ej: `/jugadores/ABC123`)
- Widget "Jugador del Mes"
- Integraciones con redes sociales
- Mobile app (vista previa de jugadores)

**Status**: ⚠️ En observación - Sin uso actual detectado
**Acción**: Revisar en 30 días. Si no hay uso, considerar eliminación.

---

### 2. GET `/api/tournaments/[id]/dates/public`

**Propósito**: Información básica de fechas de torneo (sin eliminations)

**Retorna**:
```typescript
Array<{
  id: number
  dateNumber: number
  status: string
  scheduledDate: Date
  playerIds: number[]  // Solo IDs, sin datos personales
}>
```

**Excluye**: gameResults, eliminations, player details

**Casos de uso potenciales**:
- Calendario público de fechas
- Widget "Próxima Fecha"
- RSS feed de eventos
- iCal integration

**Status**: ⚠️ En observación - Sin uso actual detectado
**Acción**: Revisar en 30 días. Si no hay uso, considerar eliminación.

---

### 3. GET `/api/proposals-v2/public`

**Propósito**: Propuestas activas para votación pública (T29)

**Retorna**:
```typescript
{
  proposals: Array<{
    id: number
    title: string
    objective: string
    situation: string
    proposal: string
    imageUrl: string | null
    votingClosed: boolean
    createdAt: Date
    createdBy: {
      firstName: string
      lastName: string
      role: string
    }
  }>
}
```

**Casos de uso**:
- Página T29 (EN USO ACTIVO ✅)
- Página de comentarios T29 (EN USO ACTIVO ✅)

**Status**: ✅ EN USO ACTIVO

---

## Endpoints Públicos Eliminados

Durante la auditoría de 2025-10-13 se eliminaron los siguientes endpoints duplicados:

1. ❌ `/api/stats/parent-child/[tournamentId]/public` - 100% duplicado
2. ❌ `/api/tournaments/active/public` - Duplicado sin uso
3. ❌ `/api/tournaments/next` - Retornaba null siempre

---

## Política de Revisión

**Frecuencia**: Trimestral (cada 3 meses)
**Próxima revisión**: 2025-01-13

**Criterios para mantener un endpoint público**:
1. ✅ Tiene uso activo en frontend
2. ✅ Tiene uso documentado en integraciones externas
3. ✅ Tiene plan de uso futuro cercano (< 3 meses)

**Criterios para eliminar**:
1. ❌ Sin uso detectado por 90+ días
2. ❌ Sin plan de uso futuro
3. ❌ Datos duplicados disponibles en otro endpoint

---

## Notas de Seguridad

Todos los endpoints públicos DEBEN:
- ✅ Excluir datos sensibles (PINs, emails, phones)
- ✅ Implementar rate limiting (TODO: pendiente)
- ✅ Logear accesos para análisis de uso
- ✅ Validar parámetros de entrada
- ✅ Retornar solo datos públicos por diseño

---

**Última actualización**: 2025-10-13
**Responsable**: Tech Team
