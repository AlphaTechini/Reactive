# Reactive Portfolio - Unified Price Service Integration

## Overview

This solution implements a unified price service architecture that eliminates CORS issues and provides efficient batch price fetching for the Reactive Portfolio application.

## Architecture

### Components

1. **Token Configuration** (`price-ingest/src/tokenConfig.js`)
   - Parses `tokens.txt` for canonical token list
   - Maps symbols to FreeCryptoAPI format with `@binance` suffix
   - Provides utility functions for symbol resolution and address lookup

2. **Fastify Price Server** (`price-ingest/src/priceServerFastify.js`)
   - Unified `/api/prices` endpoint for batch price fetching
   - 30-second server-side caching to avoid rate limits
   - Robust error handling and fallback mechanisms
   - CORS-enabled for frontend integration

3. **Frontend Price Service** (`client/src/lib/priceService.js`)
   - Updated to use unified batch endpoint instead of individual API calls
   - Maintains compatibility with existing store architecture
   - Automatic fallback to simulation mode when available

## Fixed Issues

### Original Problems
- **CORS Errors**: Frontend making direct API calls to freecryptoapi.com
- **Rate Limiting**: Multiple individual requests overwhelming the provider
- **Symbol Mapping**: Frontend using generic names (bitcoin, ethereum) instead of proper symbols
- **Error Handling**: No graceful degradation when prices unavailable

### Solutions Implemented
- **Server-Side Proxy**: Fastify server handles all external API calls
- **Batch Fetching**: Single request fetches all token prices simultaneously  
- **Symbol Normalization**: Proper mapping from frontend symbols to FreeCryptoAPI format
- **Caching Layer**: 30-second cache reduces API load and improves performance
- **Graceful Degradation**: Returns cached data on errors, detailed error reporting

## API Endpoints

### GET /api/prices
Returns batch price data for all supported tokens.

**Response Format:**
```json
{
  "WBTC": {
    "address": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    "priceUSD": 43250.50,
    "ts": 1759228591264
  },
  "WETH": {
    "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 
    "priceUSD": 2650.75,
    "ts": 1759228591264
  }
}
```

### GET /api/health
Server health check and cache status.

**Response Format:**
```json
{
  "status": "ok",
  "cacheAge": 15000,
  "cachedTokens": 35,
  "timestamp": "2025-09-30T10:35:44.717Z"
}
```

## Running the System

### 1. Start Price Server
```bash
cd price-ingest
npm install
npm run price-server
```

### 2. Start Frontend
```bash
cd client
npm install
npm run dev
```

### 3. Access Application
- Frontend: http://localhost:5173
- Price API: http://localhost:3001/api/prices
- Health Check: http://localhost:3001/api/health

## Configuration

### Environment Variables
- `PRICE_SERVER_PORT`: Price server port (default: 3001)
- `FREECRYPTO_API_KEY`: Optional API key for FreeCryptoAPI

### Token List
Managed in `tokens.txt` with machine-readable JSON block:
- Canonical symbol-to-address mapping
- Alias resolution (bitcoin → WBTC, ethereum → WETH)
- Closed list for security (no user-supplied tokens)

## Integration Points

### Frontend Integration
The price service automatically:
- Fetches prices every 48 seconds
- Updates Svelte stores (`pricesStore`, `priceHistoryStore`)
- Maintains price history for charts
- Handles app mode switches (simulation vs live)

### Provider Integration
- Uses FreeCryptoAPI `/getData` endpoint
- Symbols formatted with `@binance` suffix
- Robust field extraction supports multiple response formats
- Timeout and error handling for network issues

## Performance Optimizations

1. **Batch Requests**: Single API call instead of 35+ individual requests
2. **Server-Side Caching**: 30-second cache reduces API load by 95%+
3. **Efficient Symbol Mapping**: O(1) lookup for address resolution
4. **Connection Reuse**: Fastify server maintains persistent connections
5. **Graceful Degradation**: Returns stale data rather than failing

## Security Considerations

1. **Closed Token List**: Only predefined tokens supported
2. **Address Validation**: EIP-55 checksums required
3. **CORS Configuration**: Restricted to specific origins
4. **Rate Limiting**: Server-side cache prevents API abuse
5. **Input Sanitization**: All user inputs validated and sanitized

## Monitoring & Debugging

### Logs
- Request/response timing
- Cache hit/miss ratios  
- Provider API status
- Error rates and types

### Health Checks
- Cache freshness
- Provider connectivity
- Memory usage
- Response times

## Future Enhancements

1. **Multiple Providers**: Add Coinbase, CoinGecko fallbacks
2. **WebSocket Integration**: Real-time price updates
3. **Historical Data**: Time-series storage in ClickHouse
4. **Alert System**: Price change notifications
5. **Analytics**: Usage metrics and performance monitoring

## Testing

### Manual Testing
1. Verify both servers start without errors
2. Check `/api/health` returns valid status
3. Confirm `/api/prices` returns price data
4. Test frontend loads and displays prices
5. Validate error handling with network issues

### Automated Testing
```bash
# Test price server endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/prices

# Test frontend integration
# Navigate to http://localhost:5173 and verify price data loads
```

## Troubleshooting

### Common Issues

**No Price Data Returned**
- Check FreeCryptoAPI service status
- Verify symbol mapping in tokenConfig.js
- Review server logs for API errors

**CORS Errors**
- Ensure price server is running on port 3001
- Check frontend is configured to use localhost:3001
- Verify CORS origins in priceServerFastify.js

**Cache Issues**
- Cache expires after 30 seconds automatically
- Health endpoint shows cache age and status
- Restart server to clear cache manually

## Support

For issues or questions:
1. Check server logs for specific error messages
2. Verify all dependencies are installed (`npm install`)
3. Ensure both servers are running on correct ports
4. Test individual endpoints with curl/Postman
5. Review this documentation for configuration options