'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

export function ImportProgress() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Preparando importación...');

  const steps = [
    'Preparando importación...',
    'Validando datos...',
    'Buscando GameDate...',
    'Limpiando datos existentes...',
    'Importando eliminaciones...',
    'Actualizando estado de fecha...',
    'Finalizando importación...'
  ];

  useEffect(() => {
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setCurrentStep(steps[stepIndex]);
        setProgress(((stepIndex + 1) / steps.length) * 100);
        stepIndex++;
      } else {
        clearInterval(stepInterval);
      }
    }, 800);

    return () => clearInterval(stepInterval);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="bg-poker-card border-2 border-gray-600 p-8 max-w-md w-full">
        <div className="text-center space-y-6">
          {/* Animated Icon */}
          <div className="relative">
            <div className="text-6xl text-poker-red animate-pulse">
              📊
            </div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-poker-red rounded-full animate-ping"></div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white">
            Importando Datos...
          </h2>

          {/* Current Step */}
          <div className="text-poker-text">
            {currentStep}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-poker-red to-red-500 h-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm text-poker-text">
              {Math.round(progress)}% completado
            </div>
          </div>

          {/* Loading Animation */}
          <div className="flex justify-center space-x-2">
            <div className="w-3 h-3 bg-poker-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-poker-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-poker-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>

          {/* Warning */}
          <div className="text-xs text-yellow-400 bg-yellow-900 bg-opacity-20 p-3 rounded border border-yellow-700">
            ⚠️ No cierres esta ventana durante la importación
          </div>
        </div>
      </Card>
    </div>
  );
}