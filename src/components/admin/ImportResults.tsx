'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  gameDateId?: number;
  tournamentNumber?: number;
  dateNumber?: number;
  suggestions?: string[];
}

interface ImportResultsProps {
  result: ImportResult;
  onStartOver: () => void;
  onBackToPreview: () => void;
}

export function ImportResults({ result, onStartOver, onBackToPreview }: ImportResultsProps) {
  const { success, message, imported, gameDateId, tournamentNumber, dateNumber, suggestions } = result;

  return (
    <div className="space-y-6">
      {/* Result Status */}
      <Card className={`border-2 p-8 text-center ${
        success 
          ? 'bg-poker-red bg-opacity-20 border-poker-red' 
          : 'bg-red-900 bg-opacity-20 border-red-500'
      }`}>
        <div className={`text-6xl mb-4 ${success ? 'text-white' : 'text-red-500'}`}>
          {success ? '🎉' : '💥'}
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3">
          {success ? 'Importación Exitosa' : 'Error en la Importación'}
        </h2>
        
        <p className={`text-lg mb-6 ${success ? 'text-white' : 'text-red-300'}`}>
          {message}
        </p>

        {success && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-poker-red">{imported}</div>
              <div className="text-poker-text">Eliminaciones Importadas</div>
            </div>
            {tournamentNumber && (
              <div className="text-center">
                <div className="text-xl font-semibold text-white">Torneo {tournamentNumber}</div>
                <div className="text-poker-text">Torneo Actualizado</div>
              </div>
            )}
            {dateNumber && (
              <div className="text-center">
                <div className="text-xl font-semibold text-white">Fecha {dateNumber}</div>
                <div className="text-poker-text">Fecha Completada</div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Error Details */}
      {!success && suggestions && suggestions.length > 0 && (
        <Card className="bg-poker-card border-2 border-red-500 p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-3">Detalles del Error</h3>
          <ul className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-red-300 text-sm">
                • {suggestion}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Success Details */}
      {success && gameDateId && (
        <Card className="bg-poker-card border-2 border-poker-red p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Detalles de la Importación</h3>
          <div className="space-y-2 text-sm">
            <p className="text-poker-text">
              <span className="text-white font-medium">GameDate ID:</span> {gameDateId}
            </p>
            <p className="text-poker-text">
              <span className="text-white font-medium">Estado:</span> Completada
            </p>
            <p className="text-poker-text">
              <span className="text-white font-medium">Eliminaciones:</span> {imported} registros procesados
            </p>
            <p className="text-white mt-4">
              ✅ Los datos han sido importados exitosamente y están disponibles en el sistema.
            </p>
          </div>
        </Card>
      )}

      {/* Navigation Links */}
      {success && (
        <Card className="bg-poker-card border-2 border-gray-600 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Próximos Pasos</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-black rounded border border-gray-700">
              <div>
                <div className="text-white font-medium">Ver Ranking del Torneo</div>
                <div className="text-poker-text text-sm">Verificar los puntos importados</div>
              </div>
              <Button
                onClick={() => window.open('/ranking', '_blank')}
                className="bg-poker-red hover:bg-red-700 text-white text-sm"
              >
                Ver Ranking
              </Button>
            </div>
            
            {gameDateId && (
              <div className="flex items-center justify-between p-3 bg-black rounded border border-gray-700">
                <div>
                  <div className="text-white font-medium">Administrar Puntos</div>
                  <div className="text-poker-text text-sm">Ajustar puntos si es necesario</div>
                </div>
                <Button
                  onClick={() => window.open('/admin/points', '_blank')}
                  className="bg-gray-600 hover:bg-gray-700 text-white text-sm"
                >
                  Admin Puntos
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button
          onClick={onStartOver}
          className="bg-poker-red hover:bg-red-700 text-white font-semibold px-8"
        >
          Nueva Importación
        </Button>
        
        {!success && (
          <Button
            onClick={onBackToPreview}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            ← Regresar
          </Button>
        )}
      </div>
    </div>
  );
}