import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProductionConnection() {
  try {
    console.log('🔍 Checking database connection consistency...')

    // Check players count (should be consistent)
    const playersCount = await prisma.player.count()
    console.log(`👥 Players count: ${playersCount}`)

    // Check tournaments count
    const tournamentsCount = await prisma.tournament.count()
    console.log(`🏆 Tournaments count: ${tournamentsCount}`)

    // Check ProposalV2 count
    const proposalsV2Count = await prisma.proposalV2.count()
    console.log(`📝 ProposalsV2 count: ${proposalsV2Count}`)

    // Check original proposals count
    const proposalsCount = await prisma.proposal.count()
    console.log(`📋 Original Proposals count: ${proposalsCount}`)

    // Get some sample data to verify we're looking at the right database
    const samplePlayer = await prisma.player.findFirst({
      select: { firstName: true, lastName: true }
    })
    console.log(`👤 Sample player: ${samplePlayer?.firstName} ${samplePlayer?.lastName}`)

    if (proposalsV2Count > 0) {
      const sampleProposal = await prisma.proposalV2.findFirst({
        select: { title: true, createdAt: true }
      })
      console.log(`📝 Sample proposal: "${sampleProposal?.title}" (${sampleProposal?.createdAt})`)
    }

  } catch (error) {
    console.error('❌ Database connection error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProductionConnection()