# Task 6 Test Checklist: Per-Token Settings UI

## ✅ Manual Testing Checklist

### 1. Initial Load Tests

- [ ] Navigate to portfolio settings page
- [ ] Verify page loads without errors
- [ ] Check that existing allocations are loaded correctly
- [ ] Verify per-token settings are loaded if they exist
- [ ] Confirm global defaults are displayed correctly

### 2. Allocation Tests

#### Basic Allocation
- [ ] Enter allocation percentage for a token (e.g., BTC: 50%)
- [ ] Verify token card expands to show per-token settings
- [ ] Confirm blue border appears on allocated token
- [ ] Check that total percentage updates correctly
- [ ] Verify remaining percentage calculation is accurate

#### Multiple Tokens
- [ ] Allocate percentages to multiple tokens
- [ ] Verify each token shows its own settings panel
- [ ] Confirm total percentage sums correctly
- [ ] Check validation when total ≠ 100%

#### Edge Cases
- [ ] Try entering 0% allocation
- [ ] Try entering 100% to single token
- [ ] Try entering negative values (should be prevented)
- [ ] Try entering values > 100 (should be prevented)
- [ ] Try entering decimal values

### 3. Per-Token Settings Tests

#### Sell Percentage
- [ ] Change sell % for a token
- [ ] Verify value updates in real-time
- [ ] Check range validation (1-100)
- [ ] Confirm different tokens can have different sell %

#### Buy Percentage
- [ ] Change buy % for a token
- [ ] Verify value updates in real-time
- [ ] Check range validation (1-50)
- [ ] Confirm different tokens can have different buy %

#### Stop Loss Percentage
- [ ] Change stop-loss % for a token
- [ ] Verify value updates in real-time
- [ ] Check range validation (1-50)
- [ ] Confirm different tokens can have different stop-loss %

#### Settings Independence
- [ ] Set different values for BTC and ETH
- [ ] Verify changing BTC settings doesn't affect ETH
- [ ] Confirm each token maintains its own settings

### 4. Toggle Tests

#### Enable/Disable Automation
- [ ] Click toggle to disable automation
- [ ] Verify toggle switches to gray/OFF state
- [ ] Check status text changes to "disabled"
- [ ] Click toggle to re-enable
- [ ] Verify toggle switches to green/ON state
- [ ] Check status text changes to "active"

#### Multiple Token Toggles
- [ ] Enable automation for BTC
- [ ] Disable automation for USDC
- [ ] Verify each token's toggle state is independent
- [ ] Confirm visual feedback is correct for each

### 5. Quick Actions Tests

#### Auto Distribute
- [ ] Select 3 tokens with 0% allocation
- [ ] Click "Auto Distribute"
- [ ] Verify each token gets 33.33%
- [ ] Confirm total equals 100%
- [ ] Check that token settings are initialized
- [ ] Verify success message appears

#### Select All
- [ ] Click "Select All"
- [ ] Verify all tokens are added with 0% allocation
- [ ] Confirm no per-token settings panels show yet
- [ ] Check success message appears

#### Clear All
- [ ] Set up some allocations
- [ ] Click "Clear All"
- [ ] Verify all allocations are removed
- [ ] Confirm per-token settings panels collapse
- [ ] Check success message appears

### 6. Save Settings Tests

#### Valid Save
- [ ] Set allocations totaling 100%
- [ ] Configure per-token settings
- [ ] Click "Upload Settings"
- [ ] Verify success message appears
- [ ] Confirm redirect to portfolio page
- [ ] Navigate back to settings
- [ ] Verify settings were persisted

#### Invalid Save
- [ ] Set allocations totaling 90%
- [ ] Try to save
- [ ] Verify error message appears
- [ ] Confirm save is prevented
- [ ] Check button is disabled when invalid

#### No Tokens Selected
- [ ] Clear all allocations
- [ ] Try to save
- [ ] Verify error message appears
- [ ] Confirm save is prevented

### 7. Data Persistence Tests

#### Store Persistence
- [ ] Configure settings and save
- [ ] Refresh the page
- [ ] Verify settings are loaded correctly
- [ ] Check allocations match
- [ ] Confirm per-token settings match

#### LocalStorage Fallback
- [ ] Check localStorage for saved settings
- [ ] Verify tokenSettings are stored
- [ ] Confirm backward compatibility with old structure

### 8. Migration Tests

#### From Old Structure
- [ ] Load portfolio with old settings structure (no tokenSettings)
- [ ] Verify migration creates tokenSettings
- [ ] Check that global defaults are applied to all tokens
- [ ] Confirm holdings are migrated correctly

#### From Holdings
- [ ] Load portfolio with holdings but no settings
- [ ] Verify allocations are calculated from holdings
- [ ] Check that token settings are initialized
- [ ] Confirm percentages match holding values

### 9. UI/UX Tests

#### Visual Feedback
- [ ] Verify blue border on allocated tokens
- [ ] Check toggle color changes (green/gray)
- [ ] Confirm input focus rings work
- [ ] Verify status indicators show correctly

#### Responsive Design
- [ ] Test on desktop (≥768px)
- [ ] Verify 3-column grid for settings
- [ ] Test on mobile (<768px)
- [ ] Verify single-column stack
- [ ] Check touch targets are adequate

#### Dark Mode
- [ ] Switch to dark mode
- [ ] Verify colors are appropriate
- [ ] Check contrast is sufficient
- [ ] Confirm all elements are visible

### 10. Integration Tests

#### With Portfolio Store
- [ ] Verify updatePortfolioSettings is called correctly
- [ ] Check that tokenSettings are saved to store
- [ ] Confirm store state updates properly

#### With Portfolio Page
- [ ] Save settings
- [ ] Navigate to portfolio page
- [ ] Verify settings are reflected in portfolio
- [ ] Check that automation status is visible

### 11. Error Handling Tests

#### Invalid Input
- [ ] Enter non-numeric values
- [ ] Verify validation prevents invalid input
- [ ] Check error messages are clear

#### Missing Portfolio
- [ ] Navigate to settings for non-existent portfolio
- [ ] Verify error message appears
- [ ] Confirm graceful handling

#### Network Issues
- [ ] Simulate localStorage failure
- [ ] Verify error is caught and logged
- [ ] Confirm user sees appropriate message

### 12. Performance Tests

#### Large Token List
- [ ] Load settings with all tokens selected
- [ ] Verify page remains responsive
- [ ] Check that updates are smooth

#### Rapid Changes
- [ ] Quickly change multiple settings
- [ ] Verify all updates are captured
- [ ] Confirm no race conditions

## 🎯 Expected Behavior Summary

### When User Enters Allocation
1. Token card expands
2. Blue border appears
3. Per-token settings panel shows
4. Toggle defaults to ON (enabled)
5. Settings use global defaults initially

### When User Customizes Settings
1. Values update in real-time
2. Each token maintains independent settings
3. Changes are not saved until "Upload Settings"
4. Visual feedback confirms changes

### When User Toggles Automation
1. Toggle animates smoothly
2. Color changes (green ↔ gray)
3. Status text updates
4. Setting is saved with other settings

### When User Saves Settings
1. Validation runs (total = 100%, tokens selected)
2. Settings persist to store
3. Settings persist to localStorage
4. Success message shows
5. Redirect to portfolio page after 1.5s

## 🐛 Known Issues / Limitations

### Non-Critical
- Accessibility warnings for label associations (cosmetic)
- No visual feedback during save (could add spinner)

### Future Enhancements
- Preset templates for common strategies
- Bulk edit for multiple tokens
- Copy/paste settings between tokens
- Visual charts for allocation

## ✅ Acceptance Criteria Validation

### Requirement 3.1: Individual Sell Percentage
- [x] Each token has its own sell% input
- [x] Sell% is stored per token in tokenSettings
- [x] Different tokens can have different sell%
- [x] Settings persist correctly

### Requirement 3.2: Individual Buy Percentage
- [x] Each token has its own buy% input
- [x] Buy% is stored per token in tokenSettings
- [x] Different tokens can have different buy%
- [x] Settings persist correctly

### Requirement 3.3: Individual Stop-Loss Percentage
- [x] Each token has its own stop-loss% input
- [x] Stop-loss% is stored per token in tokenSettings
- [x] Different tokens can have different stop-loss%
- [x] Settings persist correctly

## 📊 Test Results Template

```
Test Date: ___________
Tester: ___________
Environment: [ ] Development [ ] Staging [ ] Production

Results:
- Total Tests: ___
- Passed: ___
- Failed: ___
- Skipped: ___

Critical Issues Found:
1. ___________
2. ___________

Non-Critical Issues Found:
1. ___________
2. ___________

Notes:
___________________________________________
___________________________________________
___________________________________________

Sign-off: ___________
```

## 🚀 Ready for Next Task

Once all tests pass, the implementation is ready for:
- Task 7: Implement per-token price monitoring logic
- Task 8: Implement per-token automated actions

The UI foundation is complete and provides all necessary controls for per-token configuration.
