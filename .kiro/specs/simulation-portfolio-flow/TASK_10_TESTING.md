# Task 10: Error Handling Testing Guide

## Testing Overview

This document provides a comprehensive testing guide for the error handling and validation implementation in Task 10.

## Manual Testing Checklist

### 1. Portfolio Creation Validation

#### Test: Empty Portfolio Name
- **Steps**: 
  1. Navigate to `/simulated/create-portfolio`
  2. Leave name field empty
  3. Enter valid deposit amount
  4. Click "Continue to Token Selection"
- **Expected**: Error message "Portfolio name is required"
- **Status**: ☐ Pass ☐ Fail

#### Test: Short Portfolio Name
- **Steps**:
  1. Enter name with 1 character (e.g., "A")
  2. Enter valid deposit amount
  3. Click submit
- **Expected**: Error message "Portfolio name must be at least 2 characters"
- **Status**: ☐ Pass ☐ Fail

#### Test: Long Portfolio Name
- **Steps**:
  1. Enter name with 51+ characters
  2. Enter valid deposit amount
  3. Click submit
- **Expected**: Error message "Portfolio name must be less than 50 characters"
- **Status**: ☐ Pass ☐ Fail

#### Test: Duplicate Portfolio Name
- **Steps**:
  1. Create a portfolio named "Test Portfolio"
  2. Try to create another with same name
- **Expected**: Error message "Portfolio with this name already exists"
- **Status**: ☐ Pass ☐ Fail

#### Test: Invalid Deposit Amount (Zero)
- **Steps**:
  1. Enter valid name
  2. Enter 0 as deposit amount
  3. Click submit
- **Expected**: Error message "Deposit amount must be positive"
- **Status**: ☐ Pass ☐ Fail

#### Test: Invalid Deposit Amount (Negative)
- **Steps**:
  1. Enter valid name
  2. Enter -100 as deposit amount
  3. Click submit
- **Expected**: Error message "Deposit amount must be positive"
- **Status**: ☐ Pass ☐ Fail

#### Test: Insufficient Balance
- **Steps**:
  1. Enter valid name
  2. Enter amount > available balance (e.g., 15000 when balance is 10000)
  3. Click submit
- **Expected**: Error message "Insufficient balance. Available: $10,000.00"
- **Status**: ☐ Pass ☐ Fail

#### Test: Real-time Validation Feedback
- **Steps**:
  1. Start typing in name field
  2. Observe validation messages
  3. Type in amount field
  4. Observe validation messages
- **Expected**: Validation messages appear/disappear in real-time
- **Status**: ☐ Pass ☐ Fail

#### Test: Loading State During Creation
- **Steps**:
  1. Enter valid inputs
  2. Click submit
  3. Observe button state
- **Expected**: 
  - Button shows "Creating..." with spinner
  - Button is disabled
  - Form inputs are disabled
- **Status**: ☐ Pass ☐ Fail

#### Test: Prevent Double Submission
- **Steps**:
  1. Enter valid inputs
  2. Click submit button rapidly multiple times
- **Expected**: Only one portfolio is created
- **Status**: ☐ Pass ☐ Fail

### 2. Price Fetching and Retry Logic

#### Test: Initial Price Load
- **Steps**:
  1. Create a portfolio
  2. Navigate to configuration page
  3. Observe price loading
- **Expected**: 
  - Loading spinner appears
  - Prices load successfully
  - All tokens show prices
- **Status**: ☐ Pass ☐ Fail

#### Test: Price Fetch Retry (Simulated Failure)
- **Steps**:
  1. Open DevTools Network tab
  2. Set network to "Offline"
  3. Navigate to portfolio configuration
  4. Observe retry attempts
  5. Set network back to "Online"
- **Expected**: 
  - Shows "Loading prices... (attempt 1/3)"
  - Retries with increasing delays
  - Eventually succeeds or shows error
- **Status**: ☐ Pass ☐ Fail

#### Test: Manual Price Refresh
- **Steps**:
  1. On portfolio configuration page
  2. Click "🔄 Refresh Prices" button
  3. Observe loading state
- **Expected**:
  - Button shows "Refreshing..."
  - Button is disabled during refresh
  - Success message appears
  - Prices update
- **Status**: ☐ Pass ☐ Fail

#### Test: Missing Price Data
- **Steps**:
  1. Configure portfolio with tokens
  2. Simulate missing price for a token (DevTools)
  3. Try to create portfolio
- **Expected**: Error message listing tokens with missing prices
- **Status**: ☐ Pass ☐ Fail

#### Test: Stale Price Warning
- **Steps**:
  1. Load portfolio configuration
  2. Wait 6+ minutes without refreshing
  3. Try to create portfolio
- **Expected**: Warning about stale prices
- **Status**: ☐ Pass ☐ Fail

### 3. Token Allocation Validation

#### Test: No Tokens Selected
- **Steps**:
  1. On portfolio configuration page
  2. Don't select any tokens
  3. Click "Confirm & Create Portfolio"
- **Expected**: Error message "Please select at least one token"
- **Status**: ☐ Pass ☐ Fail

#### Test: Total Percentage < 100%
- **Steps**:
  1. Select tokens with total = 50%
  2. Click "Confirm & Create Portfolio"
- **Expected**: Error message "Total allocation must equal 100%"
- **Status**: ☐ Pass ☐ Fail

#### Test: Total Percentage > 100%
- **Steps**:
  1. Select tokens with total = 150%
  2. Click "Confirm & Create Portfolio"
- **Expected**: Error message "Total allocation must equal 100%"
- **Status**: ☐ Pass ☐ Fail

#### Test: Negative Percentage
- **Steps**:
  1. Try to enter negative percentage
  2. Observe input behavior
- **Expected**: Input prevents negative values
- **Status**: ☐ Pass ☐ Fail

#### Test: Auto Distribute with No Selection
- **Steps**:
  1. Don't select any tokens
  2. Click "Auto Distribute"
- **Expected**: Error message "Please select at least one token first"
- **Status**: ☐ Pass ☐ Fail

#### Test: Auto Distribute Success
- **Steps**:
  1. Select 5 tokens (enter any percentage)
  2. Click "Auto Distribute"
- **Expected**: 
  - Each token gets 20%
  - Success message appears
  - Total = 100%
- **Status**: ☐ Pass ☐ Fail

### 4. localStorage Handling

#### Test: Normal Save and Load
- **Steps**:
  1. Create a portfolio
  2. Refresh the page
  3. Check if portfolio still exists
- **Expected**: Portfolio data persists across page refresh
- **Status**: ☐ Pass ☐ Fail

#### Test: Corrupted Data Recovery
- **Steps**:
  1. Create a portfolio
  2. Open DevTools Console
  3. Run: `localStorage.setItem('simulation_portfolios_state', 'invalid json')`
  4. Refresh page
- **Expected**: 
  - Console shows error about corrupted data
  - App resets to initial state
  - No crash
- **Status**: ☐ Pass ☐ Fail

#### Test: Missing Required Fields
- **Steps**:
  1. Create a portfolio
  2. Open DevTools Console
  3. Modify localStorage to remove required field
  4. Refresh page
- **Expected**: 
  - Console shows validation error
  - Invalid portfolio is skipped
  - App continues to work
- **Status**: ☐ Pass ☐ Fail

#### Test: Storage Quota Exceeded (Simulated)
- **Steps**:
  1. Fill localStorage to near capacity
  2. Try to create many portfolios
- **Expected**: Error message about storage quota
- **Status**: ☐ Pass ☐ Fail

### 5. Portfolio Configuration Flow

#### Test: Complete Success Flow
- **Steps**:
  1. Create portfolio with $1000
  2. Select 3 tokens
  3. Auto distribute
  4. Confirm & create
- **Expected**: 
  - All steps complete without errors
  - Redirects to dashboard
  - Portfolio appears with correct values
- **Status**: ☐ Pass ☐ Fail

#### Test: Portfolio Not Found
- **Steps**:
  1. Navigate to `/simulated/portfolio/nonexistent`
- **Expected**: Error message "Portfolio not found"
- **Status**: ☐ Pass ☐ Fail

#### Test: Loading State During Creation
- **Steps**:
  1. Configure portfolio
  2. Click "Confirm & Create Portfolio"
  3. Observe UI during creation
- **Expected**:
  - Button shows "Creating Portfolio..."
  - Button is disabled
  - All inputs are disabled
- **Status**: ☐ Pass ☐ Fail

### 6. Error Message Display

#### Test: Error Message Styling
- **Steps**:
  1. Trigger any validation error
  2. Observe error message appearance
- **Expected**:
  - Red background
  - Error icon
  - Clear, readable text
- **Status**: ☐ Pass ☐ Fail

#### Test: Success Message Display
- **Steps**:
  1. Perform successful action (e.g., auto distribute)
  2. Observe success message
- **Expected**:
  - Green/blue background
  - Success message appears
  - Auto-dismisses after 3 seconds
- **Status**: ☐ Pass ☐ Fail

#### Test: Multiple Errors
- **Steps**:
  1. Trigger multiple validation errors
  2. Observe error display
- **Expected**: Most recent/relevant error is shown
- **Status**: ☐ Pass ☐ Fail

### 7. Network Error Scenarios

#### Test: Slow Network
- **Steps**:
  1. Open DevTools Network tab
  2. Set throttling to "Slow 3G"
  3. Try to fetch prices
- **Expected**:
  - Loading indicator shows
  - Eventually succeeds or times out gracefully
- **Status**: ☐ Pass ☐ Fail

#### Test: Intermittent Network
- **Steps**:
  1. Toggle network on/off during price fetch
  2. Observe retry behavior
- **Expected**: Retries succeed when network is back
- **Status**: ☐ Pass ☐ Fail

#### Test: Complete Network Failure
- **Steps**:
  1. Disconnect network completely
  2. Try to fetch prices
- **Expected**: 
  - Shows retry attempts
  - Eventually shows error message
  - App doesn't crash
- **Status**: ☐ Pass ☐ Fail

### 8. Edge Cases

#### Test: Very Small Amount
- **Steps**:
  1. Create portfolio with $0.01
  2. Configure and create
- **Expected**: Works correctly with small amounts
- **Status**: ☐ Pass ☐ Fail

#### Test: Maximum Balance
- **Steps**:
  1. Create portfolio with full $10,000
  2. Configure and create
- **Expected**: Works correctly, balance becomes $0
- **Status**: ☐ Pass ☐ Fail

#### Test: Many Decimal Places
- **Steps**:
  1. Enter amount like $1234.56789
  2. Observe handling
- **Expected**: Handles decimals correctly
- **Status**: ☐ Pass ☐ Fail

#### Test: Special Characters in Name
- **Steps**:
  1. Enter name with special chars: "My Portfolio! @#$"
  2. Create portfolio
- **Expected**: Accepts or rejects gracefully
- **Status**: ☐ Pass ☐ Fail

#### Test: Browser Back Button
- **Steps**:
  1. Start creating portfolio
  2. Click browser back button
  3. Navigate forward again
- **Expected**: No errors, state is consistent
- **Status**: ☐ Pass ☐ Fail

#### Test: Page Refresh During Operation
- **Steps**:
  1. Click submit button
  2. Immediately refresh page
- **Expected**: Operation is cancelled, no corrupted state
- **Status**: ☐ Pass ☐ Fail

## Automated Testing Scenarios

### Unit Tests (Future Implementation)

```javascript
// Example test structure
describe('SimulationErrorHandler', () => {
  describe('validatePortfolioName', () => {
    it('should reject empty names', () => {
      expect(() => validatePortfolioName('')).toThrow();
    });
    
    it('should reject names < 2 characters', () => {
      expect(() => validatePortfolioName('A')).toThrow();
    });
    
    it('should reject names > 50 characters', () => {
      const longName = 'A'.repeat(51);
      expect(() => validatePortfolioName(longName)).toThrow();
    });
    
    it('should reject duplicate names', () => {
      const existing = ['Portfolio 1'];
      expect(() => validatePortfolioName('Portfolio 1', existing)).toThrow();
    });
    
    it('should accept valid names', () => {
      expect(validatePortfolioName('My Portfolio')).toBe('My Portfolio');
    });
  });
  
  describe('validateDepositAmount', () => {
    it('should reject negative amounts', () => {
      expect(() => validateDepositAmount(-100, 1000)).toThrow();
    });
    
    it('should reject zero', () => {
      expect(() => validateDepositAmount(0, 1000)).toThrow();
    });
    
    it('should reject amounts > balance', () => {
      expect(() => validateDepositAmount(2000, 1000)).toThrow();
    });
    
    it('should accept valid amounts', () => {
      expect(validateDepositAmount(500, 1000)).toBe(500);
    });
  });
  
  describe('validateAllocations', () => {
    it('should reject empty allocations', () => {
      expect(() => validateAllocations({})).toThrow();
    });
    
    it('should reject total != 100%', () => {
      expect(() => validateAllocations({ BTC: 50, ETH: 30 })).toThrow();
    });
    
    it('should reject negative percentages', () => {
      expect(() => validateAllocations({ BTC: -50, ETH: 150 })).toThrow();
    });
    
    it('should accept valid allocations', () => {
      expect(validateAllocations({ BTC: 50, ETH: 50 })).toBe(true);
    });
  });
});
```

## Performance Testing

### Test: Large Number of Portfolios
- **Steps**:
  1. Create 50+ portfolios
  2. Observe performance
- **Expected**: App remains responsive
- **Status**: ☐ Pass ☐ Fail

### Test: Large Number of Tokens
- **Steps**:
  1. Select all 33 tokens
  2. Configure allocations
  3. Create portfolio
- **Expected**: No performance degradation
- **Status**: ☐ Pass ☐ Fail

### Test: Rapid Actions
- **Steps**:
  1. Rapidly click buttons
  2. Rapidly type in inputs
  3. Rapidly switch between pages
- **Expected**: No crashes, proper debouncing
- **Status**: ☐ Pass ☐ Fail

## Browser Compatibility Testing

### Browsers to Test
- ☐ Chrome (latest)
- ☐ Firefox (latest)
- ☐ Safari (latest)
- ☐ Edge (latest)
- ☐ Mobile Chrome
- ☐ Mobile Safari

### Features to Verify
- ☐ localStorage works
- ☐ Error messages display correctly
- ☐ Loading states work
- ☐ Form validation works
- ☐ Responsive design

## Accessibility Testing

### Keyboard Navigation
- ☐ Can tab through all inputs
- ☐ Can submit form with Enter
- ☐ Can cancel with Escape
- ☐ Focus indicators visible

### Screen Reader
- ☐ Error messages are announced
- ☐ Loading states are announced
- ☐ Form labels are read correctly
- ☐ Button states are clear

## Security Testing

### Input Sanitization
- ☐ XSS attempts in portfolio name
- ☐ SQL injection attempts (N/A for client-side)
- ☐ Script tags in inputs
- ☐ HTML in inputs

### Data Validation
- ☐ Cannot manipulate balance via DevTools
- ☐ Cannot create invalid portfolios via console
- ☐ Cannot bypass validation

## Test Results Summary

| Category | Tests | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Portfolio Creation | 10 | - | - | - |
| Price Fetching | 5 | - | - | - |
| Token Allocation | 6 | - | - | - |
| localStorage | 4 | - | - | - |
| Configuration Flow | 3 | - | - | - |
| Error Display | 3 | - | - | - |
| Network Errors | 3 | - | - | - |
| Edge Cases | 6 | - | - | - |
| **Total** | **40** | **-** | **-** | **-** |

## Known Issues

_Document any known issues discovered during testing_

1. Issue: [Description]
   - Severity: High/Medium/Low
   - Steps to Reproduce: [Steps]
   - Workaround: [If any]

## Testing Notes

_Add any additional notes or observations during testing_

---

**Tester**: _______________
**Date**: _______________
**Environment**: _______________
**Browser**: _______________
