'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Trophy, Star } from 'lucide-react';
import { toast } from 'react-toastify';
import TimerDisplay from '@/components/TimerDisplay';
import EliminationForm from '@/components/eliminations/EliminationForm';
import EliminationTable from '@/components/eliminations/EliminationTable';

interface LiveStatus {
  gameDate: {
    id: string;
    dateNumber: number;
    status: string;
    totalPlayers: number;
    startedAt: string | null;
    scheduledDate: string;
  };
  tournament: {
    id: string;
    number: number;
    name: string;
  };
  liveStats: {
    playersRemaining: number;
    totalPlayers: number;
    winnerPoints: number;
    nextPosition: number;
    eliminationsCount: number;
  };
  currentBlind: {
    level: number;
    smallBlind: number;
    bigBlind: number;
    duration: number;
    timeRemaining: number;
  };
  activePlayers: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}

interface Elimination {
  id: string;
  position: number;
  points: number;
  eliminationTime: string;
  eliminatedPlayer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  eliminatorPlayer: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export default function RegistroPage() {
  const router = useRouter();
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [eliminations, setEliminations] = useState<Elimination[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Obtener fecha activa
  useEffect(() => {
    async function fetchActiveGameDate() {
      try {
        const res = await fetch('/api/game-dates/active');
        if (res.ok) {
          const gameDate = await res.json();
          if (gameDate) {
            fetchLiveStatus(gameDate.id);
            fetchEliminations(gameDate.id);
          } else {
            toast.error('No hay fecha activa');
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error fetching active game date:', error);
        toast.error('Error al cargar la fecha activa');
      }
    }

    fetchActiveGameDate();
  }, [router]);

  // Actualizar cada 5 segundos
  useEffect(() => {
    if (!liveStatus?.gameDate?.id) return;

    const interval = setInterval(() => {
      fetchLiveStatus(liveStatus.gameDate.id);
      fetchEliminations(liveStatus.gameDate.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [liveStatus?.gameDate?.id]);

  async function fetchLiveStatus(gameDateId: string) {
    try {
      const res = await fetch(`/api/game-dates/${gameDateId}/live-status`);
      if (res.ok) {
        const data = await res.json();
        setLiveStatus(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching live status:', error);
    }
  }

  async function fetchEliminations(gameDateId: string) {
    try {
      const res = await fetch(`/api/eliminations/game-date/${gameDateId}`);
      if (res.ok) {
        const data = await res.json();
        setEliminations(data);
      }
    } catch (error) {
      console.error('Error fetching eliminations:', error);
    }
  }

  const handleEliminationSaved = () => {
    if (liveStatus?.gameDate?.id) {
      fetchLiveStatus(liveStatus.gameDate.id);
      fetchEliminations(liveStatus.gameDate.id);
    }
    setRefreshKey(prev => prev + 1);
  };

  const handleEliminationUpdated = () => {
    if (liveStatus?.gameDate?.id) {
      fetchEliminations(liveStatus.gameDate.id);
    }
  };

  if (loading || !liveStatus) {
    return (
      <div className="min-h-screen bg-poker-black flex items-center justify-center">
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-poker-black p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="text-center flex-1">
          <h1 className="text-xl font-bold text-white">REGISTRO</h1>
          <p className="text-sm text-poker-muted">
            Fecha {liveStatus.gameDate.dateNumber} - Torneo {liveStatus.tournament.number}
          </p>
        </div>

        <div className="w-9" /> {/* Spacer para centrar */}
      </div>

      {/* Timer y Blind */}
      <div className="bg-poker-red/20 border border-poker-red/30 rounded-lg p-4 mb-6">
        <TimerDisplay
          currentBlind={liveStatus.currentBlind}
          tournament={{
            id: liveStatus.tournament.id,
            blindLevels: [] // No necesitamos todos los niveles aquí
          }}
          compact
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-poker-card border border-white/10 rounded-lg p-4 text-center">
          <Users className="w-8 h-8 text-poker-gold mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">
            {liveStatus.liveStats.playersRemaining}
          </div>
          <div className="text-xs text-poker-muted uppercase">En Juego</div>
        </div>

        <div className="bg-poker-card border border-white/10 rounded-lg p-4 text-center">
          <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">
            {liveStatus.liveStats.totalPlayers}
          </div>
          <div className="text-xs text-poker-muted uppercase">Total</div>
        </div>

        <div className="bg-poker-card border border-white/10 rounded-lg p-4 text-center">
          <Trophy className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">
            {liveStatus.liveStats.winnerPoints}
          </div>
          <div className="text-xs text-poker-muted uppercase">Puntos 1º</div>
        </div>
      </div>

      {/* Formulario de Eliminación */}
      <EliminationForm
        gameDateId={liveStatus.gameDate.id}
        nextPosition={liveStatus.liveStats.nextPosition}
        activePlayers={liveStatus.activePlayers}
        totalPlayers={liveStatus.liveStats.totalPlayers}
        onSave={handleEliminationSaved}
        key={refreshKey}
      />

      {/* Tabla de Eliminaciones */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center">
          <Star className="w-5 h-5 mr-2 text-poker-gold" />
          Eliminaciones
        </h2>
        
        <EliminationTable
          eliminations={eliminations}
          gameDateId={liveStatus.gameDate.id}
          onUpdate={handleEliminationUpdated}
        />
      </div>
    </div>
  );
}