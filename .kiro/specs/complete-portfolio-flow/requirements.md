# Requirements Document

## Introduction

This specification defines a complete portfolio management flow for both simulation and live modes on the Reactive Network DeFi platform. The system provides users with an end-to-end experience from portfolio creation, through settings configuration, to active portfolio management with automated trading, rebalancing, and risk management capabilities.

## Glossary

- **Portfolio_System**: The complete portfolio management interface and backend logic
- **Simulation_Mode**: Local calculation-based portfolio management without blockchain transactions
- **Live_Mode**: Blockchain-based portfolio management using Reactive Network smart contracts
- **Portfolio_Balance**: The total value of all tokens held within a specific portfolio
- **Available_Balance**: The user's remaining funds not allocated to any portfolio (starts at 10,000 in simulation)
- **Token_Allocation**: The percentage distribution of portfolio value across different tokens
- **Auto_Balancer**: The automated system that maintains target token allocations
- **Stop_Loss**: The percentage decrease threshold that triggers automatic sale to USDC
- **Take_Profit**: The percentage increase threshold that triggers automatic token sale
- **Buy_Threshold**: The percentage decrease threshold that triggers automatic token purchase
- **Portfolio_Settings**: User-defined parameters controlling automated trading behavior
- **Token_Categories**: Classification of tokens (Memecoins, Altcoins, Stablecoins, Individual coins)
- **Profit_Loss_Tracker**: The system that calculates cumulative profit and loss percentages

## Requirements

### Requirement 1

**User Story:** As a new user, I want to see the simulation mode by default when I enter the app, so that I can explore the platform without connecting a wallet.

#### Acceptance Criteria

1. WHEN a user first accesses the application, THE Portfolio_System SHALL display the simulation mode interface
2. WHEN the user views the navigation bar, THE Portfolio_System SHALL display a mode switcher button
3. WHEN the user clicks the mode switcher, THE Portfolio_System SHALL toggle between simulation and live modes
4. WHEN switching to live mode, THE Portfolio_System SHALL prompt for wallet connection if not already connected
5. WHEN the user is in simulation mode, THE Portfolio_System SHALL display an Available_Balance of 10,000 USD

### Requirement 2

**User Story:** As a user, I want to create a new portfolio with a name, description, and initial deposit, so that I can start managing my investments.

#### Acceptance Criteria

1. WHEN the user clicks create portfolio, THE Portfolio_System SHALL display a card-style creation form
2. WHEN the user submits the form, THE Portfolio_System SHALL validate that the deposit amount does not exceed Available_Balance
3. WHEN a portfolio is created, THE Portfolio_System SHALL deduct the deposit amount from Available_Balance
4. WHEN a portfolio is created, THE Portfolio_System SHALL set Portfolio_Balance equal to the deposit amount
5. WHEN portfolio creation succeeds, THE Portfolio_System SHALL redirect to the portfolio settings page at /portfolios/[portfolio-name]/settings

### Requirement 3

**User Story:** As a portfolio owner, I want to configure token allocation percentages for my portfolio, so that I can define my investment strategy.

#### Acceptance Criteria

1. WHEN the user accesses portfolio settings, THE Portfolio_System SHALL display all available tokens with input fields
2. WHEN the user enters allocation percentages, THE Portfolio_System SHALL accept only whole numbers without decimals
3. WHEN only one token remains unallocated, THE Portfolio_System SHALL auto-calculate its percentage as (100 - sum of other allocations)
4. WHEN the user sets allocations, THE Portfolio_System SHALL allow total allocation to exceed 100%
5. WHEN the user completes token allocation, THE Portfolio_System SHALL validate that at least one token has a non-zero allocation

### Requirement 4

**User Story:** As a portfolio owner, I want to configure automated trading parameters including sell, buy, and stop-loss thresholds, so that my portfolio can trade automatically based on market conditions.

#### Acceptance Criteria

1. WHEN the user configures settings, THE Portfolio_System SHALL provide input fields for Take_Profit percentage
2. WHEN the user configures settings, THE Portfolio_System SHALL provide input fields for Buy_Threshold percentage
3. WHEN the user configures settings, THE Portfolio_System SHALL provide input fields for Stop_Loss percentage
4. WHEN the user configures settings, THE Portfolio_System SHALL provide a toggle for Auto_Balancer (on/off)
5. WHEN the user clicks upload settings, THE Portfolio_System SHALL save all Portfolio_Settings to storage

### Requirement 5

**User Story:** As a portfolio owner, I want the Auto_Balancer to maintain my target allocations automatically, so that my portfolio stays aligned with my strategy as prices change.

#### Acceptance Criteria

1. WHEN Auto_Balancer is enabled and a token allocation exceeds its target percentage, THE Portfolio_System SHALL sell the excess amount
2. WHEN Auto_Balancer is enabled and a token allocation falls below its target percentage, THE Portfolio_System SHALL buy additional tokens
3. WHEN calculating rebalancing needs, THE Portfolio_System SHALL use current Portfolio_Balance as the reference value
4. WHEN Auto_Balancer is disabled, THE Portfolio_System SHALL not execute any automatic rebalancing trades
5. WHEN rebalancing occurs, THE Portfolio_System SHALL update the Profit_Loss_Tracker with trade results

### Requirement 6

**User Story:** As a portfolio owner, I want to view my portfolio dashboard showing all holdings, current prices, and performance metrics, so that I can monitor my investments.

#### Acceptance Criteria

1. WHEN the user views the portfolio dashboard, THE Portfolio_System SHALL display the number of currencies held
2. WHEN the user views the portfolio dashboard, THE Portfolio_System SHALL display the current Portfolio_Balance
3. WHEN the user views the portfolio dashboard, THE Portfolio_System SHALL display cumulative Profit percentage
4. WHEN the user views the portfolio dashboard, THE Portfolio_System SHALL display cumulative Loss percentage
5. WHEN the user views the portfolio dashboard, THE Portfolio_System SHALL display a settings icon that links to /portfolios/[portfolio-name]/settings

### Requirement 7

**User Story:** As a portfolio owner, I want to see a sidebar showing all my token holdings with current prices and percentage changes, so that I can quickly assess individual token performance.

#### Acceptance Criteria

1. WHEN the user views the portfolio, THE Portfolio_System SHALL display a sidebar listing all tokens in the portfolio
2. WHEN displaying tokens, THE Portfolio_System SHALL show the current price for each token
3. WHEN displaying tokens, THE Portfolio_System SHALL show the percentage change since the last price fetch
4. WHEN prices are updated, THE Portfolio_System SHALL refresh the sidebar display within 2 seconds
5. WHEN a token has no price data, THE Portfolio_System SHALL display a loading or unavailable indicator

### Requirement 8

**User Story:** As a portfolio owner, I want to see the percentage breakdown of my portfolio by token categories, so that I can understand my exposure to different asset types.

#### Acceptance Criteria

1. WHEN the user views the portfolio dashboard, THE Portfolio_System SHALL display the percentage of Memecoins in the portfolio
2. WHEN the user views the portfolio dashboard, THE Portfolio_System SHALL display the percentage of Altcoins in the portfolio
3. WHEN the user views the portfolio dashboard, THE Portfolio_System SHALL display the percentage of Stablecoins in the portfolio
4. WHEN the user views the portfolio dashboard, THE Portfolio_System SHALL display the percentage of Individual coins in the portfolio
5. WHEN a category has no tokens, THE Portfolio_System SHALL display 0% for that category

### Requirement 9

**User Story:** As a portfolio owner, I want to deposit additional funds into my portfolio, so that I can increase my investment over time.

#### Acceptance Criteria

1. WHEN the user clicks the deposit button, THE Portfolio_System SHALL display a modal with an amount input field
2. WHEN the user enters a deposit amount, THE Portfolio_System SHALL validate that the amount does not exceed Available_Balance
3. WHEN the user confirms deposit, THE Portfolio_System SHALL deduct the amount from Available_Balance
4. WHEN the deposit is processed, THE Portfolio_System SHALL distribute the funds across tokens according to Portfolio_Settings allocations
5. WHEN the deposit completes, THE Portfolio_System SHALL update Portfolio_Balance to reflect the new total

### Requirement 10

**User Story:** As a portfolio owner, I want to withdraw funds from my portfolio, so that I can access my investments when needed.

#### Acceptance Criteria

1. WHEN the user clicks the withdraw button, THE Portfolio_System SHALL display a modal with an amount input field
2. WHEN the user enters a withdrawal amount, THE Portfolio_System SHALL validate that the amount does not exceed Portfolio_Balance
3. WHEN the user confirms withdrawal, THE Portfolio_System SHALL sell tokens proportionally to raise the requested amount
4. WHEN the withdrawal is processed, THE Portfolio_System SHALL add the amount to Available_Balance
5. WHEN the withdrawal completes, THE Portfolio_System SHALL update Portfolio_Balance to reflect the new total

### Requirement 11

**User Story:** As a portfolio owner, I want automated trading to execute based on my configured thresholds, so that my portfolio can respond to market movements without manual intervention.

#### Acceptance Criteria

1. WHEN a token price increases by the Take_Profit percentage, THE Portfolio_System SHALL automatically sell that token
2. WHEN a token price decreases by the Buy_Threshold percentage, THE Portfolio_System SHALL automatically buy more of that token
3. WHEN a token price decreases by the Stop_Loss percentage, THE Portfolio_System SHALL automatically sell that token for USDC
4. WHEN automated trades execute, THE Portfolio_System SHALL update the Profit_Loss_Tracker with cumulative results
5. WHEN price changes are detected, THE Portfolio_System SHALL compare against the last fetched price to determine threshold triggers

### Requirement 12

**User Story:** As a portfolio owner, I want my profit and loss percentages to accumulate over time, so that I can track my overall portfolio performance since creation.

#### Acceptance Criteria

1. WHEN a profitable trade executes, THE Portfolio_System SHALL add the profit percentage to the cumulative Profit total
2. WHEN a losing trade executes, THE Portfolio_System SHALL add the loss percentage to the cumulative Loss total
3. WHEN calculating profit/loss, THE Portfolio_System SHALL use the difference between buy and sell prices
4. WHEN displaying profit/loss, THE Portfolio_System SHALL show percentages with 2 decimal places precision
5. WHEN the portfolio is first created, THE Portfolio_System SHALL initialize both Profit and Loss to 0%

### Requirement 13

**User Story:** As a user, I want the same portfolio flow to work in both simulation and live modes, so that I can practice strategies before using real funds.

#### Acceptance Criteria

1. WHEN in Simulation_Mode, THE Portfolio_System SHALL use local calculations for all trades and balances
2. WHEN in Live_Mode, THE Portfolio_System SHALL use Reactive Network smart contracts for all trades and balances
3. WHEN switching modes, THE Portfolio_System SHALL maintain separate portfolio data for each mode
4. WHEN in Simulation_Mode, THE Portfolio_System SHALL not require wallet connection or gas fees
5. WHEN in Live_Mode, THE Portfolio_System SHALL require wallet connection and REACT tokens for gas fees

### Requirement 14

**User Story:** As a user, I want consistent visual styling across all portfolio pages, so that the interface is intuitive and professional.

#### Acceptance Criteria

1. WHEN displaying portfolio pages, THE Portfolio_System SHALL use card-style components for forms and data display
2. WHEN displaying multiple metrics side-by-side, THE Portfolio_System SHALL use CSS grid with equal column widths
3. WHEN displaying category percentages, THE Portfolio_System SHALL arrange them in a 2x2 grid layout
4. WHEN the user navigates between portfolios, THE Portfolio_System SHALL maintain consistent layout and styling
5. WHEN displaying the portfolio dashboard, THE Portfolio_System SHALL use Tailwind CSS classes for all styling
