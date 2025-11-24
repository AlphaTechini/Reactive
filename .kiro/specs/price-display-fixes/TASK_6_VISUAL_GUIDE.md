# Task 6 Visual Guide: Error Recovery UI

## Dashboard Header - Price Refresh Controls

### Normal State (Fresh Data)
```
┌─────────────────────────────────────────────────────────────────┐
│ Portfolio Dashboard                    Portfolio Balance         │
│ Address: 0x1234...5678                 1,234.56 REACT           │
│                                         [Deposit]                │
├─────────────────────────────────────────────────────────────────┤
│ [🔄 Refresh Prices]              Last updated: 2:45:30 PM       │
└─────────────────────────────────────────────────────────────────┘
```

### Loading State (Refreshing)
```
┌─────────────────────────────────────────────────────────────────┐
│ Portfolio Dashboard                    Portfolio Balance         │
│ Address: 0x1234...5678                 1,234.56 REACT           │
│                                         [Deposit]                │
├─────────────────────────────────────────────────────────────────┤
│ [⟳ Refreshing...]                Last updated: 2:45:30 PM       │
│  (button disabled, spinner animating)                            │
└─────────────────────────────────────────────────────────────────┘
```

### Stale Data State (Using Cache)
```
┌─────────────────────────────────────────────────────────────────┐
│ Portfolio Dashboard                    Portfolio Balance         │
│ Address: 0x1234...5678                 1,234.56 REACT           │
│                                         [Deposit]                │
├─────────────────────────────────────────────────────────────────┤
│ [🔄 Refresh Prices] [🕐 Cached (7m old)]  Last updated: 2:38 PM │
│                      ↑ Yellow badge                              │
└─────────────────────────────────────────────────────────────────┘
```

### Error State (Refresh Failed)
```
┌─────────────────────────────────────────────────────────────────┐
│ Portfolio Dashboard                    Portfolio Balance         │
│ Address: 0x1234...5678                 1,234.56 REACT           │
│                                         [Deposit]                │
├─────────────────────────────────────────────────────────────────┤
│ [🔄 Refresh Prices] [⚠️ Refresh failed]  Last updated: 2:38 PM  │
│                      ↑ Red badge (auto-dismisses in 5s)         │
└─────────────────────────────────────────────────────────────────┘
```

### Combined State (Stale + Error)
```
┌─────────────────────────────────────────────────────────────────┐
│ Portfolio Dashboard                    Portfolio Balance         │
│ Address: 0x1234...5678                 1,234.56 REACT           │
│                                         [Deposit]                │
├─────────────────────────────────────────────────────────────────┤
│ [🔄 Refresh] [🕐 Cached (7m)] [⚠️ Failed]  Last updated: 2:38 PM│
└─────────────────────────────────────────────────────────────────┘
```

## Button States

### Enabled (Ready to Refresh)
```
┌──────────────────────┐
│ 🔄 Refresh Prices    │  ← Clickable, hover effect
└──────────────────────┘
```

### Loading (Refreshing)
```
┌──────────────────────┐
│ ⟳ Refreshing...      │  ← Disabled, spinner animates
└──────────────────────┘
```

### Disabled (Already Refreshing)
```
┌──────────────────────┐
│ 🔄 Refresh Prices    │  ← Grayed out, not clickable
└──────────────────────┘
```

## Badge Components

### Staleness Badge (Yellow)
```
┌─────────────────────┐
│ 🕐 Cached (7m old)  │  ← Yellow background, white text
└─────────────────────┘
```

### Error Badge (Red)
```
┌──────────────────┐
│ ⚠️ Refresh failed │  ← Red background, white text
└──────────────────┘
```

## Console Output Examples

### Successful Refresh
```
🔄 Manual refresh triggered by user
🔄 Manual refresh started...
📡 Fetching from backend (cache expired or empty)...
✅ Loaded prices from backend
📊 Backend data: 8 tokens, age: 45s
⏰ Backend cache fresh for 14 more minutes
💾 Storing 8 prices from backend...
✅ Stored prices successfully (source: backend)
✅ Manual refresh completed, updated 8 prices
```

### Failed Refresh (Backend Down)
```
🔄 Manual refresh triggered by user
🔄 Manual refresh started...
❌ Failed to load from backend: fetch failed
❌ Backend fetch failed: fetch failed
❌ Manual refresh failed: Backend fetch failed: fetch failed
❌ Refresh error details: {
  message: "Backend fetch failed: fetch failed",
  timestamp: 1234567890,
  consecutiveFailures: 1,
  hasCache: true
}
```

### Using Cached Data
```
💾 Loaded 8 cached prices (age: 420s)
📋 Cache age: 420s
✅ Using cached data (fresh for 480s more)
```

## User Experience Flow

### Happy Path (Successful Refresh)
1. User clicks "Refresh Prices" button
2. Button shows "Refreshing..." with spinner
3. Staleness badge disappears (if present)
4. Prices update in real-time
5. Button returns to normal state
6. "Last updated" timestamp updates

### Error Path (Failed Refresh)
1. User clicks "Refresh Prices" button
2. Button shows "Refreshing..." with spinner
3. Fetch fails (backend down, timeout, etc.)
4. Error badge appears: "⚠️ Refresh failed"
5. Button returns to normal state
6. Staleness badge remains (if data is old)
7. Error badge auto-dismisses after 5 seconds
8. App continues working with cached data

### Recovery Path (Retry After Error)
1. User sees error badge
2. User clicks "Refresh Prices" again
3. If successful:
   - Error badge disappears
   - Staleness badge disappears
   - Fresh data loads
   - Failure counter resets
4. If failed again:
   - Error badge reappears
   - Failure counter increments
   - App continues with cached data

## Color Coding

- **Blue/Purple Gradient**: Dashboard header background
- **White**: Button background (normal state)
- **White/10% opacity**: Button background (hover)
- **Yellow/20% opacity**: Staleness badge background
- **Yellow/300**: Staleness badge icon color
- **Red/20% opacity**: Error badge background
- **Red/300**: Error badge icon color
- **Gray/50% opacity**: Disabled button state

## Accessibility Features

- Button has `title` attribute for tooltip
- Button has `disabled` attribute when not clickable
- Badges have descriptive text (not just icons)
- Color is not the only indicator (icons + text)
- Timestamps are human-readable
- Loading states are clearly indicated

## Mobile Responsive Behavior

On smaller screens:
- Badges stack vertically if needed
- Button text may abbreviate to "Refresh"
- Timestamp may show relative time ("7m ago")
- Error messages are truncated with ellipsis
