# Implementation Plan: Simulation Mode with Testnet Integration

- [x] 1. Set up testnet network configuration





  - Create network configuration constants for Reactive testnet
  - Add testnet RPC endpoints and chain ID to environment config
  - Implement network configuration getter that returns config based on mode
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement NetworkConfigService for network management





  - Create NetworkConfigService class with network switching logic
  - Implement getNetworkConfig() method to return mode-specific config
  - Implement switchNetwork() method to trigger MetaMask network change
  - Implement addNetworkToWallet() method to add testnet to MetaMask
  - Implement verifyNetwork() method to check current network matches mode
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.1, 10.2_

- [ ]* 2.1 Write property test for network-mode consistency
  - **Property 1: Network Mode Consistency**
  - **Validates: Requirements 1.1, 1.2**

- [x] 3. Deploy FREACT token contract to testnet





  - Create FREACT ERC-20 token contract with 1M supply
  - Add faucet functionality to contract (1000 FREACT per claim, 24hr cooldown)
  - Deploy contract to Reactive testnet
  - Verify contract on testnet block explorer
  - Update environment config with FREACT contract address
  - _Requirements: 2.1, 2.2, 4.1, 4.2, 7.2, 7.3_

- [ ] 4. Create FREACTTokenService for token management
  - Implement getTokenContract() to return FREACT contract instance
  - Implement getBalance() to check user's FREACT balance
  - Implement token approval methods for portfolio contract
  - Add FREACT token to frontend token configuration
  - _Requirements: 2.1, 2.2, 2.5_

- [ ] 5. Implement FREACTFaucetService for token distribution
  - Create FREACTFaucetService class
  - Implement claimFREACT() method to trigger claim transaction
  - Implement canClaim() method to check eligibility and cooldown
  - Implement getClaimHistory() method to show past claims
  - Implement getFaucetStats() method for faucet statistics
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 5.1 Write property test for token address isolation
  - **Property 2: Token Address Isolation**
  - **Validates: Requirements 2.1, 2.2**

- [ ] 6. Create simulation portfolio contract for position tracking
  - Design portfolio contract that tracks simulated asset positions
  - Implement deposit() function to accept FREACT
  - Implement buyAsset() function to record position using FREACT
  - Implement sellAsset() function to convert position back to FREACT
  - Implement getPositions() view function to query user positions
  - Deploy contract to testnet and verify
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 7. Implement SimulationTradingService
  - Create SimulationTradingService class
  - Implement buyAsset() method using FREACT (1 FREACT = 1 USD calculation)
  - Implement sellAsset() method to convert positions back to FREACT
  - Implement getPortfolioValue() to calculate total value in FREACT
  - Integrate with price feeds for real-time asset pricing
  - _Requirements: 3.1, 3.2, 9.1, 9.2, 9.3_

- [ ]* 7.1 Write property test for transaction network matching
  - **Property 4: Transaction Network Matching**
  - **Validates: Requirements 3.1, 3.2**

- [ ] 8. Implement ModeAwareStorageService for data isolation
  - Create ModeAwareStorageService class
  - Implement getStorageKey() to add mode prefix to keys
  - Implement savePortfolio() with mode-specific storage
  - Implement loadPortfolios() to filter by mode
  - Update existing portfolio store to use mode-aware storage
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 8.1 Write property test for data storage separation
  - **Property 3: Data Storage Separation**
  - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ]* 8.2 Write property test for mode switch preservation
  - **Property 5: Mode Switch Preservation**
  - **Validates: Requirements 5.4**

- [ ] 9. Update wallet service for automatic network switching
  - Integrate NetworkConfigService into wallet store
  - Add network verification before transactions
  - Implement automatic network switch when mode changes
  - Add network mismatch detection and warnings
  - Handle network switch failures with user instructions
  - _Requirements: 1.3, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 9.1 Write property test for network verification
  - **Property 7: Network Verification**
  - **Validates: Requirements 10.4**

- [ ] 10. Add simulation mode UI indicators
  - Add prominent "TESTNET MODE" banner when simulation is active
  - Update token displays to show "Test" label in simulation mode
  - Add testnet badge to navigation sidebar
  - Update transaction modals to show testnet warnings
  - Implement distinct color scheme for simulation mode (e.g., orange/yellow theme)
  - Add mode confirmation dialog when switching modes
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 10.1 Write property test for test token identification
  - **Property 6: Test Token Identification**
  - **Validates: Requirements 2.4, 8.2**

- [ ] 11. Create faucet UI component
  - Design FaucetButton component for claiming FREACT
  - Show current FREACT balance
  - Display claim eligibility and cooldown timer
  - Show claim history and statistics
  - Add faucet access to portfolio creation flow
  - Handle claim transaction flow with loading states
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [ ] 12. Update portfolio creation flow for simulation mode
  - Modify create-portfolio page to detect simulation mode
  - Show FREACT as the funding token in simulation mode
  - Update token selection to use testnet addresses
  - Add faucet link for users with insufficient FREACT
  - Update validation to check FREACT balance instead of mainnet tokens
  - _Requirements: 2.1, 2.2, 3.1, 4.1_

- [ ] 13. Update portfolio detail page for testnet transactions
  - Modify portfolio detail page to show testnet transaction links
  - Update transaction history to link to testnet block explorer
  - Display testnet-specific gas estimates
  - Show "Test Transaction" labels on all operations
  - Update swap UI to use FREACT-based trading
  - _Requirements: 3.4, 6.3, 8.2_

- [ ] 14. Implement error handling for testnet operations
  - Add network switch failure handling with manual instructions
  - Implement insufficient FREACT error with faucet redirect
  - Add testnet RPC failure handling with fallback options
  - Implement transaction revert error display
  - Add network mismatch prevention and warnings
  - _Requirements: 1.4, 2.3, 10.3, 10.4_

- [ ] 15. Add testnet price feed integration
  - Ensure price service works with simulation mode
  - Use same price feeds for both modes
  - Implement fallback prices for test tokens without feeds
  - Update portfolio value calculations for FREACT-based positions
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 17. Create integration tests for complete simulation flow
  - Test complete mode switch flow (live → simulation → live)
  - Test FREACT acquisition from faucet
  - Test portfolio creation with FREACT
  - Test buying assets with FREACT
  - Test selling assets back to FREACT
  - Test data isolation between modes
  - Test network auto-switching
  - _Requirements: All_

- [ ]* 18. Write documentation for simulation mode
  - Document FREACT token system and faucet usage
  - Create user guide for simulation mode
  - Document testnet setup instructions
  - Add troubleshooting guide for common issues
  - Document differences between simulation and live mode
