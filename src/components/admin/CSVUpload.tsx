'use client';

import { useState, useCallback, useRef } from 'react';
// Button component removed - using native buttons
import { Card } from '@/components/ui/card';
import LoadingState from '@/components/ui/LoadingState';

interface CSVUploadProps {
  onFileUpload: (file: File) => void;
  isValidating: boolean;
}

export function CSVUpload({ onFileUpload, isValidating }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 1) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.csv')) {
        handleFileSelect(file);
      } else {
        alert('Solo se permiten archivos CSV');
      }
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length === 1) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(() => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  }, [selectedFile, onFileUpload]);

  const handleChooseFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isValidating) {
    return <LoadingState message="Validando archivo CSV..." />;
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="admin-card">
        <div
          className={`p-8 text-center border-2 border-dashed transition-colors ${
            isDragging 
              ? 'border-poker-red bg-poker-red bg-opacity-10' 
              : 'border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <>
              <div className="text-6xl text-gray-500 mb-4">📁</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Arrastra y suelta tu archivo CSV
              </h3>
              <p className="text-poker-text mb-6">
                O haz clic para seleccionar un archivo
              </p>
              <button
                onClick={handleChooseFile}
                className="btn-admin-secondary"
              >
                Seleccionar Archivo
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Máximo 5MB • Solo archivos .csv
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-4xl text-white mb-2">✅</div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {selectedFile.name}
                </h3>
                <p className="text-poker-text text-sm">
                  {formatFileSize(selectedFile.size)} • Tipo: {selectedFile.type || 'text/csv'}
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleUpload}
                  className="btn-admin-primary"
                >
                  Validar Archivo
                </button>
                <button
                  onClick={handleRemoveFile}
                  className="btn-admin-outline"
                >
                  Cambiar Archivo
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Formato del Archivo CSV */}
      <Card className="admin-card p-6 sm:p-7">
        <h2 className="text-xl font-semibold text-white mb-3">Formato del archivo CSV</h2>
        <p className="text-sm text-poker-muted mb-4">El archivo debe contener exactamente <span className="font-semibold text-white">7 columnas</span> en el siguiente orden:</p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-poker-text">
          <li><span className="font-semibold text-white">TORNEO</span> — Número del torneo (ej. 28).</li>
          <li><span className="font-semibold text-white">FECHA</span> — Número de fecha jugada (1-12).</li>
          <li><span className="font-semibold text-white">DATE</span> — Fecha en formato <code className="font-mono text-xs bg-black/40 px-1 py-0.5 rounded">YYYY-MM-DD</code>.</li>
          <li><span className="font-semibold text-white">POSICION</span> — Posición en la que salió el jugador.</li>
          <li><span className="font-semibold text-white">ELIMINADO</span> — Nombre completo del jugador eliminado.</li>
          <li><span className="font-semibold text-white">ELIMINADOR</span> — Nombre del jugador que lo eliminó (vacío para el ganador).</li>
          <li><span className="font-semibold text-white">PUNTOS</span> — Puntos asignados a la posición.</li>
        </ol>
        <div className="mt-5 bg-black/40 border border-white/10 rounded-lg p-4 text-xs sm:text-sm text-white/80">
          <p className="uppercase text-poker-muted tracking-wide text-[10px] sm:text-[11px]">Ejemplo de fila</p>
          <code className="block mt-2 whitespace-pre-wrap break-words font-mono">28,7,2025-07-08,11,Jose Patricio Moreno,Freddy Lopez,12</code>
        </div>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}