/**
 * Example Usage: Helia Storage Module
 * 
 * This file demonstrates how to use the Helia storage module
 * for crypto prices and user wallet management.
 */

import {
  initHelia,
  storeJSON,
  fetchJSON,
  updatePrices,
  updateUserWallets,
  stopHelia
} from './heliaStorage.js'

/**
 * Example 1: Basic JSON Storage and Retrieval
 */
async function basicStorageExample() {
  console.log('\n=== Basic Storage Example ===')
  
  const { helia, fs } = await initHelia()
  
  try {
    // Store some basic data
    const testData = {
      message: 'Hello IPFS!',
      timestamp: Date.now(),
      version: '1.0'
    }
    
    const cid = await storeJSON(fs, testData)
    console.log(`Stored data with CID: ${cid}`)
    
    // Fetch it back
    const retrievedData = await fetchJSON(fs, cid)
    console.log('Retrieved data:', retrievedData)
    
  } finally {
    await stopHelia(helia)
  }
}

/**
 * Example 2: Crypto Prices Management
 */
async function cryptoPricesExample() {
  console.log('\n=== Crypto Prices Example ===')
  
  const { helia, fs } = await initHelia()
  
  try {
    // Initial price data (from your backend)
    const initialPrices = {
      BTC: 113085.12,
      ETH: 4112.00,
      USDC: 1.00,
      UNI: 7.454,
      AAVE: 267.79,
      SNX: 1.086
    }
    
    // Store initial prices
    let pricesCID = await updatePrices(fs, initialPrices, {
      source: 'freecryptoapi.com',
      pinningService: 'web3storage' // Optional
    })
    console.log(`Initial prices stored: ${pricesCID}`)
    
    // Simulate price update (like your 15-minute backend fetch)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const updatedPrices = {
      ...initialPrices,
      BTC: 113250.75, // Price went up
      ETH: 4095.50,   // Price went down
      PEPE: 0.00000901 // New token added
    }
    
    // Update prices
    pricesCID = await updatePrices(fs, updatedPrices, {
      source: 'freecryptoapi.com'
    })
    console.log(`Updated prices stored: ${pricesCID}`)
    
    // Fetch latest prices
    const latestPrices = await fetchJSON(fs, pricesCID)
    console.log('Latest prices:', latestPrices)
    console.log('Metadata:', latestPrices._metadata)
    
    return pricesCID
    
  } finally {
    await stopHelia(helia)
  }
}

/**
 * Example 3: User Wallet Management
 */
async function userWalletsExample() {
  console.log('\n=== User Wallets Example ===')
  
  const { helia, fs } = await initHelia()
  
  try {
    // Initial user data
    const initialUsers = {
      '0x742d35Cc6634C0532925a3b8D05c1F2CC6fcCCC': {
        username: 'alice_trader',
        portfolioAllocation: {
          BTC: 40,
          ETH: 35,
          USDC: 25
        },
        riskSettings: {
          stopLoss: 15,
          takeProfit: 25
        },
        joinedAt: '2024-01-15T10:30:00.000Z',
        lastActive: Date.now()
      },
      '0x8ba1f109551bD432803012645Hac136c4A6b9D': {
        username: 'bob_hodler',
        portfolioAllocation: {
          BTC: 60,
          ETH: 30,
          UNI: 10
        },
        riskSettings: {
          stopLoss: 10,
          takeProfit: 50
        },
        joinedAt: '2024-02-01T14:20:00.000Z',
        lastActive: Date.now() - (1000 * 60 * 60 * 2) // 2 hours ago
      }
    }
    
    // Store initial user data
    let usersCID = await updateUserWallets(fs, initialUsers, {
      version: '1.0'
    })
    console.log(`Initial users stored: ${usersCID}`)
    
    // Add a new user
    const updatedUsers = {
      ...initialUsers,
      '0x9fC5e2B8de5e0C4D5B3A8E7F9C2A1B4E6D8F0A3': {
        username: 'charlie_degen',
        portfolioAllocation: {
          PEPE: 50,
          SHIB: 30,
          DOGE: 20
        },
        riskSettings: {
          stopLoss: 20,
          takeProfit: 100
        },
        joinedAt: new Date().toISOString(),
        lastActive: Date.now()
      }
    }
    
    // Update user registry
    usersCID = await updateUserWallets(fs, updatedUsers, {
      version: '1.1'
    })
    console.log(`Updated users stored: ${usersCID}`)
    
    // Fetch latest users
    const latestUsers = await fetchJSON(fs, usersCID)
    console.log('Latest users:', latestUsers)
    console.log('User count:', latestUsers._metadata.userCount)
    
    return usersCID
    
  } finally {
    await stopHelia(helia)
  }
}

/**
 * Example 4: Integration with Reactive Portfolio Backend
 */
async function reactivePortfolioIntegration() {
  console.log('\n=== Reactive Portfolio Integration ===')
  
  const { helia, fs } = await initHelia()
  
  try {
    // Simulate your backend price fetch process
    console.log('📊 Simulating backend price fetch...')
    
    // This would be your actual price data from FreeCryptoAPI
    const backendPrices = {
      // Core tokens
      BTC: 113085.12,
      ETH: 4112.00,
      
      // Stablecoins
      USDC: 1.00,
      
      // Altcoins
      UNI: 7.454,
      AAVE: 267.79,
      SNX: 1.086,
      SUSHI: 0.6474,
      CRV: 0.6591,
      MKR: 1813.7,
      COMP: 40.61,
      YFI: 5315,
      GRT: 0.0788,
      SAND: 0.2587,
      MANA: 0.2805,
      LDO: 1.0833,
      OP: 0.6539,
      ARB: 0.4058,
      BAL: 0.967,
      FXS: 2.062,
      IMX: 0.679,
      '1INCH': 0.2441,
      RNDR: 7.03,
      DAI: 0.99882,
      
      // Memecoins
      DOGE: 0.22736,
      SHIB: 0.00001159,
      PEPE: 0.00000901,
      FLOKI: 0.00007815,
      ELON: 9.34e-8,
      AKITA: 4.773e-8,
      VINU: 1.357e-8,
      SAITAMA: 0.0006258
    }
    
    // Store to IPFS (could replace or supplement your current price-cache.json)
    const pricesCID = await updatePrices(fs, backendPrices, {
      source: 'freecryptoapi.com',
      pretty: true
    })
    
    console.log(`✅ Backend prices stored to IPFS: ${pricesCID}`)
    
    // Simulate user wallet activities
    console.log('👥 Simulating user wallet management...')
    
    const userActivities = {
      '0x742d35Cc6634C0532925a3b8D05c1F2CC6fcCCC': {
        username: 'reactive_user_1',
        portfolioValue: 15000.50,
        activeStrategies: ['stop_loss', 'take_profit'],
        recentTrades: [
          {
            type: 'buy',
            token: 'ETH',
            amount: 2.5,
            price: 4110.19,
            timestamp: Date.now() - (1000 * 60 * 30) // 30 min ago
          }
        ],
        preferences: {
          notifications: true,
          autoRebalance: false,
          riskLevel: 'medium'
        }
      }
    }
    
    const usersCID = await updateUserWallets(fs, userActivities)
    console.log(`✅ User activities stored to IPFS: ${usersCID}`)
    
    // Demo: How frontend could fetch this data
    console.log('📱 Simulating frontend data fetch...')
    
    const frontendPrices = await fetchJSON(fs, pricesCID)
    console.log(`Frontend loaded ${frontendPrices._metadata.tokenCount} token prices`)
    console.log('BTC:', frontendPrices.BTC, 'ETH:', frontendPrices.ETH)
    
    const frontendUsers = await fetchJSON(fs, usersCID)
    console.log(`Frontend loaded ${frontendUsers._metadata.userCount} user records`)
    
    // Return CIDs for potential IPNS publishing
    return {
      pricesCID,
      usersCID,
      ipnsExample: {
        // These would be your persistent IPNS names for mutable content
        pricesIPNS: 'k51qzi5uqu5dgs8sfm8z9k7p1s2x4v3z8r9y2w6f4e7n3m5k1j0h9g8d6c5b4a',
        usersIPNS: 'k51qzi5uqu5dlm9n8k6j5h4g3f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n'
      }
    }
    
  } finally {
    await stopHelia(helia)
  }
}

/**
 * Example 5: Error Handling and Edge Cases
 */
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===')
  
  const { helia, fs } = await initHelia()
  
  try {
    // Test invalid CID
    try {
      await fetchJSON(fs, 'invalid-cid')
    } catch (error) {
      console.log('✅ Correctly caught invalid CID error:', error.message)
    }
    
    // Test invalid JSON data
    try {
      await storeJSON(fs, undefined)
    } catch (error) {
      console.log('✅ Correctly caught invalid data error:', error.message)
    }
    
    // Test fetch timeout (would need a very slow/unreachable CID)
    try {
      const validCID = await storeJSON(fs, { test: 'data' })
      const result = await fetchJSON(fs, validCID, { timeout: 100 }) // Very short timeout
      console.log('Fetch succeeded despite short timeout:', !!result)
    } catch (error) {
      console.log('Fetch timeout or other error (expected):', error.message)
    }
    
  } finally {
    await stopHelia(helia)
  }
}

// Run all examples
async function runAllExamples() {
  try {
    await basicStorageExample()
    const pricesCID = await cryptoPricesExample()
    const usersCID = await userWalletsExample()
    const integration = await reactivePortfolioIntegration()
    await errorHandlingExample()
    
    console.log('\n=== Summary ===')
    console.log('All examples completed successfully!')
    console.log('Latest prices CID:', integration.pricesCID)
    console.log('Latest users CID:', integration.usersCID)
    console.log('\n💡 Next steps:')
    console.log('1. Add IPNS support for mutable pointers')
    console.log('2. Integrate with Web3.Storage or Pinata for persistence')
    console.log('3. Add to your Svelte frontend and Fastify backend')
    console.log('4. Consider using these CIDs in your price-cache.json metadata')
    
  } catch (error) {
    console.error('Example failed:', error)
  }
}

// Export for use in other files
export {
  basicStorageExample,
  cryptoPricesExample,
  userWalletsExample,
  reactivePortfolioIntegration,
  errorHandlingExample,
  runAllExamples
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples()
}