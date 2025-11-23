# Requirements Document: Simulation Mode with Testnet Integration

## Introduction

This document specifies the requirements for updating the simulation mode to use the Reactive testnet network with test tokens instead of operating in a purely offline simulation. This will allow users to test the full portfolio management flow including real blockchain transactions without risking real funds.

## Glossary

- **Simulation Mode**: A testing environment where users can experiment with portfolio features
- **Testnet**: A test blockchain network (Reactive Testnet) that mimics mainnet but uses test tokens
- **Test Tokens**: ERC-20 tokens deployed on testnet with no real value, used for testing
- **Faucet**: A service that distributes free test tokens to users
- **Live Mode**: Production mode using mainnet with real tokens and real value

## Requirements

### Requirement 1: Testnet Network Configuration

**User Story:** As a developer, I want simulation mode to connect to Reactive testnet, so that I can test real blockchain interactions without risk.

#### Acceptance Criteria

1. WHEN simulation mode is enabled THEN the system SHALL connect to Reactive testnet network
2. WHEN simulation mode is enabled THEN the system SHALL use testnet chain ID and RPC endpoints
3. WHEN a user switches from live to simulation mode THEN the system SHALL prompt MetaMask to switch networks
4. WHEN testnet is not configured in MetaMask THEN the system SHALL offer to add the network automatically
5. WHEN simulation mode is active THEN the system SHALL display a clear indicator showing testnet connection

### Requirement 2: Test Token Configuration

**User Story:** As a user, I want to use test versions of real tokens in simulation mode, so that I can practice portfolio management safely.

#### Acceptance Criteria

1. WHEN simulation mode is enabled THEN the system SHALL display test token addresses instead of mainnet addresses
2. WHEN viewing available tokens THEN the system SHALL show test token contracts deployed on testnet
3. WHEN test tokens are not available THEN the system SHALL provide instructions for obtaining them
4. WHEN switching between modes THEN the system SHALL maintain separate token configurations for each mode
5. WHERE test tokens exist THEN the system SHALL use the same symbols and names as mainnet tokens for consistency

### Requirement 3: Simulated Trading Operations

**User Story:** As a user, I want to execute buy/sell operations on testnet, so that I can verify the complete trading flow works correctly.

#### Acceptance Criteria

1. WHEN a user executes a buy operation in simulation mode THEN the system SHALL submit a real transaction to testnet
2. WHEN a user executes a sell operation in simulation mode THEN the system SHALL interact with testnet DEX contracts
3. WHEN a swap is initiated THEN the system SHALL use testnet Uniswap or equivalent DEX
4. WHEN transactions are pending THEN the system SHALL show real transaction hashes and block confirmations
5. WHEN a transaction fails THEN the system SHALL display actual error messages from the testnet

### Requirement 4: Test Token Faucet Integration

**User Story:** As a user, I want easy access to test tokens, so that I can start testing without manual setup.

#### Acceptance Criteria

1. WHEN a user has insufficient test tokens THEN the system SHALL display a faucet link or button
2. WHEN the faucet button is clicked THEN the system SHALL direct users to obtain test tokens
3. WHERE an automated faucet exists THEN the system SHALL integrate direct token requests
4. WHEN test tokens are received THEN the system SHALL update the user's balance automatically
5. WHEN displaying token balances THEN the system SHALL clearly indicate these are test tokens

### Requirement 5: Mode Switching and Data Isolation

**User Story:** As a user, I want my simulation and live portfolios kept separate, so that test data doesn't mix with real data.

#### Acceptance Criteria

1. WHEN switching modes THEN the system SHALL maintain separate portfolio storage for each mode
2. WHEN in simulation mode THEN the system SHALL only display simulation portfolios
3. WHEN in live mode THEN the system SHALL only display live portfolios
4. WHEN switching modes THEN the system SHALL preserve all data in both modes
5. WHEN displaying mode status THEN the system SHALL clearly show which mode is active

### Requirement 6: Testnet Transaction Simulation

**User Story:** As a user, I want to see realistic transaction flows in simulation mode, so that I understand what will happen in live mode.

#### Acceptance Criteria

1. WHEN executing swaps THEN the system SHALL show real gas estimates from testnet
2. WHEN transactions are submitted THEN the system SHALL display actual transaction confirmation times
3. WHEN viewing transaction history THEN the system SHALL link to testnet block explorer
4. WHEN errors occur THEN the system SHALL show real blockchain error messages
5. WHEN slippage occurs THEN the system SHALL reflect actual testnet market conditions

### Requirement 7: Test Token Deployment Support

**User Story:** As a developer, I want to deploy test tokens to testnet, so that I can ensure all required tokens are available for testing.

#### Acceptance Criteria

1. WHERE test tokens don't exist THEN the system SHALL provide deployment scripts
2. WHEN deploying test tokens THEN the system SHALL create ERC-20 contracts with appropriate metadata
3. WHEN test tokens are deployed THEN the system SHALL update the token configuration automatically
4. WHEN multiple test tokens are needed THEN the system SHALL support batch deployment
5. WHEN tokens are deployed THEN the system SHALL verify contracts on testnet explorer

### Requirement 8: Simulation Mode UI Indicators

**User Story:** As a user, I want clear visual indicators when in simulation mode, so that I never confuse test and real transactions.

#### Acceptance Criteria

1. WHEN simulation mode is active THEN the system SHALL display a prominent banner or badge
2. WHEN viewing balances THEN the system SHALL label amounts as "Test" or "Testnet"
3. WHEN executing transactions THEN the system SHALL show warnings that these are test transactions
4. WHEN switching modes THEN the system SHALL require explicit user confirmation
5. WHERE confusion is possible THEN the system SHALL use distinct color schemes for each mode

### Requirement 9: Testnet Price Feeds

**User Story:** As a user, I want realistic price data in simulation mode, so that portfolio calculations are meaningful.

#### Acceptance Criteria

1. WHEN in simulation mode THEN the system SHALL use the same price feeds as live mode
2. WHEN calculating portfolio values THEN the system SHALL apply real market prices to test token quantities
3. WHEN displaying performance THEN the system SHALL show realistic profit/loss calculations
4. WHEN prices are unavailable THEN the system SHALL use cached or fallback price data
5. WHEN test tokens have no price feed THEN the system SHALL use configurable mock prices

### Requirement 10: Network Switching Automation

**User Story:** As a user, I want automatic network switching when changing modes, so that I don't have to manually configure MetaMask.

#### Acceptance Criteria

1. WHEN switching to simulation mode THEN the system SHALL automatically request network change in MetaMask
2. WHEN switching to live mode THEN the system SHALL automatically request network change to mainnet
3. WHEN network switch fails THEN the system SHALL provide clear instructions for manual switching
4. WHEN the wrong network is detected THEN the system SHALL prompt the user to switch
5. WHEN network switching is pending THEN the system SHALL show a loading state
