# Requirements Document - Simulation Portfolio Fixes

## Introduction

This specification addresses critical bugs in the simulation portfolio management system that affect portfolio counting, profit/loss calculations, token quantity tracking, and per-token settings application.

## Glossary

- **Portfolio**: A collection of token holdings with associated settings and tracking
- **Sidebar**: The navigation panel showing portfolio list
- **Dashboard**: The main view displaying portfolio overview and metrics
- **Initial Deposit**: The original amount deposited when creating a portfolio
- **Current Value**: The real-time value of all holdings based on current prices
- **Profit/Loss (P/L)**: The difference between current value and initial deposit
- **Token Quantity**: The number of tokens owned, calculated as (allocated USD amount) / (token price)
- **Portfolio Settings**: Per-token rules for sell%, buy%, stop-loss%, and auto-balance
- **Token Allocation**: The percentage of portfolio value assigned to each token

## Requirements

### Requirement 1

**User Story:** As a user, I want the sidebar to accurately display the number of portfolios I have created, so that I can quickly see my portfolio count.

#### Acceptance Criteria

1. WHEN a user creates a portfolio THEN the sidebar SHALL display the updated portfolio count immediately
2. WHEN the sidebar displays portfolio count THEN the count SHALL match the number of portfolios shown in the dashboard
3. WHEN a user deletes a portfolio THEN the sidebar SHALL decrement the portfolio count
4. WHEN the application loads THEN the sidebar SHALL retrieve the portfolio count from the simulation store

### Requirement 2

**User Story:** As a user, I want my initial deposit to be treated as the baseline for profit/loss calculations, not as a loss, so that my portfolio performance is accurately tracked.

#### Acceptance Criteria

1. WHEN a portfolio is created with an initial deposit THEN the profit/loss SHALL be $0.00 (0%)
2. WHEN token prices change after portfolio creation THEN the profit/loss SHALL be calculated as (current value - initial deposit)
3. WHEN displaying profit/loss THEN the system SHALL never count the initial deposit itself as a loss
4. WHEN a user deposits additional funds THEN the initial deposit baseline SHALL remain unchanged for P/L calculations
5. WHEN calculating P/L percentage THEN the system SHALL use the formula: ((current value - initial deposit) / initial deposit) × 100

### Requirement 3

**User Story:** As a user, I want portfolio settings to be applied individually to each token, so that I can have different sell/buy/stop-loss rules for different tokens.

#### Acceptance Criteria

1. WHEN a user sets a sell percentage for a token THEN the system SHALL trigger a sell action only when that specific token's price increases by the specified percentage
2. WHEN a user sets a buy percentage for a token THEN the system SHALL trigger a buy action only when that specific token's price decreases by the specified percentage
3. WHEN a user sets a stop-loss percentage for a token THEN the system SHALL convert only that token to USDC when its price decreases by the specified percentage
4. WHEN monitoring price changes THEN the system SHALL compare each token's current price to its last fetched price
5. WHEN a token meets its sell/buy/stop-loss condition THEN the system SHALL execute the action for only that token

### Requirement 4

**User Story:** As a user, I want to see the exact quantity of each token I own, so that I can understand my holdings and verify calculations.

#### Acceptance Criteria

1. WHEN displaying a token holding THEN the system SHALL show the token quantity calculated as (allocated USD amount) / (token price at purchase)
2. WHEN a token is purchased THEN the system SHALL store the token quantity, initial price, and current price
3. WHEN displaying holdings THEN the system SHALL show: token symbol, quantity owned, current price, and current value
4. WHEN prices update THEN the token quantity SHALL remain constant while the current value recalculates
5. WHEN a user buys more of a token THEN the system SHALL add to the existing quantity

### Requirement 5

**User Story:** As a user, I want the auto-balance feature to maintain my specified token percentages, so that my portfolio stays aligned with my allocation strategy.

#### Acceptance Criteria

1. WHEN auto-balance is enabled THEN the system SHALL monitor each token's percentage relative to current portfolio value
2. WHEN a token's percentage exceeds its target allocation THEN the system SHALL sell exactly enough to restore the target percentage
3. WHEN a token's percentage falls below its target allocation THEN the system SHALL buy exactly enough to restore the target percentage
4. WHEN calculating rebalancing amounts THEN the system SHALL use current portfolio value, not initial deposit
5. WHEN auto-balance is disabled THEN the system SHALL not perform any automatic rebalancing actions

### Requirement 6

**User Story:** As a user, I want deposits to be distributed according to my current token allocations, so that my portfolio maintains its intended balance.

#### Acceptance Criteria

1. WHEN a user deposits funds THEN the system SHALL calculate each token's current percentage of the portfolio
2. WHEN distributing deposit funds THEN the system SHALL allocate to each token based on its current percentage
3. WHEN calculating token amounts to buy THEN the system SHALL use the formula: (deposit amount × token percentage) / current token price
4. WHEN a deposit is completed THEN the system SHALL update each token's quantity
5. WHEN a deposit is completed THEN the initial deposit baseline SHALL remain unchanged

### Requirement 7

**User Story:** As a developer, I want the portfolio store to correctly track and persist portfolio data, so that the UI displays accurate information.

#### Acceptance Criteria

1. WHEN the simulation store initializes THEN the system SHALL load all portfolios from localStorage
2. WHEN portfolio data changes THEN the system SHALL persist the updated data to localStorage
3. WHEN derived stores calculate values THEN the system SHALL use the current state from the simulation store
4. WHEN the sidebar subscribes to portfolio count THEN the system SHALL provide the count from the portfolios object
5. WHEN multiple components access portfolio data THEN the system SHALL ensure consistency through the centralized store
