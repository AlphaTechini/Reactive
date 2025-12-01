# Requirements Document

## Introduction

This specification addresses the need to simplify the portfolio settings flow by removing the comprehensive tokens list from the settings page after portfolio creation. Currently, users are presented with all available tokens in categorized lists, which can be overwhelming and doesn't align with the intended user experience where users should focus on configuring specific tokens they want to include in their portfolio.

## Glossary

- **Portfolio_Settings_System**: The interface and logic that manages portfolio configuration after creation
- **Token_Selection_Interface**: The UI component that allows users to choose which tokens to include
- **Allocation_Configuration**: The process of setting percentage distributions for selected tokens
- **Settings_Page**: The portfolio configuration page accessed after portfolio creation

## Requirements

### Requirement 1

**User Story:** As a user, I want a streamlined token selection process in portfolio settings, so that I can focus on configuring only the tokens I'm interested in without being overwhelmed by a comprehensive list.

#### Acceptance Criteria

1. WHEN a user accesses portfolio settings THEN the Portfolio_Settings_System SHALL display only a token search/selection interface instead of categorized token lists
2. WHEN a user searches for tokens THEN the Portfolio_Settings_System SHALL return relevant matches from the available token list
3. WHEN a user selects a token THEN the Portfolio_Settings_System SHALL add it to their portfolio configuration with default allocation settings
4. WHEN a user has selected tokens THEN the Portfolio_Settings_System SHALL display only those selected tokens for percentage allocation configuration
5. WHEN a user removes a token from selection THEN the Portfolio_Settings_System SHALL remove it from the allocation configuration and redistribute percentages

### Requirement 2

**User Story:** As a user, I want to easily add and remove tokens from my portfolio configuration, so that I can customize my portfolio without navigating through extensive categorized lists.

#### Acceptance Criteria

1. WHEN a user wants to add a token THEN the Portfolio_Settings_System SHALL provide a search interface with autocomplete functionality
2. WHEN a user types in the search field THEN the Portfolio_Settings_System SHALL filter tokens by symbol and name
3. WHEN a user clicks on a search result THEN the Portfolio_Settings_System SHALL add the token to their selection with a default allocation percentage
4. WHEN a user wants to remove a token THEN the Portfolio_Settings_System SHALL provide a clear removal action for each selected token
5. WHEN a token is removed THEN the Portfolio_Settings_System SHALL automatically recalculate remaining percentages to maintain 100% total

### Requirement 3

**User Story:** As a user, I want the allocation configuration to be focused only on my selected tokens, so that I can efficiently set up my portfolio without distractions.

#### Acceptance Criteria

1. WHEN a user has selected tokens THEN the Portfolio_Settings_System SHALL display allocation controls only for those selected tokens
2. WHEN a user adjusts allocation percentages THEN the Portfolio_Settings_System SHALL validate that the total equals 100%
3. WHEN the total allocation is not 100% THEN the Portfolio_Settings_System SHALL prevent settings submission and display clear validation messages
4. WHEN a user uses auto-distribute THEN the Portfolio_Settings_System SHALL evenly distribute percentages among selected tokens
5. WHEN a user saves settings THEN the Portfolio_Settings_System SHALL store both token selections and their allocation percentages

### Requirement 4

**User Story:** As a user, I want per-token trading settings to be configured only for tokens I've selected, so that I can customize trading behavior for each token in my portfolio.

#### Acceptance Criteria

1. WHEN a user has selected tokens with allocations THEN the Portfolio_Settings_System SHALL display per-token trading settings for each selected token
2. WHEN a user configures token-specific settings THEN the Portfolio_Settings_System SHALL allow customization of sell percentage, buy percentage, and stop-loss percentage per token
3. WHEN a user enables/disables automation for a token THEN the Portfolio_Settings_System SHALL toggle the automation state for that specific token
4. WHEN a user saves settings THEN the Portfolio_Settings_System SHALL persist both allocation and per-token trading configurations
5. WHEN a user removes a token THEN the Portfolio_Settings_System SHALL also remove its associated trading settings

### Requirement 5

**User Story:** As a system administrator, I want the token selection interface to be performant and user-friendly, so that users can efficiently configure their portfolios without technical issues.

#### Acceptance Criteria

1. WHEN the settings page loads THEN the Portfolio_Settings_System SHALL initialize with existing token selections if any
2. WHEN a user performs token search THEN the Portfolio_Settings_System SHALL return results within 200 milliseconds
3. WHEN a user adds or removes tokens THEN the Portfolio_Settings_System SHALL update the interface reactively without page refresh
4. WHEN validation errors occur THEN the Portfolio_Settings_System SHALL display clear, actionable error messages
5. WHEN settings are saved THEN the Portfolio_Settings_System SHALL provide confirmation feedback and redirect to the portfolio view