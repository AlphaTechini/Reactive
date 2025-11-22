# Task 4 - Portfolio Creation Page Visual Guide

## Page Layout

### Header Section
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Home                                             │
│                                                             │
│  Create New Portfolio                                       │
│  Set up your automated portfolio with custom risk          │
│  management and rebalancing                                 │
└─────────────────────────────────────────────────────────────┘
```

### Wallet Info Card (Blue Background)
```
┌─────────────────────────────────────────────────────────────┐
│  Connected Wallet              Available Balance            │
│  0x1234...5678                 1,234.5 REACT               │
└─────────────────────────────────────────────────────────────┘
```

### Form Card (White Background with Shadow)
```
┌─────────────────────────────────────────────────────────────┐
│  Portfolio Name *                                           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ e.g., My DeFi Portfolio                               │ │
│  └───────────────────────────────────────────────────────┘ │
│  [Error message appears here if validation fails]          │
│                                                             │
│  Description (Optional)                                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Describe your portfolio strategy...                   │ │
│  │                                                         │ │
│  │                                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│  0/200 characters                                          │
│                                                             │
│  Initial Deposit Amount (REACT) *                          │
│  ┌─────────────────────────────────────────────────┐ MAX │ │
│  │ 0.0                                             │     │ │
│  └─────────────────────────────────────────────────┘─────┘ │
│  Available: 1,234.5 REACT                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ℹ️ What happens next?                               │  │
│  │ • Your portfolio will be created with the specified │  │
│  │   deposit                                            │  │
│  │ • You'll be able to select tokens and set           │  │
│  │   allocation percentages                            │  │
│  │ • Configure risk management settings (stop-loss,    │  │
│  │   take-profit, auto-buy)                            │  │
│  │ • Enable auto-rebalancing to maintain your target   │  │
│  │   allocation                                         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────────────────────────┐   │
│  │   Cancel     │  │   Create Portfolio               │   │
│  └──────────────┘  └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Feature Preview Cards (Below Form)
```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  📊              │ │  🛡️              │ │  🔄              │
│  Token           │ │  Risk            │ │  Auto-           │
│  Allocation      │ │  Management      │ │  Rebalancing     │
│                  │ │                  │ │                  │
│  Select tokens   │ │  Configure       │ │  Maintain target │
│  and set         │ │  stop-loss and   │ │  allocation      │
│  percentage      │ │  take-profit     │ │  automatically   │
│  allocations     │ │  levels          │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

## Color Scheme

### Primary Colors
- **Blue Gradient:** `from-blue-600 to-purple-600` (Primary buttons, branding)
- **Blue Background:** `bg-blue-50 dark:bg-blue-900/20` (Info cards)
- **Purple Background:** `bg-purple-50 dark:bg-purple-900/20` (Info boxes)

### Status Colors
- **Success:** Green (`text-green-500`)
- **Error:** Red (`text-red-500`, `border-red-500`)
- **Warning:** Yellow (`text-yellow-500`)
- **Info:** Blue (`text-blue-600`)

### Neutral Colors
- **Background:** White / Gray-900 (dark mode)
- **Text:** Gray-900 / White (dark mode)
- **Borders:** Gray-300 / Gray-600 (dark mode)

## Interactive States

### Form Fields
- **Default:** Gray border, white background
- **Focus:** Blue ring, blue border
- **Error:** Red border, red text
- **Disabled:** Opacity 50%, cursor not-allowed

### Buttons
- **Primary (Create Portfolio)**
  - Default: Blue-purple gradient
  - Hover: Darker gradient + scale up
  - Loading: Spinner icon + "Creating Portfolio..."
  - Disabled: Opacity 50%, no hover effects

- **Secondary (Cancel)**
  - Default: Gray border, transparent background
  - Hover: Light gray background
  - Disabled: Opacity 50%

- **MAX Button**
  - Default: Blue text
  - Hover: Darker blue
  - Disabled: Gray text

## Responsive Behavior

### Desktop (≥1024px)
- Form centered with max-width of 768px
- Feature cards in 3-column grid
- Full navigation visible

### Tablet (768px - 1023px)
- Form takes 90% width
- Feature cards in 3-column grid
- Condensed navigation

### Mobile (<768px)
- Form takes full width with padding
- Feature cards stack vertically
- Hamburger menu for navigation
- Shorter labels and compact spacing

## Validation Messages

### Portfolio Name
- ❌ "Portfolio name is required"
- ❌ "Portfolio name must be at least 3 characters"
- ❌ "Portfolio name must be less than 50 characters"

### Description
- ❌ "Description must be less than 200 characters"

### Deposit Amount
- ❌ "Deposit amount is required"
- ❌ "Please enter a valid amount greater than 0"
- ❌ "Insufficient balance"

## User Flow Diagram

```
┌─────────────┐
│  Home Page  │
└──────┬──────┘
       │ Click "Create Portfolio"
       ↓
┌─────────────────────┐
│  Create Portfolio   │
│  Page               │
└──────┬──────────────┘
       │
       ├─→ Fill Name
       ├─→ Fill Description (optional)
       ├─→ Enter Deposit Amount
       │
       ↓
┌─────────────────────┐
│  Validation Check   │
└──────┬──────────────┘
       │
       ├─→ Invalid → Show Errors
       │
       ↓ Valid
┌─────────────────────┐
│  Submit to Backend  │
└──────┬──────────────┘
       │
       ├─→ Error → Show Notification
       │
       ↓ Success
┌─────────────────────┐
│  Portfolio Created  │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  Redirect to        │
│  /portfolio/{id}    │
└─────────────────────┘
```

## Accessibility Features

### Keyboard Navigation
- Tab through all form fields
- Enter to submit form
- Escape to cancel (when focused on cancel button)

### Screen Reader Support
- Proper label associations
- ARIA labels for icons
- Error announcements
- Loading state announcements

### Visual Indicators
- Focus rings on all interactive elements
- Clear error states with color + text
- Loading spinners for async operations
- Disabled states clearly indicated

## Animation & Transitions

### Hover Effects
- Buttons: Scale up slightly (transform: scale(1.05))
- Cards: Shadow increases
- Links: Color change

### Loading States
- Spinner rotation animation
- Button text changes
- Disabled state applied

### Page Transitions
- Smooth navigation with SvelteKit
- Fade in on mount
- Slide out on navigation

## Dark Mode Support

All colors have dark mode variants:
- Background: White → Gray-900
- Text: Gray-900 → White
- Borders: Gray-300 → Gray-600
- Cards: White → Gray-800
- Inputs: White → Gray-700

Toggle available in header for testing both modes.
