'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { canCRUD } from '@/lib/auth';
import { getPointsTable } from '@/lib/tournament-utils';

export default function AdminPointsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [pointsTable, setPointsTable] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPlayerCount, setSelectedPlayerCount] = useState(20);

  // Verificar permisos
  useEffect(() => {
    if (!user || !canCRUD(user.role)) {
      router.push('/dashboard');
      return;
    }

    // Cargar tabla de puntos actual
    const currentTable = getPointsTable();
    setPointsTable(currentTable);
    setLoading(false);
  }, [user, router]);

  const resetToDefault = () => {
    const defaultTable = getPointsTable();
    setPointsTable(defaultTable);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-black flex items-center justify-center">
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }

  const selectedDistribution = pointsTable[selectedPlayerCount] || [];

  return (
    <div className="min-h-screen bg-poker-black p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-admin-outline btn-admin-sm mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Administración de Puntos</h1>
              <p className="text-poker-muted">Configuración de la tabla de puntos por posición</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetToDefault}
              className="btn-admin-neutral flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar
            </button>
            <button className="btn-admin-success flex items-center gap-2">
              <Save className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>

        {/* Selector de cantidad de jugadores */}
        <div className="admin-card p-6 mb-6">
          <h3 className="text-white font-bold mb-3">Seleccionar cantidad de jugadores</h3>
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 16 }, (_, i) => i + 9).map(count => (
              <button
                key={count}
                onClick={() => setSelectedPlayerCount(count)}
                className={`text-sm font-medium transition-smooth ${
                  selectedPlayerCount === count
                    ? 'btn-admin-primary btn-admin-sm'
                    : 'btn-admin-outline btn-admin-sm'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de puntos para la cantidad seleccionada */}
        <div className="admin-card overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-bold">
              Distribución de puntos para {selectedPlayerCount} jugadores
            </h3>
            <p className="text-poker-muted text-sm mt-1">
              Máximo: {selectedDistribution[0]} puntos | Mínimo: {selectedDistribution[selectedDistribution.length - 1]} punto
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left py-3 px-4 text-poker-muted font-medium">Posición</th>
                  <th className="text-left py-3 px-4 text-poker-muted font-medium">Puntos</th>
                  <th className="text-left py-3 px-4 text-poker-muted font-medium">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {selectedDistribution.map((points, index) => {
                  const position = index + 1;
                  const previousPoints = index > 0 ? selectedDistribution[index - 1] : points;
                  const difference = previousPoints - points;

                  return (
                    <tr key={position} className="border-b border-white/5">
                      <td className="py-3 px-4 text-white font-medium">
                        {position === 1 && '🏆 '}
                        {position === 2 && '🥈 '}
                        {position === 3 && '🥉 '}
                        {position}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${
                          position <= 3 ? 'text-poker-gold' : 'text-poker-text'
                        }`}>
                          {points}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-poker-muted">
                        {index > 0 ? `-${difference}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen de la lógica */}
        <div className="bg-poker-card/50 border border-white/10 rounded-lg p-4 mt-6">
          <h4 className="text-white font-bold mb-3">Lógica de Puntos</h4>
          <ul className="text-poker-muted text-sm space-y-1">
            <li>• <strong>Última posición:</strong> 1 punto</li>
            <li>• <strong>Posición 10+ hasta penúltima:</strong> +1 punto por posición</li>
            <li>• <strong>Posición 9:</strong> +2 puntos respecto a posición 10</li>
            <li>• <strong>Posiciones 8-4:</strong> +1 punto por posición</li>
            <li>• <strong>Posiciones 3, 2, 1:</strong> +3 puntos por posición</li>
          </ul>
        </div>
      </div>
    </div>
  );
}