'use client';

import { useEffect, useState, useRef } from 'react';
import { TournamentRankingData } from '@/lib/ranking-utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';

interface ResumenTableProps {
  tournamentId: number;
  adminKey?: string | null;
}

export default function ResumenTable({ tournamentId, adminKey }: ResumenTableProps) {
  const [rankingData, setRankingData] = useState<TournamentRankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
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
        }
      } catch (error) {
        console.error('Error fetching ranking data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRankingData();
  }, [tournamentId, adminKey]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-poker-muted">Cargando datos...</div>
      </div>
    );
  }

  if (!rankingData) {
    return (
      <div className="text-center py-8">
        <p className="text-poker-muted">No hay datos disponibles</p>
      </div>
    );
  }

  // Obtener el número de la última fecha completada
  const lastCompletedDate = rankingData.rankings.length > 0
    ? Math.max(
        ...rankingData.rankings.flatMap(r => Object.keys(r.pointsByDate || {})).map(Number),
        0
      )
    : 0;

  // Función para formatear nombre en móvil
  const formatPlayerName = (name: string, isMobile: boolean) => {
    if (!isMobile) return name;
    
    // Formato seguro "Nombre A." 
    const parts = name.split(' ').filter(part => part.trim().length > 0);
    
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      
      // Verificar que el apellido tenga al menos una letra
      if (lastName && lastName.length > 0) {
        return `${firstName} ${lastName[0].toUpperCase()}.`;
      }
    }
    
    // Fallback: retornar solo el primer nombre o el nombre completo
    return parts[0] || name;
  };

  const downloadPDF = async () => {
    if (!tableRef.current || !rankingData) return;
    
    setDownloading(true);
    
    try {
      // Capturar la tabla como imagen
      const canvas = await html2canvas(tableRef.current, {
        scale: 2, // Alta resolución
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
      });

      // Crear PDF cuadrado 800x800px
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [800, 800]
      });

      // Obtener dimensiones
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calcular dimensiones para ajustar en PDF cuadrado
      const pdfWidth = 800;
      const pdfHeight = 800;
      
      // Calcular escala manteniendo proporciones
      const scale = Math.min(pdfWidth / imgWidth, (pdfHeight - 100) / imgHeight);
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      
      // Centrar la imagen
      const x = (pdfWidth - scaledWidth) / 2;
      const y = 50; // Dejar espacio para título

      // Agregar título
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Tabla Resumen - Torneo ${rankingData.tournament.number}`, pdfWidth / 2, 30, { align: 'center' });
      
      // Agregar fecha
      pdf.setFontSize(12);
      const currentDate = new Date().toLocaleDateString('es-ES');
      pdf.text(`Generado el: ${currentDate}`, pdfWidth / 2, 750, { align: 'center' });

      // Agregar imagen de la tabla
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

      // Descargar PDF
      const fileName = `tabla-resumen-torneo-${rankingData.tournament.number}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Inténtalo de nuevo.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full">
      <div ref={tableRef}>
        <table className="excel-table w-full table-fixed">
        <thead>
          <tr>
            <th className="excel-header-gray w-[8%] sm:w-[8%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">POS</span>
              <span className="sm:hidden">#</span>
            </th>
            <th className="excel-header w-[32%] sm:w-[25%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">JUGADOR</span>
              <span className="sm:hidden">JUG</span>
            </th>
            <th className="excel-header w-[12%] sm:w-[12%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">FECHA {lastCompletedDate}</span>
              <span className="sm:hidden">F.{lastCompletedDate}</span>
            </th>
            <th className="excel-header excel-header-total w-[12%] sm:w-[13%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">TOTAL</span>
              <span className="sm:hidden">TOT</span>
            </th>
            <th className="excel-header w-[12%] sm:w-[14%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">ELIMINA 1</span>
              <span className="sm:hidden">E1</span>
            </th>
            <th className="excel-header w-[12%] sm:w-[14%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">ELIMINA 2</span>
              <span className="sm:hidden">E2</span>
            </th>
            <th className="excel-header excel-header-total w-[12%] sm:w-[14%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">FINAL</span>
              <span className="sm:hidden">FIN</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rankingData.rankings.map((player, index) => {
            const pointsLastDate = lastCompletedDate > 0 
              ? player.pointsByDate[lastCompletedDate] || 0
              : 0;
              
            return (
              <tr key={player.playerId} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="excel-cell excel-cell-gray text-center font-medium" style={{color: '#000'}}>
                  {player.position}
                </td>
                <td className="excel-cell text-left" style={{color: '#000'}}>
                  <span className="hidden sm:inline" style={{color: '#000'}}>{player.playerName}</span>
                  <span className="sm:hidden" style={{color: '#000'}}>{formatPlayerName(player.playerName, true)}</span>
                </td>
                <td className="excel-cell text-center" style={{color: '#000'}}>
                  {pointsLastDate}
                </td>
                <td className="excel-cell excel-cell-total text-center font-bold" style={{color: '#000'}}>
                  {player.totalPoints}
                </td>
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
            );
          })}
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