'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { Wrench, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface TournamentHealthData {
  tournament: {
    id: number
    name: string
    number: number
    status: string
  }
  analysis: {
    participants: {
      inArray: number
      inTable: number
      missingInTable: number
      extraInTable: number
      hasIssues: boolean
    }
    dates: {
      total: number
      withDateIssues: number
      completed: number
      hasIssues: boolean
    }
    eliminations: {
      total: number
      datesWithEliminations: number
      hasIssues: boolean
    }
  }
  needsRepair: boolean
}

interface TournamentRepairToolProps {
  tournamentId: number
}

export default function TournamentRepairTool({ tournamentId }: TournamentRepairToolProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [healthData, setHealthData] = useState<TournamentHealthData | null>(null)
  const [repairResult, setRepairResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    if (!user?.adminKey) return

    setLoading(true)
    setError(null)
    setRepairResult(null)
    
    try {
      const response = await fetch(`/api/admin/repair-tournament?tournamentId=${tournamentId}`, {
        headers: {
          'Authorization': `Bearer ${user.adminKey}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to check tournament health')
      }

      const data = await response.json()
      setHealthData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error checking tournament')
    } finally {
      setLoading(false)
    }
  }

  const repairTournament = async () => {
    if (!user?.adminKey || !healthData) return

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/repair-tournament', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.adminKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tournamentId })
      })

      if (!response.ok) {
        throw new Error('Failed to repair tournament')
      }

      const data = await response.json()
      setRepairResult(data)
      
      // Re-check health after repair
      await checkHealth()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error repairing tournament')
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'Comision') {
    return null
  }

  return (
    <div className="bg-poker-card border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center">
          <Wrench className="w-5 h-5 mr-2" />
          Tournament Health Check
        </h3>
        <Button
          onClick={checkHealth}
          disabled={loading}
          size="sm"
          className="bg-poker-red hover:bg-red-700"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Check Health'
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {healthData && (
        <div className="space-y-4">
          <div className="text-sm text-poker-muted">
            Tournament {healthData.tournament.number} - {healthData.tournament.status}
          </div>

          <div className="space-y-3">
            {/* Participants Status */}
            <div className={`p-3 rounded-lg border ${
              healthData.analysis.participants.hasIssues 
                ? 'bg-red-500/5 border-red-500/20' 
                : 'bg-green-500/5 border-green-500/20'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Participants</span>
                {healthData.analysis.participants.hasIssues ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="mt-1 text-xs text-poker-muted">
                Array: {healthData.analysis.participants.inArray} | 
                Table: {healthData.analysis.participants.inTable}
                {healthData.analysis.participants.missingInTable > 0 && (
                  <span className="text-red-400 ml-2">
                    ({healthData.analysis.participants.missingInTable} missing)
                  </span>
                )}
              </div>
            </div>

            {/* Dates Status */}
            <div className={`p-3 rounded-lg border ${
              healthData.analysis.dates.hasIssues 
                ? 'bg-red-500/5 border-red-500/20' 
                : 'bg-green-500/5 border-green-500/20'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Game Dates</span>
                {healthData.analysis.dates.hasIssues ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="mt-1 text-xs text-poker-muted">
                Total: {healthData.analysis.dates.total} | 
                Completed: {healthData.analysis.dates.completed}
                {healthData.analysis.dates.withDateIssues > 0 && (
                  <span className="text-red-400 ml-2">
                    ({healthData.analysis.dates.withDateIssues} not on Tuesday)
                  </span>
                )}
              </div>
            </div>

            {/* Eliminations Status */}
            <div className={`p-3 rounded-lg border ${
              healthData.analysis.eliminations.hasIssues 
                ? 'bg-orange-500/5 border-orange-500/20' 
                : 'bg-green-500/5 border-green-500/20'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Eliminations</span>
                {healthData.analysis.eliminations.hasIssues ? (
                  <AlertCircle className="w-4 h-4 text-orange-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="mt-1 text-xs text-poker-muted">
                Total: {healthData.analysis.eliminations.total} | 
                Dates with data: {healthData.analysis.eliminations.datesWithEliminations}
              </div>
            </div>
          </div>

          {healthData.needsRepair && (
            <div className="pt-4 border-t border-white/10">
              <Button
                onClick={repairTournament}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Repairing...
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 mr-2" />
                    Repair Tournament Data
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {repairResult && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <h4 className="text-sm font-medium text-green-400 mb-2">Repair Completed</h4>
          <div className="text-xs text-poker-muted space-y-1">
            <div>Participants synced: {repairResult.repairs.participantSync.addedToTable}</div>
            <div>Dates fixed: {repairResult.repairs.dateFixing.datesFixed}</div>
            <div>Final participants: {repairResult.repairs.finalStatus.participants}</div>
          </div>
        </div>
      )}
    </div>
  )
}