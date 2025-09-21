#!/usr/bin/env tsx

/**
 * RESTORE SCRIPT - Generated for backup 2025-09-21T16-44-36-951Z
 * WARNING: This will completely replace current database with backup data
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function restoreFromBackup() {
  console.log('🔄 RESTORING DATABASE FROM BACKUP: 2025-09-21T16-44-36-951Z')
  console.log('⚠️  WARNING: This will completely replace current database!')
  
  const backupData = JSON.parse(fs.readFileSync('/Users/jac/Apps/PE/poker-app/backups/tournament-backup-2025-09-21T16-44-36-951Z.json', 'utf8'))
  
  try {
    // Clear all data in reverse dependency order
    console.log('🧹 Clearing current database...')
    await prisma.timerAction.deleteMany({})
    await prisma.timerState.deleteMany({})
    await prisma.parentChildStats.deleteMany({})
    await prisma.tournamentRanking.deleteMany({})
    await prisma.elimination.deleteMany({})
    await prisma.blindLevel.deleteMany({})
    await prisma.tournamentParticipant.deleteMany({})
    await prisma.gameDate.deleteMany({})
    await prisma.tournament.deleteMany({})
    
    // Restore data in dependency order
    console.log('📥 Restoring backup data...')
    
    // Players (independent)
    for (const player of backupData.players) {
      await prisma.player.upsert({
        where: { id: player.id },
        create: player,
        update: player
      })
    }
    
    // Tournaments
    for (const tournament of backupData.tournaments) {
      const { gameDates, tournamentParticipants, blindLevels, ...tournamentData } = tournament
      await prisma.tournament.create({ data: tournamentData })
    }
    
    // Game Dates
    for (const gameDate of backupData.gameDates) {
      const { eliminations, timerStates, ...gameDateData } = gameDate
      await prisma.gameDate.create({ data: gameDateData })
    }
    
    // Tournament Participants
    for (const participant of backupData.tournamentParticipants) {
      await prisma.tournamentParticipant.create({ data: participant })
    }
    
    // Blind Levels
    for (const blindLevel of backupData.blindLevels) {
      await prisma.blindLevel.create({ data: blindLevel })
    }
    
    // Eliminations
    for (const elimination of backupData.eliminations) {
      await prisma.elimination.create({ data: elimination })
    }
    
    // Tournament Rankings
    for (const ranking of backupData.tournamentRankings) {
      await prisma.tournamentRanking.create({ data: ranking })
    }
    
    // Parent Child Stats
    for (const stat of backupData.parentChildStats) {
      await prisma.parentChildStats.create({ data: stat })
    }
    
    // Timer States
    for (const timerState of backupData.timerStates) {
      await prisma.timerState.create({ data: timerState })
    }
    
    // Timer Actions
    for (const timerAction of backupData.timerActions) {
      await prisma.timerAction.create({ data: timerAction })
    }
    
    console.log('✅ RESTORE COMPLETED SUCCESSFULLY')
    console.log('Database restored to state: 2025-09-21T16-44-36-951Z')
    
  } catch (error) {
    console.error('❌ Restore failed:', error)
    throw error
  }
}

restoreFromBackup()
  .catch(error => {
    console.error('❌ Restore script failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })
