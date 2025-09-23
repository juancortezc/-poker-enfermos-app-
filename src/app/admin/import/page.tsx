'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import LoadingState from '@/components/ui/LoadingState';
import ValidationMessage from '@/components/ui/ValidationMessage';
import { CSVUpload } from '@/components/admin/CSVUpload';
import { CSVPreview } from '@/components/admin/CSVPreview';
import { ImportProgress } from '@/components/admin/ImportProgress';
import { ImportResults } from '@/components/admin/ImportResults';
import { buildAuthHeaders } from '@/lib/client-auth';

interface CSVElimination {
  torneo: string;
  fecha: number;
  date: string;
  posicion: number;
  eliminado: string;
  eliminador: string;
  puntos: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  playerValidation: {
    valid: Array<{ csvName: string; dbName: string; playerId: string; role: string }>;
    invalid: Array<{ csvName: string; reason: string }>;
    warnings: Array<{ csvName: string; message: string }>;
  };
  eliminations: CSVElimination[];
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

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'results';

export default function AdminImportPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsValidating(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/admin/import/validate', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setValidationResult(result);
      setCurrentStep('preview');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error validando archivo');
      console.error('Error validating file:', err);
    } finally {
      setIsValidating(false);
    }
  }, [user]);

  const handleImport = useCallback(async () => {
    if (!validationResult || !validationResult.valid) {
      setError('No se puede importar: datos inválidos');
      return;
    }

    setCurrentStep('importing');
    setError(null);
    
    try {
      const response = await fetch('/api/admin/import/execute', {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({
          eliminations: validationResult.eliminations
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setImportResult(result);
      setCurrentStep('results');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error ejecutando importación');
      console.error('Error executing import:', err);
      setCurrentStep('preview'); // Regresar a preview en caso de error
    }
  }, [validationResult, user]);

  const handleStartOver = useCallback(() => {
    setCurrentStep('upload');
    setValidationResult(null);
    setImportResult(null);
    setError(null);
  }, []);

  const handleBackToPreview = useCallback(() => {
    setCurrentStep('preview');
    setError(null);
  }, []);

  if (authLoading) {
    return <LoadingState message="Verificando autenticación..." />;
  }

  if (!user || user.role !== 'Comision') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="admin-card-error p-8 text-center">
          <h1 className="text-2xl font-bold text-poker-red mb-4">Acceso Denegado</h1>
          <p className="text-poker-text">Solo usuarios de la Comisión pueden acceder a esta página.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-poker-dark">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {error && (
          <ValidationMessage
            type="error"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        <section className="bg-poker-card border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Importar Eliminaciones</h1>
              <p className="text-sm text-poker-muted mt-1">Carga un archivo CSV para validar y aplicar resultados de una fecha.</p>
            </div>
          </header>

          <div className="space-y-5 text-sm text-poker-muted">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${currentStep === 'upload' ? 'bg-poker-red text-white' : 'bg-white/10 text-white'}`}>1</div>
              <div>
                <p className={`font-semibold ${currentStep === 'upload' ? 'text-white' : 'text-poker-muted'}`}>Subir archivo</p>
                <p className="text-xs sm:text-sm text-poker-muted">Selecciona el CSV y verifica que tenga el formato correcto.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${currentStep === 'preview' ? 'bg-poker-red text-white' : ['importing', 'results'].includes(currentStep) ? 'bg-green-500 text-white' : 'bg-white/10 text-white'}`}>2</div>
              <div>
                <p className={`font-semibold ${currentStep === 'preview' ? 'text-white' : ['importing', 'results'].includes(currentStep) ? 'text-white' : 'text-poker-muted'}`}>Previsualizar</p>
                <p className="text-xs sm:text-sm text-poker-muted">Confirma los datos detectados y revisa los jugadores coincidentes.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${['importing', 'results'].includes(currentStep) ? 'bg-poker-red text-white' : 'bg-white/10 text-white'}`}>3</div>
              <div>
                <p className={`font-semibold ${['importing', 'results'].includes(currentStep) ? 'text-white' : 'text-poker-muted'}`}>Importar</p>
                <p className="text-xs sm:text-sm text-poker-muted">Aplica la importación y revisa el resumen final con los registros creados.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-8">
          {currentStep === 'upload' && (
            <CSVUpload
              onFileUpload={handleFileUpload}
              isValidating={isValidating}
            />
          )}

          {currentStep === 'preview' && validationResult && (
            <CSVPreview
              validationResult={validationResult}
              onImport={handleImport}
              onBackToUpload={handleStartOver}
              // @ts-expect-error - isImporting prop type issue
              isImporting={currentStep === 'importing'}
            />
          )}

          {currentStep === 'importing' && (<ImportProgress />)}

          {currentStep === 'results' && importResult && (
            <ImportResults
              result={importResult}
              onStartOver={handleStartOver}
              onBackToPreview={handleBackToPreview}
            />
          )}
        </div>
      </div>
    </div>
  );
}

