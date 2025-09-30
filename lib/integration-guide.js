/**
 * Integration Guide: Adding Helia IPFS to Reactive Portfolio
 * 
 * This file shows how to integrate the Helia storage module
 * into your existing Fastify backend and Svelte frontend.
 */

// =============================================================================
// 1. BACKEND INTEGRATION (price-ingest/src/priceServerFastify.js)
// =============================================================================

/*
Add this to your imports at the top of priceServerFastify.js:

import { 
  initHelia, 
  updatePrices, 
  updateUserWallets 
} from '../../lib/heliaStorage.js'

// Global IPFS node (initialize once)
let ipfsNode = null

// Add this after your existing initialization:
async function initializeIPFS() {
  try {
    ipfsNode = await initHelia()
    console.log('✅ IPFS node initialized for price storage')
  } catch (error) {
    console.warn('⚠️ IPFS initialization failed:', error.message)
    // Continue without IPFS - not critical for core functionality
  }
}

// Call during server startup
initializeIPFS()

// Modify your existing fetchAllTokenPrices function to also store to IPFS:
async function fetchAllTokenPrices() {
  // ... your existing code ...
  
  // After successfully fetching and processing results:
  if (Object.keys(results).length > 0 && ipfsNode) {
    try {
      const ipfsCID = await updatePrices(ipfsNode.fs, results, {
        source: 'freecryptoapi.com'
      })
      console.log(`💾 Prices also stored to IPFS: ${ipfsCID}`)
      
      // Optional: store CID in your existing cache metadata
      // This lets frontend know the IPFS CID for the current prices
      priceCache._ipfs = {
        cid: ipfsCID,
        timestamp: Date.now()
      }
    } catch (error) {
      console.warn('⚠️ IPFS storage failed (continuing):', error.message)
    }
  }
  
  return results
}

// Add new endpoint to fetch from IPFS:
fastify.get('/api/prices/ipfs/:cid', async (request, reply) => {
  try {
    if (!ipfsNode) {
      reply.code(503)
      return { error: 'IPFS not available' }
    }
    
    const { cid } = request.params
    const data = await fetchJSON(ipfsNode.fs, cid, { timeout: 10000 })
    
    return {
      ...data,
      _source: 'ipfs',
      _cid: cid
    }
  } catch (error) {
    reply.code(404)
    return { error: 'IPFS data not found', message: error.message }
  }
})
*/

// =============================================================================
// 2. FRONTEND INTEGRATION (client/src/lib/priceService.js)
// =============================================================================

/*
Add this to your imports in priceService.js:

import { initHelia, fetchJSON } from '$lib/../lib/heliaStorage.js'

// Add IPFS node as class property:
class EnhancedPriceService {
  constructor() {
    // ... existing properties ...
    this.ipfsNode = null
    this.enableIPFS = true // feature flag
  }

  // Add IPFS initialization to your existing initialize() method:
  async initialize() {
    // ... existing initialization code ...
    
    // Initialize IPFS if enabled
    if (this.enableIPFS) {
      try {
        this.ipfsNode = await initHelia()
        console.log('✅ Frontend IPFS node initialized')
      } catch (error) {
        console.warn('⚠️ Frontend IPFS init failed:', error.message)
        this.enableIPFS = false
      }
    }
  }

  // Add method to fetch prices from IPFS
  async fetchPricesFromIPFS(cid) {
    if (!this.ipfsNode) {
      throw new Error('IPFS not available')
    }
    
    try {
      const data = await fetchJSON(this.ipfsNode.fs, cid, { timeout: 15000 })
      console.log(`📦 Fetched prices from IPFS: ${cid}`)
      return data
    } catch (error) {
      console.error('Failed to fetch from IPFS:', error)
      throw error
    }
  }

  // Modify fetchCachedPricesBatch to try IPFS as fallback:
  async fetchCachedPricesBatch(mode = null) {
    // ... existing backend cache logic ...
    
    // If backend cache failed and we have IPFS, try to get data from IPFS
    if (!batchPrices && this.enableIPFS && this.lastKnownIPFSCID) {
      try {
        console.log('🔄 Backend cache failed, trying IPFS fallback...')
        batchPrices = await this.fetchPricesFromIPFS(this.lastKnownIPFSCID)
        console.log('✅ Fallback to IPFS successful')
      } catch (error) {
        console.warn('IPFS fallback also failed:', error.message)
      }
    }
    
    // ... rest of existing processing logic ...
    
    // Extract IPFS CID from backend response for future fallback
    if (batchPrices && batchPrices._ipfs && batchPrices._ipfs.cid) {
      this.lastKnownIPFSCID = batchPrices._ipfs.cid
    }
  }
}
*/

// =============================================================================
// 3. SVELTE COMPONENT INTEGRATION (client/src/routes/+page.svelte)
// =============================================================================

/*
Add IPFS status indicator to your dashboard:

<script>
  import { onMount } from 'svelte'
  import { priceService } from '$lib/priceService.js'
  
  let ipfsStatus = 'unknown'
  
  onMount(() => {
    // Check IPFS status
    if (priceService.ipfsNode) {
      ipfsStatus = 'connected'
    } else if (priceService.enableIPFS === false) {
      ipfsStatus = 'disabled'
    } else {
      ipfsStatus = 'disconnected'
    }
  })
</script>

<!-- Add to your dashboard header or status bar -->
<div class="ipfs-status">
  <span class="text-xs text-gray-500">
    IPFS: 
    <span class:text-green-600={ipfsStatus === 'connected'}
          class:text-yellow-600={ipfsStatus === 'disconnected'}
          class:text-gray-400={ipfsStatus === 'disabled'}>
      {ipfsStatus}
    </span>
  </span>
</div>
*/

// =============================================================================
// 4. INSTALLATION STEPS
// =============================================================================

/*
1. Install dependencies:
   npm install helia @helia/unixfs @helia/ipns @libp2p/crypto

2. Copy the lib/ folder files to your project

3. Add the integration code above to your existing files

4. Test the integration:
   - Start your server: npm run start:full
   - Check logs for "✅ IPFS node initialized"
   - Visit http://localhost:3001/api/prices - should include _ipfs.cid
   - Check browser console for "✅ Frontend IPFS node initialized"

5. Optional: Add environment variables for pinning:
   WEB3_STORAGE_TOKEN=your_token
   PINATA_API_KEY=your_key
   PINATA_SECRET=your_secret
*/

// =============================================================================
// 5. TESTING EXAMPLE
// =============================================================================

export async function testIPFSIntegration() {
  console.log('🧪 Testing IPFS integration...')
  
  try {
    // Test backend endpoint with IPFS CID
    const response = await fetch('http://localhost:3001/api/prices')
    const data = await response.json()
    
    if (data._ipfs && data._ipfs.cid) {
      console.log('✅ Backend storing to IPFS:', data._ipfs.cid)
      
      // Test fetching from IPFS directly
      const ipfsResponse = await fetch(`http://localhost:3001/api/prices/ipfs/${data._ipfs.cid}`)
      const ipfsData = await ipfsResponse.json()
      
      if (ipfsData.BTC && ipfsData.ETH) {
        console.log('✅ IPFS retrieval working')
        console.log('BTC from IPFS:', ipfsData.BTC)
        console.log('ETH from IPFS:', ipfsData.ETH)
      }
    } else {
      console.log('⚠️ Backend not storing to IPFS yet')
    }
    
  } catch (error) {
    console.error('❌ IPFS integration test failed:', error)
  }
}

// =============================================================================
// 6. MIGRATION STRATEGY
// =============================================================================

/*
Phase 1: Add IPFS alongside existing systems (no breaking changes)
- Backend stores to both file cache AND IPFS
- Frontend uses backend cache as primary, IPFS as fallback
- Monitor IPFS performance and reliability

Phase 2: Gradually increase IPFS usage
- Frontend can directly read from IPFS for some use cases
- Add IPNS for mutable pointers to latest data
- Implement pinning service for persistence

Phase 3: Full IPFS migration (optional)
- Replace file-based cache with IPFS as primary storage
- Use IPFS for user data, transaction history, etc.
- Implement distributed architecture with multiple nodes

Benefits:
- Decentralized data storage
- Censorship resistance  
- Global CDN-like distribution
- Version history built-in
- Interoperability with other IPFS apps
*/

export default {
  testIPFSIntegration
}