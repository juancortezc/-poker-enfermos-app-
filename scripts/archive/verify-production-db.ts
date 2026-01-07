import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyProductionDB() {
  try {
    console.log('🔍 Verifying database connection and tables...')

    // Check if ProposalV2 table exists by attempting a query
    try {
      const proposalCount = await prisma.proposalV2.count()
      console.log(`✅ ProposalV2 table exists with ${proposalCount} records`)
    } catch (error) {
      console.error('❌ ProposalV2 table does not exist or query failed:', error)
    }

    // Check original Proposal table
    try {
      const originalProposalCount = await prisma.proposal.count()
      console.log(`✅ Original Proposal table exists with ${originalProposalCount} records`)
    } catch (error) {
      console.error('❌ Original Proposal table does not exist or query failed:', error)
    }

    // List all tables to see database structure
    const result = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `

    console.log('📋 Available tables:', result)

  } catch (error) {
    console.error('❌ Database verification error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyProductionDB()