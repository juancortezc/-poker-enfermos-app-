#!/usr/bin/env npx tsx

/**
 * Script de backup completo de la base de datos antes de migración a PINs
 * 
 * Este script crea un backup completo de la tabla players antes de
 * realizar la migración del sistema adminKey al sistema de PINs.
 * 
 * Uso: npx tsx scripts/backup-database.ts
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function createDatabaseBackup() {
  console.log('🔄 Iniciando backup completo de la base de datos...\n')

  try {
    // Backup de tabla players (la más crítica para esta migración)
    console.log('📋 Respaldando tabla players...')
    const players = await prisma.player.findMany({
      include: {
        gameResults: true,
        eliminations: true,
        eliminationsGiven: true,
        tournamentRankings: true,
        tournamentParticipants: true,
        timerActions: true,
        invitees: true
      }
    })

    // Backup de otras tablas críticas
    console.log('📋 Respaldando otras tablas críticas...')
    
    const tournaments = await prisma.tournament.findMany({
      include: {
        gameDates: true,
        tournamentRankings: true,
        blindLevels: true,
        tournamentParticipants: true
      }
    })

    const gameDates = await prisma.gameDate.findMany({
      include: {
        gameResults: true,
        eliminations: true,
        timerStates: true,
        tournamentRankings: true
      }
    })

    const eliminations = await prisma.elimination.findMany({
      include: {
        eliminatedPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        eliminatorPlayer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Crear objeto backup completo
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      description: 'Backup completo antes de migración adminKey -> PINs',
      tables: {
        players: players,
        tournaments: tournaments,
        gameDates: gameDates,
        eliminations: eliminations
      },
      counts: {
        players: players.length,
        tournaments: tournaments.length,
        gameDates: gameDates.length,
        eliminations: eliminations.length
      }
    }

    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `database-backup-${timestamp}.json`
    const backupPath = join(process.cwd(), 'backups', backupFileName)

    // Crear directorio backups si no existe
    const { mkdirSync } = await import('fs')
    try {
      mkdirSync(join(process.cwd(), 'backups'), { recursive: true })
    } catch (error) {
      // Directory already exists, continue
    }

    // Escribir backup
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2))

    // Backup específico de adminKeys (para rollback)
    const adminKeyBackup = players
      .filter(player => player.adminKey)
      .map(player => ({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        role: player.role,
        adminKey: player.adminKey,
        pin: player.pin
      }))

    const adminKeyBackupPath = join(process.cwd(), 'backups', `adminkeys-backup-${timestamp}.json`)
    writeFileSync(adminKeyBackupPath, JSON.stringify(adminKeyBackup, null, 2))

    // Estadísticas del backup
    console.log('\n✅ BACKUP COMPLETADO EXITOSAMENTE\n')
    console.log('📊 Estadísticas del backup:')
    console.log(`   👥 Jugadores: ${backupData.counts.players}`)
    console.log(`   🏆 Torneos: ${backupData.counts.tournaments}`)
    console.log(`   📅 Fechas: ${backupData.counts.gameDates}`)
    console.log(`   ❌ Eliminaciones: ${backupData.counts.eliminations}`)
    
    console.log('\n📁 Archivos generados:')
    console.log(`   📄 Backup completo: ${backupPath}`)
    console.log(`   🔑 AdminKeys backup: ${adminKeyBackupPath}`)

    // Información sobre usuarios con adminKey
    const usersWithAdminKey = players.filter(p => p.adminKey)
    console.log(`\n🔐 Usuarios con adminKey encontrados: ${usersWithAdminKey.length}`)
    usersWithAdminKey.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.role})`)
    })

    // Información sobre usuarios con PIN existente
    const usersWithPin = players.filter(p => p.pin)
    console.log(`\n📌 Usuarios con PIN existente: ${usersWithPin.length}`)
    usersWithPin.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (PIN: ****)`)
    })

    console.log('\n⚠️  IMPORTANTE:')
    console.log('   - Guarda estos archivos en lugar seguro')
    console.log('   - NO los subas a git (están en .gitignore)')
    console.log('   - Úsalos para rollback si es necesario')
    console.log('\n🚀 Listo para proceder con la migración a PINs')

  } catch (error) {
    console.error('❌ Error durante el backup:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar backup
createDatabaseBackup()