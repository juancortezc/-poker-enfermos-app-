/**
 * Calcula los puntos para una posición específica según la cantidad total de jugadores
 * 
 * Lógica de puntos:
 * - 9 jugadores o menos: ver smallTable (último 1, +1 hasta el 4º, +3 en el podio)
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

  // 9 jugadores o menos: tabla aprobada por la Comisión (ver abajo).
  if (totalPlayers <= 9) {
    return smallTable(totalPlayers)[position - 1];
  }

  // Máximo de 24
  const players = Math.min(24, totalPlayers);

  // La validacion de arriba mira totalPlayers, pero la tabla se construye con
  // tope de 24. Con 25 jugadores, la posicion 25 pasaba el filtro y caia fuera
  // del array: devolvia undefined, que se guardaba en la base y salia como NaN
  // en la proyeccion. Se fija al ultimo puesto, que vale 1 punto.
  const slot = Math.min(position, players);
  
  // Crear array de puntos para esta cantidad de jugadores
  const pointsArray = new Array(players);
  
  // Última posición siempre 1 punto
  pointsArray[players - 1] = 1;
  
  // Desde penúltima hasta posición 10: +1 punto cada una
  for (let i = players - 2; i >= 9; i--) { // índice 9 = posición 10
    pointsArray[i] = pointsArray[i + 1] + 1;
  }
  
  // Posición 9 (índice 8): +2 puntos respecto a posición 10
  pointsArray[8] = pointsArray[9] + 2;
  
  // Posiciones 8-4 (índices 7-3): +1 punto cada una
  for (let i = 7; i >= 3; i--) {
    pointsArray[i] = pointsArray[i + 1] + 1;
  }
  
  // Posiciones 3, 2, 1 (índices 2, 1, 0): +3 puntos cada una
  for (let i = 2; i >= 0; i--) {
    pointsArray[i] = pointsArray[i + 1] + 3;
  }
  
  return pointsArray[slot - 1];
}

/**
 * Tabla para 9 jugadores o menos (aprobada por la Comisión):
 * último = 1, +1 por puesto hacia arriba hasta el 4º, y +3 en cada uno de los
 * tres primeros. Con 3 o menos solo existen puestos de podio.
 *   9 → 15,12,9,6,5,4,3,2,1   6 → 12,9,6,3,2,1   3 → 7,4,1
 */
function smallTable(players: number): number[] {
  const a = new Array<number>(players);
  a[players - 1] = 1;
  for (let i = players - 2; i >= 3; i--) a[i] = a[i + 1] + 1;
  for (let i = Math.min(2, players - 2); i >= 0; i--) a[i] = a[i + 1] + 3;
  return a;
}

export function getWinnerPoints(totalPlayers: number): number {
  return calculatePointsForPosition(1, totalPlayers);
}

/**
 * Obtiene la distribución completa de puntos para una cantidad de jugadores
 */
export function getPointsDistribution(totalPlayers: number): number[] {
  const players = Math.max(0, Math.min(24, totalPlayers));
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