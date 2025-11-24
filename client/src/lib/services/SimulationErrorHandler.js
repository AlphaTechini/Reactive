/**
 * Simulation Error Handler
 * Centralized error handling and user-friendly error messages for simulation mode
 */

export class SimulationError extends Error {
	constructor(message, code, details = {}) {
		super(message);
		this.name = 'SimulationError';
		this.code = code;
		this.details = details;
		this.timestamp = Date.now();
	}
}

// Error codes
export const ErrorCodes = {
	// Validation errors
	INVALID_NAME: 'INVALID_NAME',
	DUPLICATE_NAME: 'DUPLICATE_NAME',
	INVALID_AMOUNT: 'INVALID_AMOUNT',
	INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
	INVALID_ALLOCATIONS: 'INVALID_ALLOCATIONS',
	INVALID_PERCENTAGE: 'INVALID_PERCENTAGE',
	
	// Price errors
	PRICE_FETCH_FAILED: 'PRICE_FETCH_FAILED',
	PRICE_NOT_FOUND: 'PRICE_NOT_FOUND',
	STALE_PRICES: 'STALE_PRICES',
	
	// Storage errors
	STORAGE_CORRUPTED: 'STORAGE_CORRUPTED',
	STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
	STORAGE_ACCESS_DENIED: 'STORAGE_ACCESS_DENIED',
	
	// Portfolio errors
	PORTFOLIO_NOT_FOUND: 'PORTFOLIO_NOT_FOUND',
	PORTFOLIO_ALREADY_EXISTS: 'PORTFOLIO_ALREADY_EXISTS',
	
	// System errors
	INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Get user-friendly error message for error code
 */
export function getUserFriendlyMessage(error) {
	if (error instanceof SimulationError) {
		switch (error.code) {
			case ErrorCodes.INVALID_NAME:
				return 'Please enter a valid portfolio name (2-50 characters).';
			case ErrorCodes.DUPLICATE_NAME:
				return 'A portfolio with this name already exists. Please choose a different name.';
			case ErrorCodes.INVALID_AMOUNT:
				return 'Please enter a valid amount greater than zero.';
			case ErrorCodes.INSUFFICIENT_BALANCE:
				return `Insufficient balance. You have $${error.details.available?.toFixed(2) || '0.00'} available.`;
			case ErrorCodes.INVALID_ALLOCATIONS:
				return `Invalid token allocations: ${error.details.errors?.join(', ') || 'Unknown error'}`;
			case ErrorCodes.INVALID_PERCENTAGE:
				return 'Total allocation must equal 100%.';
			case ErrorCodes.PRICE_FETCH_FAILED:
				return 'Unable to fetch current prices. Please check your internet connection and try again.';
			case ErrorCodes.PRICE_NOT_FOUND:
				return `Prices not available for: ${error.details.symbols?.join(', ') || 'some tokens'}. Please try refreshing.`;
			case ErrorCodes.STALE_PRICES:
				return 'Price data may be outdated. Please refresh prices before continuing.';
			case ErrorCodes.STORAGE_CORRUPTED:
				return 'Your saved data appears to be corrupted. It has been reset to default values.';
			case ErrorCodes.STORAGE_QUOTA_EXCEEDED:
				return 'Storage limit exceeded. Please delete some old portfolios to free up space.';
			case ErrorCodes.STORAGE_ACCESS_DENIED:
				return 'Unable to access browser storage. Please check your browser settings.';
			case ErrorCodes.PORTFOLIO_NOT_FOUND:
				return 'Portfolio not found. It may have been deleted.';
			case ErrorCodes.PORTFOLIO_ALREADY_EXISTS:
				return 'A portfolio with this name already exists.';
			case ErrorCodes.INITIALIZATION_FAILED:
				return 'Failed to initialize the application. Please refresh the page.';
			default:
				return error.message || 'An unexpected error occurred. Please try again.';
		}
	}
	
	// Handle standard errors
	if (error instanceof Error) {
		return error.message || 'An unexpected error occurred. Please try again.';
	}
	
	// Handle string errors
	if (typeof error === 'string') {
		return error;
	}
	
	return 'An unexpected error occurred. Please try again.';
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling(fn, errorCallback) {
	return async (...args) => {
		try {
			return await fn(...args);
		} catch (error) {
			console.error('Error in async operation:', error);
			
			const friendlyMessage = getUserFriendlyMessage(error);
			
			if (errorCallback) {
				errorCallback(friendlyMessage, error);
			}
			
			throw error;
		}
	};
}

/**
 * Retry async function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
	let lastError = null;
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await fn(attempt);
		} catch (error) {
			lastError = error;
			console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);
			
			if (attempt < maxRetries) {
				const delay = baseDelay * Math.pow(2, attempt - 1);
				console.log(`Retrying in ${delay}ms...`);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}
	
	throw lastError;
}

/**
 * Validate portfolio name
 */
export function validatePortfolioName(name, existingNames = []) {
	if (!name || typeof name !== 'string') {
		throw new SimulationError(
			'Portfolio name is required',
			ErrorCodes.INVALID_NAME
		);
	}
	
	const trimmed = name.trim();
	
	if (trimmed.length < 2) {
		throw new SimulationError(
			'Portfolio name must be at least 2 characters',
			ErrorCodes.INVALID_NAME,
			{ length: trimmed.length }
		);
	}
	
	if (trimmed.length > 50) {
		throw new SimulationError(
			'Portfolio name must be less than 50 characters',
			ErrorCodes.INVALID_NAME,
			{ length: trimmed.length }
		);
	}
	
	if (existingNames.includes(trimmed)) {
		throw new SimulationError(
			'Portfolio with this name already exists',
			ErrorCodes.DUPLICATE_NAME,
			{ name: trimmed }
		);
	}
	
	return trimmed;
}

/**
 * Validate deposit amount
 */
export function validateDepositAmount(amount, availableBalance) {
	const numAmount = parseFloat(amount);
	
	if (isNaN(numAmount)) {
		throw new SimulationError(
			'Please enter a valid number',
			ErrorCodes.INVALID_AMOUNT
		);
	}
	
	if (numAmount <= 0) {
		throw new SimulationError(
			'Deposit amount must be positive',
			ErrorCodes.INVALID_AMOUNT,
			{ amount: numAmount }
		);
	}
	
	if (numAmount > availableBalance) {
		throw new SimulationError(
			'Insufficient balance',
			ErrorCodes.INSUFFICIENT_BALANCE,
			{ requested: numAmount, available: availableBalance }
		);
	}
	
	return numAmount;
}

/**
 * Validate token allocations
 */
export function validateAllocations(allocations) {
	if (!allocations || typeof allocations !== 'object') {
		throw new SimulationError(
			'Invalid allocations format',
			ErrorCodes.INVALID_ALLOCATIONS
		);
	}
	
	const symbols = Object.keys(allocations);
	
	if (symbols.length === 0) {
		throw new SimulationError(
			'Please select at least one token',
			ErrorCodes.INVALID_ALLOCATIONS
		);
	}
	
	let totalPercentage = 0;
	const errors = [];
	
	for (const [symbol, percentage] of Object.entries(allocations)) {
		if (typeof percentage !== 'number' || isNaN(percentage)) {
			errors.push(`Invalid percentage for ${symbol}`);
			continue;
		}
		
		if (percentage < 0) {
			errors.push(`Percentage for ${symbol} cannot be negative`);
			continue;
		}
		
		if (percentage > 100) {
			errors.push(`Percentage for ${symbol} cannot exceed 100%`);
			continue;
		}
		
		totalPercentage += percentage;
	}
	
	if (errors.length > 0) {
		throw new SimulationError(
			'Invalid allocations',
			ErrorCodes.INVALID_ALLOCATIONS,
			{ errors }
		);
	}
	
	const percentageDifference = Math.abs(totalPercentage - 100);
	if (percentageDifference > 0.01) {
		throw new SimulationError(
			`Total allocation must equal 100% (current: ${totalPercentage.toFixed(2)}%)`,
			ErrorCodes.INVALID_PERCENTAGE,
			{ total: totalPercentage }
		);
	}
	
	return true;
}

/**
 * Handle localStorage errors
 */
export function handleStorageError(error) {
	if (error.name === 'QuotaExceededError') {
		throw new SimulationError(
			'Storage quota exceeded',
			ErrorCodes.STORAGE_QUOTA_EXCEEDED
		);
	}
	
	if (error.name === 'SecurityError') {
		throw new SimulationError(
			'Storage access denied',
			ErrorCodes.STORAGE_ACCESS_DENIED
		);
	}
	
	throw new SimulationError(
		'Storage error',
		ErrorCodes.STORAGE_CORRUPTED,
		{ originalError: error.message }
	);
}

/**
 * Check if prices are stale (older than 5 minutes)
 */
export function checkPricesFreshness(lastFetchTime, maxAgeMs = 5 * 60 * 1000) {
	if (!lastFetchTime) {
		return { stale: true, age: null };
	}
	
	const age = Date.now() - lastFetchTime;
	const stale = age > maxAgeMs;
	
	return { stale, age };
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error) {
	if (error instanceof SimulationError) {
		return {
			type: 'SimulationError',
			code: error.code,
			message: error.message,
			details: error.details,
			timestamp: error.timestamp,
			stack: error.stack
		};
	}
	
	if (error instanceof Error) {
		return {
			type: error.name,
			message: error.message,
			stack: error.stack
		};
	}
	
	return {
		type: 'Unknown',
		message: String(error)
	};
}

export default {
	SimulationError,
	ErrorCodes,
	getUserFriendlyMessage,
	withErrorHandling,
	retryWithBackoff,
	validatePortfolioName,
	validateDepositAmount,
	validateAllocations,
	handleStorageError,
	checkPricesFreshness,
	formatErrorForLogging
};
