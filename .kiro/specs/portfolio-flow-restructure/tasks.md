# Portfolio Flow Restructure - Implementation Tasks

## Overview
Restructure the frontend to have a proper portfolio creation and management flow with MetaMask integration, Uniswap SDK integration for token swaps, and dynamic portfolio pages.

## Task List

- [ ] 1. Fix price display issue on current dashboard
  - Fix price fetching to use EnhancedPriceDisplayService correctly
  - Ensure prices are fetched from server/cache and displayed properly
  - Fix $0.00 price display bug
  - Verify price updates work with manual refresh

- [x] 2. Create landing page (home page)






  - Show "Connect Wallet" button when MetaMask not connected
  - Show "Create Portfolio" button after successful MetaMask connection
  - Display user's wallet address and balance
  - List existing portfolios if user has any
  - Add navigation to existing portfolios

- [x] 3. Fix MetaMask connection





  - Debug and fix wallet connection issues
  - Ensure wallet store updates correctly
  - Handle connection errors gracefully
  - Add connection status indicator

- [x] 4. Create portfolio creation page (/create-portfolio)





  - Add form for portfolio name input
  - Add form for portfolio description input
  - Add deposit amount input field
  - Trigger MetaMask for deposit transaction
  - Store portfolio metadata (name, description, initial deposit)
  - Redirect to portfolio management page after creation

- [x] 5. Create dynamic portfolio management page (/portfolio/[id])





  - Create dynamic route based on portfolio ID/name
  - Display portfolio name and description
  - Show current portfolio balance
  - Add token selection interface (from INITIAL_TOKEN_LIST)
  - Add percentage allocation inputs for selected tokens
  - Ensure percentages sum to 100% with validation
  - Add auto-distribute button for equal percentages

- [x] 6. Integrate Uniswap SDK for token swaps






  - Install and configure Uniswap V3 SDK
  - Create swap service for buying tokens
  - Implement auto-split logic to divide deposit among selected tokens
  - Execute swaps for each token based on allocation percentages
  - Handle slippage and gas estimation
  - Show swap progress and confirmations

- [x] 7. Add portfolio settings on management page





  - Add stop-loss percentage input
  - Add take-profit percentage input
  - Add auto-buy percentage input
  - Add auto-rebalance toggle and threshold
  - Save settings per portfolio (different settings for different portfolios)
  - Integrate with existing RiskManagementService and RebalancingEngine

- [x] 8. Create portfolio list/dashboard page




  - Show all user portfolios
  - Display portfolio cards with key metrics (balance, performance, allocation)
  - Add navigation to individual portfolio pages
  - Add "Create New Portfolio" button

- [x] 9. Update navigation and routing





  - Update Sidebar component with new routes
  - Add portfolio navigation menu
  - Ensure proper route guards for wallet connection
  - Add breadcrumb navigation

- [x] 10. Integrate with smart contracts




  - Connect portfolio creation to EnhancedPortfolioManager contract
  - Store portfolio data on-chain
  - Retrieve portfolio data from blockchain
  - Handle contract interactions with proper error handling

- [x] 11. Add manual trading capability





  - Keep existing manual buy/sell functionality
  - Add manual trade buttons on portfolio page
  - Allow users to override automation for specific trades
  - Integrate with ManualTradingIntegrationService

- [ ] 12. Testing and optimization
  - Test complete portfolio creation flow
  - Test token swaps with various allocations
  - Test MetaMask interactions
  - Verify price display accuracy
  - Test responsive design on mobile
  - Optimize loading times

## Notes
- No unit tests required - focus on main logic only
- Use Uniswap V3 SDK documentation: https://docs.uniswap.org/sdk/v3/overview
- Ensure proper error handling for all MetaMask and blockchain interactions
- Keep existing services (RiskManagementService, RebalancingEngine, etc.) and integrate them
- Portfolio settings should be stored per portfolio, not globally
