# ✅ FIX TIMER DESPLEGADO - Instrucciones de Verificación

**Fecha**: 2025-10-13
**Status**: 🚀 DESPLEGADO A PRODUCCIÓN
**Commit**: `7f3e7b3`

---

## 🔴 PROBLEMA ORIGINAL

### Síntomas
- ❌ Botón "INICIAR FECHA" NO aparecía en `/registro`
- ❌ Error en console: `GET /api/timer/game-date/13 404 (Not Found)`
- ❌ Error SWR: `SWR Error: {key: '/api/timer/game-date/13'...}`
- ❌ Timer bloqueado, imposible iniciar fechas de juego

### Causa Raíz
1. **Props incorrectas** en TimerDisplay: componente esperaba `timeRemaining` y `currentBlind`, pero se le pasaban también `formattedTime` y `status` que no existían en la interface
2. **Hook cargando timer prematuramente**: `useTimerStateById` se llamaba siempre, incluso cuando `status='CREATED'` (antes de que exista el timer)
3. **Timer solo existe después de iniciar**: El TimerState se crea en DB cuando se presiona "INICIAR FECHA", no antes

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Fix 1: TimerDisplay Component Mejorado
**Archivo**: `src/components/registro/TimerDisplay.tsx`

```typescript
interface TimerDisplayProps {
  timeRemaining: number
  formattedTime?: string      // ✅ NUEVO (opcional)
  status?: 'active' | 'paused' | 'inactive'  // ✅ NUEVO (opcional)
  currentBlind?: { smallBlind: number, bigBlind: number }
}
```

**Mejoras**:
- ✅ Props opcionales para retrocompatibilidad
- ✅ Calcula tiempo internamente si no se pasa `formattedTime`
- ✅ Visual de pausa: icono ⏸ + opacity 70%
- ✅ Animación pulse cuando tiempo < 1 minuto

### Fix 2: Hook Condicionado
**Archivo**: `src/app/registro/page.tsx` (línea 59)

```typescript
// ANTES - Siempre cargaba timer (causaba 404)
const { ... } = useTimerStateById(activeGameDate?.id ?? null)

// DESPUÉS - Solo carga si está in_progress
const timerGameDateId = activeGameDate?.status === 'in_progress'
  ? activeGameDate.id
  : null
const { ... } = useTimerStateById(timerGameDateId)
```

**Beneficio**: Evita error 404 cuando gameDate aún no ha iniciado

---

## 🧪 VERIFICACIÓN EN PRODUCCIÓN (REQUERIDA)

### ⚠️ IMPORTANTE: TESTING MANUAL OBLIGATORIO

Vercel habrá deployado automáticamente (~3-5 minutos después del push).
**URL**: https://poker-enfermos.vercel.app/registro

### Checklist de Verificación

#### ✅ Test 1: Console Limpia
1. Abrir https://poker-enfermos.vercel.app/registro
2. Login con usuario Comisión
3. Abrir Console (F12)
4. **VERIFICAR**: ❌ NO hay error 404 de `/api/timer/game-date/13`
5. **VERIFICAR**: ❌ NO hay "SWR Error" en rojo

**Resultado esperado**: Console limpia sin errores HTTP

---

#### ✅ Test 2: Botón INICIAR FECHA Visible
1. En `/registro` con gameDate status='CREATED'
2. **VERIFICAR**: ✅ Botón rojo "INICIAR FECHA" visible
3. **VERIFICAR**: ✅ NO aparece componente TimerDisplay todavía

**Resultado esperado**: Botón grande y visible, listo para presionar

---

#### ✅ Test 3: Iniciar Fecha Funciona
1. Presionar botón "INICIAR FECHA"
2. **VERIFICAR**: ✅ Botón desaparece inmediatamente
3. **VERIFICAR**: ✅ Aparece TimerDisplay con tiempo "25:00"
4. **VERIFICAR**: ✅ Blinds muestran "50/100"
5. **VERIFICAR**: ✅ Timer empieza a contar regresiva (24:59, 24:58...)

**Resultado esperado**: Transición suave de botón → timer activo

---

#### ✅ Test 4: Pausa para Break de Comida
1. Con timer activo, presionar botón "PAUSAR"
2. **VERIFICAR**: ✅ Timer se detiene (tiempo congelado)
3. **VERIFICAR**: ✅ Aparece icono ⏸ antes del tiempo
4. **VERIFICAR**: ✅ Timer tiene opacidad reducida (visual más tenue)
5. Esperar 10 segundos
6. **VERIFICAR**: ✅ Tiempo NO cambia (permanece congelado)

**Resultado esperado**: Timer pausado visualmente y funcionalmente

---

#### ✅ Test 5: Resume después del Break
1. Presionar botón "REINICIAR"
2. **VERIFICAR**: ✅ Timer continúa desde donde pausó
3. **VERIFICAR**: ✅ Icono ⏸ desaparece
4. **VERIFICAR**: ✅ Opacidad vuelve a normal
5. **VERIFICAR**: ✅ Cuenta regresiva continúa (ej: de 23:45 → 23:44 → 23:43...)

**Resultado esperado**: Timer reanuda sin pérdida de tiempo

---

#### ✅ Test 6: Timer en Background (WebSocket)
1. Con timer activo, navegar a `/admin/stats`
2. Esperar 30 segundos en esa página
3. Regresar a `/registro`
4. **VERIFICAR**: ✅ Tiempo avanzó aproximadamente 30 segundos
5. **VERIFICAR**: ✅ Blind level sigue correcto
6. **VERIFICAR**: ✅ No hay desincronización

**Resultado esperado**: Timer corrió en background via WebSocket

---

#### ✅ Test 7: Notificaciones (Opcional pero Recomendado)
1. Permitir notificaciones en browser
2. Esperar a que quede < 1 minuto en blind actual
3. **VERIFICAR**: ✅ Notificación de "1 minuto restante" aparece
4. **VERIFICAR**: ✅ Sonido reproduce (si está habilitado)

**Resultado esperado**: Notificaciones funcionando correctamente

---

## 📊 CRITERIOS DE APROBACIÓN

Para considerar el fix **EXITOSO**, estos items deben pasar:

- [x] Build exitoso (ya verificado en local)
- [x] Deploy completo en Vercel
- [ ] **Test 1**: Console limpia ✅
- [ ] **Test 2**: Botón visible ✅
- [ ] **Test 3**: Iniciar funciona ✅
- [ ] **Test 4**: Pausa funciona ✅
- [ ] **Test 5**: Resume funciona ✅
- [ ] **Test 6**: Background funciona ✅
- [ ] **Test 7**: Notificaciones funcionan ✅ (opcional)

**Mínimo requerido**: Tests 1-6 deben pasar
**Ideal**: Todos los tests pasan incluyendo 7

---

## 🚨 SI ALGO FALLA EN PRODUCCIÓN

### Problema: Botón aún NO aparece
**Diagnóstico**:
```bash
# 1. Verificar que deploy terminó
curl -I https://poker-enfermos.vercel.app/registro
# Debe retornar 200 OK

# 2. Verificar commit en producción
# En Vercel dashboard, verificar que commit 7f3e7b3 está deployed
```

**Solución**:
- Esperar 2-3 minutos más (deploy puede tardar)
- Hard refresh en browser (Cmd+Shift+R o Ctrl+Shift+R)
- Limpiar cache del browser
- Si persiste: revisar Vercel logs

---

### Problema: Error 404 aún aparece
**Diagnóstico**:
```javascript
// En Console del browser, verificar:
console.log(window.location.href)
// Debe ser: https://poker-enfermos.vercel.app/registro

// Verificar gameDate:
fetch('/api/game-dates/active')
  .then(r => r.json())
  .then(d => console.log('GameDate:', d))
// Debe mostrar: {id: 13, status: 'CREATED', ...}
```

**Solución**:
- Verificar que gameDate.status === 'CREATED' (no 'in_progress')
- Si status='in_progress', es normal que timer exista
- Verificar código fuente en browser (view-source) para confirmar versión

---

### Problema: Timer no cuenta
**Diagnóstico**:
- Abrir DevTools → Network → WS (WebSockets)
- Verificar conexión Socket.IO activa
- Buscar eventos: `timer-state`, `join-timer`

**Solución**:
- Refresh de página
- Verificar internet connection
- Si persiste: revisar logs de Vercel (Socket.IO server)

---

## 🔄 PLAN DE ROLLBACK (Si necesario)

**Opción 1**: Revert inmediato
```bash
git revert 7f3e7b3
git push origin main
# Vercel auto-deploya en ~3 min
```

**Opción 2**: Rollback via Vercel
1. Ir a Vercel Dashboard → Deployments
2. Buscar deployment anterior (commit `fcd637b`)
3. Click "..." → "Promote to Production"
4. Rollback instantáneo

**Opción 3**: Hotfix
```bash
# Crear fix urgente en nueva rama
git checkout -b hotfix/timer-emergency
# Hacer cambios
git commit -m "hotfix: ..."
git push origin hotfix/timer-emergency
# Merge a main
```

---

## 📞 CONTACTO EN CASO DE EMERGENCIA

Si encuentras un problema CRÍTICO que bloquea el juego:

1. **Documentar** el problema (screenshots, console errors)
2. **Notificar** al equipo inmediatamente
3. **NO intentar** fixes manuales en producción sin backup
4. **Considerar** rollback temporal mientras se investiga

---

## 🎯 PRÓXIMOS PASOS DESPUÉS DE VERIFICACIÓN

### Si Tests Pasan (✅ TODO OK)
1. ✅ Marcar este fix como APROBADO
2. ✅ Cerrar issue en GitHub (si existe)
3. ✅ Actualizar CLAUDE.md con fix documentado
4. ✅ Preparar sistema para Torneo 29 Fecha 1

### Si Tests Fallan (❌ PROBLEMAS)
1. ⚠️ Documentar exactamente qué test falló
2. ⚠️ Capturar screenshots y console logs
3. ⚠️ Decidir: rollback o hotfix
4. ⚠️ Investigar causa raíz
5. ⚠️ Aplicar fix adicional

---

## 📝 RESUMEN TÉCNICO

### Archivos Modificados
- `src/components/registro/TimerDisplay.tsx` (+17 líneas)
- `src/app/registro/page.tsx` (+5 líneas)
- `scripts/test-timer-complete.ts` (+216 líneas NUEVO)

### Cambios en Comportamiento
**ANTES**:
- Hook cargaba timer incluso cuando no existía → 404
- Props incorrectas causaban render defectuoso
- Botón desaparecía por error de renderizado

**DESPUÉS**:
- Hook solo carga timer cuando existe (`status='in_progress'`)
- Props correctas y opcionales para flexibilidad
- Botón visible y funcional
- Timer con mejoras visuales (pausa, animación)

### Compatibilidad
- ✅ Retrocompatible: props antiguas siguen funcionando
- ✅ Forward-compatible: acepta props nuevas opcionales
- ✅ No breaking changes en otros componentes
- ✅ Build y tests pasan al 100%

---

**Status**: 🟡 DEPLOYED - PENDING VERIFICATION

**Actualizar a**: 🟢 VERIFIED después de completar testing manual

---

**Generado**: 2025-10-13
**Deploy commit**: `7f3e7b3`
**Tiempo estimado de verificación**: 15-20 minutos
