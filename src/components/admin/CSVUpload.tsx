'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
      <Card className="bg-poker-card border-2 border-gray-600 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Formato del Archivo CSV</h2>
        <div className="text-poker-text space-y-2">
          <p>El archivo debe tener las siguientes columnas en orden:</p>
          <div className="bg-black p-4 rounded border border-gray-700 font-mono text-sm">
            <div className="text-poker-red">torneo,fecha,date,posicion,eliminado,eliminador,puntos</div>
            <div className="text-gray-400 mt-2">
              Torneo 28,1,2025-04-15,1,Diego Behar,,25<br />
              Torneo 28,1,2025-04-15,2,Milton Tapia,Diego Behar,18<br />
              ...
            </div>
          </div>
          <div className="mt-4 space-y-1 text-sm">
            <p><span className="text-poker-red">torneo:</span> Nombre del torneo (ej: "Torneo 28")</p>
            <p><span className="text-poker-red">fecha:</span> Número de fecha (1-12)</p>
            <p><span className="text-poker-red">date:</span> Fecha ISO (YYYY-MM-DD)</p>
            <p><span className="text-poker-red">posicion:</span> Posición final (1 = ganador)</p>
            <p><span className="text-poker-red">eliminado:</span> Nombre del jugador eliminado</p>
            <p><span className="text-poker-red">eliminador:</span> Nombre del eliminador (vacío si es ganador)</p>
            <p><span className="text-poker-red">puntos:</span> Puntos asignados (0-30)</p>
          </div>
        </div>
      </Card>

      {/* Upload Area */}
      <Card className="bg-poker-card border-2 border-gray-600">
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
              <Button
                onClick={handleChooseFile}
                className="bg-poker-red hover:bg-red-700 text-white"
              >
                Seleccionar Archivo
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                Máximo 5MB • Solo archivos .csv
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-4xl text-green-500 mb-2">✅</div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {selectedFile.name}
                </h3>
                <p className="text-poker-text text-sm">
                  {formatFileSize(selectedFile.size)} • Tipo: {selectedFile.type || 'text/csv'}
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleUpload}
                  className="bg-poker-red hover:bg-red-700 text-white"
                >
                  Validar Archivo
                </Button>
                <Button
                  onClick={handleRemoveFile}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Cambiar Archivo
                </Button>
              </div>
            </div>
          )}
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