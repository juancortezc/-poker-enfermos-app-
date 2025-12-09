'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Book, ChevronDown, ChevronRight, Code, Database, FileText } from 'lucide-react'
import { UserRole } from '@prisma/client'

interface PageDoc {
  name: string
  route: string
  description: string
  apis: string[]
  formulas?: {
    name: string
    formula: string
    description: string
  }[]
  permissions: string
}

const PAGES_DOCUMENTATION: PageDoc[] = [
  {
    name: 'Dashboard Principal',
    route: '/admin',
    description: 'Vista principal con ranking en vivo del torneo activo. Muestra posiciones, puntos, tendencias y estadísticas clave.',
    apis: [
      'GET /api/tournaments/active - Obtener torneo activo con participantes',
      'GET /api/tournaments/[id]/ranking - Obtener ranking completo con ELIMINA 2',
      'GET /api/game-dates/active - Verificar fechas activas o en progreso'
    ],
    formulas: [
      {
        name: 'ELIMINA 2',
        formula: 'Suma de las mejores 10 fechas de 12 totales',
        description: 'Se calculan automáticamente las 2 peores fechas y se excluyen. Esto permite que todos tengan oportunidad de recuperarse de malas sesiones.'
      },
      {
        name: 'Puntos por Posición',
        formula: 'posición 1=30pts, 2=24pts, 3=20pts, 4=18pts... hasta posición 9+=1pt',
        description: 'Sistema de puntos escalonado que premia las posiciones altas. Los puntos se asignan al momento de eliminación.'
      },
      {
        name: 'Tendencia',
        formula: 'Promedio últimas 3 fechas vs promedio total',
        description: 'Si promedio reciente > promedio total: tendencia positiva. Si es menor: negativa. Indica racha del jugador.'
      }
    ],
    permissions: 'Todos los roles (Comisión, Enfermo, Invitado)'
  },
  {
    name: 'Timer de Blinds',
    route: '/timer',
    description: 'Temporizador en vivo de la estructura de blinds. Se sincroniza automáticamente con la fecha activa.',
    apis: [
      'GET /api/timer/game-date/[id] - Obtener estado actual del timer',
      'POST /api/timer/game-date/[id]/pause - Pausar timer (requiere Comisión)',
      'POST /api/timer/game-date/[id]/resume - Reanudar timer (requiere Comisión)',
      'POST /api/timer/game-date/[id]/level-up - Forzar cambio de nivel (requiere Comisión)'
    ],
    formulas: [
      {
        name: 'Estructura de 12 Niveles',
        formula: 'Niveles 1-5: 25min, Niveles 6-10: 20min, Niveles 11-12: 15min',
        description: 'NOTA: Pausa manual de 30min para cena después del nivel 3. Blinds desde 50/100 hasta 2500/5000.'
      },
      {
        name: 'Tiempo Transcurrido',
        formula: 'Suma de duraciones de niveles completados + tiempo en nivel actual',
        description: 'Se calcula en tiempo real. El timer se guarda en la base de datos al pausar.'
      }
    ],
    permissions: 'Control: Solo Comisión. Visualización: Todos'
  },
  {
    name: 'Registro de Eliminaciones',
    route: '/registro',
    description: 'Formulario para registrar eliminaciones durante la partida. Asigna puntos automáticamente según posición.',
    apis: [
      'POST /api/eliminations - Crear nueva eliminación',
      'GET /api/eliminations/game-date/[id] - Obtener eliminaciones de una fecha',
      'GET /api/game-dates/[id]/live-status - Estado en vivo con eliminados y activos'
    ],
    formulas: [
      {
        name: 'Asignación de Puntos',
        formula: 'Posición final = Total jugadores - Eliminaciones registradas + 1',
        description: 'Ej: 18 jugadores, 3ra eliminación = posición 16. Los puntos se asignan según tabla de posiciones.'
      },
      {
        name: 'Validación de Eliminador',
        formula: 'Eliminador debe estar activo (no eliminado previamente)',
        description: 'El sistema valida que el jugador que elimina todavía esté en juego.'
      }
    ],
    permissions: 'Solo Comisión'
  },
  {
    name: 'Histórico de Resultados',
    route: '/admin/resultados',
    description: 'Vista de resultados históricos con 3 tabs: General, Por Fecha, Ganadores.',
    apis: [
      'GET /api/tournaments/[id]/ranking - Ranking completo del torneo',
      'GET /api/game-dates/[id] - Detalles de fecha específica',
      'GET /api/tournaments/winners - Ganadores de todos los torneos',
      'GET /api/eliminations/game-date/[id] - Eliminaciones por fecha'
    ],
    formulas: [
      {
        name: 'Promedio de Puntos',
        formula: 'Total puntos / Fechas jugadas',
        description: 'Indica consistencia del jugador. Un promedio alto con pocas fechas puede ser engañoso.'
      },
      {
        name: 'Mejor/Peor Fecha',
        formula: 'Max/Min puntos entre todas las fechas jugadas',
        description: 'Muestra el rango de performance del jugador.'
      }
    ],
    permissions: 'Todos los roles'
  },
  {
    name: 'Gestión de Jugadores',
    route: '/players',
    description: 'CRUD completo de jugadores. Maneja Enfermos (con PIN) e Invitados (con invitador).',
    apis: [
      'GET /api/players - Listar jugadores con filtros',
      'POST /api/players - Crear nuevo jugador',
      'PUT /api/players/[id] - Actualizar jugador',
      'DELETE /api/players/[id] - Desactivar jugador (soft delete)',
      'PUT /api/players/[id]/role - Cambiar rol'
    ],
    formulas: [
      {
        name: 'Validación de PIN',
        formula: 'Exactamente 4 dígitos numéricos',
        description: 'PINs hasheados con bcrypt. Duplicados permitidos solo si jugador inactivo.'
      },
      {
        name: 'Deduplicación',
        formula: 'Normalización: firstName.trim() + lastName.trim() (case-insensitive)',
        description: 'Si hay duplicados por nombre completo, se mantiene el de mayor prioridad de rol (Comisión > Enfermo > Invitado).'
      }
    ],
    permissions: 'Visualización: Todos. Edición: Solo Comisión'
  },
  {
    name: 'Configuración de Fechas',
    route: '/game-dates/config',
    description: 'Activación y configuración de fechas. Define jugadores participantes y rango de jugadores (min/max).',
    apis: [
      'GET /api/game-dates/active - Obtener fecha activa',
      'PUT /api/game-dates/[id] - Actualizar configuración (action: start, update)',
      'GET /api/players - Obtener jugadores disponibles para selección'
    ],
    formulas: [
      {
        name: 'Jugadores Min/Max',
        formula: 'Default: 9 min, 24 max',
        description: 'El sistema valida que haya suficientes jugadores antes de iniciar. Puede ajustarse por fecha.'
      },
      {
        name: 'Auto-inicio Timer',
        formula: 'Al cambiar status de pending a CREATED, se crea registro de timer automáticamente',
        description: 'El timer inicia pausado. La Comisión debe despausarlo manualmente cuando empiece la partida.'
      }
    ],
    permissions: 'Solo Comisión'
  },
  {
    name: 'Gestión de Torneos',
    route: '/tournaments',
    description: 'CRUD de torneos. Configura participantes, fechas (12), estructura de blinds y número de torneo.',
    apis: [
      'GET /api/tournaments - Listar torneos',
      'POST /api/tournaments - Crear torneo con fechas y blinds',
      'PUT /api/tournaments/[id] - Actualizar torneo',
      'DELETE /api/tournaments/[id] - Cancelar torneo (cascade)',
      'GET /api/tournaments/next-number - Obtener siguiente número de torneo',
      'POST /api/tournaments/[id]/activate - Activar torneo',
      'POST /api/tournaments/[id]/complete - Finalizar torneo'
    ],
    formulas: [
      {
        name: 'Generación de Fechas',
        formula: 'Primera fecha + 15 días en martes por 12 veces',
        description: 'Las fechas se generan automáticamente. Si un martes cae en festivo, se puede ajustar manualmente.'
      },
      {
        name: 'Estados de Torneo',
        formula: 'PROXIMO → ACTIVO → FINALIZADO',
        description: 'Solo puede haber 1 torneo ACTIVO. Al activar uno, los ACTIVOS previos pasan a FINALIZADO automáticamente.'
      }
    ],
    permissions: 'Visualización: Todos. Gestión: Solo Comisión'
  },
  {
    name: 'Estadísticas - Sin Ganar',
    route: '/admin/sin-ganar',
    description: 'Días desde última victoria de cada jugador. Calcula desde última victoria hasta hoy.',
    apis: [
      'GET /api/players - Obtener todos los jugadores con lastVictoryDate',
      'GET /api/game-dates - Fechas completadas para contexto'
    ],
    formulas: [
      {
        name: 'Días Sin Ganar',
        formula: '(Hoy - lastVictoryDate) en días',
        description: 'Si lastVictoryDate es null, muestra "Nunca". Se actualiza automáticamente al ganar una fecha.'
      },
      {
        name: 'Actualización automática',
        formula: 'Al registrar posición 1, se actualiza player.lastVictoryDate',
        description: 'Esto ocurre en el endpoint POST /api/eliminations cuando position === 1.'
      }
    ],
    permissions: 'Todos los roles'
  },
  {
    name: 'Estadísticas - Padres e Hijos',
    route: '/admin/stats',
    description: 'Relaciones de eliminaciones entre jugadores (quién elimina a quién más veces). Tab "P&H".',
    apis: [
      'GET /api/stats/parent-child/[tournamentId] - Obtener todas las relaciones',
      'GET /api/stats/parent-child/[tournamentId]/[relationId] - Detalle de relación específica',
      'GET /api/eliminations - Historial de eliminaciones entre dos jugadores'
    ],
    formulas: [
      {
        name: 'Relación Padre-Hijo',
        formula: 'Padre = quien elimina, Hijo = quien es eliminado',
        description: 'Se cuentan todas las veces que jugadorA elimina a jugadorB. Mínimo 2 para aparecer en stats.'
      },
      {
        name: 'Filtrado por Torneo',
        formula: 'Solo jugadores participantes del torneo seleccionado',
        description: 'Evita contar eliminaciones de jugadores que no participaron en ese torneo específico.'
      }
    ],
    permissions: 'Tab P&H: Solo Comisión. Tab Premios: Todos'
  },
  {
    name: 'Premios del Torneo',
    route: '/admin/stats (Tab Premios)',
    description: '8 categorías de premios: Varón, Gay, Podios, Victorias, 7/2, Sin Podio, Faltas, Mesas Finales.',
    apis: [
      'GET /api/stats/awards/[tournamentId] - Obtener ranking por categoría',
      'GET /api/tournaments/[id] - Participantes y fechas del torneo'
    ],
    formulas: [
      {
        name: 'Varón/Gay',
        formula: 'Ranking por PUNTOS totales (no por posición)',
        description: 'Se usan puntos en lugar de posición para desempatar correctamente. Solo participantes del torneo.'
      },
      {
        name: 'Podios',
        formula: 'COUNT(posiciones 1, 2, 3)',
        description: 'Cuenta cuántas veces el jugador quedó en el podio (top 3).'
      },
      {
        name: 'Victorias',
        formula: 'COUNT(posición = 1)',
        description: 'Cuenta cuántas fechas ganó el jugador.'
      },
      {
        name: '7/2',
        formula: 'COUNT(cartas finales = 7 y 2)',
        description: 'PENDIENTE DE IMPLEMENTAR - requiere registro de cartas finales.'
      },
      {
        name: 'Sin Podio',
        formula: 'Total de fechas jugadas - COUNT(posiciones 1, 2, 3)',
        description: 'Cuántas fechas jugó sin llegar al podio. Mayor número "gana" este anti-premio.'
      },
      {
        name: 'Faltas',
        formula: 'Total fechas del torneo - fechas jugadas',
        description: 'Cuántas fechas faltó el jugador. Solo se cuentan participantes registrados del torneo.'
      },
      {
        name: 'Mesas Finales',
        formula: 'COUNT(posición <= 9)',
        description: 'Cuenta cuántas veces llegó a mesa final (asumiendo 9 jugadores en mesa final).'
      }
    ],
    permissions: 'Todos los roles'
  },
  {
    name: 'Propuestas T29',
    route: '/t29',
    description: 'Sistema de propuestas para el Torneo 29. Usuarios pueden crear propuestas, votar y comentar.',
    apis: [
      'GET /api/proposals-v2/public - Propuestas públicas activas',
      'GET /api/proposals-v2/my - Propuestas del usuario actual',
      'POST /api/proposals-v2 - Crear nueva propuesta',
      'PATCH /api/proposals-v2/[id] - Editar propuesta (solo dueño)',
      'DELETE /api/proposals-v2/[id] - Eliminar propuesta (solo dueño)',
      'POST /api/proposals/[id]/votes - Votar propuesta',
      'DELETE /api/proposals/[id]/votes - Quitar voto',
      'POST /api/proposals/[id]/comments - Comentar',
      'GET /api/proposals/[id]/comments - Obtener comentarios'
    ],
    formulas: [
      {
        name: 'Validación de Propuesta',
        formula: 'Título (max 100 chars), Objetivo, Situación, Propuesta (todos requeridos)',
        description: 'Imagen opcional. Solo usuarios Comisión y Enfermo pueden crear propuestas.'
      },
      {
        name: 'Sistema de Votación',
        formula: '1 voto por usuario por propuesta',
        description: 'El usuario puede cambiar su voto. Se bloquea votación si proposal.votingClosed = true.'
      },
      {
        name: 'Cierre de Votación',
        formula: 'Solo Comisión puede cerrar/reabrir votaciones',
        description: 'Al cerrar, se desactivan votos y comentarios. Al reabrir, se reactivan.'
      }
    ],
    permissions: 'Visualización: Todos. Crear/Editar propias: Comisión y Enfermo. Cerrar votación: Solo Comisión'
  },
  {
    name: 'Mis Propuestas',
    route: '/propuestas-v2',
    description: 'Vista personal de propuestas del usuario. Permite crear, editar y desactivar propias propuestas.',
    apis: [
      'GET /api/proposals-v2/my - Obtener propuestas del usuario',
      'GET /api/proposals-v2/[id] - Cargar propuesta para edición',
      'PATCH /api/proposals-v2/[id]/toggle - Activar/desactivar'
    ],
    permissions: 'Solo Comisión y Enfermo'
  },
  {
    name: 'Admin Propuestas',
    route: '/admin/propuestas',
    description: 'Panel de gestión de todas las propuestas. Comisión puede cerrar votaciones y ver estadísticas.',
    apis: [
      'GET /api/proposals-v2/admin - Todas las propuestas con estadísticas',
      'PATCH /api/proposals-v2/[id]/close-voting - Cerrar votación',
      'PUT /api/proposals-v2/[id]/close-voting - Reabrir votación'
    ],
    permissions: 'Solo Comisión'
  },
  {
    name: 'Perfil de Usuario',
    route: '/perfil',
    description: 'Información personal del usuario autenticado. Permite cambiar PIN.',
    apis: [
      'GET /api/profile/status - Obtener datos del usuario',
      'PUT /api/profile/update-pin - Cambiar PIN'
    ],
    formulas: [
      {
        name: 'Cambio de PIN',
        formula: 'Validación: 4 dígitos, no duplicado con otros jugadores activos',
        description: 'El PIN se hashea con bcrypt antes de guardarse. Requiere PIN antiguo para confirmar.'
      }
    ],
    permissions: 'Solo Comisión y Enfermo'
  },
  {
    name: 'Importación de Datos',
    route: '/admin/import',
    description: 'Herramienta para importar datos históricos desde CSV. Soporta torneos, fechas y eliminaciones.',
    apis: [
      'POST /api/admin/import/tournaments - Importar torneo completo',
      'POST /api/admin/import/game-dates - Importar fechas',
      'POST /api/admin/import/eliminations - Importar eliminaciones',
      'POST /api/admin/import/validate - Validar CSV antes de importar'
    ],
    formulas: [
      {
        name: 'Formato CSV',
        formula: 'Columnas: dateNumber, playerName, position, points, eliminatorName, eliminationTime',
        description: 'El sistema busca jugadores por nombre completo (coincidencia aproximada). Crea participantes automáticamente.'
      },
      {
        name: 'Transaccionalidad',
        formula: 'Todo o nada - si falla 1 fila, se revierte toda la importación',
        description: 'Garantiza consistencia de datos. Se validan todos los registros antes de insertar.'
      }
    ],
    permissions: 'Solo Comisión'
  }
]

export default function TecnicoPage() {
  const { user, loading } = useAuth()
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set())
  const [expandedFormulas, setExpandedFormulas] = useState<Set<string>>(new Set())

  const togglePage = (index: number) => {
    const newExpanded = new Set(expandedPages)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedPages(newExpanded)
  }

  const toggleFormulas = (pageRoute: string) => {
    const newExpanded = new Set(expandedFormulas)
    if (newExpanded.has(pageRoute)) {
      newExpanded.delete(pageRoute)
    } else {
      newExpanded.add(pageRoute)
    }
    setExpandedFormulas(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto mb-4 animate-spin rounded-full border-b-2 border-[#e0b66c]"></div>
          <p className="text-[#d7c59a]">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== UserRole.Comision) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1208] via-[#0f0a04] to-[#0a0703] pb-24 pt-6 px-4">
        <Card className="border border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-[#2a1a14] to-[#1f1410] p-7 text-center shadow-[0_18px_40px_rgba(230,70,120,0.25)]">
          <p className="text-rose-200">Acceso restringido. Solo disponible para Comisión.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1208] via-[#0f0a04] to-[#0a0703] pb-24 pt-6 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-br from-[#2a1a14] via-[#24160f] to-[#1f1410] border border-[#e0b66c]/15 p-6 shadow-[0_18px_40px_rgba(11,12,32,0.35)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e0b66c]/25 ring-1 ring-[#e0b66c]/40">
              <Book className="w-6 h-6 text-[#e0b66c]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f3e6c5] tracking-tight">Documentación Técnica</h1>
              <p className="text-sm text-[#d7c59a]">
                Información detallada de cada página, APIs y fórmulas del sistema
              </p>
            </div>
          </div>

          <div className="bg-[#24160f]/50 rounded-lg p-4 border border-[#e0b66c]/10">
            <p className="text-xs text-[#d7c59a] leading-relaxed">
              💡 Esta documentación detalla el funcionamiento técnico de cada página del sistema,
              incluyendo los endpoints de API utilizados y las fórmulas de cálculo implementadas.
              Haz clic en cada sección para expandir los detalles.
            </p>
          </div>
        </Card>

        {/* Pages List */}
        <div className="space-y-3">
          {PAGES_DOCUMENTATION.map((page, index) => {
            const isExpanded = expandedPages.has(index)
            const formulasExpanded = expandedFormulas.has(page.route)

            return (
              <Card
                key={page.route}
                className="border border-[#e0b66c]/15 bg-gradient-to-br from-[#2a1a14] via-[#24160f] to-[#1f1410] overflow-hidden shadow-[0_8px_16px_rgba(11,12,32,0.25)] transition-all hover:border-[#e0b66c]/30"
              >
                {/* Header - Clickable */}
                <button
                  onClick={() => togglePage(index)}
                  className="w-full p-5 flex items-center justify-between hover:bg-[#24160f]/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e0b66c]/20">
                      <FileText className="w-4 h-4 text-[#e0b66c]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-semibold text-[#f3e6c5]">{page.name}</h3>
                      <p className="text-xs text-[#d7c59a] font-mono">{page.route}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-[#e0b66c]" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[#d7c59a]" />
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-[#e0b66c]/10">
                    {/* Description */}
                    <div className="pt-4">
                      <p className="text-sm text-[#f3e6c5] leading-relaxed">{page.description}</p>
                    </div>

                    {/* Permissions */}
                    <div className="bg-[#24160f]/30 rounded-lg p-3 border border-[#e0b66c]/10">
                      <p className="text-xs text-[#d7c59a]">
                        <span className="font-semibold text-[#e0b66c]">Permisos:</span> {page.permissions}
                      </p>
                    </div>

                    {/* APIs */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="w-4 h-4 text-[#e0b66c]" />
                        <h4 className="text-sm font-semibold text-[#e0b66c] uppercase tracking-wider">
                          APIs Utilizadas ({page.apis.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {page.apis.map((api, apiIndex) => (
                          <div
                            key={apiIndex}
                            className="bg-[#0f0a04] rounded-lg p-3 border border-[#e0b66c]/10"
                          >
                            <code className="text-xs text-[#10b981] font-mono break-all">
                              {api}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Formulas */}
                    {page.formulas && page.formulas.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleFormulas(page.route)}
                          className="flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity"
                        >
                          <Database className="w-4 h-4 text-[#e0b66c]" />
                          <h4 className="text-sm font-semibold text-[#e0b66c] uppercase tracking-wider">
                            Fórmulas y Cálculos ({page.formulas.length})
                          </h4>
                          {formulasExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#e0b66c]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#d7c59a]" />
                          )}
                        </button>

                        {formulasExpanded && (
                          <div className="space-y-3 ml-6">
                            {page.formulas.map((formula, fIndex) => (
                              <div
                                key={fIndex}
                                className="bg-[#24160f]/50 rounded-lg p-4 border border-[#e0b66c]/10"
                              >
                                <h5 className="text-sm font-semibold text-[#f3e6c5] mb-2">
                                  {formula.name}
                                </h5>
                                <div className="bg-[#0f0a04] rounded p-2 mb-2">
                                  <code className="text-xs text-[#10b981] font-mono">
                                    {formula.formula}
                                  </code>
                                </div>
                                <p className="text-xs text-[#d7c59a] leading-relaxed">
                                  {formula.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {/* Footer Info */}
        <Card className="border border-[#e0b66c]/15 bg-gradient-to-br from-[#2a1a14] via-[#24160f] to-[#1f1410] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e0b66c]/25 flex-shrink-0">
              <Database className="h-4 w-4 text-[#e0b66c]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#f3e6c5] mb-2">
                Información Adicional
              </h4>
              <ul className="text-xs text-[#d7c59a] space-y-1 leading-relaxed">
                <li>• <strong>Framework:</strong> Next.js 15.5.2 con React Server Components</li>
                <li>• <strong>Base de Datos:</strong> PostgreSQL vía Prisma ORM</li>
                <li>• <strong>Autenticación:</strong> Sistema de tokens con cache de 5 minutos</li>
                <li>• <strong>Tema:</strong> Noir Jazz - Diseño oscuro con acentos dorados y cobre</li>
                <li>• <strong>Optimizaciones:</strong> Token cache, SWR, Lazy loading de imágenes</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
