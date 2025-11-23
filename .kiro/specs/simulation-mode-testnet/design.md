# Design Document: Simulation Mode with Testnet Integration

## Overview

This design transforms simulation mode from a purely offline testing environment into a fully functional testnet-based system. Users will interact with real blockchain infrastructure using test tokens, providing a realistic testing experience without financial risk.

The design maintains backward compatibility with the existing mode-switching infrastructure while adding testnet network configuration, test token management, and real transaction execution capabilities.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Client)                     │
├─────────────────────────────────────────────────────────────┤
│  Mode Selector  │  Network Manager  │  Token Config Manager │
├─────────────────────────────────────────────────────────────┤
│           Wallet Service (MetaMask Integration)              │
├─────────────────────────────────────────────────────────────┤
│  Live Mode Config          │      Simulation Mode Config     │
│  - Mainnet RPC             │      - Testnet RPC              │
│  - Real Token Addresses    │      - Test Token Addresses     │
│  - Production DEX          │      - Testnet DEX              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Blockchain Layer                          │
├──────────────────────────┬──────────────────────────────────┤
│   Reactive Mainnet       │    Reactive Testnet              │
│   - Real Tokens          │    - Test Tokens                 │
│   - Production DEX       │    - Test DEX                    │
│   - Real Value           │    - No Real Value               │
└──────────────────────────┴──────────────────────────────────┘
```

### Component Interaction Flow

```
User Switches to Simulation Mode
         │
         ▼
   Update appMode Store
         │
         ▼
   Trigger Network Switch
         │
         ▼
   MetaMask Prompts User
         │
         ▼
   Load Testnet Config
         │
         ▼
   Update Token Addresses
         │
         ▼
   Reload Portfolio Data
         │
         ▼
   Display Testnet UI
```

## Components and Interfaces

### 1. Network Configuration Service

**Purpose**: Manage network configurations for both live and simulation modes.

**Interface**:
```javascript
class NetworkConfigService {
  // Get network config based on current mode
  getNetworkConfig(mode: 'live' | 'simulation'): NetworkConfig
  
  // Switch to specified network
  async switchNetwork(mode: 'live' | 'simulation'): Promise<boolean>
  
  // Add network to MetaMask if not present
  async addNetworkToWallet(config: NetworkConfig): Promise<boolean>
  
  // Verify current network matches expected mode
  async verifyNetwork(mode: 'live' | 'simulation'): Promise<boolean>
}

interface NetworkConfig {
  chainId: string
  chainName: string
  rpcUrls: string[]
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  blockExplorerUrls: string[]
}
```

**Configuration**:
- Mainnet: Chain ID 1597, RPC: https://mainnet-rpc.rnk.dev/
- Testnet: Chain ID 5318008 (or configured testnet ID), RPC: https://testnet-rpc.rnk.dev/

### 2. FREACT Token System

**Purpose**: Provide a single test token (FREACT) that users can use to buy any asset in simulation mode.

**Token Specifications**:
- Name: Fake React
- Symbol: FREACT
- Initial Supply: 1,000,000 FREACT
- Pegged Value: 1 FREACT = 1 USD (for easy mental math)
- Decimals: 18 (standard ERC-20)
- Network: Reactive Testnet only

**Interface**:
```javascript
class FREACTTokenService {
  // Get FREACT token contract
  getTokenContract(): Contract
  
  // Check user's FREACT balance
  async getBalance(address: string): Promise<string>
  
  // Request FREACT from faucet (frontend-controlled)
  async claimFromFaucet(address: string, amount: string): Promise<Transaction>
  
  // Check if user can claim (rate limiting)
  async canClaim(address: string): Promise<boolean>
  
  // Get next claim time
  async getNextClaimTime(address: string): Promise<Date>
}
```

**Faucet Configuration**:
- Claim Amount: 1,000 FREACT per claim
- Cooldown: 24 hours between claims
- Max per address: 10,000 FREACT total
- Frontend-controlled: No external faucet needed

### 3. Simulation Trading Service

**Purpose**: Simulate buying assets using FREACT tokens on testnet.

**Simplified Trading Model**:
Since 1 FREACT = 1 USD, buying is straightforward:
- User has 1000 FREACT
- BTC price is $45,000
- User can "buy" 0.0222 BTC by spending 1000 FREACT
- Transaction: Transfer FREACT to portfolio contract, receive simulated BTC position

**Interface**:
```javascript
class SimulationTradingService {
  // Buy asset using FREACT (1 FREACT = 1 USD)
  async buyAsset(
    assetSymbol: string,
    freactAmount: string,
    currentPrice: number
  ): Promise<{
    success: boolean
    assetAmount: string
    transactionHash: string
  }>
  
  // Sell asset back to FREACT
  async sellAsset(
    assetSymbol: string,
    assetAmount: string,
    currentPrice: number
  ): Promise<{
    success: boolean
    freactReceived: string
    transactionHash: string
  }>
  
  // Get simulated portfolio value in FREACT
  async getPortfolioValue(positions: Position[]): Promise<string>
}
```

**Implementation Strategy**:
- Portfolio contract tracks positions (not actual tokens)
- FREACT is the only real token transferred
- Asset positions are recorded on-chain but tokens aren't actually swapped
- Prices from real price feeds determine position values
- Simpler than full DEX integration, faster transactions

### 4. FREACT Faucet Service

**Purpose**: Distribute FREACT tokens to users directly from the frontend.

**Interface**:
```javascript
class FREACTFaucetService {
  // Claim FREACT tokens (frontend-initiated)
  async claimFREACT(address: string): Promise<Transaction>
  
  // Check if user can claim
  async canClaim(address: string): Promise<{
    canClaim: boolean
    reason?: string
    nextClaimTime?: Date
    remainingAllowance?: string
  }>
  
  // Get user's claim history
  async getClaimHistory(address: string): Promise<Claim[]>
  
  // Get faucet statistics
  async getFaucetStats(): Promise<{
    totalClaimed: string
    uniqueClaimers: number
    remainingSupply: string
  }>
}

interface Claim {
  address: string
  amount: string
  timestamp: Date
  transactionHash: string
}
```

**Faucet Implementation**:
- Smart contract with `claim()` function
- Rate limiting enforced on-chain
- Frontend button triggers claim transaction
- No external faucet service needed

### 5. Mode-Specific Data Storage

**Purpose**: Keep simulation and live data completely separate.

**Interface**:
```javascript
class ModeAwareStorageService {
  // Save portfolio with mode prefix
  async savePortfolio(portfolio: Portfolio, mode: string): Promise<void>
  
  // Load portfolios for specific mode
  async loadPortfolios(mode: string): Promise<Portfolio[]>
  
  // Get storage key with mode prefix
  getStorageKey(key: string, mode: string): string
}
```

**Storage Strategy**:
- LocalStorage keys: `live_portfolios`, `simulation_portfolios`
- Backend API: `/api/portfolios/:address?mode=simulation`
- Separate IPFS storage for each mode

## Data Models

### Network Configuration Model
```javascript
{
  mode: 'simulation',
  network: {
    chainId: '0x512358',  // Testnet chain ID in hex
    chainName: 'Reactive Testnet',
    rpcUrls: ['https://testnet-rpc.rnk.dev/'],
    nativeCurrency: {
      name: 'Test Reactive',
      symbol: 'tREACT',
      decimals: 18
    },
    blockExplorerUrls: ['https://testnet.reactscan.net/']
  }
}
```

### FREACT Token Model
```javascript
{
  symbol: 'FREACT',
  name: 'Fake React',
  address: '0x...testnet-freact-address...',
  decimals: 18,
  usdValue: 1.0,  // Pegged at 1 FREACT = 1 USD
  isTestToken: true,
  testnetOnly: true,
  faucet: {
    claimAmount: '1000',  // 1000 FREACT per claim
    cooldownHours: 24,
    maxPerAddress: '10000'
  }
}
```

### Mode-Aware Portfolio Model
```javascript
{
  id: 'portfolio-123',
  mode: 'simulation',  // NEW: Track which mode this portfolio belongs to
  name: 'Test Portfolio',
  balance: '1000',
  allocations: [...],
  transactions: [
    {
      hash: '0x...testnet-tx...',
      network: 'testnet',
      isTestTransaction: true
    }
  ]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Network Mode Consistency
*For any* application state, the active network in MetaMask should match the selected mode (simulation → testnet, live → mainnet)
**Validates: Requirements 1.1, 1.2**

### Property 2: Token Address Isolation
*For any* token symbol, the address used in simulation mode should differ from the address used in live mode
**Validates: Requirements 2.1, 2.2**

### Property 3: Data Storage Separation
*For any* portfolio operation, data saved in simulation mode should not appear when querying live mode data, and vice versa
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 4: Transaction Network Matching
*For any* transaction executed in simulation mode, the transaction should be submitted to testnet and not mainnet
**Validates: Requirements 3.1, 3.2**

### Property 5: Mode Switch Preservation
*For any* mode switch operation, all data in both modes should remain unchanged after the switch completes
**Validates: Requirements 5.4**

### Property 6: Test Token Identification
*For any* token displayed in simulation mode, the UI should clearly indicate it is a test token
**Validates: Requirements 2.4, 8.2**

### Property 7: Network Verification
*For any* transaction attempt, if the current network doesn't match the selected mode, the system should prevent the transaction
**Validates: Requirements 10.4**

## Error Handling

### Network Switch Failures
- User rejects network switch → Show manual instructions
- Network not in MetaMask → Offer to add network
- RPC endpoint unreachable → Show error with fallback RPC options

### Test Token Issues
- Insufficient test tokens → Show faucet link
- Test token not deployed → Provide deployment instructions
- Faucet unavailable → Show manual alternatives

### Transaction Failures
- Gas estimation fails → Show testnet gas requirements
- Transaction reverts → Display actual revert reason from testnet
- Slippage exceeded → Show current testnet market conditions

### Mode Confusion Prevention
- Wrong network detected → Block operations and show warning
- Mixed mode data → Prevent loading and show error
- Unclear mode state → Force mode selection

## Testing Strategy

### Unit Tests
- Network configuration switching
- Token address resolution by mode
- Storage key generation with mode prefix
- Mode state management

### Property-Based Tests
- Property 1: Network-mode consistency across random mode switches
- Property 2: Token address uniqueness across modes for all tokens
- Property 3: Data isolation across random save/load operations
- Property 4: Transaction network matching for random transactions
- Property 5: Data preservation across random mode switches
- Property 6: Test token labeling for all simulation mode tokens
- Property 7: Network verification for all transaction attempts

### Integration Tests
- Complete mode switch flow (live → simulation → live)
- Test token acquisition and usage
- Simulated trading on testnet
- Portfolio creation in both modes
- Network auto-switching with MetaMask

### Manual Testing
- MetaMask network switching UX
- Faucet integration flow
- Testnet transaction confirmation times
- UI indicators visibility
- Mode confusion scenarios

## Implementation Notes

### Phase 1: Network Configuration
1. Add testnet network config to environment
2. Implement network switching in wallet service
3. Add network verification checks
4. Update UI to show current network

### Phase 2: FREACT Token Deployment
1. Create FREACT ERC-20 contract with faucet functionality
2. Deploy FREACT to Reactive testnet
3. Deploy faucet contract with rate limiting
4. Verify contracts on testnet explorer
5. Update frontend config with FREACT address

### Phase 3: Simulated Trading with FREACT
1. Create simulation portfolio contract that tracks positions
2. Implement buy logic: FREACT → simulated asset position
3. Implement sell logic: simulated asset position → FREACT
4. Add position tracking and value calculation
5. Update UI to show FREACT-based trading

### Phase 4: Data Isolation
1. Implement mode-aware storage service
2. Update portfolio store to filter by mode
3. Add mode prefix to all storage keys
4. Migrate existing simulation data

### Phase 5: Faucet Integration
1. Research available testnet faucets
2. Implement faucet service
3. Add faucet UI components
4. Test token distribution flow

### Dependencies
- Reactive testnet must be accessible
- Test tokens must be deployed on testnet
- Testnet DEX (Uniswap) must be available
- Testnet block explorer must be functional

### Performance Considerations
- Testnet RPC may be slower than mainnet
- Cache testnet responses when possible
- Show loading states for testnet operations
- Implement timeout handling for slow testnet responses

### Security Considerations
- Clearly label all test transactions
- Prevent accidental mainnet transactions in simulation mode
- Validate network before every transaction
- Never mix test and real token addresses
