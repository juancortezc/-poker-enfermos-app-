'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, AlertCircle, CheckCircle, Users, Trophy, Target, UserPlus } from 'lucide-react'

interface ImportRecord {
  tournamentNumber: number
  playerName: string
  finalPosition: number
  points?: number
  notes?: string
}

interface ImportResult {
  created: number
  updated: number
  errors: string[]
}

export default function HistoricalImportPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [csvData, setCsvData] = useState('')
  const [parsedRecords, setParsedRecords] = useState<ImportRecord[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
  const [newPlayersNeeded, setNewPlayersNeeded] = useState<string[]>([])

  // Check permissions
  useEffect(() => {
    if (user && user.role !== 'Comision') {
      router.push('/admin')
    }
  }, [user, router])

  // Load available players
  useEffect(() => {
    loadAvailablePlayers()
  }, [])

  const loadAvailablePlayers = async () => {
    try {
      const response = await fetch('/api/players', {
        headers: {
          'Authorization': `Bearer PIN:${localStorage.getItem('poker-pin')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAvailablePlayers(data)
      }
    } catch (error) {
      console.error('Error loading players:', error)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvData(text)
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const parseCSV = (csvText: string) => {
    try {
      const lines = csvText.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      // Validate headers
      const requiredHeaders = ['Tournament', 'Player', 'Position']
      const missingHeaders = requiredHeaders.filter(h => !headers.some(header => 
        header.toLowerCase().includes(h.toLowerCase())
      ))
      
      if (missingHeaders.length > 0) {
        setValidationErrors([`Missing required headers: ${missingHeaders.join(', ')}`])
        return
      }

      const records: ImportRecord[] = []
      const errors: string[] = []
      const playersNotFound: Set<string> = new Set()

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        
        if (values.length < 3) {
          errors.push(`Line ${i + 1}: Insufficient data`)
          continue
        }

        const tournamentText = values[0]
        const playerName = values[1]
        const positionText = values[2]
        const pointsText = values[3] || ''
        const notes = values[4] || ''

        // Extract tournament number
        const tournamentMatch = tournamentText.match(/(\d+)/)
        if (!tournamentMatch) {
          errors.push(`Line ${i + 1}: Invalid tournament format: ${tournamentText}`)
          continue
        }
        const tournamentNumber = parseInt(tournamentMatch[1])

        // Validate tournament number (should be 1-27 for historical data)
        if (tournamentNumber < 1 || tournamentNumber > 27) {
          errors.push(`Line ${i + 1}: Tournament number out of range (1-27): ${tournamentNumber}`)
          continue
        }

        // Parse position
        const position = parseInt(positionText)
        if (isNaN(position) || position < 1) {
          errors.push(`Line ${i + 1}: Invalid position: ${positionText}`)
          continue
        }

        // Check if player exists
        const playerExists = availablePlayers.some(p => 
          `${p.firstName} ${p.lastName}`.toLowerCase() === playerName.toLowerCase() ||
          p.aliases?.some((alias: string) => alias.toLowerCase() === playerName.toLowerCase())
        )

        if (!playerExists) {
          playersNotFound.add(playerName)
        }

        // Parse points (optional)
        const points = pointsText ? parseInt(pointsText) : undefined

        records.push({
          tournamentNumber,
          playerName,
          finalPosition: position,
          points,
          notes: notes || undefined
        })
      }

      setParsedRecords(records)
      setValidationErrors(errors)
      setNewPlayersNeeded(Array.from(playersNotFound))
      setShowPreview(true)

    } catch (error) {
      setValidationErrors([`Error parsing CSV: ${error}`])
    }
  }

  const createMissingPlayers = async () => {
    try {
      const createdPlayers = []
      
      for (const playerName of newPlayersNeeded) {
        const [firstName, ...lastNameParts] = playerName.split(' ')
        const lastName = lastNameParts.join(' ') || ''
        
        const response = await fetch('/api/players', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer PIN:${localStorage.getItem('poker-pin')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            firstName,
            lastName,
            role: 'Enfermo',
            isActive: false, // Mark as inactive since they're historical
            joinDate: '2020-01-01', // Default historical date
            joinYear: 2020,
            notes: 'Historical player created for tournament statistics'
          })
        })

        if (response.ok) {
          const player = await response.json()
          createdPlayers.push(player)
        }
      }

      // Reload players and clear missing players list
      await loadAvailablePlayers()
      setNewPlayersNeeded([])
      
      return createdPlayers
    } catch (error) {
      console.error('Error creating players:', error)
      throw error
    }
  }

  const handleImport = async () => {
    try {
      setIsImporting(true)
      
      // Create missing players if needed
      if (newPlayersNeeded.length > 0) {
        await createMissingPlayers()
      }

      // Map player names to IDs
      const recordsWithIds = parsedRecords.map(record => {
        const player = availablePlayers.find(p => 
          `${p.firstName} ${p.lastName}`.toLowerCase() === record.playerName.toLowerCase() ||
          p.aliases?.some((alias: string) => alias.toLowerCase() === record.playerName.toLowerCase())
        )
        
        if (!player) {
          throw new Error(`Player not found: ${record.playerName}`)
        }

        return {
          tournamentNumber: record.tournamentNumber,
          playerId: player.id,
          finalPosition: record.finalPosition,
          points: record.points,
          notes: record.notes
        }
      })

      // Import to API
      const response = await fetch('/api/stats/historical', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer PIN:${localStorage.getItem('poker-pin')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records: recordsWithIds })
      })

      if (response.ok) {
        const result = await response.json()
        setImportResult(result.data)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

    } catch (error) {
      console.error('Import error:', error)
      setValidationErrors([`Import failed: ${error}`])
    } finally {
      setIsImporting(false)
    }
  }

  const getPositionDisplay = (position: number) => {
    if (position === 1) return '🏆 Campeón'
    if (position === 2) return '🥈 Subcampeón'
    if (position === 3) return '🥉 Tercer Lugar'
    if (position === 7) return '🎯 7mo (7/2)'
    return `${position}º`
  }

  if (!user || user.role !== 'Comision') {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <p className="text-poker-muted">Sin permisos para acceder</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-poker-dark pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Importar Datos Históricos</h1>
          <p className="text-poker-muted">Torneos 1-27 - Estadísticas para campeones, subcampeones y posiciones especiales</p>
        </div>

        {/* Import Instructions */}
        <Card className="bg-poker-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Formato de Archivo CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-poker-text">
              <p className="mb-2">El archivo CSV debe tener las siguientes columnas:</p>
              <div className="bg-poker-dark/50 p-3 rounded border border-white/10 font-mono text-sm">
                Tournament,Player,Position,Points,Notes<br/>
                Torneo 1,Juan Perez,1,100,Champion<br/>
                Torneo 1,Diego Behar,2,75,<br/>
                Torneo 2,Luis Garcia,1,95,Champion
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="text-white font-semibold mb-1">Columnas Requeridas:</h4>
                <ul className="text-poker-text space-y-1">
                  <li>• <strong>Tournament</strong>: Torneo 1, Torneo 2, etc.</li>
                  <li>• <strong>Player</strong>: Nombre completo del jugador</li>
                  <li>• <strong>Position</strong>: Posición final (1, 2, 3, etc.)</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Columnas Opcionales:</h4>
                <ul className="text-poker-text space-y-1">
                  <li>• <strong>Points</strong>: Puntos obtenidos</li>
                  <li>• <strong>Notes</strong>: Notas adicionales</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="bg-poker-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Subir Archivo CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-poker-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-poker-red file:text-white hover:file:bg-red-700 file:cursor-pointer"
              />
              
              {csvData && (
                <div className="text-sm text-poker-muted">
                  Archivo cargado: {parsedRecords.length} registros encontrados
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Errores de Validación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-red-300 text-sm">• {error}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Missing Players */}
        {newPlayersNeeded.length > 0 && (
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Jugadores No Encontrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-300 text-sm mb-3">
                Los siguientes jugadores no existen y serán creados automáticamente como jugadores históricos:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {newPlayersNeeded.map((playerName, index) => (
                  <div key={index} className="bg-poker-dark/50 p-2 rounded text-sm text-yellow-200">
                    {playerName}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {showPreview && parsedRecords.length > 0 && validationErrors.length === 0 && (
          <Card className="bg-poker-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5" />
                Vista Previa ({parsedRecords.length} registros)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary by tournament */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-poker-dark/50 p-3 rounded">
                    <div className="text-2xl font-bold text-white">
                      {new Set(parsedRecords.map(r => r.tournamentNumber)).size}
                    </div>
                    <div className="text-poker-muted text-sm">Torneos</div>
                  </div>
                  <div className="bg-poker-dark/50 p-3 rounded">
                    <div className="text-2xl font-bold text-white">
                      {new Set(parsedRecords.map(r => r.playerName)).size}
                    </div>
                    <div className="text-poker-muted text-sm">Jugadores</div>
                  </div>
                  <div className="bg-poker-dark/50 p-3 rounded">
                    <div className="text-2xl font-bold text-white">
                      {parsedRecords.filter(r => r.finalPosition === 1).length}
                    </div>
                    <div className="text-poker-muted text-sm">Campeones</div>
                  </div>
                  <div className="bg-poker-dark/50 p-3 rounded">
                    <div className="text-2xl font-bold text-white">
                      {parsedRecords.filter(r => r.finalPosition <= 3).length}
                    </div>
                    <div className="text-poker-muted text-sm">Top 3</div>
                  </div>
                </div>

                {/* Sample records */}
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-poker-dark/50">
                      <tr className="text-poker-text">
                        <th className="p-2 text-left">Torneo</th>
                        <th className="p-2 text-left">Jugador</th>
                        <th className="p-2 text-left">Posición</th>
                        <th className="p-2 text-left">Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRecords.slice(0, 10).map((record, index) => (
                        <tr key={index} className="border-t border-white/10">
                          <td className="p-2 text-white">Torneo {record.tournamentNumber}</td>
                          <td className="p-2 text-white">{record.playerName}</td>
                          <td className="p-2">{getPositionDisplay(record.finalPosition)}</td>
                          <td className="p-2 text-poker-text">{record.points || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRecords.length > 10 && (
                    <div className="text-center text-poker-muted text-sm mt-2">
                      ... y {parsedRecords.length - 10} registros más
                    </div>
                  )}
                </div>

                {/* Import Button */}
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="w-full bg-poker-red hover:bg-red-700 text-white"
                >
                  {isImporting ? 'Importando...' : 'Importar Datos Históricos'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Results */}
        {importResult && (
          <Card className="bg-green-500/10 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Importación Completada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{importResult.created}</div>
                  <div className="text-green-300 text-sm">Creados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{importResult.updated}</div>
                  <div className="text-blue-300 text-sm">Actualizados</div>
                </div>
              </div>
              
              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="text-red-400 font-semibold mb-2">Errores:</h4>
                  <ul className="space-y-1">
                    {importResult.errors.map((error, index) => (
                      <li key={index} className="text-red-300 text-sm">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                <Button
                  onClick={() => router.push('/admin/stats')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Ver Estadísticas
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/5"
                >
                  Importar Más Datos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}