# Task 6 Visual Guide: Per-Token Settings UI

## 🎨 UI Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Portfolio Settings - [Portfolio Name]                          │
│                                           ← Back to Portfolio    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Trading Settings (Global Defaults)                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Sell % (Price Increase)        [====|====] 10%           │  │
│  │ Buy % (Price Decrease)         [==|======] 5%            │  │
│  │ Stop Loss % (Price Decrease)   [====|====] 15%           │  │
│  │ Auto Balance                                    [ON/OFF] │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Token Allocation & Per-Token Settings      Total: 100.00% ✓   │
│                                                                  │
│  [Auto Distribute] [Select All] [Clear All]                    │
│                                                                  │
│  Core Assets                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │   │
│  │ ┃ BTC                          Allocation: [50] %     ┃ │   │
│  │ ┃ Bitcoin                                             ┃ │   │
│  │ ┃─────────────────────────────────────────────────────┃ │   │
│  │ ┃ Token-Specific Settings              [●─────] ON   ┃ │   │
│  │ ┃                                                     ┃ │   │
│  │ ┃ Sell % ↑      Buy % ↓       Stop Loss % ↓         ┃ │   │
│  │ ┃ [15] %        [10] %         [20] %                ┃ │   │
│  │ ┃                                                     ┃ │   │
│  │ ┃ ✓ Automation active for this token                 ┃ │   │
│  │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │   │
│  │ ┃ ETH                          Allocation: [30] %     ┃ │   │
│  │ ┃ Ethereum                                            ┃ │   │
│  │ ┃─────────────────────────────────────────────────────┃ │   │
│  │ ┃ Token-Specific Settings              [●─────] ON   ┃ │   │
│  │ ┃                                                     ┃ │   │
│  │ ┃ Sell % ↑      Buy % ↓       Stop Loss % ↓         ┃ │   │
│  │ ┃ [10] %        [5] %          [15] %                ┃ │   │
│  │ ┃                                                     ┃ │   │
│  │ ┃ ✓ Automation active for this token                 ┃ │   │
│  │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Stablecoins                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │   │
│  │ ┃ USDC                         Allocation: [20] %     ┃ │   │
│  │ ┃ USD Coin                                            ┃ │   │
│  │ ┃─────────────────────────────────────────────────────┃ │   │
│  │ ┃ Token-Specific Settings              [─────●] OFF  ┃ │   │
│  │ ┃                                                     ┃ │   │
│  │ ┃ Sell % ↑      Buy % ↓       Stop Loss % ↓         ┃ │   │
│  │ ┃ [5] %         [5] %          [5] %                 ┃ │   │
│  │ ┃                                                     ┃ │   │
│  │ ┃ ⚠ Automation disabled for this token               ┃ │   │
│  │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Memecoins                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ FLOKI                            Allocation: [  ] %     │   │
│  │ Floki Inu                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│  (No per-token settings shown - no allocation)                 │
│                                                                  │
│  [Upload Settings]                                              │
│                                                                  │
│  ℹ Per-Token Portfolio Settings                                │
│  Configure individual trading parameters for each token...      │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Key Visual Elements

### 1. Token Card States

#### **No Allocation (Default State)**
```
┌─────────────────────────────────────────────┐
│ FLOKI                  Allocation: [  ] %   │
│ Floki Inu                                   │
└─────────────────────────────────────────────┘
```
- Gray background
- No border highlight
- No per-token settings shown
- Compact view

#### **With Allocation (Active State)**
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ BTC                    Allocation: [50] %   ┃
┃ Bitcoin                                     ┃
┃─────────────────────────────────────────────┃
┃ Token-Specific Settings      [●─────] ON   ┃
┃                                             ┃
┃ Sell % ↑    Buy % ↓     Stop Loss % ↓     ┃
┃ [15] %      [10] %       [20] %            ┃
┃                                             ┃
┃ ✓ Automation active for this token         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
- Blue border (highlighted)
- Expanded view with settings
- Toggle switch visible
- Status indicator at bottom

### 2. Toggle Switch States

#### **Enabled (Green)**
```
[●─────] ON
```
- Green background
- Slider on right
- "ON" label
- Automation active

#### **Disabled (Gray)**
```
[─────●] OFF
```
- Gray background
- Slider on left
- "OFF" label
- Automation inactive

### 3. Input Field Color Coding

#### **Sell % (Green accent)**
```
Sell % ↑
[15] %
```
- Green focus ring
- Up arrow indicator
- Positive action (profit taking)

#### **Buy % (Blue accent)**
```
Buy % ↓
[10] %
```
- Blue focus ring
- Down arrow indicator
- Buying opportunity

#### **Stop Loss % (Red accent)**
```
Stop Loss % ↓
[20] %
```
- Red focus ring
- Down arrow indicator
- Risk management

## 📱 Responsive Behavior

### Desktop View (≥768px)
```
┌─────────────────────────────────────────────────────┐
│ Sell % ↑        Buy % ↓         Stop Loss % ↓      │
│ [15] %          [10] %           [20] %             │
└─────────────────────────────────────────────────────┘
```
- 3-column grid layout
- Side-by-side inputs
- Full labels visible

### Mobile View (<768px)
```
┌─────────────────────┐
│ Sell % ↑            │
│ [15] %              │
├─────────────────────┤
│ Buy % ↓             │
│ [10] %              │
├─────────────────────┤
│ Stop Loss % ↓       │
│ [20] %              │
└─────────────────────┘
```
- Single column stack
- Full width inputs
- Vertical layout

## 🎨 Color Scheme

### Light Mode
- **Background:** White (#FFFFFF)
- **Card Background:** Light Gray (#F9FAFB)
- **Active Border:** Blue (#3B82F6)
- **Text:** Dark Gray (#111827)
- **Toggle ON:** Green (#16A34A)
- **Toggle OFF:** Gray (#D1D5DB)

### Dark Mode
- **Background:** Dark Gray (#1F2937)
- **Card Background:** Darker Gray (#374151)
- **Active Border:** Light Blue (#60A5FA)
- **Text:** White (#FFFFFF)
- **Toggle ON:** Green (#22C55E)
- **Toggle OFF:** Gray (#4B5563)

## 🔄 User Interaction Flow

### Setting Up a Token

1. **Enter Allocation**
   ```
   User types: 50
   → Card expands
   → Blue border appears
   → Settings panel shows
   → Toggle defaults to ON
   ```

2. **Customize Settings**
   ```
   User adjusts Sell %: 15
   User adjusts Buy %: 10
   User adjusts Stop Loss %: 20
   → Values update in real-time
   → No save needed yet
   ```

3. **Toggle Automation**
   ```
   User clicks toggle
   → Switch animates
   → Color changes (green ↔ gray)
   → Status text updates
   ```

4. **Save Settings**
   ```
   User clicks "Upload Settings"
   → Validation runs
   → Settings persist to store
   → Success message shows
   → Redirect to portfolio
   ```

## 📊 Status Indicators

### Automation Active
```
✓ Automation active for this token
```
- Green checkmark
- Positive message
- Shown when enabled = true

### Automation Disabled
```
⚠ Automation disabled for this token
```
- Warning icon
- Neutral message
- Shown when enabled = false

### Validation Messages

#### **Success**
```
┌─────────────────────────────────────────┐
│ ✓ Settings saved successfully!          │
└─────────────────────────────────────────┘
```
- Green background
- Checkmark icon
- Auto-dismiss after 1.5s

#### **Error**
```
┌─────────────────────────────────────────┐
│ ✗ Total allocation must equal 100%      │
└─────────────────────────────────────────┘
```
- Red background
- X icon
- Stays until fixed

## 🎯 Quick Actions Bar

```
[Auto Distribute] [Select All] [Clear All]
```

### Auto Distribute
- Divides 100% equally among selected tokens
- Updates both allocations and target percentages
- Shows success message with percentage

### Select All
- Adds all tokens with 0% allocation
- Doesn't set percentages automatically
- Prompts user to use Auto Distribute

### Clear All
- Removes all allocations
- Collapses all per-token settings
- Shows confirmation message

## 💡 Best Practices

### For Users

1. **Start with Allocation**
   - Set percentages first
   - Settings panel appears automatically

2. **Customize Per Token**
   - Adjust sell/buy/stop-loss for each token
   - Different strategies for different assets

3. **Use Toggle Wisely**
   - Disable automation for stablecoins
   - Enable for volatile assets

4. **Validate Before Saving**
   - Ensure total = 100%
   - Check all settings are reasonable

### For Developers

1. **State Management**
   - Keep allocations and tokenSettings in sync
   - Update targetPercentage when allocation changes

2. **Validation**
   - Check percentage ranges (0-100)
   - Validate total allocation = 100%

3. **Persistence**
   - Save to both store and localStorage
   - Handle migration from old structure

4. **Reactivity**
   - Use spread operator to trigger updates
   - Ensure UI reflects state changes

## 🚀 Future Enhancements

Potential improvements for future iterations:

1. **Preset Templates**
   - Conservative, Moderate, Aggressive presets
   - One-click apply to all tokens

2. **Bulk Edit**
   - Apply same settings to multiple tokens
   - Category-based bulk updates

3. **Visual Charts**
   - Show allocation pie chart
   - Display historical performance

4. **Advanced Settings**
   - Trailing stop-loss
   - Take-profit targets
   - Time-based rules

5. **Copy/Paste Settings**
   - Copy settings from one token
   - Paste to another token
   - Export/import settings JSON
