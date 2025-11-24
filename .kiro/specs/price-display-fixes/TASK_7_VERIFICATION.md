# Task 7: Mode Switching - Verification Checklist

## Pre-Testing Setup

- [ ] Backend price service is running (`http://localhost:3001`)
- [ ] Frontend dev server is running
- [ ] Browser console is open for monitoring
- [ ] No cached data from previous sessions (or clear localStorage)

## Test 1: Initial Load in Live Mode

### Steps:
1. Navigate to `http://localhost:5173/`
2. Wait for prices to load

### Expected Results:
- [ ] Console shows: `📍 Initial mode: live`
- [ ] Console shows: `🔴 Fetching backend prices for live mode` or `✅ Using cached data`
- [ ] Prices display in dashboard
- [ ] No errors in console

### Verification:
```javascript
// Run in console:
priceService.getModeStatus()

// Expected:
// {
//   currentMode: 'live',
//   priceCount: > 0,
//   mockCount: 0,
//   backendCount: > 0,
//   isConsistent: true
// }
```

## Test 2: Switch to Simulation Mode

### Steps:
1. From live mode, navigate to `/simulated`
2. Wait for mode switch to complete

### Expected Results:
- [ ] Console shows: `🔄 Mode change detected: switching to simulation`
- [ ] Console shows: `🧹 Clearing stale price data from previous mode...`
- [ ] Console shows: `🧪 Fetching mock prices for simulation mode...`
- [ ] Console shows: `✅ Loaded mock prices for simulation`
- [ ] Console shows: `✅ Price source verification passed`
- [ ] Console shows: `✅ Mode switch complete: simulation mode prices loaded`
- [ ] Prices change to mock values
- [ ] Simulation banner appears at top
- [ ] No errors in console

### Verification:
```javascript
// Run in console:
priceService.getModeStatus()

// Expected:
// {
//   currentMode: 'simulation',
//   priceCount: > 0,
//   mockCount: > 0,
//   backendCount: 0,
//   isConsistent: true
// }

// Verify all prices are mock:
Object.values(priceService.getAllPrices()).every(p => p.source === 'mock')
// Expected: true
```

## Test 3: Switch Back to Live Mode

### Steps:
1. From simulation mode, navigate to `/`
2. Wait for mode switch to complete

### Expected Results:
- [ ] Console shows: `🔄 Mode change detected: switching to live`
- [ ] Console shows: `🧹 Clearing stale price data from previous mode...`
- [ ] Console shows: `🔴 Fetching backend prices for live mode...`
- [ ] Console shows: `✅ Loaded prices from backend`
- [ ] Console shows: `✅ Price source verification passed`
- [ ] Console shows: `✅ Mode switch complete: live mode prices loaded`
- [ ] Prices change back to backend values
- [ ] Simulation banner disappears
- [ ] No errors in console

### Verification:
```javascript
// Run in console:
priceService.getModeStatus()

// Expected:
// {
//   currentMode: 'live',
//   priceCount: > 0,
//   mockCount: 0,
//   backendCount: > 0,
//   isConsistent: true
// }

// Verify no mock prices remain:
Object.values(priceService.getAllPrices()).every(p => p.source !== 'mock')
// Expected: true
```

## Test 4: Rapid Mode Switching

### Steps:
1. Navigate to `/simulated`
2. Immediately navigate to `/`
3. Immediately navigate to `/simulated`
4. Wait for all operations to complete

### Expected Results:
- [ ] No errors in console
- [ ] Final mode is simulation
- [ ] Prices are mock prices
- [ ] No backend prices contamination
- [ ] Console shows multiple mode switches
- [ ] Each switch clears data properly

### Verification:
```javascript
// Run in console:
priceService.getModeStatus()

// Expected:
// {
//   currentMode: 'simulation',
//   isConsistent: true
// }
```

## Test 5: Mode Switch with Backend Offline

### Steps:
1. Stop backend price service
2. Navigate to `/simulated`
3. Wait for mode switch

### Expected Results:
- [ ] Console shows: `🔄 Mode change detected: switching to simulation`
- [ ] Console shows: `🧹 Clearing stale price data from previous mode...`
- [ ] Console shows: `🧪 Fetching mock prices for simulation mode...`
- [ ] Mock prices load successfully (doesn't depend on backend)
- [ ] Console shows: `✅ Mode switch complete: simulation mode prices loaded`
- [ ] No critical errors (warnings are OK)

### Verification:
```javascript
// Run in console:
priceService.getModeStatus()

// Expected:
// {
//   currentMode: 'simulation',
//   mockCount: > 0,
//   isConsistent: true
// }
```

## Test 6: Header Toggle Mode Switch

### Steps:
1. Click mode toggle in header
2. Wait for page reload

### Expected Results:
- [ ] Page reloads
- [ ] Mode changes (live ↔ simulation)
- [ ] Prices load for new mode
- [ ] No errors after reload

### Verification:
```javascript
// Run in console after reload:
priceService.getModeStatus()

// Verify mode matches toggle state
```

## Test 7: Price Display Components

### Steps:
1. Switch to simulation mode
2. Navigate to different pages:
   - Dashboard
   - Portfolio view
   - Trade modal

### Expected Results:
- [ ] All components show mock prices
- [ ] No "undefined" or "NaN" values
- [ ] No console errors
- [ ] Prices format correctly
- [ ] Loading states work properly

## Test 8: Data Persistence

### Steps:
1. Switch to simulation mode
2. Refresh page (F5)
3. Check mode and prices

### Expected Results:
- [ ] Mode persists (stays in simulation)
- [ ] Prices reload correctly
- [ ] No cross-contamination from previous session

### Verification:
```javascript
// Run in console:
localStorage.getItem('reactiveAppMode')
// Expected: 'simulation'

priceService.getModeStatus()
// Expected: currentMode: 'simulation', isConsistent: true
```

## Test 9: Error Recovery

### Steps:
1. Switch to simulation mode
2. Manually trigger error: `priceService.consecutiveFailures = 5`
3. Switch back to live mode

### Expected Results:
- [ ] Console shows: `🧹 Clearing stale price data from previous mode...`
- [ ] Error tracking is reset
- [ ] Prices load successfully
- [ ] No lingering error state

### Verification:
```javascript
// Run in console:
priceService.getConsecutiveFailures()
// Expected: 0

priceService.getLastFetchErrors()
// Expected: []
```

## Test 10: Source Verification

### Steps:
1. Switch to simulation mode
2. Manually contaminate data:
   ```javascript
   const prices = priceService.getAllPrices();
   const firstKey = Object.keys(prices)[0];
   prices[firstKey].source = 'backend';
   ```
3. Run verification:
   ```javascript
   priceService.verifyPriceSource('simulation')
   ```

### Expected Results:
- [ ] Console shows warning: `⚠️ Price contamination detected`
- [ ] Verification returns false
- [ ] System detects inconsistency

## Performance Tests

### Test 11: Mode Switch Speed

### Steps:
1. Measure time from navigation to prices loaded
2. Switch modes multiple times

### Expected Results:
- [ ] Mode switch completes in < 2 seconds
- [ ] No UI freezing
- [ ] Smooth transition

### Measurement:
```javascript
// Run in console before switching:
const start = Date.now();
// Switch mode
// After prices load:
const end = Date.now();
console.log(`Mode switch took ${end - start}ms`);
// Expected: < 2000ms
```

## Edge Cases

### Test 12: Empty Price Response

### Steps:
1. Mock empty response from backend
2. Switch modes

### Expected Results:
- [ ] Fallback to deterministic mock prices (simulation)
- [ ] Error logged but app continues
- [ ] No crashes

### Test 13: Malformed Price Data

### Steps:
1. Mock malformed response
2. Switch modes

### Expected Results:
- [ ] Error logged
- [ ] Fallback mechanism activates
- [ ] App remains functional

## Final Verification

### Overall System Check:
```javascript
// Run in console:

// 1. Check mode status
priceService.getModeStatus()

// 2. Check all prices have correct source
const prices = priceService.getAllPrices();
const mode = priceService.getModeStatus().currentMode;
const allCorrect = Object.values(prices).every(p => {
  if (mode === 'simulation') return p.source === 'mock';
  if (mode === 'live') return p.source !== 'mock';
  return false;
});
console.log('All prices from correct source:', allCorrect);
// Expected: true

// 3. Check no errors
priceService.getLastFetchErrors()
// Expected: []

// 4. Check storage stats
priceService.getStorageStatus()
// Expected: priceCount > 0, lastUpdated recent
```

## Sign-Off Checklist

- [ ] All 13 tests passed
- [ ] No console errors during testing
- [ ] Mode switching works in both directions
- [ ] No price contamination detected
- [ ] Performance is acceptable
- [ ] Error handling works correctly
- [ ] Documentation is complete
- [ ] Code has no diagnostics errors

## Notes

Record any issues or observations during testing:

```
Date: ___________
Tester: ___________

Issues Found:
1. 
2. 
3. 

Observations:
1. 
2. 
3. 

Overall Assessment: PASS / FAIL
```
