import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function backupProposals() {
  try {
    console.log('🔍 Fetching existing proposals...')

    const proposals = await prisma.proposal.findMany({
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        },
        comments: {
          include: {
            player: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        },
        votes: {
          include: {
            player: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(process.cwd(), 'backups', `proposals-backup-${timestamp}.json`)

    const backupData = {
      timestamp: new Date().toISOString(),
      totalProposals: proposals.length,
      proposals: proposals.map(proposal => ({
        ...proposal,
        imageUrl: proposal.imageUrl ? (
          proposal.imageUrl.startsWith('data:') ? '[BASE64_IMAGE_REMOVED]' : proposal.imageUrl
        ) : null
      }))
    }

    writeFileSync(backupPath, JSON.stringify(backupData, null, 2))

    console.log(`✅ Backup completed!`)
    console.log(`📁 File: ${backupPath}`)
    console.log(`📊 Total proposals: ${proposals.length}`)
    console.log(`🖼️  Proposals with images: ${proposals.filter(p => p.imageUrl).length}`)
    console.log(`💾 Proposals with base64 images: ${proposals.filter(p => p.imageUrl?.startsWith('data:')).length}`)

    // Show summary
    proposals.forEach((proposal, index) => {
      console.log(`${index + 1}. "${proposal.title}" by ${proposal.createdBy?.firstName} ${proposal.createdBy?.lastName} (${proposal.comments?.length || 0} comments, ${proposal.votes?.length || 0} votes)`)
    })

  } catch (error) {
    console.error('❌ Error backing up proposals:', error)
  } finally {
    await prisma.$disconnect()
  }
}

backupProposals()