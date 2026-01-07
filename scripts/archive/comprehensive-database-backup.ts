#!/usr/bin/env tsx

/**
 * Comprehensive Database Backup System
 * Creates full backup with rollback capability before data integrity rebuild
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface BackupData {
  timestamp: string
  version: string
  tournaments: any[]
  gameDates: any[]
  eliminations: any[]
  tournamentRankings: any[]
  tournamentParticipants: any[]
  parentChildStats: any[]
  blindLevels: any[]
  timerStates: any[]
  timerActions: any[]
  players: any[]
}

async function createComprehensiveBackup() {
  console.log('🚀 COMPREHENSIVE DATABASE BACKUP SYSTEM')
  console.log('Creating complete backup before data integrity rebuild...\n')

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(process.cwd(), 'backups')
  const backupFile = path.join(backupDir, `tournament-backup-${timestamp}.json`)

  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
      console.log('📁 Created backup directory')
    }

    console.log('📊 Backing up all tournament data...')

    // Create comprehensive backup data
    const backupData: BackupData = {
      timestamp,
      version: '1.0.0',
      tournaments: await prisma.tournament.findMany({
        include: {
          gameDates: true,
          tournamentParticipants: true,
          blindLevels: true
        }
      }),
      gameDates: await prisma.gameDate.findMany({
        include: {
          eliminations: true,
          timerStates: true
        }
      }),
      eliminations: await prisma.elimination.findMany(),
      tournamentRankings: await prisma.tournamentRanking.findMany(),
      tournamentParticipants: await prisma.tournamentParticipant.findMany(),
      parentChildStats: await prisma.parentChildStats.findMany(),
      blindLevels: await prisma.blindLevel.findMany(),
      timerStates: await prisma.timerState.findMany(),
      timerActions: await prisma.timerAction.findMany(),
      players: await prisma.player.findMany()
    }

    // Calculate backup statistics
    const stats = {
      tournaments: backupData.tournaments.length,
      gameDates: backupData.gameDates.length,
      eliminations: backupData.eliminations.length,
      tournamentRankings: backupData.tournamentRankings.length,
      players: backupData.players.length,
      totalRecords: Object.values(backupData).reduce((sum, data) => 
        sum + (Array.isArray(data) ? data.length : 0), 0
      )
    }

    // Write backup file
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))

    console.log('✅ BACKUP COMPLETED SUCCESSFULLY')
    console.log(`📁 File: ${backupFile}`)
    console.log(`📊 Statistics:`)
    console.log(`   - Tournaments: ${stats.tournaments}`)
    console.log(`   - Game Dates: ${stats.gameDates}`)
    console.log(`   - Eliminations: ${stats.eliminations}`)
    console.log(`   - Rankings: ${stats.tournamentRankings}`)
    console.log(`   - Players: ${stats.players}`)
    console.log(`   - Total Records: ${stats.totalRecords}`)
    
    const fileSizeMB = (fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)
    console.log(`   - File Size: ${fileSizeMB} MB`)

    // Create restore script for this backup
    await createRestoreScript(backupFile, timestamp)

    return {
      backupFile,
      timestamp,
      stats
    }

  } catch (error) {
    console.error('❌ Backup failed:', error)
    throw error
  }
}

async function createRestoreScript(backupFile: string, timestamp: string) {
  const restoreScript = `#!/usr/bin/env tsx

/**
 * RESTORE SCRIPT - Generated for backup ${timestamp}
 * WARNING: This will completely replace current database with backup data
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function restoreFromBackup() {
  console.log('🔄 RESTORING DATABASE FROM BACKUP: ${timestamp}')
  console.log('⚠️  WARNING: This will completely replace current database!')
  
  const backupData = JSON.parse(fs.readFileSync('${backupFile}', 'utf8'))
  
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
    console.log('Database restored to state: ${timestamp}')
    
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
`

  const restoreFile = path.join(path.dirname(backupFile), `restore-${timestamp}.ts`)
  fs.writeFileSync(restoreFile, restoreScript)
  console.log(`🔄 Restore script created: ${restoreFile}`)
}

// Validate backup integrity
async function validateBackup(backupFile: string) {
  console.log('🔍 Validating backup integrity...')
  
  try {
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'))
    
    // Validate essential data exists
    const validations = [
      { name: 'tournaments', count: backupData.tournaments?.length || 0 },
      { name: 'gameDates', count: backupData.gameDates?.length || 0 },
      { name: 'eliminations', count: backupData.eliminations?.length || 0 },
      { name: 'players', count: backupData.players?.length || 0 }
    ]
    
    console.log('📊 Backup validation results:')
    validations.forEach(v => {
      const status = v.count > 0 ? '✅' : '⚠️ '
      console.log(`   ${status} ${v.name}: ${v.count} records`)
    })
    
    // Validate Tournament 28 specifically
    const tournament28 = backupData.tournaments?.find(t => t.number === 28)
    if (tournament28) {
      console.log(`✅ Tournament 28 found in backup (ID: ${tournament28.id})`)
      
      const tournament28Dates = backupData.gameDates?.filter(gd => gd.tournamentId === tournament28.id)
      console.log(`✅ Tournament 28 has ${tournament28Dates?.length || 0} game dates`)
      
      const tournament28Eliminations = backupData.eliminations?.filter(e => 
        tournament28Dates?.some(gd => gd.id === e.gameDateId)
      )
      console.log(`✅ Tournament 28 has ${tournament28Eliminations?.length || 0} eliminations`)
    } else {
      console.log('⚠️  Tournament 28 not found in backup')
    }
    
    return true
  } catch (error) {
    console.error('❌ Backup validation failed:', error)
    return false
  }
}

// Main execution
async function main() {
  try {
    const backup = await createComprehensiveBackup()
    const isValid = await validateBackup(backup.backupFile)
    
    if (isValid) {
      console.log('\n🎉 BACKUP SYSTEM READY')
      console.log('✅ Complete database backup created successfully')
      console.log('✅ Restore script generated')
      console.log('✅ Backup integrity validated')
      console.log('\n📋 Next Steps:')
      console.log('1. Proceed with comprehensive data audit')
      console.log('2. Run data integrity rebuild')
      console.log('3. Use restore script if rollback needed')
      
      return backup
    } else {
      throw new Error('Backup validation failed')
    }
  } catch (error) {
    console.error('❌ Backup system failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .catch(error => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

export { createComprehensiveBackup, validateBackup }