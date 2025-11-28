# Backend Files Cleanup Summary

## Files Moved/Removed

### Removed from Root (Duplicates/Unused)
1. **token-config.json** - Removed (not used by backend, frontend has its own config)
2. **price-cache.json** - Removed (backend uses the one in price-ingest directory via `process.cwd()`)

## Backend File Structure

All backend files are now properly organized in the `price-ingest/` directory:

```
price-ingest/
├── .env                          # Backend environment variables
├── package.json                  # Backend dependencies
├── tokens.txt                    # Token configuration (used by backend)
├── token-config.json             # Token configuration JSON (copied from root)
├── price-cache.json              # Price cache (used by backend)
├── src/
│   ├── priceServerFastify.js    # Main Fastify server
│   ├── server.js                # Alternative server entry
│   ├── tokenConfig.js           # Token config parser
│   ├── aggregator.js            # Price aggregation logic
│   ├── config.js                # Configuration
│   ├── portfolioUtils.js        # Portfolio utilities
│   └── clickhouse.js            # ClickHouse integration
├── lib/
│   ├── centralStorage.js        # Storage utilities
│   ├── heliaStorage.js          # IPFS/Helia storage
│   └── heliaStorageExamples.js  # Storage examples
└── storage/                      # User data storage
    └── *.json                    # Individual user files
```

## Deployment Notes

When deploying the backend (price-ingest service):
- The working directory should be `price-ingest/`
- All dependencies are in `price-ingest/package.json`
- Environment variables are in `price-ingest/.env`
- The server will create/use `price-cache.json` in its working directory
- Token configuration is read from `tokens.txt` in the price-ingest directory

## Files That Stay in Root

These files remain in root as they are NOT backend-related:
- `package.json` - Root project dependencies (Hardhat, smart contracts)
- `hardhat.config.js` - Hardhat configuration
- `scripts/` - Deployment and contract interaction scripts
- `contracts/` - Solidity smart contracts
- `client/` - Frontend application
- `.env` - Root environment variables (for Hardhat/contracts)

## Verification

To verify the backend works correctly:
```bash
cd price-ingest
pnpm install
pnpm start
```

The server should start without errors and use the local files in the price-ingest directory.
