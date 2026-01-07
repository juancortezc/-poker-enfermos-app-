import { prisma } from '../src/lib/prisma'

async function checkProposals() {
  try {
    console.log('Conectando a la base de datos...')

    const proposals = await prisma.proposal.findMany({
      orderBy: { createdAt: 'desc' }
    })

    console.log(`\n✅ Total de propuestas: ${proposals.length}`)
    console.log(`✅ Propuestas activas: ${proposals.filter(p => p.isActive).length}`)
    console.log(`✅ Propuestas inactivas: ${proposals.filter(p => !p.isActive).length}`)

    console.log('\nDetalle de propuestas:')
    proposals.forEach(p => {
      console.log(`\n${p.id}. ${p.title}`)
      console.log(`   Estado: ${p.isActive ? '🟢 Activa' : '🔴 Inactiva'}`)
      console.log(`   Contenido: ${p.content.substring(0, 50)}...`)
      console.log(`   Imagen: ${p.imageUrl ? '✅' : '❌'}`)
      console.log(`   Creada: ${p.createdAt}`)
    })

  } catch (error) {
    console.error('❌ Error al verificar propuestas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProposals()