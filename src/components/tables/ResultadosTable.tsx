'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-config';
import Image from 'next/image';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
}

interface GameDate {
  id: number;
  dateNumber: number;
  scheduledDate: string;
  status: string;
}

interface DateAwardsResponse {
  gameDate: GameDate;
  awards: {
    varon: { player: Player; eliminations: number }[];
    gay: { player: Player; eliminations: number }[];
    podio: Player[];
    mesaFinal: Player[];
    sieteYDos: Player[];
    faltas: Player[];
  };
}

interface ResultadosTableProps {
  tournamentId: number;
  userPin?: string | null;
}

interface CPAwardCardProps {
  title: string;
  description: string;
  accentColor: string;
  players: Array<{
    player: Player;
    value?: number;
  }>;
  valueLabel?: string;
}

function CPAwardCard({ title, description, accentColor, players, valueLabel }: CPAwardCardProps) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-surface-border)',
      }}
    >
      {/* Header */}
      <div className="mb-3">
        <p
          className="uppercase tracking-wider"
          style={{
            fontSize: '10px',
            color: 'var(--cp-on-surface-muted)',
          }}
        >
          {description}
        </p>
        <h3
          className="mt-1 font-semibold"
          style={{
            fontSize: 'var(--cp-body-size)',
            color: 'var(--cp-on-surface)',
          }}
        >
          {title}
        </h3>
      </div>

      {/* Players List */}
      {players.length > 0 ? (
        <div className="space-y-2">
          {players.map((item, index) => (
            <div
              key={item.player.id}
              className="flex items-center gap-3 rounded-xl p-2"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {/* Position */}
              <div
                className="w-5 text-center font-medium"
                style={{
                  fontSize: 'var(--cp-caption-size)',
                  color: 'var(--cp-on-surface-muted)',
                }}
              >
                {index + 1}
              </div>

              {/* Player Photo */}
              <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-white/10">
                {item.player.photoUrl ? (
                  <Image
                    src={item.player.photoUrl}
                    alt={`${item.player.firstName} ${item.player.lastName}`}
                    fill
                    loading="lazy"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-xs font-semibold"
                    style={{
                      background: 'var(--cp-surface-elevated)',
                      color: 'var(--cp-on-surface-muted)',
                    }}
                  >
                    {item.player.firstName[0]}
                    {item.player.lastName[0]}
                  </div>
                )}
              </div>

              {/* Player Name */}
              <div className="flex-1 min-w-0">
                <p
                  className="font-medium truncate"
                  style={{
                    fontSize: 'var(--cp-caption-size)',
                    color: 'var(--cp-on-surface)',
                  }}
                >
                  {item.player.firstName} {item.player.lastName}
                </p>
              </div>

              {/* Value */}
              {item.value !== undefined && (
                <div
                  className="flex flex-col items-end text-right px-2 py-1 rounded-lg"
                  style={{ background: accentColor + '20' }}
                >
                  <span
                    className="font-bold"
                    style={{ fontSize: 'var(--cp-body-size)', color: accentColor }}
                  >
                    {item.value}
                  </span>
                  {valueLabel && (
                    <span
                      className="uppercase tracking-wider"
                      style={{
                        fontSize: '9px',
                        color: 'var(--cp-on-surface-muted)',
                      }}
                    >
                      {valueLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--cp-caption-size)',
              color: 'var(--cp-on-surface-muted)',
            }}
          >
            No hay datos
          </p>
        </div>
      )}
    </div>
  );
}

export default function ResultadosTable({ tournamentId }: ResultadosTableProps) {
  const [availableDates, setAvailableDates] = useState<GameDate[]>([]);
  const [selectedDateId, setSelectedDateId] = useState<number | null>(null);

  // Fetch tournament dates
  const { data: gameDates, isLoading: datesLoading } = useSWR<GameDate[]>(
    `/api/tournaments/${tournamentId}/dates`,
    fetcher,
    { refreshInterval: 60000 }
  );

  // Process available dates
  useEffect(() => {
    if (gameDates) {
      const filtered = gameDates
        .filter(gd => gd.status === 'completed' || gd.status === 'in_progress')
        .sort((a, b) => b.dateNumber - a.dateNumber);
      setAvailableDates(filtered);

      // Set default to latest date if not already selected
      if (filtered.length > 0 && !selectedDateId) {
        setSelectedDateId(filtered[0].id);
      }
    }
  }, [gameDates, selectedDateId]);

  // Fetch date awards
  const { data: awardsData, isLoading: awardsLoading } = useSWR<DateAwardsResponse>(
    selectedDateId ? `/api/stats/date-awards/${selectedDateId}` : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  if (datesLoading) {
    return (
      <div className="flex justify-center py-8">
        <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando fechas...</div>
      </div>
    );
  }

  if (availableDates.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
          No hay fechas disponibles
        </p>
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)', marginTop: '8px' }}>
          Los resultados se mostrarán cuando se registre una fecha.
        </p>
      </div>
    );
  }

  const awards = awardsData?.awards;
  const gameDate = awardsData?.gameDate;

  return (
    <div className="w-full space-y-4 p-4" style={{ background: 'var(--cp-background)' }}>
      {/* Date Selector - CleanPoker style */}
      <div className="flex justify-center">
        <div className="relative">
          <select
            value={selectedDateId || ''}
            onChange={(e) => setSelectedDateId(parseInt(e.target.value))}
            className="appearance-none rounded px-4 py-3 pr-10 font-medium min-w-[200px] cursor-pointer transition-all"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
              fontSize: 'var(--cp-body-size)',
            }}
          >
            {availableDates.map(date => (
              <option key={date.id} value={date.id} style={{ background: '#1a1a1a' }}>
                Fecha {date.dateNumber}{date.status === 'in_progress' ? ' (En curso)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          />
        </div>
      </div>

      {/* Awards Content */}
      {awardsLoading ? (
        <div className="flex justify-center py-8">
          <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando resultados...</div>
        </div>
      ) : awards ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Podio */}
          <CPAwardCard
            title="Podio"
            description="Top 3 de la fecha"
            accentColor="#F59E0B"
            players={awards.podio.map(p => ({ player: p }))}
          />

          {/* Varón de la Noche */}
          <CPAwardCard
            title="Varón de la Noche"
            description="Mayor cantidad de eliminaciones"
            accentColor="#E53935"
            players={awards.varon.map(v => ({ player: v.player, value: v.eliminations }))}
            valueLabel="Elims"
          />

          {/* Mesa Final */}
          <CPAwardCard
            title="Mesa Final"
            description="Posiciones 1 a 9"
            accentColor="#10B981"
            players={awards.mesaFinal.map(p => ({ player: p }))}
          />

          {/* 7/2 */}
          <CPAwardCard
            title="7/2"
            description="Primeros eliminados"
            accentColor="#F43F5E"
            players={awards.sieteYDos.map(p => ({ player: p }))}
          />

          {/* Faltas */}
          {awards.faltas.length > 0 && (
            <CPAwardCard
              title="Faltas"
              description="Jugadores ausentes"
              accentColor="#F43F5E"
              players={awards.faltas.map(p => ({ player: p }))}
            />
          )}
        </div>
      ) : (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
          }}
        >
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
            No hay resultados para esta fecha
          </p>
        </div>
      )}

      {/* Footer info */}
      {gameDate && (
        <div className="text-center pt-2">
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            Fecha {gameDate.dateNumber} - {new Date(gameDate.scheduledDate).toLocaleDateString('es-EC')}
          </p>
        </div>
      )}
    </div>
  );
}
