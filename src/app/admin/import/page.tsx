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
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`
        },
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
  }, [user?.adminKey]);

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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.adminKey}`
        },
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
  }, [validationResult, user?.adminKey]);

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
        <Card className="bg-poker-card border-poker-red border-2 p-8 text-center">
          <h1 className="text-2xl font-bold text-poker-red mb-4">Acceso Denegado</h1>
          <p className="text-poker-text">Solo usuarios de la Comisión pueden acceder a esta página.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-poker-red mb-2">Importar CSV Histórico</h1>
          <p className="text-poker-text">
            Importar eliminaciones históricas desde archivos CSV al sistema
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <ValidationMessage 
              type="error" 
              message={error}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-poker-text">
            <div className={`flex items-center ${currentStep === 'upload' ? 'text-poker-red' : currentStep !== 'upload' ? 'text-white' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                currentStep === 'upload' ? 'bg-poker-red text-white' : 
                currentStep !== 'upload' ? 'bg-white text-black' : 'bg-gray-600'
              }`}>
                1
              </div>
              Subir Archivo
            </div>
            
            <div className="flex-1 h-0.5 bg-gray-600 mx-4">
              <div className={`h-full bg-poker-red transition-all ${
                ['preview', 'importing', 'results'].includes(currentStep) ? 'w-full' : 'w-0'
              }`} />
            </div>
            
            <div className={`flex items-center ${currentStep === 'preview' ? 'text-poker-red' : ['importing', 'results'].includes(currentStep) ? 'text-white' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                currentStep === 'preview' ? 'bg-poker-red text-white' : 
                ['importing', 'results'].includes(currentStep) ? 'bg-white text-black' : 'bg-gray-600'
              }`}>
                2
              </div>
              Previsualizar
            </div>
            
            <div className="flex-1 h-0.5 bg-gray-600 mx-4">
              <div className={`h-full bg-poker-red transition-all ${
                ['importing', 'results'].includes(currentStep) ? 'w-full' : 'w-0'
              }`} />
            </div>
            
            <div className={`flex items-center ${['importing', 'results'].includes(currentStep) ? 'text-poker-red' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ['importing', 'results'].includes(currentStep) ? 'bg-poker-red text-white' : 'bg-gray-600'
              }`}>
                3
              </div>
              Importar
            </div>
          </div>
        </div>

        {/* Step Content */}
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
            isImporting={currentStep === 'importing'}
          />
        )}

        {currentStep === 'importing' && (
          <ImportProgress />
        )}

        {currentStep === 'results' && importResult && (
          <ImportResults 
            result={importResult}
            onStartOver={handleStartOver}
            onBackToPreview={handleBackToPreview}
          />
        )}
      </div>
    </div>
  );
}