import { PrismaClient } from '@prisma/client'

// Create a fresh Prisma client instance
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function testProductionAPI() {
  try {
    console.log('🧪 Testing direct database query...')

    // Try the exact same query as the API
    const proposals = await prisma.proposalV2.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    console.log(`✅ Found ${proposals.length} proposals`)
    proposals.forEach((proposal, index) => {
      console.log(`${index + 1}. "${proposal.title}" - Active: ${proposal.isActive}`)
    })

    // Also try a raw query to see if there's a Prisma issue
    const rawCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM proposals_v2 WHERE "isActive" = true`
    console.log('📊 Raw query result:', rawCount)

  } catch (error) {
    console.error('❌ Error in test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testProductionAPI()