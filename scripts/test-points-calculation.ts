#!/usr/bin/env npx tsx

import { calculatePointsForPosition } from '../src/lib/tournament-utils'

function testPointsCalculation() {
  console.log('🔢 TESTING CÁLCULO DE PUNTOS - DIAGNÓSTICO DETALLADO\n')

  // Probar el caso problemático de 9 jugadores
  console.log('🧪 CASO PROBLEMÁTICO: 9 JUGADORES')
  console.log('Debugging paso a paso...\n')

  const totalPlayers = 9
  const players = Math.max(9, Math.min(24, totalPlayers))
  console.log(`Total players: ${totalPlayers}, Adjusted: ${players}`)
  
  // Crear array de puntos
  const pointsArray = new Array(players)
  console.log(`Array initialized with length: ${pointsArray.length}`)
  
  // Última posición siempre 1 punto
  pointsArray[players - 1] = 1
  console.log(`pointsArray[${players - 1}] = 1`)
  
  // Desde penúltima hasta posición 10: +1 punto cada una
  console.log(`\nLoop: desde índice ${players - 2} hasta índice 9 (posición 10)`)
  for (let i = players - 2; i >= 9; i--) { // índice 9 = posición 10
    pointsArray[i] = pointsArray[i + 1] + 1
    console.log(`pointsArray[${i}] = pointsArray[${i + 1}] + 1 = ${pointsArray[i]}`)
  }
  
  // Posición 9 (índice 8): +2 puntos respecto a posición 10
  if (players >= 9) {
    console.log(`\nPosición 9 (índice 8): +2 puntos respecto a posición 10`)
    console.log(`pointsArray[9] = ${pointsArray[9]} (puede ser undefined si no hay posición 10)`)
    pointsArray[8] = (pointsArray[9] || 0) + 2
    console.log(`pointsArray[8] = ${pointsArray[8]}`)
  }
  
  // Posiciones 8-4 (índices 7-3): +1 punto cada una
  console.log(`\nLoop: desde índice 7 hasta índice 3`)
  for (let i = 7; i >= 3; i--) {
    pointsArray[i] = pointsArray[i + 1] + 1
    console.log(`pointsArray[${i}] = pointsArray[${i + 1}] + 1 = ${pointsArray[i]}`)
  }
  
  // Posiciones 3, 2, 1 (índices 2, 1, 0): +3 puntos cada una
  console.log(`\nLoop: desde índice 2 hasta índice 0`)
  for (let i = 2; i >= 0; i--) {
    pointsArray[i] = pointsArray[i + 1] + 3
    console.log(`pointsArray[${i}] = pointsArray[${i + 1}] + 3 = ${pointsArray[i]}`)
  }
  
  console.log(`\nArray final:`, pointsArray)
  
  // Mostrar distribución de puntos
  console.log('\n📊 DISTRIBUCIÓN DE PUNTOS PARA 9 JUGADORES:')
  for (let position = 1; position <= 9; position++) {
    const points = pointsArray[position - 1]
    console.log(`   Posición ${position}: ${points} puntos`)
  }

  // Probar con función real
  console.log('\n🔍 USANDO FUNCIÓN REAL:')
  for (let position = 1; position <= 9; position++) {
    const points = calculatePointsForPosition(position, 9)
    console.log(`   Posición ${position}: ${points} puntos`)
  }

  // Comparar con otras cantidades de jugadores
  console.log('\n📈 COMPARACIÓN CON OTRAS CANTIDADES:')
  const playerCounts = [9, 12, 15, 18, 21, 24]
  
  playerCounts.forEach(count => {
    const winner = calculatePointsForPosition(1, count)
    const second = calculatePointsForPosition(2, count)
    const third = calculatePointsForPosition(3, count)
    const last = calculatePointsForPosition(count, count)
    console.log(`   ${count} jugadores: 1°=${winner}, 2°=${second}, 3°=${third}, Último=${last}`)
  })

  // Verificar lógica del algoritmo
  console.log('\n🔧 ANÁLISIS DEL ALGORITMO:')
  console.log('Problema detectado en 9 jugadores:')
  console.log('- El loop "desde penúltima hasta posición 10" NO se ejecuta para 9 jugadores')
  console.log('- Índice 9 nunca se inicializa porque 9 jugadores = índices 0-8')
  console.log('- pointsArray[9] es undefined')
  console.log('- pointsArray[8] = undefined + 2 = NaN')
  console.log('\n💡 SOLUCIÓN: Verificar que pointsArray[9] existe antes de usarlo')
}

testPointsCalculation()