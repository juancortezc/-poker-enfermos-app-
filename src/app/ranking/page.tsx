'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import TournamentRankingTable from '@/components/tournaments/TournamentRankingTable';
import ResumenTable from '@/components/tables/ResumenTable';
import TotalTable from '@/components/tables/TotalTable';
import FechasTable from '@/components/tables/FechasTable';

type TabType = 'resumen' | 'total' | 'fechas';

export default function RankingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTournamentId, setActiveTournamentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('resumen');

  // Obtener torneo activo
  useEffect(() => {
    async function fetchActiveTournament() {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };

        // Add authorization header if user has adminKey
        if (user?.adminKey) {
          headers['Authorization'] = `Bearer ${user.adminKey}`;
        }

        const response = await fetch('/api/tournaments/active', { headers });
        if (response.ok) {
          const data = await response.json();
          if (data.tournament) {
            setActiveTournamentId(data.tournament.id);
          }
        }
      } catch (error) {
        console.error('Error fetching active tournament:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchActiveTournament();
  }, [user]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <div className="text-white text-lg">Cargando tabla...</div>
      </div>
    );
  }

  // Verificar autenticación
  if (!user) {
    return (
      <div className="min-h-screen bg-poker-dark p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.push('/')}
              className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-white">Tabla</h1>
          </div>

          <div className="text-center py-12">
            <p className="text-poker-muted text-lg">Acceso no autorizado</p>
            <p className="text-poker-muted mt-2">Debes iniciar sesión para ver la tabla</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-6 py-2 bg-poker-red text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeTournamentId) {
    return (
      <div className="min-h-screen bg-poker-dark p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.push('/')}
              className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-white">Tabla</h1>
          </div>

          <div className="text-center py-12">
            <p className="text-poker-muted text-lg">No hay torneo activo</p>
            <p className="text-poker-muted mt-2">La tabla se mostrará cuando haya un torneo en curso</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-poker-dark pt-2 px-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Tabs */}
        <div className="flex border-b border-gray-600 mb-4">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'resumen'
                ? 'text-white border-b-2 border-poker-red'
                : 'text-poker-muted hover:text-white'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('total')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'total'
                ? 'text-white border-b-2 border-poker-red'
                : 'text-poker-muted hover:text-white'
            }`}
          >
            Total
          </button>
          <button
            onClick={() => setActiveTab('fechas')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'fechas'
                ? 'text-white border-b-2 border-poker-red'
                : 'text-poker-muted hover:text-white'
            }`}
          >
            Fechas
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-2">
          {activeTab === 'resumen' && (
            <ResumenTable tournamentId={activeTournamentId} adminKey={user?.adminKey} />
          )}
          
          {activeTab === 'total' && (
            <TotalTable tournamentId={activeTournamentId} adminKey={user?.adminKey} />
          )}
          
          {activeTab === 'fechas' && (
            <FechasTable tournamentId={activeTournamentId} adminKey={user?.adminKey} />
          )}
        </div>
      </div>
    </div>
  );
}