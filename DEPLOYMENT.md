# Enhanced Portfolio Management - Deployment Guide

This guide covers the complete deployment process for the Enhanced Portfolio Management system.

## Prerequisites

- Node.js 18+ and pnpm installed
- Hardhat configured for Reactive Network
- Access to deployment wallet with sufficient funds
- Environment variables configured

## Deployment Steps

### 1. Smart Contract Deployment

Deploy the enhanced smart contracts to Reactive Network:

```bash
# Deploy contracts
npx hardhat run scripts/deploy-enhanced-contracts.js --network reactive-testnet

# Verify deployment
npx hardhat run scripts/verify-contract-integration.js --network reactive-testnet
```

The deployment script will:
- Deploy EnhancedPortfolioManager contract
- Deploy AutomationController contract
- Configure contract linkages
- Save deployment addresses to `deployments/` directory

### 2. Frontend Configuration

Update the frontend environment configuration:

```bash
# Copy example environment file
cp client/.env.example client/.env

# Edit .env with your configuration
nano client/.env
```

Key configuration values:
- `VITE_PORTFOLIO_MANAGER_ADDRESS` - From contract deployment
- `VITE_AUTOMATION_CONTROLLER_ADDRESS` - From contract deployment
- `VITE_RPC_URL` - Reactive Network RPC endpoint
- `VITE_PRICE_INGEST_API_URL` - Price service API endpoint

### 3. Frontend Build and Deployment

Build and deploy the Svelte frontend:

```bash
# Run deployment script
chmod +x scripts/deploy-frontend.sh
./scripts/deploy-frontend.sh
```

The script will:
- Install dependencies with pnpm
- Load contract addresses from deployment
- Build the frontend application
- Generate production-ready dist/ directory

### 4. Hosting Deployment

Deploy the built frontend to your hosting service:

#### Option A: Static Hosting (Vercel, Netlify)

```bash
cd client
pnpm run build

# Deploy to Vercel
vercel --prod

# Or deploy to Netlify
netlify deploy --prod --dir=dist
```

#### Option B: Self-Hosted

```bash
# Copy dist/ to your web server
scp -r client/dist/* user@server:/var/www/portfolio/

# Configure nginx or apache to serve the files
```

### 5. Post-Deployment Verification

Verify the deployment is working correctly:

```bash
# Run integration tests
cd client
pnpm run test:integration

# Check service health
curl https://your-domain.com/api/health
```

## Configuration Reference

### Environment Variables

#### API Endpoints
- `VITE_PRICE_INGEST_API_URL` - Price data API
- `VITE_COINGECKO_API_URL` - CoinGecko API
- `VITE_UNISWAP_API_URL` - Uniswap price API

#### Contract Addresses
- `VITE_PORTFOLIO_MANAGER_ADDRESS` - Portfolio manager contract
- `VITE_AUTOMATION_CONTROLLER_ADDRESS` - Automation controller contract

#### Network Configuration
- `VITE_NETWORK_NAME` - Network name (reactive-testnet)
- `VITE_CHAIN_ID` - Chain ID
- `VITE_RPC_URL` - RPC endpoint URL

#### Service Configuration
- `VITE_ENABLE_PRICE_CACHING` - Enable price caching (true/false)
- `VITE_PRICE_CACHE_TTL` - Cache TTL in milliseconds (30000)
- `VITE_PRICE_STALENESS_THRESHOLD` - Staleness threshold (300000)

#### Rebalancing Configuration
- `VITE_DEFAULT_DRIFT_THRESHOLD` - Drift threshold (0.05 = 5%)
- `VITE_DEFAULT_MAX_GAS_PERCENT` - Max gas percent (0.02 = 2%)
- `VITE_DEFAULT_MIN_TRADE_VALUE` - Min trade value in USD (10)

#### Risk Management Configuration
- `VITE_DEFAULT_TRAILING_STOP_PERCENT` - Trailing stop (0.05 = 5%)
- `VITE_DEFAULT_STOP_LOSS_PERCENT` - Stop loss (0.10 = 10%)
- `VITE_PANIC_MODE_TIMEOUT` - Panic mode timeout (60000ms)

#### Error Handling Configuration
- `VITE_MAX_RETRIES` - Max retry attempts (3)
- `VITE_BASE_RETRY_DELAY` - Base retry delay (1000ms)
- `VITE_ENABLE_HEALTH_CHECKS` - Enable health checks (true/false)

#### Notification Configuration
- `VITE_ENABLE_NOTIFICATIONS` - Enable notifications (true/false)
- `VITE_ENABLE_SOUNDS` - Enable notification sounds (true/false)
- `VITE_ENABLE_DESKTOP_NOTIFICATIONS` - Desktop notifications (true/false)
- `VITE_AUTO_HIDE_DELAY` - Auto-hide delay (5000ms)

#### Feature Flags
- `VITE_ENABLE_MANUAL_TRADING` - Enable manual trading (true/false)
- `VITE_ENABLE_AUTOMATED_TRADING` - Enable automation (true/false)
- `VITE_ENABLE_RISK_MANAGEMENT` - Enable risk management (true/false)
- `VITE_ENABLE_PANIC_MODE` - Enable panic mode (true/false)

## Troubleshooting

### Contract Deployment Issues

**Problem**: Contract deployment fails with "insufficient funds"
**Solution**: Ensure deployment wallet has sufficient REACT tokens for gas

**Problem**: Contract verification fails
**Solution**: Run `npx hardhat verify --network reactive-testnet <address>`

### Frontend Build Issues

**Problem**: Build fails with module not found errors
**Solution**: Run `pnpm install` to ensure all dependencies are installed

**Problem**: Environment variables not loading
**Solution**: Ensure .env file exists and variables are prefixed with `VITE_`

### Runtime Issues

**Problem**: Price updates not working
**Solution**: Check API endpoints in .env and ensure services are accessible

**Problem**: Contract interactions failing
**Solution**: Verify contract addresses in .env match deployed contracts

## Monitoring and Maintenance

### Health Checks

Monitor system health using the built-in status indicators:
- Price data freshness
- Service health
- System status
- Automation status

### Error Monitoring

Review error logs and statistics:
```javascript
import { errorHandlingFramework } from './services/ErrorHandlingFramework.js';

const stats = errorHandlingFramework.getErrorStats();
console.log('Error statistics:', stats);
```

### Performance Monitoring

Monitor key performance metrics:
- Price update latency
- Rebalancing execution time
- Risk trigger evaluation time
- API response times

## Security Considerations

1. **Private Keys**: Never commit private keys or mnemonics to version control
2. **API Keys**: Store API keys securely in environment variables
3. **Contract Ownership**: Verify contract ownership after deployment
4. **Access Control**: Implement proper access control for admin functions
5. **Rate Limiting**: Configure rate limiting for API endpoints

## Rollback Procedure

If issues occur after deployment:

1. Revert to previous contract deployment:
```bash
# Use previous deployment addresses
cp deployments/backup/reactive-testnet-deployment.json deployments/
```

2. Redeploy frontend with previous configuration:
```bash
git checkout <previous-commit>
./scripts/deploy-frontend.sh
```

3. Verify rollback:
```bash
npx hardhat run scripts/verify-contract-integration.js --network reactive-testnet
```

## Support

For deployment issues or questions:
- Check the documentation at https://dev.reactive.network/
- Review error logs in `logs/` directory
- Contact support team

## Changelog

### Version 2.0.0 (Current)
- Enhanced price display with multi-source aggregation
- Intelligent rebalancing with gas optimization
- Advanced risk management with trailing stops
- Manual/automated trading integration
- Comprehensive error handling and notifications
