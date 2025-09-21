# 🧪 Plan de Pruebas Manuales Completo

## **INFORMACIÓN PREVIA**
- **Usuario requerido**: Comisión (con adminKey)
- **Estado inicial**: Sistema operativo, fecha 11 en estado "pending"
- **Duración estimada**: 20-30 minutos

---

## **FASE 1: Edición de Jugadores** 📝

### **1.1 Prueba de Edición de Invitados**
**🎯 Objetivo**: Verificar que el editor de invitados funciona completamente

#### **📋 Pasos Detallados**:

1. **Navegar a Jugadores**
   ```
   URL: http://localhost:3001/players
   ```

2. **Identificar un Invitado**
   - Buscar cards con badge azul "Invitado"
   - Ejemplo: "Agustin Guerrero", "Milton Tapia", etc.
   - Anotar nombre actual para verificar cambios

3. **Iniciar Edición**
   - Hacer clic en el botón editar (ícono lápiz ✏️)
   - **Verificar redirección**: URL debe ser `/players/edit-invitado/[id]`

4. **Verificar Carga de Datos** ✅
   - [ ] **Nombre**: Campo pre-llenado con valor actual
   - [ ] **Apellido**: Campo pre-llenado con valor actual
   - [ ] **Invitador**: Dropdown con selección actual
   - [ ] **Año**: Campo con año actual
   - [ ] **Foto**: Imagen del pato o fallback emoji 🦆

5. **Modificar Datos**
   ```
   Nombre: "TEST_EDIT_[TuNombre]"
   Apellido: "MANUAL_PRUEBA"
   Año: 2023
   Invitador: Cambiar a otro enfermo
   ```

6. **Guardar Cambios**
   - Hacer clic "Guardar"
   - **Verificar**: Redirección a `/players`
   - **Confirmar**: Datos actualizados en la lista

#### **✅ Criterios de Éxito**:
- [ ] Navegación correcta a formulario de invitado
- [ ] Todos los campos pre-cargados
- [ ] Guardado exitoso sin errores
- [ ] Cambios visibles inmediatamente
- [ ] Redirección correcta

---

### **1.2 Prueba de Edición de Enfermos**
**🎯 Objetivo**: Verificar que el editor de enfermos sigue funcionando

#### **📋 Pasos Detallados**:

1. **Buscar un Enfermo**
   - Badge gris "Enfermo"
   - Ejemplo: "Carlos Chacón", "Diego Behar", etc.

2. **Iniciar Edición**
   - Clic en editar ✏️
   - **Verificar redirección**: URL debe ser `/players/edit/[id]`

3. **Verificar Funcionalidad** ✅
   - [ ] **Información completa**: Datos pre-cargados
   - [ ] **Foto visible**: Avatar o fallback 👤
   - [ ] **Campos adicionales**: PIN, teléfono, email, etc.

4. **Modificar un Campo**
   ```
   Ejemplo: Teléfono: "+593999TEST"
   O Email: "test@manual.com"
   ```

5. **Guardar y Verificar**
   - Confirmar actualización en lista

#### **✅ Criterios de Éxito**:
- [ ] Editor de enfermos funciona normalmente
- [ ] Campos específicos de enfermos disponibles
- [ ] Actualización exitosa

---

## **FASE 2: Activación de Fecha 11** 📅

### **2.1 Preparación del Sistema**
**🎯 Objetivo**: Verificar estado inicial y acceder a configuración

#### **📋 Pasos Detallados**:

1. **Verificar Dashboard**
   ```
   URL: http://localhost:3001/
   ```
   - **Botón "FECHA"**: Debe estar habilitado (no gris)
   - Si está deshabilitado: hay fecha activa, revisar estado

2. **Acceder a Configuración**
   - Clic en botón "FECHA"
   - **Redirección**: `/game-dates/config`

#### **✅ Estado Esperado**:
- [ ] Dashboard accesible
- [ ] Botón FECHA habilitado
- [ ] Navegación exitosa a configuración

---

### **2.2 Configuración de Participantes**
**🎯 Objetivo**: Seleccionar jugadores para fecha 11

#### **📋 Pasos Detallados**:

1. **Seleccionar Fecha**
   - **Dropdown**: Elegir "Fecha 11"
   - **Fecha programada**: 16 septiembre 2025
   - **Verificar**: Carga automática de participantes

2. **Tab "Enfermos"** 👥
   - **Participantes pre-seleccionados**: Verificar lista
   - **Ajustar selección**:
     - Objetivo: 9-12 participantes totales
     - Usar checkboxes para agregar/quitar
   - **Verificar contador**: Debe actualizarse dinámicamente

3. **Tab "Invitados"** 🎭
   - **Seleccionar algunos invitados**: 2-3 jugadores
   - **Categorías**:
     - Miembros del Grupo (fondo rosa)
     - Invitados Externos
   - **Verificar contador**: Total de participantes

4. **Revisión Final**
   ```
   Total recomendado: 9-12 jugadores
   Distribución: ~70% Enfermos, ~30% Invitados
   ```

5. **Activar Configuración**
   - Clic "ACTIVAR"
   - **Verificar**: Mensaje de éxito

#### **✅ Criterios de Éxito**:
- [ ] Fecha 11 seleccionable
- [ ] Participantes pre-cargados
- [ ] Tabs funcionando correctamente
- [ ] Contadores actualizándose
- [ ] Activación exitosa

---

### **2.3 Confirmación e Inicio**
**🎯 Objetivo**: Iniciar oficialmente la fecha 11

#### **📋 Pasos Detallados**:

1. **Página de Confirmación**
   ```
   URL: /game-dates/11/confirm (o similar)
   ```

2. **Verificar Resumen** ✅
   - [ ] **Fecha**: "16 septiembre 2025 → Fecha 11"
   - [ ] **Participantes**: Lista completa visible
   - [ ] **Puntos**: Calculados según cantidad (ej: 18-20 pts)
   - [ ] **Estado**: "Lista para iniciar"

3. **Iniciar Fecha**
   - Clic "INICIAR FECHA"
   - **Verificar redirección**: `/registro`

4. **Verificación Post-Inicio** ✅
   - [ ] **Timer iniciado**: Cuenta regresiva activa
   - [ ] **Estado de fecha**: Cambiado a "in_progress"
   - [ ] **Dashboard**: Botón FECHA ahora deshabilitado

#### **✅ Criterios de Éxito**:
- [ ] Confirmación muestra datos correctos
- [ ] Inicio exitoso sin errores
- [ ] Timer funcionando
- [ ] Sistema actualizado consistentemente

---

## **FASE 3: Registro de Eliminaciones** 🎯

### **3.1 Verificación del Sistema de Registro**
**🎯 Objetivo**: Confirmar que la página de registro está operativa

#### **📋 Pasos Detallados**:

1. **Verificar Página de Registro**
   ```
   URL: http://localhost:3001/registro
   ```

2. **Elementos Visibles** ✅
   - [ ] **Timer**: Cuenta regresiva funcionando (ej: 12:00)
   - [ ] **Nivel de Blinds**: Mostrado (ej: Nivel 1: 50/100)
   - [ ] **Cards de Estadísticas**:
     - "Jugando": [número inicial]
     - "Jugadores": [total registrados]
     - "PTS Ganador": [puntos calculados]

3. **Formulario de Eliminación** ✅
   - [ ] **Dropdown "Eliminado"**: Lista de participantes
   - [ ] **Dropdown "Eliminador"**: Lista de participantes
   - [ ] **Botón "Registrar"**: Habilitado
   - [ ] **Historial**: Vacío inicialmente

#### **✅ Estado Inicial Esperado**:
- [ ] Timer: 12:00 (Level 1)
- [ ] Jugando: [número total]
- [ ] Historial: 0 eliminaciones
- [ ] Formulario: Funcional

---

### **3.2 Primera Eliminación**
**🎯 Objetivo**: Registrar la primera eliminación del torneo

#### **📋 Pasos Detallados**:

1. **Seleccionar Eliminado**
   - **Dropdown**: Elegir primer participante a eliminar
   - Ejemplo: Primer jugador de la lista

2. **Seleccionar Eliminador**
   - **Dropdown**: Elegir quien eliminó
   - **Importante**: Debe ser diferente al eliminado

3. **Registrar Eliminación**
   - Clic "Registrar Eliminación"
   - **Verificar**: Mensaje de confirmación

4. **Verificar Actualización** ✅
   - [ ] **Historial**: Nueva entrada visible
   - [ ] **Posición**: Asignada automáticamente (ej: Pos. 12)
   - [ ] **Contador "Jugando"**: Disminuido en 1
   - [ ] **Formulario**: Reseteado para próxima eliminación

#### **✅ Resultado Esperado**:
```
Historial:
Pos. 12 | [Eliminado] | Por: [Eliminador] | [Tiempo]

Contadores actualizados:
Jugando: [número inicial - 1]
```

---

### **3.3 Eliminaciones Secuenciales**
**🎯 Objetivo**: Registrar múltiples eliminaciones para simular progreso del torneo

#### **📋 Pasos Detallados**:

1. **Repetir Proceso** (5-6 eliminaciones)
   ```
   Eliminación 2: Pos. 11
   Eliminación 3: Pos. 10
   Eliminación 4: Pos. 9
   Eliminación 5: Pos. 8
   Eliminación 6: Pos. 7
   ```

2. **Verificar Progresión** ✅
   - [ ] **Posiciones secuenciales**: Descendentes correctamente
   - [ ] **Historial ordenado**: Más reciente arriba
   - [ ] **Contadores actualizándose**: "Jugando" disminuye
   - [ ] **Dropdowns actualizados**: Eliminados no aparecen

3. **Verificar Funcionalidades** ✅
   - [ ] **Edición inline**: Poder modificar eliminaciones
   - [ ] **Timer**: Continúa funcionando
   - [ ] **Validaciones**: No duplicados, etc.

#### **✅ Estado Intermedio Esperado**:
```
Jugando: [inicial - 6]
Historial: 6 eliminaciones
Posiciones: 12, 11, 10, 9, 8, 7
```

---

### **3.4 Finalización (Ganador Automático)**
**🎯 Objetivo**: Completar el torneo declarando el ganador

#### **📋 Pasos Detallados**:

1. **Continuar Eliminaciones**
   - Eliminar hasta que queden **2 jugadores**
   - Ejemplo: Posiciones hasta 3

2. **Penúltima Eliminación**
   - **Registrar**: Jugador en posición 2
   - **Verificar**: Solo queda 1 jugador

3. **Auto-Completado del Ganador** ✅
   - [ ] **Detección automática**: Sistema declara ganador
   - [ ] **Posición 1**: Asignada al último jugador
   - [ ] **Puntos del ganador**: Actualizados
   - [ ] **Estado de fecha**: Cambiado a "completed"

4. **Verificación Final** ✅
   - [ ] **Formulario deshabilitado**: No más eliminaciones
   - [ ] **Mensaje de finalización**: Torneo completado
   - [ ] **Historial completo**: Todas las posiciones
   - [ ] **Contadores finales**: "Jugando: 0"

#### **✅ Estado Final Esperado**:
```
TORNEO COMPLETADO
Ganador: [Último jugador] - Posición 1 - [XX] puntos
Total eliminaciones: [número total - 1]
Estado: "completed"
```

---

## **FASE 4: Verificaciones Post-Torneo** ✅

### **4.1 Estado del Sistema**
**🎯 Objetivo**: Confirmar que el sistema se actualizó correctamente

#### **📋 Pasos de Verificación**:

1. **Dashboard Principal**
   ```
   URL: http://localhost:3001/
   ```
   - [ ] **Botón "FECHA"**: Debería estar habilitado nuevamente
   - [ ] **Widget "Próxima Fecha"**: Fecha 12 visible

2. **Calendar Admin**
   ```
   URL: http://localhost:3001/admin/calendar
   ```
   - [ ] **Fecha 11**: Borde gris (completed)
   - [ ] **Fecha 12**: Fondo rojo (próxima disponible)

3. **Ranking de Torneo**
   ```
   URL: http://localhost:3001/ranking
   ```
   - [ ] **Puntos actualizados**: Participantes de fecha 11
   - [ ] **Ganador**: Puntos del primer lugar
   - [ ] **Sistema ELIMINA 2**: Funcionando (si aplica)

#### **✅ Indicadores de Éxito Total**:
- [ ] Sistema listo para próxima fecha
- [ ] Datos persistidos correctamente
- [ ] Estados consistentes en toda la aplicación

---

## **🎯 RESUMEN DE CRITERIOS DE ÉXITO**

### **📝 Edición de Jugadores**:
- ✅ Editor de invitados 100% funcional
- ✅ Editor de enfermos sin regresiones
- ✅ Datos pre-cargados y persistentes
- ✅ Navegación por roles correcta

### **📅 Activación de Fecha**:
- ✅ Configuración fluida de participantes
- ✅ Timer iniciado automáticamente
- ✅ Estados del sistema actualizados
- ✅ Transición pending → CREATED → in_progress

### **🎯 Registro de Eliminaciones**:
- ✅ Eliminaciones secuenciales exitosas
- ✅ Contadores en tiempo real
- ✅ Auto-completado del ganador
- ✅ Finalización correcta (in_progress → completed)

### **🔧 Sistema General**:
- ✅ Consistencia entre componentes
- ✅ Persistencia en base de datos
- ✅ UX sin interrupciones
- ✅ Preparado para siguiente ciclo

---

## **⚠️ Troubleshooting**

### **Problemas Comunes**:

1. **Auth Errors**
   - Verificar login como Comisión
   - Revisar adminKey en localStorage

2. **Timer No Actualiza**
   - Refrescar página
   - Verificar conexión a BD

3. **Datos No Cargan**
   - Verificar console del navegador
   - Confirmar APIs respondiendo

4. **Navegación Incorrecta**
   - Limpiar cache del navegador
   - Verificar rutas en URL

### **Comandos de Verificación**:
```bash
# Estado de fechas
npx tsx scripts/check-date-11-status.ts

# Pruebas CRUD
npx tsx scripts/test-crud-funcionality.ts
```

---

**🚀 ¡Sistema listo para pruebas manuales completas!**