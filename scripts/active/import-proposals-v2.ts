import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function importProposalsV2() {
  try {
    console.log('📥 Importing proposals from backup to v2...')

    // Read the backup file
    const backupPath = join(process.cwd(), 'backups', 'proposals-backup-2025-10-03T16-24-55-972Z.json')
    const backupData = JSON.parse(readFileSync(backupPath, 'utf-8'))

    console.log(`Found ${backupData.proposals.length} proposals in backup`)

    // Import each proposal
    for (const proposal of backupData.proposals) {
      const imported = await prisma.proposalV2.create({
        data: {
          title: proposal.title,
          content: proposal.content,
          isActive: true,
          createdAt: new Date(proposal.createdAt)
          // Note: createdById is null since we don't have that info in backup
        }
      })

      console.log(`✅ Imported: "${imported.title}"`)
    }

    console.log('🎉 Import completed successfully!')

  } catch (error) {
    console.error('❌ Error importing proposals:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importProposalsV2()