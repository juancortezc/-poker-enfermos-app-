'use client';

import { useEffect, useState, useRef } from 'react';
import { TournamentRankingData } from '@/lib/ranking-utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';

interface TotalTableProps {
  tournamentId: number;
  adminKey?: string | null;
}

export default function TotalTable({ tournamentId, adminKey }: TotalTableProps) {
  const [rankingData, setRankingData] = useState<TournamentRankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [completedDates, setCompletedDates] = useState<number[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchRankingData() {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };

        // Add authorization header if adminKey is provided
        if (adminKey) {
          headers['Authorization'] = `Bearer ${adminKey}`;
        }

        const response = await fetch(`/api/tournaments/${tournamentId}/ranking`, { headers });
        if (response.ok) {
          const data = await response.json();
          setRankingData(data);
          
          // Obtener fechas completadas del primer jugador y ordenarlas en orden ascendente
          if (data.rankings.length > 0) {
            const dateNumbers = Object.keys(data.rankings[0].pointsByDate || {})
              .map(Number)
              .filter(dateNumber => dateNumber > 0)
              .sort((a, b) => a - b); // Orden ascendente: F1, F2, F3, F4, F5
            setCompletedDates(dateNumbers);
          }
        }
      } catch (error) {
        console.error('Error fetching ranking data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRankingData();
  }, [tournamentId, adminKey]);

  // Función para formatear nombre según espacio disponible
  const formatPlayerName = (name: string, availableSpace: 'full' | 'medium' | 'short') => {
    const parts = name.split(' ').filter(part => part.trim().length > 0);
    
    switch (availableSpace) {
      case 'full':
        return name;
      case 'medium':
        if (parts.length >= 2) {
          return `${parts[0]} ${parts[parts.length - 1][0]}.`;
        }
        return parts[0] || name;
      case 'short':
        return parts[0] || name;
      default:
        return name;
    }
  };

  const downloadPDF = async () => {
    if (!tableRef.current || !rankingData) return;
    
    setDownloading(true);
    
    try {
      // Para tabla ancha, usar formato landscape
      const canvas = await html2canvas(tableRef.current, {
        scale: 1.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        width: tableRef.current.scrollWidth,
      });

      // Crear PDF landscape para tabla ancha
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular escala
      const scale = Math.min(pdfWidth / canvas.width, (pdfHeight - 80) / canvas.height);
      const scaledWidth = canvas.width * scale;
      const scaledHeight = canvas.height * scale;
      
      const x = (pdfWidth - scaledWidth) / 2;
      const y = 40;

      // Título
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Tabla Total - Torneo ${rankingData.tournament.number}`, pdfWidth / 2, 25, { align: 'center' });
      
      // Fecha
      pdf.setFontSize(10);
      const currentDate = new Date().toLocaleDateString('es-ES');
      pdf.text(`Generado el: ${currentDate}`, pdfWidth / 2, pdfHeight - 15, { align: 'center' });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

      const fileName = `tabla-total-torneo-${rankingData.tournament.number}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Inténtalo de nuevo.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-poker-muted">Cargando datos...</div>
      </div>
    );
  }

  if (!rankingData || completedDates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-poker-muted">No hay fechas completadas disponibles</p>
      </div>
    );
  }

  // Determinar formato de nombre basado en número de fechas
  const nameFormat = completedDates.length > 8 ? 'short' : completedDates.length > 5 ? 'medium' : 'full';

  return (
    <div className="w-full">
      <div ref={tableRef} className="total-table-container">
        <table className="excel-table total-table">
          <thead>
            <tr>
              <th className="excel-header-gray" style={{color: '#000'}}>
                <span className="hidden sm:inline">POS</span>
                <span className="sm:hidden">#</span>
              </th>
              <th className="excel-header sticky-col" style={{color: '#000'}}>
                <span className="hidden sm:inline">JUGADOR</span>
                <span className="sm:hidden">JUG</span>
              </th>
              <th className="excel-header excel-header-total" style={{color: '#000'}}>
                <span className="hidden sm:inline">TOTAL</span>
                <span className="sm:hidden">TOT</span>
              </th>
              {completedDates.map(dateNumber => (
                <th key={dateNumber} className="excel-header date-header" style={{color: '#000'}}>
                  F{dateNumber}
                </th>
              ))}
              <th className="excel-header" style={{color: '#000'}}>
                <span className="hidden sm:inline">ELIMINA 1</span>
                <span className="sm:hidden">E1</span>
              </th>
              <th className="excel-header" style={{color: '#000'}}>
                <span className="hidden sm:inline">ELIMINA 2</span>
                <span className="sm:hidden">E2</span>
              </th>
              <th className="excel-header excel-header-total" style={{color: '#000'}}>
                <span className="hidden sm:inline">FINAL</span>
                <span className="sm:hidden">FIN</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rankingData.rankings.map((player, index) => (
              <tr key={player.playerId} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="excel-cell excel-cell-gray text-center font-medium" style={{color: '#000'}}>
                  {player.position}
                </td>
                <td className="excel-cell text-left sticky-col" style={{color: '#000'}}>
                  {formatPlayerName(player.playerName, nameFormat)}
                </td>
                <td className="excel-cell excel-cell-total text-center font-bold" style={{color: '#000'}}>
                  {player.totalPoints}
                </td>
                {completedDates.map(dateNumber => (
                  <td key={dateNumber} className="excel-cell text-center date-cell" style={{color: '#000'}}>
                    {player.pointsByDate[dateNumber] || 0}
                  </td>
                ))}
                <td className="excel-cell text-center" style={{color: '#000'}}>
                  {player.elimina1 !== undefined ? player.elimina1 : '-'}
                </td>
                <td className="excel-cell text-center" style={{color: '#000'}}>
                  {player.elimina2 !== undefined ? player.elimina2 : '-'}
                </td>
                <td className="excel-cell excel-cell-total text-center font-bold" style={{color: '#000'}}>
                  {player.finalScore !== undefined ? player.finalScore : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Botón de descarga PDF */}
      <div className="flex justify-center mt-6">
        <button
          onClick={downloadPDF}
          disabled={downloading || !rankingData}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200
            ${downloading || !rankingData 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-poker-red text-white hover:bg-red-700 active:scale-95 shadow-lg hover:shadow-xl'
            }
          `}
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Generando PDF...' : 'Descargar PDF'}
        </button>
      </div>
    </div>
  );
}