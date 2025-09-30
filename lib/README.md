# Helia IPFS Storage Module

Modern IPFS storage solution for the Reactive Portfolio Manager using Helia JS + UnixFS.

## Features

- 🚀 **Modern IPFS**: Uses Helia (successor to js-ipfs)
- 📊 **Crypto Prices**: Store and fetch token price data
- 👥 **User Wallets**: Manage user wallet mappings
- 🌐 **Universal**: Works in browser and Node.js
- 📌 **Pinning Ready**: Integration points for Web3.Storage, Pinata
- 🔄 **Mutable Pointers**: IPNS support ready (commented examples)
- ⚡ **Plug-and-Play**: Ready for Svelte frontend or Fastify backend

## Installation

```bash
# Install Helia dependencies
npm install helia @helia/unixfs

# Optional: for mutable pointers (IPNS)
npm install @helia/ipns @libp2p/crypto

# Optional: for pinning services
npm install web3.storage pinata-sdk
```

## Quick Start

```javascript
import {
  initHelia,
  updatePrices,
  updateUserWallets,
  fetchJSON
} from './lib/heliaStorage.js'

// Initialize Helia node
const { helia, fs } = await initHelia()

// Store crypto prices
const prices = {
  BTC: 113085.12,
  ETH: 4112.00,
  USDC: 1.00
}
const pricesCID = await updatePrices(fs, prices)

// Store user data
const users = {
  '0x742d35Cc...': {
    username: 'alice_trader',
    portfolio: { BTC: 40, ETH: 60 }
  }
}
const usersCID = await updateUserWallets(fs, users)

// Fetch data back
const latestPrices = await fetchJSON(fs, pricesCID)
const latestUsers = await fetchJSON(fs, usersCID)

console.log('Prices:', latestPrices)
console.log('Users:', latestUsers)
```

## API Reference

### `initHelia()`
Initialize Helia node and UnixFS interface.

**Returns:** `Promise<{helia, fs}>`

### `storeJSON(fs, data, options)`
Store JSON data and return CID.

**Parameters:**
- `fs` - UnixFS interface from initHelia()
- `data` - JSON data to store
- `options` - Storage options (filename, pretty, pin, pinningService)

**Returns:** `Promise<string>` - CID string

### `fetchJSON(fs, cid, options)`
Fetch JSON data from CID.

**Parameters:**
- `fs` - UnixFS interface
- `cid` - CID string to fetch
- `options` - Fetch options (timeout)

**Returns:** `Promise<Object>` - Parsed JSON data

### `updatePrices(fs, prices, options)`
Store crypto prices with metadata.

**Parameters:**
- `fs` - UnixFS interface
- `prices` - Object with token symbols as keys, prices as values
- `options` - Update options (source, pinningService)

**Returns:** `Promise<string>` - CID of stored price data

### `updateUserWallets(fs, userMap, options)`
Store user wallet mapping with metadata.

**Parameters:**
- `fs` - UnixFS interface  
- `userMap` - Object with wallet addresses as keys, user data as values
- `options` - Update options (version)

**Returns:** `Promise<string>` - CID of stored user data

## Integration Examples

### Svelte Frontend Integration

```javascript
// In your Svelte component
import { initHelia, fetchJSON } from '$lib/heliaStorage.js'
import { onMount } from 'svelte'

let prices = {}
let users = {}

onMount(async () => {
  const { helia, fs } = await initHelia()
  
  // Fetch latest data from known CIDs
  const pricesCID = 'QmYourPricesCID...'
  const usersCID = 'QmYourUsersCID...'
  
  prices = await fetchJSON(fs, pricesCID)
  users = await fetchJSON(fs, usersCID)
})
```

### Fastify Backend Integration

```javascript
// In your Fastify server
import { initHelia, updatePrices } from './lib/heliaStorage.js'

let heliaNode = null

fastify.register(async function (fastify) {
  // Initialize Helia on server start
  heliaNode = await initHelia()
  
  // Add route to store prices to IPFS
  fastify.post('/api/prices/store-ipfs', async (request, reply) => {
    const prices = request.body
    const cid = await updatePrices(heliaNode.fs, prices, {
      source: 'freecryptoapi.com'
    })
    
    return { cid, stored: Object.keys(prices).length }
  })
})
```

## Mutable Pointers (IPNS)

For production use, you'll want mutable pointers so clients can always fetch the latest data:

```javascript
// TODO: Implement in heliaStorage.js
import { ipns } from '@helia/ipns'
import { ed25519 } from '@libp2p/crypto/keys'

// Create persistent IPNS keys
const pricesKey = await ed25519.generateKeyPair()
const usersKey = await ed25519.generateKeyPair()

// Publish to IPNS (creates mutable pointer)
const ipnsService = ipns(helia)
await ipnsService.publish(pricesKey, pricesCID)
await ipnsService.publish(usersKey, usersCID)

// Clients can resolve IPNS to get latest CID
const latestPricesCID = await ipnsService.resolve(pricesKey.publicKey)
```

## Pinning Services

For data persistence beyond local storage:

```javascript
// Web3.Storage integration (commented in heliaStorage.js)
const web3Storage = new Web3Storage({ 
  token: process.env.WEB3_STORAGE_TOKEN 
})
await web3Storage.pin(cid)

// Pinata integration (commented in heliaStorage.js)  
const pinata = new PinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET
)
await pinata.pinByHash(cid.toString())
```

## File Structure

```
lib/
├── heliaStorage.js         # Main storage module
├── heliaStorageExamples.js # Usage examples
└── README.md              # This file

# Integration points:
price-ingest/src/priceServerFastify.js  # Add IPFS storage
client/src/lib/priceService.js          # Add IPFS fetching
```

## Environment Variables

```env
# Optional: for pinning services
WEB3_STORAGE_TOKEN=your_token_here
PINATA_API_KEY=your_api_key
PINATA_SECRET=your_secret_key
```

## Next Steps

1. **Add to package.json**: Include Helia dependencies
2. **Backend Integration**: Store prices to IPFS in your 15-minute fetch cycle
3. **Frontend Integration**: Fetch prices from IPFS as fallback or primary source
4. **IPNS Setup**: Implement mutable pointers for latest data
5. **Pinning Service**: Choose and integrate a pinning service for persistence
6. **Monitoring**: Add IPFS node health checks to your backend

## Examples

Run the examples to see the module in action:

```bash
node lib/heliaStorageExamples.js
```

This will demonstrate:
- Basic JSON storage and retrieval
- Crypto price management
- User wallet mapping
- Integration patterns
- Error handling

## Browser Support

The module works in modern browsers with:
- ES modules support
- WebRTC (for IPFS connectivity)
- IndexedDB (for local storage)

For older browsers, you may need polyfills or bundling with Webpack/Vite.

## Performance Notes

- **Cold Start**: Initial Helia node startup can take 2-5 seconds
- **Network Discovery**: First IPFS operations may be slower until peers are found
- **Local Storage**: Frequently accessed data is cached locally
- **Bandwidth**: Consider data size when storing large objects

## Security Considerations

- **Public Data**: All IPFS data is public unless encrypted
- **Private Keys**: Store IPNS keys securely for mutable content
- **Validation**: Always validate data fetched from IPFS
- **Rate Limiting**: Implement rate limits for IPFS operations