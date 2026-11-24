import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateProposalsV2Structure() {
  try {
    console.log('🔄 Migrating ProposalV2 structure...')

    // First, get all existing proposals
    const existingProposals = await prisma.$queryRaw`
      SELECT id, title, content FROM proposals_v2
    ` as Array<{id: number, title: string, content: string}>

    console.log(`Found ${existingProposals.length} existing proposals to migrate`)

    // Add the new columns manually with default values
    await prisma.$executeRaw`
      ALTER TABLE proposals_v2
      ADD COLUMN IF NOT EXISTS objective TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS situation TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS proposal TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS image_url TEXT
    `

    console.log('✅ Added new columns to proposals_v2 table')

    // Migrate existing data: move 'content' to 'proposal' field and set defaults
    for (const proposal of existingProposals) {
      await prisma.$executeRaw`
        UPDATE proposals_v2
        SET
          objective = 'Migrado desde propuesta anterior',
          situation = 'Sin especificar',
          proposal = ${proposal.content}
        WHERE id = ${proposal.id}
      `
      console.log(`✅ Migrated proposal: "${proposal.title}"`)
    }

    // Now remove the old content column
    await prisma.$executeRaw`
      ALTER TABLE proposals_v2 DROP COLUMN IF EXISTS content
    `

    console.log('✅ Removed old content column')
    console.log('🎉 Migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateProposalsV2Structure()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })