import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testProposalsSystem() {
  try {
    console.log('🧪 Testing Proposals System...')

    // Check ProposalV2 table structure
    console.log('\n📋 Checking ProposalV2 table structure...')
    const proposals = await prisma.proposalV2.findMany({
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

    console.log(`✅ Found ${proposals.length} proposals in ProposalV2 table`)

    proposals.forEach((proposal, index) => {
      console.log(`\n${index + 1}. "${proposal.title}"`)
      console.log(`   - ID: ${proposal.id}`)
      console.log(`   - Objetivo: ${proposal.objective.substring(0, 50)}...`)
      console.log(`   - Situación: ${proposal.situation.substring(0, 50)}...`)
      console.log(`   - Propuesta: ${proposal.proposal.substring(0, 50)}...`)
      console.log(`   - Imagen URL: ${proposal.imageUrl || 'No'}`)
      console.log(`   - Activa: ${proposal.isActive}`)
      console.log(`   - Creador: ${proposal.createdBy?.firstName || 'Sin autor'} (${proposal.createdBy?.role || 'N/A'})`)
      console.log(`   - Fecha: ${proposal.createdAt}`)
    })

    // Check players for permission testing
    console.log('\n👥 Checking available players for permission testing...')
    const players = await prisma.player.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true
      },
      take: 5
    })

    players.forEach(player => {
      console.log(`   - ${player.firstName} ${player.lastName} (${player.role}) - ID: ${player.id}`)
    })

    // Test data integrity
    console.log('\n🔍 Testing data integrity...')

    const activeProposals = await prisma.proposalV2.count({
      where: { isActive: true }
    })

    const inactiveProposals = await prisma.proposalV2.count({
      where: { isActive: false }
    })

    console.log(`✅ Active proposals: ${activeProposals}`)
    console.log(`✅ Inactive proposals: ${inactiveProposals}`)
    console.log(`✅ Total proposals: ${activeProposals + inactiveProposals}`)

    // Check proposals with authors
    const proposalsWithAuthors = await prisma.proposalV2.count({
      where: {
        createdById: { not: null }
      }
    })

    const proposalsWithoutAuthors = await prisma.proposalV2.count({
      where: {
        createdById: null
      }
    })

    console.log(`✅ Proposals with authors: ${proposalsWithAuthors}`)
    console.log(`✅ Proposals without authors: ${proposalsWithoutAuthors}`)

    console.log('\n🎉 Proposals system test completed successfully!')

  } catch (error) {
    console.error('❌ Test error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testProposalsSystem()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })