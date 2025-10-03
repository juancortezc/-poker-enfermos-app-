import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProposalsV2() {
  try {
    console.log('🔍 Checking ProposalV2 data...')

    const proposals = await prisma.proposalV2.findMany({
      orderBy: { createdAt: 'desc' }
    })

    console.log(`Found ${proposals.length} proposals in v2 table:`)

    proposals.forEach((proposal, index) => {
      console.log(`${index + 1}. "${proposal.title}" - Active: ${proposal.isActive} - Created: ${proposal.createdAt}`)
    })

    if (proposals.length === 0) {
      console.log('❌ No proposals found in v2 table')
    }

  } catch (error) {
    console.error('❌ Error checking proposals:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProposalsV2()