# Task 11: Manual Trading - Visual Guide

## UI Components Added

### 1. Manual Trading Quick Actions Card

**Location**: Top of portfolio page, above token selection panel

```
┌─────────────────────────────────────────────────────────────┐
│  ⚡ Manual Trading                    [Manual Control]       │
│  Override automation and execute trades manually             │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │   ➕ Quick Buy       │  │   ➖ Quick Sell      │        │
│  │  (Green Gradient)    │  │  (Red Gradient)      │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                              │
│  ℹ️ Manual trades override automation temporarily.          │
│     Your portfolio settings remain active after trade.      │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Purple-themed gradient background
- Lightning bolt icon
- Two prominent action buttons
- Informational message
- Responsive grid layout

### 2. Per-Token Buy/Sell Buttons

**Location**: Allocation Summary panel, on each selected token

```
Selected Tokens
┌─────────────────────────────────────────────┐
│  BTC    50.00%              [➕] [➖]       │  ← Hover to see buttons
├─────────────────────────────────────────────┤
│  ETH    30.00%              [➕] [➖]       │
├─────────────────────────────────────────────┤
│  USDC   20.00%              [➕] [➖]       │
└─────────────────────────────────────────────┘
```

**Features**:
- Buttons appear on hover (opacity transition)
- Green buy button with plus icon
- Red sell button with minus icon
- Accessible with aria-labels
- Smooth hover effects

### 3. Trade Modal Integration

**Triggered by**: Any buy/sell button

```
┌─────────────────────────────────────────────┐
│  Quick Swap                            ✕    │
├─────────────────────────────────────────────┤
│                                             │
│  From                    Balance: 100 USDC  │
│  ┌─────────────────────────────────────┐   │
│  │ USDC ▼                              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Amount                                     │
│  ┌─────────────────────────────────────┐   │
│  │ 0.0                            USDC │   │
│  └─────────────────────────────────────┘   │
│                                             │
│              ⇅ Swap Direction               │
│                                             │
│  To                      Balance: 0.5 BTC   │
│  ┌─────────────────────────────────────┐   │
│  │ BTC ▼                               │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Cancel    │  │      Swap           │  │
│  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Features**:
- Pre-filled tokens based on action
- Balance display
- Amount input with validation
- Swap direction toggle
- Cancel and confirm buttons

## User Flows

### Flow 1: Quick Buy

```
User clicks "Quick Buy"
        ↓
Trade modal opens
        ↓
User selects tokens (USDC → BTC)
        ↓
User enters amount
        ↓
User clicks "Swap"
        ↓
Transaction executes
        ↓
Success notification
        ↓
Portfolio refreshes
```

### Flow 2: Token-Specific Sell

```
User hovers over BTC in allocation list
        ↓
Buy/Sell buttons appear
        ↓
User clicks "Sell" button
        ↓
Trade modal opens with BTC pre-selected
        ↓
User enters amount
        ↓
User clicks "Swap"
        ↓
Transaction executes
        ↓
Success notification
        ↓
Portfolio refreshes
```

## Color Scheme

### Manual Trading Card
- Background: Purple-to-blue gradient
- Border: Purple
- Badge: Purple
- Icon: Purple

### Action Buttons
- Quick Buy: Green-to-emerald gradient
- Quick Sell: Red-to-pink gradient
- Per-token Buy: Solid green
- Per-token Sell: Solid red

### States
- Hover: Darker shade + scale transform
- Disabled: Reduced opacity
- Active: Shadow enhancement

## Responsive Behavior

### Desktop (lg+)
```
┌─────────────────────────────────────────────────────┐
│  Manual Trading Card (full width)                   │
├─────────────────────────────────────────────────────┤
│  Token Selection (2/3)  │  Allocation Summary (1/3) │
│                         │  - Selected Tokens        │
│                         │  - Buy/Sell buttons       │
└─────────────────────────────────────────────────────┘
```

### Mobile (sm)
```
┌─────────────────────────┐
│  Manual Trading Card    │
│  [Quick Buy]            │
│  [Quick Sell]           │
├─────────────────────────┤
│  Token Selection        │
├─────────────────────────┤
│  Allocation Summary     │
│  - Selected Tokens      │
│  - Buy/Sell buttons     │
└─────────────────────────┘
```

## Accessibility Features

1. **Keyboard Navigation**
   - All buttons are keyboard accessible
   - Tab order is logical
   - Enter/Space activates buttons

2. **Screen Readers**
   - Aria-labels on icon-only buttons
   - Descriptive button text
   - Semantic HTML structure

3. **Visual Feedback**
   - Hover states
   - Focus indicators
   - Loading states
   - Success/error messages

## Notifications

### On Action
- "Manual buy - this will override automation for this trade"
- "Manual sell - this will override automation for this trade"

### On Success
- "Manual trade completed successfully!"

### On Error
- "Manual trading is not available yet. Please wait..."
- Specific error messages from trade execution

## Integration Points

### Services
- `ManualTradingIntegrationService` - Handles override logic
- `TradeModal` - Provides UI
- `portfolioContractService` - Executes trades
- `notify` - Shows messages

### State
- `showTradeModal` - Modal visibility
- `tradeModalDefaultTokenIn` - Pre-fill input
- `tradeModalDefaultTokenOut` - Pre-fill output
- `isManualTradingInitialized` - Service ready

### Events
- `on:swapped` - Trade success
- `on:close` - Modal closed
- `on:click` - Button clicks

## Dark Mode Support

All components support dark mode with appropriate color adjustments:
- Background colors
- Text colors
- Border colors
- Gradient colors
- Icon colors

## Animation & Transitions

1. **Button Hover**: Scale transform (1.05x)
2. **Button Opacity**: Fade in on hover (0 → 1)
3. **Modal**: Fade in background + slide in content
4. **Notifications**: Slide in from top

## Future Enhancements

1. Add trade preview with estimated output
2. Show gas cost estimates
3. Add trade history view
4. Implement advanced order types
5. Add batch trading capability
6. Show real-time price updates
7. Add trade confirmation for large amounts
