# Task 13 Visual Guide: Per-Token Metrics Display

## Overview

This guide shows the enhanced portfolio dashboard with per-token metrics, automation indicators, and visual triggers.

## Holdings List Layout

### Token Card Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ ▌ BTC  Bitcoin  [Auto]                              10.5%           │
│ ▌                                                    of portfolio    │
│ ▌ 0.050000 BTC                                      Target: 10.0%   │
│ ▌ Price: $40,000.00 • Value: $2,000.00                              │
│ ▌                                                                    │
│ ▌ ┌──────────────────┐  ┌──────────────────┐                       │
│ ▌ │ Token P/L        │  │ Price Change     │                       │
│ ▌ │ +5.25%           │  │ +5.00%           │                       │
│ ▌ │ +$100.00         │  │ from $38,095.24  │                       │
│ ▌ └──────────────────┘  └──────────────────┘                       │
│ ▌                                                                    │
│ ▌ ┌──────────────────┐  ┌──────────────────┐                       │
│ ▌ │ Last Action      │  │ Settings         │                       │
│ ▌ │ $39,000.00       │  │ Sell: +10%       │                       │
│ ▌ │ +2.56%           │  │ Buy: -5%         │                       │
│ ▌ └──────────────────┘  │ Stop: -15%       │                       │
│ ▌                       └──────────────────┘                       │
│ ▌                                                                    │
│ ▌ [⚡ Sell Trigger]                                                 │
└─────────────────────────────────────────────────────────────────────┘

Legend:
▌ = Blue left border (automation enabled)
[Auto] = Automation badge
[⚡ Sell Trigger] = Pulsing green badge (action ready)
```

## Visual Elements

### 1. Automation Badge
```
┌──────────┐
│ ⚡ Auto  │  ← Blue badge, appears when automation is enabled
└──────────┘
```

### 2. Token P/L Card
```
┌──────────────────┐
│ Token P/L        │  ← White background
│ +5.25%           │  ← Green text (profit) or red (loss)
│ +$100.00         │  ← Absolute dollar amount
└──────────────────┘
```

### 3. Price Change Card
```
┌──────────────────┐
│ Price Change     │  ← White background
│ +5.00%           │  ← Green text (increase) or red (decrease)
│ from $38,095.24  │  ← Original purchase price
└──────────────────┘
```

### 4. Last Action Card (Automation Only)
```
┌──────────────────┐
│ Last Action      │  ← Blue background
│ $39,000.00       │  ← Price at last automated action
│ +2.56%           │  ← Change from last action
└──────────────────┘
```

### 5. Settings Card (Automation Only)
```
┌──────────────────┐
│ Settings         │  ← Purple background
│ Sell: +10%       │  ← Sell threshold
│ Buy: -5%         │  ← Buy threshold
│ Stop: -15%       │  ← Stop-loss threshold
└──────────────────┘
```

## Trigger Indicators

### Sell Trigger (Price increased enough to sell)
```
┌──────────────────┐
│ 📈 Sell Trigger  │  ← Green background, pulsing animation
└──────────────────┘
```

### Buy Trigger (Price decreased enough to buy)
```
┌──────────────────┐
│ 📉 Buy Trigger   │  ← Blue background, pulsing animation
└──────────────────┘
```

### Stop Loss Trigger (Price dropped to stop-loss level)
```
┌──────────────────┐
│ ⚠️ Stop Loss     │  ← Red background, pulsing animation
└──────────────────┘
```

## Complete Example: Multiple Tokens

```
Portfolio Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Holdings
────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────┐
│ ▌ BTC  Bitcoin  [Auto]                            50.0%          │
│ ▌ 0.050000 BTC                                    Target: 50.0%  │
│ ▌ Price: $40,000.00 • Value: $2,000.00                          │
│ ▌                                                                 │
│ ▌ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│ ▌ │ Token P/L   │  │ Price Change│  │ Last Action │            │
│ ▌ │ +5.25%      │  │ +5.00%      │  │ $39,000.00  │            │
│ ▌ │ +$100.00    │  │ from $38k   │  │ +2.56%      │            │
│ ▌ └─────────────┘  └─────────────┘  └─────────────┘            │
│ ▌                                                                 │
│ ▌ ┌─────────────────────────────┐                               │
│ ▌ │ Settings                    │                               │
│ ▌ │ Sell: +10% • Buy: -5%       │                               │
│ ▌ │ Stop: -15%                  │                               │
│ ▌ └─────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ▌ ETH  Ethereum  [Auto]                           30.0%          │
│ ▌ 0.500000 ETH                                    Target: 30.0%  │
│ ▌ Price: $2,400.00 • Value: $1,200.00                           │
│ ▌                                                                 │
│ ▌ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│ ▌ │ Token P/L   │  │ Price Change│  │ Last Action │            │
│ ▌ │ +12.50%     │  │ +12.00%     │  │ $2,200.00   │            │
│ ▌ │ +$150.00    │  │ from $2.1k  │  │ +9.09%      │            │
│ ▌ └─────────────┘  └─────────────┘  └─────────────┘            │
│ ▌                                                                 │
│ ▌ ┌─────────────────────────────┐                               │
│ ▌ │ Settings                    │                               │
│ ▌ │ Sell: +10% • Buy: -5%       │                               │
│ ▌ │ Stop: -15%                  │                               │
│ ▌ └─────────────────────────────┘                               │
│ ▌                                                                 │
│ ▌ [⚡ Sell Trigger]  ← READY TO SELL!                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│   USDC  USD Coin                                  20.0%          │
│   1000.000000 USDC                                               │
│   Price: $1.00 • Value: $1,000.00                               │
│                                                                   │
│   ┌─────────────┐  ┌─────────────┐                              │
│   │ Token P/L   │  │ Price Change│                              │
│   │ +0.00%      │  │ +0.00%      │                              │
│   │ +$0.00      │  │ from $1.00  │                              │
│   └─────────────┘  └─────────────┘                              │
│                                                                   │
│   (No automation enabled)                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Color Coding

### Profit/Loss Colors
- **Green**: Positive P/L or price increase
- **Red**: Negative P/L or price decrease
- **Gray**: Neutral or no change

### Card Background Colors
- **White**: Standard metrics (P/L, Price Change)
- **Blue**: Automation-related (Last Action)
- **Purple**: Settings information
- **Green**: Sell trigger active
- **Blue**: Buy trigger active
- **Red**: Stop-loss trigger active

### Border Colors
- **Blue left border**: Automation enabled for this token
- **Transparent**: No automation

## Responsive Behavior

### Desktop (Large Screens)
- 2-column grid for metrics cards
- All information visible
- Spacious layout

### Tablet (Medium Screens)
- 2-column grid maintained
- Slightly condensed spacing
- All features visible

### Mobile (Small Screens)
- Single column layout
- Stacked metrics cards
- Scrollable list
- Touch-friendly spacing

## Dark Mode

All elements support dark mode with appropriate color adjustments:
- White backgrounds → Dark gray
- Black text → White text
- Color accents remain vibrant
- Borders and shadows adjusted for visibility

## Animation Effects

### Pulsing Triggers
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

Trigger badges pulse to draw attention when conditions are met.

### Hover Effects
- Cards slightly brighten on hover
- Smooth color transitions
- Scale effect on interactive elements

## Accessibility

- High contrast ratios for text
- Color is not the only indicator (icons + text)
- Keyboard navigation support
- Screen reader friendly labels
- Touch targets sized appropriately

## User Interaction Flow

1. **View Holdings**: Scan the list to see all tokens
2. **Check Automation**: Blue border indicates automated tokens
3. **Monitor Triggers**: Pulsing badges show ready actions
4. **Review Performance**: P/L cards show individual token performance
5. **Verify Settings**: Settings card confirms automation thresholds
6. **Track Actions**: Last action price shows automation history

This visual design provides comprehensive information while maintaining clarity and usability.
