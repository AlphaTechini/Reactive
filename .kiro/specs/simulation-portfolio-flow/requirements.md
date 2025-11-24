# Simulation Portfolio Flow - Requirements

## Overview
Create a complete portfolio creation and management flow for simulation mode that mirrors the live mode experience but uses pure calculations instead of blockchain transactions.

## User Flow

### Step 1: Create Portfolio (`/simulated/create-portfolio`)
User provides:
- Portfolio name
- Description (optional)
- Initial deposit amount (USD)

Then redirects to `/simulated/portfolio/[name]`

### Step 2: Configure Portfolio (`/simulated/portfolio/[name]`)
User sees:
- All available tokens (33 tokens from INITIAL_TOKEN_LIST)
- Current prices for each token
- Ability to:
  - Manually set percentage for each token
  - Use "Auto Distribute" to split equally among selected tokens
  - See real-time calculation of how much of each token they'll get

### Step 3: Confirm & Execute
- Fetch current prices
- Calculate token amounts based on percentages
- Execute "purchases" (update simulation portfolio)
- Show portfolio dashboard with holdings

## Token List
Should display all 33 tokens from `INITIAL_TOKEN_LIST`:
- 2 Core (BTC, ETH)
- 1 Stable (USDC)
- 20 Altcoins
- 10 Memecoins

## Calculations
- Token amount = (Portfolio Value × Percentage) / Token Price
- Must fetch real prices at time of creation
- Store initial prices for P/L tracking

## Styling
- Must use Tailwind CSS (consistent with main app)
- No custom white boxes
- Match existing app design patterns
