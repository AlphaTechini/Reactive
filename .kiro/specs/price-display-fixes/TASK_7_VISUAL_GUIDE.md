# Task 7: Mode Switching - Visual Guide

## Mode Switch Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER ACTION                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Navigate to      │
                    │ /simulated/*     │
                    │ or /             │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SIMULATION STORE                                │
│  initSimulation() or exitSimulation()                           │
│  ├─ appMode.set('simulation' | 'live')                          │
│  └─ Triggers appMode subscription                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PRICE SERVICE                                   │
│  appMode.subscribe() detects change                             │
│  ├─ Skip if first call                                          │
│  └─ Call handleModeChange()                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              HANDLE MODE CHANGE                                  │
│  1. Log mode change                                             │
│  2. Clear stale data: globalStorage.clear()                     │
│  3. Reset cache expiration                                      │
│  4. Reset error tracking                                        │
│  5. Fetch prices: fetchFromBackend()                            │
│  6. Verify source: verifyPriceSource()                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              FETCH FROM BACKEND                                  │
│  if (mode === 'simulation')                                     │
│    ├─ Try: secureContractService.getMockPrices()               │
│    └─ Fallback: Generate deterministic mock prices             │
│  else                                                            │
│    └─ Fetch from backend API                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PROCESS & STORE PRICES                              │
│  For each token:                                                │
│    ├─ Create pricePoint with mode & source                     │
│    └─ Store in globalStorage                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              VERIFY PRICE SOURCE                                 │
│  Sample prices and check:                                       │
│    ├─ Simulation mode → expect 'mock' source                   │
│    └─ Live mode → expect 'backend' source                      │
│  Log warnings if contamination detected                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              UPDATE UI                                           │
│  Reactive stores update automatically:                          │
│    ├─ globalPricesStore                                         │
│    ├─ globalPriceHistoryStore                                   │
│    ├─ globalChartDataStore                                      │
│    └─ Components re-render with new prices                     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Simulation Mode

```
┌──────────────┐
│ User clicks  │
│ "Simulation" │
└──────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ BEFORE MODE SWITCH                                       │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Global Storage                                     │  │
│ │ ├─ ETH: { price: 2500, source: 'backend' }       │  │
│ │ ├─ BTC: { price: 45000, source: 'backend' }      │  │
│ │ └─ ... (backend prices)                           │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ CLEAR STALE DATA                                         │
│ globalStorage.clear()                                    │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Global Storage                                     │  │
│ │ └─ (empty)                                         │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ FETCH MOCK PRICES                                        │
│ secureContractService.getMockPrices()                    │
│ or generate deterministic mock prices                    │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ AFTER MODE SWITCH                                        │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Global Storage                                     │  │
│ │ ├─ ETH: { price: 123.45, source: 'mock' }        │  │
│ │ ├─ BTC: { price: 234.56, source: 'mock' }        │  │
│ │ └─ ... (mock prices)                              │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ✅ No backend prices remain                             │
│ ✅ All prices from mock source                          │
└──────────────────────────────────────────────────────────┘
```

## Data Flow: Live Mode

```
┌──────────────┐
│ User exits   │
│ "Simulation" │
└──────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ BEFORE MODE SWITCH                                       │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Global Storage                                     │  │
│ │ ├─ ETH: { price: 123.45, source: 'mock' }        │  │
│ │ ├─ BTC: { price: 234.56, source: 'mock' }        │  │
│ │ └─ ... (mock prices)                              │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ CLEAR STALE DATA                                         │
│ globalStorage.clear()                                    │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Global Storage                                     │  │
│ │ └─ (empty)                                         │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ FETCH BACKEND PRICES                                     │
│ fetch('http://localhost:3001/api/prices')                │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ AFTER MODE SWITCH                                        │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Global Storage                                     │  │
│ │ ├─ ETH: { price: 2500, source: 'backend' }       │  │
│ │ ├─ BTC: { price: 45000, source: 'backend' }      │  │
│ │ └─ ... (backend prices)                           │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ✅ No mock prices remain                                │
│ ✅ All prices from backend source                       │
└──────────────────────────────────────────────────────────┘
```

## Price Source Verification

```
┌─────────────────────────────────────────────────────────┐
│ verifyPriceSource(mode)                                 │
│                                                         │
│ Sample 5 prices from storage                           │
│                                                         │
│ For each price:                                        │
│   ├─ Check source field                               │
│   └─ Check mode field                                 │
│                                                         │
│ If mode === 'simulation':                             │
│   ├─ ✅ source === 'mock' → correct                   │
│   └─ ❌ source !== 'mock' → contamination!            │
│                                                         │
│ If mode === 'live':                                   │
│   ├─ ✅ source === 'backend' → correct                │
│   ├─ ✅ source === 'cache' → acceptable               │
│   ├─ ✅ source === 'ipfs' → acceptable                │
│   └─ ❌ source === 'mock' → contamination!            │
│                                                         │
│ Log results:                                           │
│   ├─ ✅ "Price source verification passed"            │
│   └─ ❌ "Price source verification failed"            │
└─────────────────────────────────────────────────────────┘
```

## State Transitions

```
┌─────────────────────────────────────────────────────────┐
│                    INITIAL STATE                        │
│  appMode: 'live' (from localStorage or default)        │
│  prices: loaded from cache or backend                  │
└─────────────────────────────────────────────────────────┘
                       │
                       │ User navigates to /simulated
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 TRANSITIONING STATE                     │
│  appMode: 'simulation' (set by initSimulation)         │
│  prices: being cleared and refreshed                   │
│  globalRefreshingStore: true                           │
└─────────────────────────────────────────────────────────┘
                       │
                       │ Fetch complete
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 SIMULATION STATE                        │
│  appMode: 'simulation'                                 │
│  prices: mock prices loaded                            │
│  globalRefreshingStore: false                          │
│  source: 'mock'                                        │
└─────────────────────────────────────────────────────────┘
                       │
                       │ User navigates to /
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 TRANSITIONING STATE                     │
│  appMode: 'live' (set by exitSimulation)              │
│  prices: being cleared and refreshed                   │
│  globalRefreshingStore: true                           │
└─────────────────────────────────────────────────────────┘
                       │
                       │ Fetch complete
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    LIVE STATE                           │
│  appMode: 'live'                                       │
│  prices: backend prices loaded                         │
│  globalRefreshingStore: false                          │
│  source: 'backend'                                     │
└─────────────────────────────────────────────────────────┘
```

## Component Integration

```
┌─────────────────────────────────────────────────────────┐
│                    COMPONENTS                           │
│                                                         │
│  Dashboard, Portfolio, Charts, etc.                    │
│  Subscribe to: globalPricesStore                       │
│                                                         │
│  $: prices = $globalPricesStore                        │
│  $: isRefreshing = $globalRefreshingStore              │
│                                                         │
│  Automatically re-render when:                         │
│    ├─ Mode changes                                     │
│    ├─ Prices refresh                                   │
│    └─ Loading state changes                            │
└─────────────────────────────────────────────────────────┘
                       │
                       │ Subscribe
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 GLOBAL STORAGE                          │
│                                                         │
│  globalPricesStore                                     │
│  globalRefreshingStore                                 │
│  globalDataSourceStore                                 │
│                                                         │
│  Updated by: priceService                              │
└─────────────────────────────────────────────────────────┘
                       │
                       │ Updates
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  PRICE SERVICE                          │
│                                                         │
│  Listens to: appMode                                   │
│  Updates: globalStorage                                │
│                                                         │
│  On mode change:                                       │
│    ├─ Clear data                                       │
│    ├─ Fetch new prices                                 │
│    └─ Update stores                                    │
└─────────────────────────────────────────────────────────┘
```

## Error Handling

```
┌─────────────────────────────────────────────────────────┐
│              MODE SWITCH ERROR FLOW                     │
│                                                         │
│  handleModeChange()                                    │
│    │                                                    │
│    ├─ Clear data (always succeeds)                    │
│    │                                                    │
│    ├─ Fetch prices                                     │
│    │   ├─ Success → Verify source                     │
│    │   └─ Failure → Log error                         │
│    │                                                    │
│    └─ Finally: Set refreshing = false                 │
│                                                         │
│  If fetch fails:                                       │
│    ├─ Error logged to console                         │
│    ├─ lastFetchErrors updated                         │
│    ├─ consecutiveFailures incremented                 │
│    └─ UI shows error state                            │
│                                                         │
│  User can:                                             │
│    ├─ Retry manually (refresh button)                 │
│    └─ Switch modes again (resets errors)              │
└─────────────────────────────────────────────────────────┘
```

## Console Output Timeline

```
Time  Event                          Console Output
────  ─────────────────────────────  ──────────────────────────────────
0ms   User navigates to /simulated   📍 Simulated Mode Active
                                     🧪 Simulation mode initialized

10ms  initSimulation() called        appMode set to 'simulation'

15ms  appMode subscription fires     🔄 Mode change detected: switching to simulation

20ms  handleModeChange() starts      🔄 App mode changed to: simulation
                                     🧹 Clearing stale price data from previous mode...

25ms  globalStorage.clear()          🧹 Global storage cleared

30ms  fetchFromBackend() starts      🧪 Fetching mock prices for simulation mode...

100ms Mock prices loaded             ✅ Loaded mock prices for simulation

110ms Prices stored                  💾 Storing 10 prices from mock...
                                     ✅ Stored prices successfully (source: mock)

120ms Source verification            ✅ Price source verification passed: 5/5 prices from correct source

130ms Mode switch complete           ✅ Mode switch complete: simulation mode prices loaded
```

## Key Takeaways

1. **Clean Slate:** Every mode switch starts with completely cleared data
2. **Automatic:** No manual intervention needed - just navigate
3. **Verified:** Source verification ensures data integrity
4. **Logged:** Detailed console output for debugging
5. **Reactive:** UI updates automatically via stores
6. **Resilient:** Error handling prevents cascading failures
