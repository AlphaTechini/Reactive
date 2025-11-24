# Requirements Document

## Introduction

This specification addresses critical frontend errors related to price data display in the Reactive Portfolio Manager application. Users are experiencing `TypeError: Cannot read properties of undefined (reading 'toFixed')` errors when the dashboard attempts to display token prices before price data has been loaded from the backend service.

## Glossary

- **Price Service**: The frontend service responsible for fetching and caching token price data from the backend
- **Global Storage**: The centralized Svelte store that holds price data accessible across all components
- **Token Price Data**: An object containing price, change percentage, timestamp, and other metadata for a cryptocurrency token
- **Dashboard**: The main user interface displaying portfolio overview and token prices
- **Safe Rendering**: Displaying UI elements with proper null/undefined checks to prevent runtime errors

## Requirements

### Requirement 1

**User Story:** As a user, I want the dashboard to load without errors, so that I can view my portfolio information immediately upon page load.

#### Acceptance Criteria

1. WHEN the dashboard component mounts THEN the system SHALL initialize with safe default values for all price-dependent displays
2. WHEN price data is undefined or null THEN the system SHALL display placeholder text instead of attempting numeric operations
3. WHEN the price service is fetching data THEN the system SHALL show loading indicators without triggering JavaScript errors
4. WHEN price data becomes available THEN the system SHALL reactively update all displays with the fetched values
5. WHEN a user refreshes the page THEN the system SHALL load cached prices from localStorage before fetching new data

### Requirement 2

**User Story:** As a user, I want to see accurate price information with proper formatting, so that I can make informed trading decisions.

#### Acceptance Criteria

1. WHEN displaying a token price THEN the system SHALL format the number with appropriate decimal places based on the price magnitude
2. WHEN a price is less than $0.01 THEN the system SHALL display up to 8 decimal places
3. WHEN a price is greater than or equal to $0.01 THEN the system SHALL display 2-4 decimal places
4. WHEN price change percentage is displayed THEN the system SHALL include a sign (+/-) and format to 2 decimal places
5. WHEN price data is zero THEN the system SHALL display "$0.00" instead of attempting calculations

### Requirement 3

**User Story:** As a user, I want the application to handle missing or delayed price data gracefully, so that I can continue using other features while prices load.

#### Acceptance Criteria

1. WHEN the backend price service is unavailable THEN the system SHALL display the last cached prices with a staleness indicator
2. WHEN no cached prices exist THEN the system SHALL display "Price unavailable" messages without breaking the UI
3. WHEN a specific token has no price data THEN the system SHALL display a token-specific unavailable message
4. WHEN price fetching fails THEN the system SHALL log the error and allow manual retry without page reload
5. WHEN switching between live and simulation modes THEN the system SHALL clear stale price data and fetch appropriate prices for the new mode

### Requirement 4

**User Story:** As a developer, I want consistent price data access patterns across all components, so that price display bugs are prevented systematically.

#### Acceptance Criteria

1. WHEN a component needs to display a price THEN the system SHALL use a centralized formatting utility function
2. WHEN accessing price data from stores THEN the system SHALL use optional chaining and nullish coalescing operators
3. WHEN performing calculations on prices THEN the system SHALL validate that values are numeric before operations
4. WHEN a component subscribes to price updates THEN the system SHALL handle both initial undefined state and subsequent updates
5. WHEN price data structure changes THEN the system SHALL maintain backward compatibility with existing components
