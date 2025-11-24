# Error Handling Guide - Simulation Portfolio Flow

## Quick Reference

### Using the Error Handler

```javascript
import { 
  SimulationError, 
  ErrorCodes, 
  getUserFriendlyMessage,
  validatePortfolioName,
  validateDepositAmount,
  validateAllocations
} from '$lib/services/SimulationErrorHandler.js';

// Validate portfolio name
try {
  const validName = validatePortfolioName(name, existingNames);
} catch (error) {
  const message = getUserFriendlyMessage(error);
  // Display message to user
}

// Validate deposit amount
try {
  const validAmount = validateDepositAmount(amount, balance);
} catch (error) {
  const message = getUserFriendlyMessage(error);
  // Display message to user
}

// Validate allocations
try {
  validateAllocations(allocations);
} catch (error) {
  const message = getUserFriendlyMessage(error);
  // Display message to user
}
```

### Retry with Backoff

```javascript
import { retryWithBackoff } from '$lib/services/SimulationErrorHandler.js';

// Retry an async operation
const result = await retryWithBackoff(
  async (attempt) => {
    console.log(`Attempt ${attempt}...`);
    return await fetchData();
  },
  3,    // maxRetries
  1000  // baseDelay in ms
);
```

### Error Codes

```javascript
import { ErrorCodes } from '$lib/services/SimulationErrorHandler.js';

// Throw specific errors
throw new SimulationError(
  'Portfolio not found',
  ErrorCodes.PORTFOLIO_NOT_FOUND,
  { name: portfolioName }
);
```

## Common Patterns

### Form Validation

```svelte
<script>
  let error = '';
  let isSubmitting = false;
  
  async function handleSubmit(event) {
    event.preventDefault();
    
    if (isSubmitting) return;
    
    error = '';
    isSubmitting = true;
    
    try {
      // Validate inputs
      const validName = validatePortfolioName(name, existingNames);
      const validAmount = validateDepositAmount(amount, balance);
      
      // Perform operation
      await createPortfolio(validName, validAmount);
      
      // Success - redirect or show message
    } catch (err) {
      error = getUserFriendlyMessage(err);
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if error}
  <div class="error-message">
    {error}
  </div>
{/if}

<button disabled={isSubmitting}>
  {isSubmitting ? 'Processing...' : 'Submit'}
</button>
```

### Price Fetching with Retry

```javascript
async function fetchPrices() {
  try {
    loadingPrices = true;
    error = '';
    
    const prices = await simulationTradingService.fetchCurrentPrices(
      tokenSymbols,
      3 // maxRetries
    );
    
    // Success
    return prices;
  } catch (err) {
    error = getUserFriendlyMessage(err);
    throw err;
  } finally {
    loadingPrices = false;
  }
}
```

### localStorage with Error Handling

```javascript
function saveToStorage(key, data) {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      throw new SimulationError(
        'Storage quota exceeded',
        ErrorCodes.STORAGE_QUOTA_EXCEEDED
      );
    }
    throw error;
  }
}

function loadFromStorage(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Validate structure
    if (!isValidStructure(parsed)) {
      throw new Error('Invalid data structure');
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to load from storage:', error);
    
    // Clear corrupted data
    localStorage.removeItem(key);
    
    throw new SimulationError(
      'Storage data corrupted',
      ErrorCodes.STORAGE_CORRUPTED
    );
  }
}
```

## Error Message Examples

### Validation Errors
- ❌ "Please enter a valid portfolio name (2-50 characters)."
- ❌ "A portfolio with this name already exists. Please choose a different name."
- ❌ "Please enter a valid amount greater than zero."
- ❌ "Insufficient balance. You have $1,234.56 available."
- ❌ "Total allocation must equal 100% (current: 95.50%)"

### Price Errors
- ❌ "Unable to fetch current prices. Please check your internet connection and try again."
- ❌ "Prices not available for: BTC, ETH. Please try refreshing."
- ❌ "Price data may be outdated. Please refresh prices before continuing."

### Storage Errors
- ❌ "Your saved data appears to be corrupted. It has been reset to default values."
- ❌ "Storage limit exceeded. Please delete some old portfolios to free up space."
- ❌ "Unable to access browser storage. Please check your browser settings."

### System Errors
- ❌ "Portfolio not found. It may have been deleted."
- ❌ "Failed to initialize the application. Please refresh the page."

## Best Practices

### 1. Always Use Try-Catch for Async Operations
```javascript
async function asyncOperation() {
  try {
    const result = await someAsyncFunction();
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    throw error; // Re-throw or handle
  }
}
```

### 2. Provide User-Friendly Messages
```javascript
// ❌ Bad
error = error.message; // "TypeError: Cannot read property 'price' of undefined"

// ✅ Good
error = getUserFriendlyMessage(error); // "Unable to fetch current prices..."
```

### 3. Log Errors for Debugging
```javascript
try {
  // Operation
} catch (error) {
  console.error('❌ Operation failed:', error);
  console.error('Details:', formatErrorForLogging(error));
  // Show user-friendly message
  error = getUserFriendlyMessage(error);
}
```

### 4. Prevent Double Submissions
```javascript
let isSubmitting = false;

async function handleSubmit() {
  if (isSubmitting) return; // Prevent double submission
  
  isSubmitting = true;
  try {
    await performOperation();
  } finally {
    isSubmitting = false; // Always reset
  }
}
```

### 5. Show Loading States
```svelte
<button disabled={isLoading}>
  {#if isLoading}
    <LoadingSpinner />
    Loading...
  {:else}
    Submit
  {/if}
</button>
```

### 6. Validate Early
```javascript
// Validate before expensive operations
try {
  validateInputs();
  await expensiveOperation();
} catch (error) {
  // Handle validation or operation error
}
```

### 7. Graceful Degradation
```javascript
try {
  const prices = await fetchPrices();
  return prices;
} catch (error) {
  console.error('Failed to fetch prices:', error);
  // Use cached prices or show warning
  return cachedPrices || {};
}
```

## Testing Error Scenarios

### Manual Testing Checklist
- [ ] Empty form submission
- [ ] Invalid input values
- [ ] Duplicate names
- [ ] Insufficient balance
- [ ] Network disconnected
- [ ] Slow network (throttle)
- [ ] localStorage full
- [ ] localStorage disabled
- [ ] Corrupted localStorage data
- [ ] Rapid form submissions
- [ ] Browser back during operation
- [ ] Page refresh during operation

### Simulating Errors

```javascript
// Simulate network error
async function fetchPrices() {
  if (Math.random() < 0.3) { // 30% failure rate
    throw new Error('Network error');
  }
  return await realFetchPrices();
}

// Simulate localStorage quota
function saveToStorage(key, data) {
  if (localStorage.length > 100) {
    throw new DOMException('QuotaExceededError');
  }
  localStorage.setItem(key, JSON.stringify(data));
}

// Simulate slow network
async function fetchWithDelay() {
  await new Promise(resolve => setTimeout(resolve, 5000));
  return await fetch();
}
```

## Troubleshooting

### Error: "Storage quota exceeded"
**Solution**: Delete old portfolios or clear browser data

### Error: "Unable to fetch prices"
**Solution**: Check internet connection, refresh page, try again later

### Error: "Portfolio not found"
**Solution**: Portfolio may have been deleted, create a new one

### Error: "Storage data corrupted"
**Solution**: Data has been reset, create portfolios again

### Error: "Total allocation must equal 100%"
**Solution**: Adjust percentages or use Auto Distribute

## Resources

- [MDN: Error Handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- [MDN: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
