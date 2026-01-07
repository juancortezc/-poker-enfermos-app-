import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanDuplicateProposals() {
  try {
    console.log('🧹 Cleaning duplicate proposals...')

    // Get all proposals
    const proposals = await prisma.proposalV2.findMany({
      orderBy: { createdAt: 'desc' }
    })

    console.log(`Found ${proposals.length} total proposals`)

    // Group by title to find duplicates
    const titleMap = new Map<string, number[]>()
    proposals.forEach(proposal => {
      if (!titleMap.has(proposal.title)) {
        titleMap.set(proposal.title, [])
      }
      titleMap.get(proposal.title)!.push(proposal.id)
    })

    // Keep only the most recent (first) of each title
    for (const [title, ids] of titleMap) {
      if (ids.length > 1) {
        const toDelete = ids.slice(1) // Keep first, delete rest
        console.log(`Deleting ${toDelete.length} duplicates of "${title}"`)

        await prisma.proposalV2.deleteMany({
          where: {
            id: {
              in: toDelete
            }
          }
        })
      }
    }

    // Verify final count
    const finalCount = await prisma.proposalV2.count()
    console.log(`✅ Cleanup complete. Final count: ${finalCount} proposals`)

  } catch (error) {
    console.error('❌ Error cleaning duplicates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanDuplicateProposals()