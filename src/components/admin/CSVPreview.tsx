'use client';

// Button component removed - using native buttons
import { Card } from '@/components/ui/card';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  playerValidation: {
    valid: Array<{ csvName: string; dbName: string; playerId: string; role: string }>;
    invalid: Array<{ csvName: string; reason: string }>;
    warnings: Array<{ csvName: string; message: string }>;
  };
  eliminations: Array<{
    torneo: string;
    fecha: number;
    date: string;
    posicion: number;
    eliminado: string;
    eliminador: string;
    puntos: number;
  }>;
  previewData?: {
    totalRecords: number;
    playerCount: number;
    tournamentInfo: {
      tournament: string;
      date: string;
      dateNumber: number;
    };
  };
}

interface CSVPreviewProps {
  validationResult: ValidationResult;
  onImport: () => void;
  onBackToUpload: () => void;
  isImporting: boolean;
}

export function CSVPreview({ 
  validationResult, 
  onImport, 
  onBackToUpload, 
  isImporting 
}: CSVPreviewProps) {
  const { valid, errors, warnings, playerValidation, eliminations, previewData } = validationResult;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {previewData && (
        <Card className="admin-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Resumen del Archivo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-poker-red">
                {previewData.totalRecords}
              </div>
              <div className="text-poker-text">Eliminaciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-poker-red">
                {previewData.playerCount}
              </div>
              <div className="text-poker-text">Jugadores</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-white">
                {previewData.tournamentInfo.tournament}
              </div>
              <div className="text-poker-text">
                Fecha {previewData.tournamentInfo.dateNumber} • {previewData.tournamentInfo.date}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Validation Status */}
      <Card className={`border-2 p-6 ${
        valid 
          ? 'bg-poker-red bg-opacity-20 border-poker-red' 
          : 'bg-red-900 bg-opacity-20 border-red-500'
      }`}>
        <div className="flex items-center mb-4">
          <div className={`text-3xl mr-3 ${valid ? 'text-white' : 'text-red-500'}`}>
            {valid ? '✅' : '❌'}
          </div>
          <h2 className="text-xl font-semibold text-white">
            {valid ? 'Validación Exitosa' : 'Errores de Validación'}
          </h2>
        </div>

        {errors.length > 0 && (
          <div className="mb-4">
            <h3 className="text-red-400 font-semibold mb-2">Errores:</h3>
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-red-300 text-sm">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div>
            <h3 className="text-yellow-400 font-semibold mb-2">Advertencias:</h3>
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="text-yellow-300 text-sm">
                  • {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Player Validation Details */}
      <Card className="bg-poker-card border-2 border-gray-600 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Validación de Jugadores</h2>
        
        {/* Valid Players */}
        {playerValidation.valid.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3">
              Jugadores Válidos ({playerValidation.valid.length})
            </h3>
            <div className="max-h-48 overflow-y-auto">
              <div className="grid gap-2">
                {playerValidation.valid.map((player, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between bg-gray-800 p-3 rounded border border-gray-600"
                  >
                    <div>
                      <span className="text-white font-medium">{player.csvName}</span>
                      {player.csvName !== player.dbName && (
                        <span className="text-orange-400 text-sm ml-2">
                          → {player.dbName}
                        </span>
                      )}
                    </div>
                    <div className="text-poker-text text-sm">
                      {player.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Invalid Players */}
        {playerValidation.invalid.length > 0 && (
          <div className="mb-6">
            <h3 className="text-red-400 font-semibold mb-3">
              Jugadores No Encontrados ({playerValidation.invalid.length})
            </h3>
            <div className="space-y-2">
              {playerValidation.invalid.map((player, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between bg-red-900 bg-opacity-20 p-3 rounded border border-red-700"
                >
                  <span className="text-white font-medium">{player.csvName}</span>
                  <span className="text-red-300 text-sm">{player.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player Warnings */}
        {playerValidation.warnings.length > 0 && (
          <div>
            <h3 className="text-yellow-400 font-semibold mb-3">
              Advertencias de Jugadores ({playerValidation.warnings.length})
            </h3>
            <div className="space-y-2">
              {playerValidation.warnings.map((warning, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between bg-yellow-900 bg-opacity-20 p-3 rounded border border-yellow-700"
                >
                  <span className="text-white font-medium">{warning.csvName}</span>
                  <span className="text-yellow-300 text-sm">{warning.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Data Preview */}
      <Card className="bg-poker-card border-2 border-gray-600 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Vista Previa de Datos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-2 px-3 text-poker-red">Pos</th>
                <th className="text-left py-2 px-3 text-poker-red">Eliminado</th>
                <th className="text-left py-2 px-3 text-poker-red">Eliminador</th>
                <th className="text-left py-2 px-3 text-poker-red">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {eliminations.slice(0, 10).map((elim, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-2 px-3 text-white font-medium">{elim.posicion}</td>
                  <td className="py-2 px-3 text-white">{elim.eliminado}</td>
                  <td className="py-2 px-3 text-poker-text">
                    {elim.eliminador || '-'}
                  </td>
                  <td className="py-2 px-3 text-poker-red font-medium">{elim.puntos}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {eliminations.length > 10 && (
            <div className="text-center py-3 text-poker-text">
              ... y {eliminations.length - 10} registros más
            </div>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={onBackToUpload}
          className={`btn-admin-outline ${isImporting ? 'btn-admin-disabled' : ''}`}
          disabled={isImporting}
        >
          ← Cambiar Archivo
        </button>
        
        <button
          onClick={onImport}
          disabled={!valid || isImporting}
          className={`${
            valid && !isImporting
              ? 'btn-admin-success btn-admin-lg' 
              : 'btn-admin-disabled'
          }`}
        >
          {isImporting ? '⏳ Importando...' : '🚀 Ejecutar Importación'}
        </button>
      </div>
    </div>
  );
}