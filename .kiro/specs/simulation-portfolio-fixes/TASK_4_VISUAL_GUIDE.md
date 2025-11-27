# Task 4 Visual Verification Guide

## How to Verify Token Quantity Display

### Step 1: Navigate to a Portfolio Dashboard

1. Start the application in simulation mode
2. Create a portfolio if you don't have one already
3. Configure the portfolio with token allocations
4. Navigate to the portfolio dashboard at `/simulated/portfolio/[name]`

### Step 2: Verify Holdings Display

Look for the "Holdings" section on the dashboard. Each token should display:

```
┌─────────────────────────────────────────────────────────────┐
│ Holdings                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BTC                                                         │
│  Bitcoin                                                     │
│                                                              │
│  0.050000 BTC          ← Token quantity with 6 decimals    │
│  Price: $40,000.00  •  Value: $2,000.00                    │
│                                                              │
│                        P/L: +5.25%                          │
│                        +$100.00                             │
│                                                              │
│                        50.0% of portfolio                   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FLOKI                                                       │
│  Floki Inu                                                   │
│                                                              │
│  1000000.000000 FLOKI  ← Large quantity with 6 decimals    │
│  Price: $0.00012  •  Value: $120.00                        │
│                                                              │
│                        P/L: -2.15%                          │
│                        -$2.64                               │
│                                                              │
│                        3.0% of portfolio                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Check Format Requirements

For each token holding, verify:

✅ **Token Quantity Format**
- Format: `{quantity} {symbol}`
- Example: "0.050000 BTC" or "1000000.000000 FLOKI"
- Decimal places: Exactly 6 decimal places
- Font: Monospace font for better number readability
- Style: Bold and prominent

✅ **Current Price Display**
- Label: "Price:"
- Format: Dollar amount with appropriate decimals
- Example: "$40,000.00" or "$0.00012"

✅ **Total Value Display**
- Label: "Value:"
- Format: Dollar amount with 2 decimal places
- Calculation: quantity × current price
- Example: "$2,000.00"

✅ **Additional Information**
- Profit/Loss percentage and absolute value
- Percentage of portfolio
- Token name below symbol

### Step 4: Test Dynamic Updates

1. **Price Updates**:
   - Wait for automatic price refresh (or click "Refresh Prices")
   - Verify token quantities remain constant
   - Verify total values recalculate correctly

2. **Buy Operation**:
   - Buy more of a token
   - Verify quantity increases
   - Verify format remains correct with 6 decimals

3. **Sell Operation**:
   - Sell some tokens
   - Verify quantity decreases
   - Verify format remains correct with 6 decimals

### Step 5: Visual Styling Checks

✅ **Typography**
- Token quantity: Monospace font, bold, larger size
- Price and value: Smaller font, gray color
- Clear visual hierarchy

✅ **Layout**
- Token info on the left
- P/L in the middle
- Portfolio percentage on the right
- Proper spacing between elements

✅ **Dark Mode**
- All text is readable in dark mode
- Proper contrast for all elements
- Colors adjust appropriately

### Common Test Cases

#### Test Case 1: Small Quantity (BTC)
```
Input:
- Portfolio value: $4000
- BTC allocation: 50%
- BTC price: $40,000

Expected Display:
0.050000 BTC
Price: $40,000.00  •  Value: $2,000.00
```

#### Test Case 2: Large Quantity (FLOKI)
```
Input:
- Portfolio value: $4000
- FLOKI allocation: 10%
- FLOKI price: $0.0004

Expected Display:
1000000.000000 FLOKI
Price: $0.0004  •  Value: $400.00
```

#### Test Case 3: Fractional Quantity (ETH)
```
Input:
- Portfolio value: $4000
- ETH allocation: 25%
- ETH price: $2,500

Expected Display:
0.400000 ETH
Price: $2,500.00  •  Value: $1,000.00
```

### Troubleshooting

**Issue**: Token quantity not showing
- Check if portfolio has holdings configured
- Verify portfolio is in dashboard view mode
- Check browser console for errors

**Issue**: Wrong number of decimal places
- Should always be exactly 6 decimals
- Check `.toFixed(6)` is being used

**Issue**: Format doesn't match "{quantity} {symbol}"
- Verify symbol is displayed after quantity
- Check spacing between quantity and symbol

**Issue**: Price or value not displaying
- Verify price service is initialized
- Check if prices are being fetched
- Look for price data in holdings object

### Success Criteria

The implementation is successful when:

1. ✅ All token quantities display with exactly 6 decimal places
2. ✅ Format matches "{quantity} {symbol}" exactly
3. ✅ Current price per token is shown
4. ✅ Total value (quantity × price) is calculated and displayed correctly
5. ✅ Quantities remain constant when prices update
6. ✅ Display works in both light and dark modes
7. ✅ Layout is clean and easy to read

## Screenshots Locations

When testing, take screenshots of:
1. Holdings section with multiple tokens
2. Holdings after price update (showing quantities unchanged)
3. Holdings after buy operation (showing quantity increase)
4. Holdings after sell operation (showing quantity decrease)
5. Dark mode view of holdings

## Related Files

- **Display Component**: `client/src/routes/simulated/portfolio/[name]/+page.svelte`
- **Data Store**: `client/src/lib/stores/simulation.js`
- **Price Formatter**: `client/src/lib/utils/priceFormatter.js`

## Next Steps

After verifying this task:
1. Move to Task 5: Implement per-token settings data structure
2. Ensure token quantities persist correctly through all operations
3. Test with various token types (high value, low value, meme coins, etc.)
