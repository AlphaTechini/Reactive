# Portfolio Creation Feature - Testing Guide

## Overview
Task 4 has been completed: Create portfolio creation page (/create-portfolio)

## What Was Implemented

### 1. Portfolio Creation Page (`/create-portfolio`)
A new route has been created at `client/src/routes/create-portfolio/+page.svelte` with the following features:

- **Form Fields:**
  - Portfolio Name (required, 3-50 characters)
  - Portfolio Description (optional, max 200 characters)
  - Initial Deposit Amount (required, must be > 0 and <= wallet balance)

- **Validation:**
  - Real-time form validation with error messages
  - Balance checking to prevent over-deposit
  - Character limits with counters

- **User Experience:**
  - Wallet info display showing connected address and available balance
  - MAX button to quickly set deposit to full balance
  - Loading states during portfolio creation
  - Cancel button to return to home page
  - Feature preview cards showing what comes next

- **Backend Integration:**
  - Uses the existing `createPortfolio` function from `portfolios.js` store
  - Stores portfolio metadata to backend API at `/api/portfolios`
  - Automatically redirects to portfolio management page after creation

### 2. Backend API Support
The backend already has full support for portfolio management:

- `POST /api/portfolios` - Create new portfolio
- `GET /api/portfolios/:walletAddress` - Get all portfolios for a wallet
- `GET /api/portfolios/:walletAddress/:portfolioId` - Get specific portfolio
- `PUT /api/portfolios/:walletAddress/:portfolioId` - Update portfolio

All portfolio data is stored in IPFS for decentralized storage.

## How to Test

### Prerequisites
1. Make sure you have MetaMask installed
2. Make sure you're connected to the Reactive Network
3. Have some REACT tokens in your wallet for testing

### Step 1: Start the Backend Server
```bash
cd price-ingest
pnpm start
```

The backend server will start on `http://localhost:3001`

### Step 2: Start the Frontend
```bash
cd client
pnpm dev
```

The frontend will start on `http://localhost:5173`

### Step 3: Test the Portfolio Creation Flow

1. **Navigate to Home Page**
   - Open `http://localhost:5173` in your browser
   - You should see the landing page

2. **Connect Wallet**
   - Click "Connect Wallet" button in the header
   - Approve the MetaMask connection
   - Your wallet address and balance should appear

3. **Navigate to Create Portfolio**
   - Click the "Create Portfolio" button on the home page
   - You should be redirected to `/create-portfolio`

4. **Fill Out the Form**
   - Enter a portfolio name (e.g., "My DeFi Portfolio")
   - Optionally add a description
   - Enter a deposit amount (or click MAX to use full balance)
   - Verify that validation works:
     - Try submitting with empty name
     - Try entering more than your balance
     - Try entering negative amounts

5. **Create Portfolio**
   - Click "Create Portfolio" button
   - Wait for the transaction to complete
   - You should be redirected to `/portfolio/{portfolioId}`

6. **Verify Portfolio Creation**
   - Go back to home page
   - Your new portfolio should appear in the "Your Portfolios" section
   - Click on the portfolio card to view details

## Expected Behavior

### Success Case
- Form validates correctly
- Portfolio is created and stored to backend
- User is redirected to portfolio management page
- Portfolio appears in the user's portfolio list
- Success notification is shown

### Error Cases
- **Wallet Not Connected:** Redirects to home page with error message
- **Invalid Form Data:** Shows validation errors inline
- **Insufficient Balance:** Shows error message
- **Backend Error:** Shows error notification with details

## API Endpoints Used

### Create Portfolio
```
POST http://localhost:3001/api/portfolios
Body: {
  "walletAddress": "0x...",
  "portfolio": {
    "name": "My Portfolio",
    "description": "Description",
    "initialDeposit": "10",
    "balance": "10",
    "performance": 0,
    "assetCount": 0,
    "allocations": [],
    "settings": {
      "stopLoss": null,
      "takeProfit": null,
      "autoBuy": null,
      "autoRebalance": false,
      "rebalanceThreshold": 5
    }
  }
}
```

### Get Portfolios
```
GET http://localhost:3001/api/portfolios/:walletAddress
```

## Next Steps

After portfolio creation is complete, the next tasks in the workflow are:

1. **Task 5:** Create dynamic portfolio management page (`/portfolio/[id]`)
   - Display portfolio details
   - Token selection interface
   - Allocation percentage inputs
   - Auto-distribute functionality

2. **Task 6:** Integrate Uniswap SDK for token swaps
   - Install Uniswap V3 SDK
   - Implement swap service
   - Execute swaps based on allocations

3. **Task 7:** Add portfolio settings
   - Stop-loss configuration
   - Take-profit configuration
   - Auto-buy settings
   - Auto-rebalance toggle

## Notes

- The portfolio creation page uses Svelte 5 syntax
- All form validation is done client-side before submission
- Portfolio data is stored both locally (cache) and in IPFS
- The initial deposit amount is stored as metadata but actual token deposits will be handled in later tasks
- No actual blockchain transactions are made during portfolio creation (metadata only)

## Troubleshooting

### Backend Not Running
If you see connection errors, make sure the backend server is running:
```bash
cd price-ingest
pnpm start
```

### Wallet Connection Issues
- Make sure MetaMask is installed
- Make sure you're on the Reactive Network
- Try refreshing the page and reconnecting

### Form Validation Not Working
- Check browser console for errors
- Make sure you're using a modern browser that supports Svelte 5

### Portfolio Not Appearing
- Check the browser console for API errors
- Verify the backend server is running
- Check that the wallet address matches
