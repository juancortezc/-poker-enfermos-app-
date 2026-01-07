#!/usr/bin/env tsx

/**
 * Script to analyze Juan Antonio's real data vs system data
 * Real total: 119, Current system total: 110 (still missing 9 points)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Real data from the provided CSV
const realData = [
  { date: 1, position: 14, points: 6 },
  { date: 2, position: 6, points: 19 },
  { date: 3, position: 6, points: 18 },
  { date: 4, position: 6, points: 17 },
  { date: 5, position: 19, points: 2 },
  { date: 6, position: 7, points: 13 },
  { date: 7, position: 13, points: 10 },
  { date: 8, position: 7, points: 18 },
  { date: 9, position: 19, points: 3 },
  // Date 10: Not in the provided data (maybe he was absent?)
  // Date 11: From image - position 19, points 2
]

async function analyzeJuanAntonioRealData() {
  console.log('🔍 Analyzing Juan Antonio real data vs system data...')
  
  // Get Juan Antonio's player ID
  const juanAntonio = await prisma.player.findFirst({
    where: {
      firstName: 'Juan Antonio',
      lastName: 'Cortez'
    }
  })
  
  if (!juanAntonio) {
    console.error('❌ Juan Antonio not found')
    return
  }
  
  // Get current system data
  const eliminations = await prisma.elimination.findMany({
    where: {
      eliminatedPlayerId: juanAntonio.id,
      gameDate: {
        tournament: {
          number: 28
        }
      }
    },
    include: {
      gameDate: {
        select: {
          dateNumber: true
        }
      }
    },
    orderBy: {
      gameDate: {
        dateNumber: 'asc'
      }
    }
  })
  
  console.log('\n📊 Real vs System comparison:')
  console.log('Date | Real Pos | Real Pts | System Pos | System Pts | Diff')
  console.log('-----|----------|----------|------------|------------|-----')
  
  let realTotal = 0
  let systemTotal = 0
  const systemByDate = new Map()
  
  eliminations.forEach(e => {
    systemByDate.set(e.gameDate.dateNumber, { position: e.position, points: e.points })
    systemTotal += e.points
  })
  
  // Compare each date
  realData.forEach(real => {
    const system = systemByDate.get(real.date)
    const systemPos = system?.position || 'N/A'
    const systemPts = system?.points || 0
    const diff = (system?.points || 0) - real.points
    
    console.log(`${real.date.toString().padStart(4)} | ${real.position.toString().padStart(8)} | ${real.points.toString().padStart(8)} | ${systemPos.toString().padStart(10)} | ${systemPts.toString().padStart(10)} | ${diff.toString().padStart(4)}`)
    
    realTotal += real.points
  })
  
  console.log('-----|----------|----------|------------|------------|-----')
  
  // Add Date 11 from image (position 19, 2 points)
  const date11Real = { date: 11, position: 19, points: 2 }
  const date11System = systemByDate.get(11)
  const date11Diff = (date11System?.points || 0) - date11Real.points
  
  console.log(`${date11Real.date.toString().padStart(4)} | ${date11Real.position.toString().padStart(8)} | ${date11Real.points.toString().padStart(8)} | ${date11System?.position.toString().padStart(10) || 'N/A'} | ${date11System?.points.toString().padStart(10) || '0'} | ${date11Diff.toString().padStart(4)}`)
  
  realTotal += date11Real.points
  
  console.log('-----|----------|----------|------------|------------|-----')
  console.log(`TOTAL| ${' '.padStart(8)} | ${realTotal.toString().padStart(8)} | ${' '.padStart(10)} | ${systemTotal.toString().padStart(10)} | ${(systemTotal - realTotal).toString().padStart(4)}`)
  
  console.log('\n🔍 Analysis:')
  console.log(`Real total from CSV + image: ${realTotal}`)
  console.log(`Image shows total: 119`)
  console.log(`System total: ${systemTotal}`)
  console.log(`Missing from real CSV data: ${119 - realTotal} points`)
  console.log(`System vs image difference: ${systemTotal - 119}`)
  
  // Check if there are dates in system that aren't in real data
  console.log('\n📅 Dates in system but not in real data:')
  for (let dateNum = 1; dateNum <= 12; dateNum++) {
    const hasReal = realData.some(r => r.date === dateNum) || dateNum === 11
    const hasSystem = systemByDate.has(dateNum)
    
    if (hasSystem && !hasReal && dateNum !== 11) {
      const systemData = systemByDate.get(dateNum)
      console.log(`Date ${dateNum}: System has position ${systemData.position}, ${systemData.points} pts (not in real data)`)
    }
  }
  
  // The missing 8 points (119 - 111) might be from Date 10 or other dates not in the CSV
  console.log('\n💡 Possible explanations for missing points:')
  console.log('1. Date 10 might not be in the CSV but Juan Antonio participated')
  console.log('2. There might be additional dates after Date 9 in the provided CSV')
  console.log('3. The image total of 119 includes points from dates not in the CSV')
}

// Run the analysis
analyzeJuanAntonioRealData()
  .catch(error => {
    console.error('❌ Analysis failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })