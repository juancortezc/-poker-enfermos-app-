import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanProposals() {
  try {
    console.log('🧹 Cleaning existing proposals...')

    // Delete all votes first (foreign key constraint)
    const deletedVotes = await prisma.proposalVote.deleteMany({})
    console.log(`📊 Deleted ${deletedVotes.count} votes`)

    // Delete all comments (foreign key constraint)
    const deletedComments = await prisma.proposalComment.deleteMany({})
    console.log(`💬 Deleted ${deletedComments.count} comments`)

    // Delete all proposals
    const deletedProposals = await prisma.proposal.deleteMany({})
    console.log(`📝 Deleted ${deletedProposals.count} proposals`)

    console.log('✅ Database cleaned successfully!')

  } catch (error) {
    console.error('❌ Error cleaning proposals:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanProposals()