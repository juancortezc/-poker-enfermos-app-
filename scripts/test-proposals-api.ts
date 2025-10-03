import { buildAuthHeaders } from '../src/lib/client-auth'

const BASE_URL = 'http://localhost:3005'

async function testProposalsAPI() {
  try {
    console.log('🧪 Testing Proposals API Endpoints...')

    // Test public proposals endpoint (used by T29 page)
    console.log('\n📋 Testing public proposals endpoint...')
    const publicResponse = await fetch(`${BASE_URL}/api/proposals/public`)

    if (publicResponse.ok) {
      const publicData = await publicResponse.json()
      console.log(`✅ Public proposals: ${publicData.proposals.length} active proposals`)
      publicData.proposals.forEach((proposal: any, index: number) => {
        console.log(`   ${index + 1}. "${proposal.title}"`)
      })
    } else {
      console.log('❌ Public proposals endpoint failed:', publicResponse.status)
    }

    // Test proposals-v2 endpoints with auth
    console.log('\n🔐 Testing authenticated proposals-v2 endpoints...')

    // Test my proposals endpoint
    console.log('\n📝 Testing my proposals endpoint...')
    const myProposalsResponse = await fetch(`${BASE_URL}/api/proposals-v2/my`, {
      headers: buildAuthHeaders()
    })

    if (myProposalsResponse.ok) {
      const myData = await myProposalsResponse.json()
      console.log(`✅ My proposals: ${myData.proposals.length} proposals`)
      myData.proposals.forEach((proposal: any, index: number) => {
        console.log(`   ${index + 1}. "${proposal.title}" - Active: ${proposal.isActive}`)
      })
    } else {
      console.log('❌ My proposals endpoint failed:', myProposalsResponse.status)
    }

    // Test admin proposals endpoint (for Commission)
    console.log('\n⚙️ Testing admin proposals endpoint...')
    const adminResponse = await fetch(`${BASE_URL}/api/proposals-v2/admin?includeInactive=true`, {
      headers: buildAuthHeaders()
    })

    if (adminResponse.ok) {
      const adminData = await adminResponse.json()
      console.log(`✅ Admin proposals: ${adminData.proposals.length} total proposals`)

      const active = adminData.proposals.filter((p: any) => p.isActive).length
      const inactive = adminData.proposals.filter((p: any) => !p.isActive).length
      console.log(`   - Active: ${active}`)
      console.log(`   - Inactive: ${inactive}`)
    } else {
      console.log('❌ Admin proposals endpoint failed:', adminResponse.status)
    }

    // Test creating a new proposal
    console.log('\n➕ Testing proposal creation...')
    const newProposal = {
      title: 'Test Proposal - API Testing',
      objective: 'Test the API endpoints for proposal creation',
      situation: 'Need to verify that the API correctly handles proposal creation',
      proposal: 'Create automated tests to validate API functionality',
      imageUrl: null
    }

    const createResponse = await fetch(`${BASE_URL}/api/proposals-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders()
      },
      body: JSON.stringify(newProposal)
    })

    if (createResponse.ok) {
      const createdProposal = await createResponse.json()
      console.log(`✅ Created proposal: "${createdProposal.proposal.title}" (ID: ${createdProposal.proposal.id})`)

      // Test updating the created proposal
      console.log('\n✏️ Testing proposal update...')
      const updateResponse = await fetch(`${BASE_URL}/api/proposals-v2/${createdProposal.proposal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders()
        },
        body: JSON.stringify({
          title: 'Test Proposal - Updated',
          objective: 'Updated objective for testing'
        })
      })

      if (updateResponse.ok) {
        const updatedProposal = await updateResponse.json()
        console.log(`✅ Updated proposal: "${updatedProposal.proposal.title}"`)
      } else {
        console.log('❌ Proposal update failed:', updateResponse.status)
      }

      // Test toggling proposal active status
      console.log('\n🔄 Testing proposal toggle...')
      const toggleResponse = await fetch(`${BASE_URL}/api/proposals-v2/${createdProposal.proposal.id}/toggle`, {
        method: 'PATCH',
        headers: buildAuthHeaders()
      })

      if (toggleResponse.ok) {
        const toggledProposal = await toggleResponse.json()
        console.log(`✅ Toggled proposal active status to: ${toggledProposal.proposal.isActive}`)
      } else {
        console.log('❌ Proposal toggle failed:', toggleResponse.status)
      }

      // Clean up - delete test proposal
      console.log('\n🗑️ Cleaning up test proposal...')
      const deleteResponse = await fetch(`${BASE_URL}/api/proposals-v2/${createdProposal.proposal.id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders()
      })

      if (deleteResponse.ok) {
        console.log(`✅ Deleted test proposal`)
      } else {
        console.log('❌ Proposal deletion failed:', deleteResponse.status)
      }

    } else {
      const errorData = await createResponse.json()
      console.log('❌ Proposal creation failed:', errorData.error)
    }

    console.log('\n🎉 API testing completed!')

  } catch (error) {
    console.error('❌ API test error:', error)
  }
}

testProposalsAPI()