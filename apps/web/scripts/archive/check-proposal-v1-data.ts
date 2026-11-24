import { prisma } from '../src/lib/prisma'

async function checkProposalV1Data() {
  try {
    // Check Proposal V1 table
    const proposalV1Count = await prisma.proposal.count()
    console.log(`\n📊 Proposal V1 records: ${proposalV1Count}`)

    if (proposalV1Count > 0) {
      const proposals = await prisma.proposal.findMany({
        select: {
          id: true,
          title: true,
          createdAt: true,
          isActive: true
        }
      })
      console.log('\nProposal V1 data:')
      console.table(proposals)
    }

    // Check ProposalV2 table
    const proposalV2Count = await prisma.proposalV2.count()
    console.log(`\n📊 ProposalV2 records: ${proposalV2Count}`)

    if (proposalV2Count > 0) {
      const proposalsV2 = await prisma.proposalV2.findMany({
        select: {
          id: true,
          title: true,
          createdAt: true,
          isActive: true
        }
      })
      console.log('\nProposalV2 data:')
      console.table(proposalsV2)
    }

    console.log('\n✅ Verificación completa')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProposalV1Data()
