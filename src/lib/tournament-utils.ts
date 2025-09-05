/**
 * Calcula los puntos para una posición específica según la cantidad total de jugadores
 * 
 * Lógica de puntos:
 * - Último lugar: 1 punto
 * - Posiciones 10+ hasta penúltima: +1 punto por posición hacia arriba
 * - Posición 9: +2 puntos respecto a posición 10
 * - Posiciones 8-4: +1 punto por posición hacia arriba
 * - Posiciones 3, 2, 1: +3 puntos por posición hacia arriba
 */
export function calculatePointsForPosition(position: number, totalPlayers: number): number {
  // Validar parámetros
  if (position < 1 || position > totalPlayers) {
    return 0;
  }

  // Soporte mínimo de 9 jugadores, máximo de 24
  const players = Math.max(9, Math.min(24, totalPlayers));
  
  // Crear array de puntos para esta cantidad de jugadores
  const pointsArray = new Array(players);
  
  // Última posición siempre 1 punto
  pointsArray[players - 1] = 1;
  
  // Desde penúltima hasta posición 10: +1 punto cada una
  for (let i = players - 2; i >= 9; i--) { // índice 9 = posición 10
    pointsArray[i] = pointsArray[i + 1] + 1;
  }
  
  // Posición 9 (índice 8): +2 puntos respecto a posición 10
  if (players >= 9) {
    pointsArray[8] = pointsArray[9] + 2;
  }
  
  // Posiciones 8-4 (índices 7-3): +1 punto cada una
  for (let i = 7; i >= 3; i--) {
    pointsArray[i] = pointsArray[i + 1] + 1;
  }
  
  // Posiciones 3, 2, 1 (índices 2, 1, 0): +3 puntos cada una
  for (let i = 2; i >= 0; i--) {
    pointsArray[i] = pointsArray[i + 1] + 3;
  }
  
  return pointsArray[position - 1];
}

export function getWinnerPoints(totalPlayers: number): number {
  return calculatePointsForPosition(1, totalPlayers);
}

/**
 * Obtiene la distribución completa de puntos para una cantidad de jugadores
 */
export function getPointsDistribution(totalPlayers: number): number[] {
  const players = Math.max(9, Math.min(24, totalPlayers));
  const distribution: number[] = [];
  
  for (let position = 1; position <= players; position++) {
    distribution.push(calculatePointsForPosition(position, players));
  }
  
  return distribution;
}

/**
 * Obtiene la tabla completa de puntos para mostrar en administración
 */
export function getPointsTable(): Record<number, number[]> {
  const pointsTable: Record<number, number[]> = {};
  
  for (let players = 9; players <= 24; players++) {
    pointsTable[players] = getPointsDistribution(players);
  }
  
  return pointsTable;
}