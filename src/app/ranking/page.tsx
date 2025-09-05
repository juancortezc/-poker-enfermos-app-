'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import TournamentRankingTable from '@/components/tournaments/TournamentRankingTable';

export default function RankingPage() {
  const router = useRouter();
  const [activeTournamentId, setActiveTournamentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Obtener torneo activo
  useEffect(() => {
    async function fetchActiveTournament() {
      try {
        const response = await fetch('/api/tournaments/active');
        if (response.ok) {
          const tournament = await response.json();
          if (tournament) {
            setActiveTournamentId(tournament.id);
          }
        }
      } catch (error) {
        console.error('Error fetching active tournament:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchActiveTournament();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-black flex items-center justify-center">
        <div className="text-white text-lg">Cargando ranking...</div>
      </div>
    );
  }

  if (!activeTournamentId) {
    return (
      <div className="min-h-screen bg-poker-black p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-white">Ranking del Torneo</h1>
          </div>

          <div className="text-center py-12">
            <p className="text-poker-muted text-lg">No hay torneo activo</p>
            <p className="text-poker-muted mt-2">El ranking se mostrará cuando haya un torneo en curso</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-poker-black p-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Ranking del Torneo</h1>
        </div>

        {/* Ranking Table */}
        <TournamentRankingTable tournamentId={activeTournamentId} />
      </div>
    </div>
  );
}