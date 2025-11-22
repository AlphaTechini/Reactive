/**
 * Comprehensive Error Handling Framework
 * 
 * Implements exponential backoff retry logic, graceful degradation modes,
 * and error logging/monitoring as specified in requirements 6.1, 6.5
 */

import { writable } from 'svelte/store';

// Error handling constants
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY = 1000; // 1 second
const DEFAULT_MAX_DELAY = 30000; // 30 seconds
const DEFAULT_BACKOFF_MULTIPLIER = 2;
const DEFAULT_JITTER_FACTOR = 0.1;
const ERROR_LOG_MAX_SIZE = 1000;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error categories
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  API: 'api',
  VALIDATION: 'validation',
  BUSINESS_LOGIC: 'business_logic',
  SYSTEM: 'system',
  USER_INPUT: 'user_input'
};

// Service degradation modes
export const DEGRADATION_MODES = {
  NORMAL: 'normal',
  DEGRADED: 'degraded',
  MINIMAL: 'minimal',
  OFFLINE: 'offline'
};

// Reactive stores for error handling state
export const errorHandlingStateStore = writable({
  globalErrorCount: 0,
  serviceStates: {},
  circuitBreakers: {},
  degradationMode: DEGRADATION_MODES.NORMAL,
  lastError: null
});

export const errorLogStore = writable([]);
export const serviceHealthStore = writable({});

class ErrorHandlingFramework {
  constructor() {
    this.isInitialized = false;
    this.errorLog = [];
    this.serviceStates = new Map();
    this.circuitBreakers = new Map();
    this.retryConfigs = new Map();
    this.healthCheckers = new Map();
    this.degradationHandlers = new Map();
    
    // Global state
    this.globalState = {
      errorCount: 0,
      degradationMode: DEGRADATION_MODES.NORMAL,
      lastError: null,
      startTime: Date.now()
    };
    
    // Health monitoring
    this.healthCheckTimer = null;
    this.isHealthChecking = false;
    
    // Error statistics
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      errorsByService: {},
      recoveryCount: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Initialize the error handling framework
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      console.log('🛡️ Error handling framework already initialized');
      return;
    }

    console.log('🚀 Initializing Error Handling Framework...');
    
    try {
      // Set configuration options
      this.maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;
      this.baseDelay = options.baseDelay || DEFAULT_BASE_DELAY;
      this.maxDelay = options.maxDelay || DEFAULT_MAX_DELAY;
      this.backoffMultiplier = options.backoffMultiplier || DEFAULT_BACKOFF_MULTIPLIER;
      this.jitterFactor = options.jitterFactor || DEFAULT_JITTER_FACTOR;
      this.enableHealthChecks = options.enableHealthChecks !== false;
      this.healthCheckInterval = options.healthCheckInterval || HEALTH_CHECK_INTERVAL;
      
      // Initialize default retry configurations for common services
      this.initializeDefaultRetryConfigs();
      
      // Initialize circuit breakers for critical services
      this.initializeCircuitBreakers();
      
      // Initialize degradation handlers
      this.initializeDegradationHandlers();
      
      // Start health monitoring if enabled
      if (this.enableHealthChecks) {
        this.startHealthMonitoring();
      }
      
      // Set up global error handler
      this.setupGlobalErrorHandler();
      
      this.isInitialized = true;
      console.log('✅ Error Handling Framework initialized successfully');
      
      // Update state store
      this.updateStateStore();
      
    } catch (error) {
      console.error('❌ Failed to initialize Error Handling Framework:', error);
      throw error;
    }
  }

  /**
   * Initialize default retry configurations for services
   */
  initializeDefaultRetryConfigs() {
    // Price service retry config
    this.setRetryConfig('price_service', {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'SERVER_ERROR'],
      nonRetryableErrors: ['INVALID_TOKEN', 'UNAUTHORIZED', 'VALIDATION_ERROR']
    });
    
    // Rebalancing engine retry config
    this.setRetryConfig('rebalancing_engine', {
      maxRetries: 2,
      baseDelay: 2000,
      maxDelay: 20000,
      backoffMultiplier: 2.5,
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'INSUFFICIENT_LIQUIDITY'],
      nonRetryableErrors: ['INSUFFICIENT_BALANCE', 'INVALID_TRADE', 'SLIPPAGE_EXCEEDED']
    });
    
    // Risk management retry config
    this.setRetryConfig('risk_management', {
      maxRetries: 3,
      baseDelay: 1500,
      maxDelay: 15000,
      backoffMultiplier: 2,
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'PRICE_STALE'],
      nonRetryableErrors: ['INVALID_PARAMETERS', 'COOLDOWN_ACTIVE', 'PANIC_MODE_ACTIVE']
    });
    
    // API services retry config
    this.setRetryConfig('api_services', {
      maxRetries: 4,
      baseDelay: 500,
      maxDelay: 8000,
      backoffMultiplier: 1.8,
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'SERVER_ERROR', 'SERVICE_UNAVAILABLE'],
      nonRetryableErrors: ['BAD_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND']
    });
  }

  /**
   * Initialize circuit breakers for critical services
   */
  initializeCircuitBreakers() {
    const criticalServices = [
      'price_service',
      'rebalancing_engine', 
      'risk_management',
      'coingecko_api',
      'price_ingest_api',
      'uniswap_api'
    ];
    
    for (const service of criticalServices) {
      this.circuitBreakers.set(service, {
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failureCount: 0,
        threshold: CIRCUIT_BREAKER_THRESHOLD,
        timeout: CIRCUIT_BREAKER_TIMEOUT,
        lastFailure: null,
        nextAttempt: null,
        successCount: 0
      });
    }
  }

  /**
   * Initialize degradation handlers for graceful service degradation
   */
  initializeDegradationHandlers() {
    // Price service degradation
    this.degradationHandlers.set('price_service', {
      normal: () => ({ mode: 'multi_source', caching: 'standard', validation: 'full' }),
      degraded: () => ({ mode: 'primary_source', caching: 'extended', validation: 'basic' }),
      minimal: () => ({ mode: 'cache_only', caching: 'aggressive', validation: 'none' }),
      offline: () => ({ mode: 'offline', caching: 'persistent', validation: 'none' })
    });
    
    // Rebalancing engine degradation
    this.degradationHandlers.set('rebalancing_engine', {
      normal: () => ({ automation: 'full', gasOptimization: 'enabled', batchSize: 'optimal' }),
      degraded: () => ({ automation: 'limited', gasOptimization: 'basic', batchSize: 'reduced' }),
      minimal: () => ({ automation: 'manual_only', gasOptimization: 'disabled', batchSize: 'single' }),
      offline: () => ({ automation: 'disabled', gasOptimization: 'disabled', batchSize: 'none' })
    });
    
    // Risk management degradation
    this.degradationHandlers.set('risk_management', {
      normal: () => ({ monitoring: 'real_time', triggers: 'all', automation: 'full' }),
      degraded: () => ({ monitoring: 'periodic', triggers: 'critical_only', automation: 'limited' }),
      minimal: () => ({ monitoring: 'manual', triggers: 'stop_loss_only', automation: 'disabled' }),
      offline: () => ({ monitoring: 'disabled', triggers: 'none', automation: 'disabled' })
    });
  }

  /**
   * Set retry configuration for a service
   */
  setRetryConfig(serviceName, config) {
    const defaultConfig = {
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      backoffMultiplier: this.backoffMultiplier,
      jitterFactor: this.jitterFactor,
      retryableErrors: [],
      nonRetryableErrors: []
    };
    
    this.retryConfigs.set(serviceName, { ...defaultConfig, ...config });
    console.log(`⚙️ Retry configuration set for ${serviceName}`);
  }

  /**
   * Execute operation with exponential backoff retry logic
   * Implements requirement 6.1 - exponential backoff retry logic for API failures
   */
  async executeWithRetry(operation, serviceName, options = {}) {
    const config = this.retryConfigs.get(serviceName) || this.retryConfigs.get('api_services');
    const maxRetries = options.maxRetries || config.maxRetries;
    const operationId = `${serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check circuit breaker
    if (!this.canExecute(serviceName)) {
      const error = new Error(`Circuit breaker is OPEN for service: ${serviceName}`);
      error.code = 'CIRCUIT_BREAKER_OPEN';
      error.serviceName = serviceName;
      this.logError(error, ERROR_SEVERITY.HIGH, ERROR_CATEGORIES.SYSTEM);
      throw error;
    }
    
    let lastError = null;
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        console.log(`🔄 Executing ${serviceName} operation (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;
        
        // Record successful execution
        this.recordSuccess(serviceName, operationId, duration);
        
        if (attempt > 0) {
          console.log(`✅ ${serviceName} operation succeeded after ${attempt} retries`);
          this.errorStats.recoveryCount++;
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Check if error is retryable
        if (!this.isRetryableError(error, config)) {
          console.log(`❌ ${serviceName} operation failed with non-retryable error: ${error.message}`);
          this.recordFailure(serviceName, operationId, error, false);
          throw error;
        }
        
        // Record retryable failure
        this.recordFailure(serviceName, operationId, error, true);
        
        // Check if we've exhausted retries
        if (attempt > maxRetries) {
          console.log(`❌ ${serviceName} operation failed after ${maxRetries} retries: ${error.message}`);
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateBackoffDelay(attempt, config);
        console.log(`⏳ Retrying ${serviceName} operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        await this.delay(delay);
      }
    }
    
    // All retries exhausted
    const finalError = new Error(`Operation failed after ${maxRetries} retries: ${lastError.message}`);
    finalError.originalError = lastError;
    finalError.serviceName = serviceName;
    finalError.attempts = attempt;
    
    this.logError(finalError, ERROR_SEVERITY.HIGH, ERROR_CATEGORIES.SYSTEM);
    throw finalError;
  }

  /**
   * Check if an error is retryable based on configuration
   */
  isRetryableError(error, config) {
    const errorCode = error.code || error.name || 'UNKNOWN_ERROR';
    const errorMessage = error.message || '';
    
    // Check non-retryable errors first
    for (const nonRetryable of config.nonRetryableErrors) {
      if (errorCode.includes(nonRetryable) || errorMessage.includes(nonRetryable)) {
        return false;
      }
    }
    
    // Check retryable errors
    for (const retryable of config.retryableErrors) {
      if (errorCode.includes(retryable) || errorMessage.includes(retryable)) {
        return true;
      }
    }
    
    // Default behavior for common error patterns
    if (errorCode.includes('NETWORK') || 
        errorCode.includes('TIMEOUT') || 
        errorCode.includes('RATE_LIMIT') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network')) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  calculateBackoffDelay(attempt, config) {
    const baseDelay = config.baseDelay;
    const maxDelay = config.maxDelay;
    const multiplier = config.backoffMultiplier;
    const jitterFactor = config.jitterFactor;
    
    // Calculate exponential backoff
    let delay = baseDelay * Math.pow(multiplier, attempt - 1);
    
    // Apply maximum delay cap
    delay = Math.min(delay, maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = delay * jitterFactor * (Math.random() * 2 - 1); // ±jitterFactor
    delay = Math.max(0, delay + jitter);
    
    return Math.floor(delay);
  }

  /**
   * Check if service can execute (circuit breaker logic)
   */
  canExecute(serviceName) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) {
      return true; // No circuit breaker configured
    }
    
    const now = Date.now();
    
    switch (breaker.state) {
      case 'CLOSED':
        return true;
        
      case 'OPEN':
        if (now >= breaker.nextAttempt) {
          // Transition to half-open
          breaker.state = 'HALF_OPEN';
          breaker.successCount = 0;
          console.log(`🔄 Circuit breaker for ${serviceName} transitioning to HALF_OPEN`);
          return true;
        }
        return false;
        
      case 'HALF_OPEN':
        return true;
        
      default:
        return true;
    }
  }

  /**
   * Record successful operation execution
   */
  recordSuccess(serviceName, operationId, duration) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker) {
      if (breaker.state === 'HALF_OPEN') {
        breaker.successCount++;
        
        // If enough successes, close the circuit
        if (breaker.successCount >= 3) {
          breaker.state = 'CLOSED';
          breaker.failureCount = 0;
          breaker.lastFailure = null;
          breaker.nextAttempt = null;
          console.log(`✅ Circuit breaker for ${serviceName} CLOSED after successful recovery`);
        }
      } else if (breaker.state === 'CLOSED') {
        // Reset failure count on success
        breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      }
    }
    
    // Update service state
    this.updateServiceState(serviceName, 'healthy', null);
  }

  /**
   * Record failed operation execution
   */
  recordFailure(serviceName, operationId, error, isRetryable) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker && !isRetryable) {
      breaker.failureCount++;
      breaker.lastFailure = Date.now();
      
      // Check if threshold is exceeded
      if (breaker.failureCount >= breaker.threshold) {
        breaker.state = 'OPEN';
        breaker.nextAttempt = Date.now() + breaker.timeout;
        console.log(`🚨 Circuit breaker for ${serviceName} OPENED after ${breaker.failureCount} failures`);
        
        // Trigger service degradation
        this.triggerServiceDegradation(serviceName, 'circuit_breaker_open');
      }
    }
    
    // Update service state
    this.updateServiceState(serviceName, 'unhealthy', error.message);
    
    // Log the error
    this.logError(error, ERROR_SEVERITY.MEDIUM, ERROR_CATEGORIES.API);
  }

  /**
   * Update service state and health status
   */
  updateServiceState(serviceName, status, errorMessage) {
    const currentState = this.serviceStates.get(serviceName) || {};
    
    const newState = {
      ...currentState,
      status,
      lastUpdate: Date.now(),
      errorMessage,
      consecutiveFailures: status === 'unhealthy' ? (currentState.consecutiveFailures || 0) + 1 : 0,
      lastSuccess: status === 'healthy' ? Date.now() : currentState.lastSuccess,
      lastFailure: status === 'unhealthy' ? Date.now() : currentState.lastFailure
    };
    
    this.serviceStates.set(serviceName, newState);
    this.updateHealthStore();
  }

  /**
   * Trigger service degradation based on failures
   * Implements requirement 6.1 - graceful degradation modes for service outages
   */
  triggerServiceDegradation(serviceName, reason) {
    console.log(`⚠️ Triggering degradation for ${serviceName}: ${reason}`);
    
    const handler = this.degradationHandlers.get(serviceName);
    if (!handler) {
      console.warn(`No degradation handler found for ${serviceName}`);
      return;
    }
    
    // Determine degradation level based on service state
    const serviceState = this.serviceStates.get(serviceName);
    const consecutiveFailures = serviceState?.consecutiveFailures || 0;
    
    let degradationMode = DEGRADATION_MODES.NORMAL;
    
    if (consecutiveFailures >= 10 || reason === 'circuit_breaker_open') {
      degradationMode = DEGRADATION_MODES.OFFLINE;
    } else if (consecutiveFailures >= 5) {
      degradationMode = DEGRADATION_MODES.MINIMAL;
    } else if (consecutiveFailures >= 2) {
      degradationMode = DEGRADATION_MODES.DEGRADED;
    }
    
    // Apply degradation configuration
    const degradationConfig = handler[degradationMode]();
    
    console.log(`🔧 Applying ${degradationMode} degradation for ${serviceName}:`, degradationConfig);
    
    // Update global degradation mode if necessary
    this.updateGlobalDegradationMode();
    
    // Emit degradation event
    this.emitDegradationEvent(serviceName, degradationMode, degradationConfig, reason);
  }

  /**
   * Update global system degradation mode
   */
  updateGlobalDegradationMode() {
    const serviceStates = Array.from(this.serviceStates.values());
    const unhealthyServices = serviceStates.filter(state => state.status === 'unhealthy').length;
    const totalServices = serviceStates.length;
    
    let newMode = DEGRADATION_MODES.NORMAL;
    
    if (totalServices === 0) {
      newMode = DEGRADATION_MODES.NORMAL;
    } else {
      const unhealthyRatio = unhealthyServices / totalServices;
      
      if (unhealthyRatio >= 0.8) {
        newMode = DEGRADATION_MODES.OFFLINE;
      } else if (unhealthyRatio >= 0.5) {
        newMode = DEGRADATION_MODES.MINIMAL;
      } else if (unhealthyRatio >= 0.2) {
        newMode = DEGRADATION_MODES.DEGRADED;
      }
    }
    
    if (newMode !== this.globalState.degradationMode) {
      console.log(`🌐 Global degradation mode changed: ${this.globalState.degradationMode} → ${newMode}`);
      this.globalState.degradationMode = newMode;
      this.updateStateStore();
    }
  }

  /**
   * Emit degradation event for services to handle
   */
  emitDegradationEvent(serviceName, mode, config, reason) {
    const event = {
      type: 'service_degradation',
      serviceName,
      mode,
      config,
      reason,
      timestamp: Date.now()
    };
    
    // In a real implementation, this would emit to an event bus
    // For now, we'll just log it
    console.log('📡 Degradation event:', event);
    
    // Store event for potential subscribers
    if (!this.degradationEvents) {
      this.degradationEvents = [];
    }
    this.degradationEvents.push(event);
    
    // Keep only last 100 events
    if (this.degradationEvents.length > 100) {
      this.degradationEvents.splice(0, this.degradationEvents.length - 100);
    }
  }

  /**
   * Log error with categorization and severity
   * Implements requirement 6.5 - error logging and monitoring system
   */
  logError(error, severity = ERROR_SEVERITY.MEDIUM, category = ERROR_CATEGORIES.SYSTEM) {
    const errorEntry = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      code: error.code || error.name || 'UNKNOWN_ERROR',
      severity,
      category,
      serviceName: error.serviceName || 'unknown',
      operationId: error.operationId || null,
      attempts: error.attempts || 1,
      originalError: error.originalError ? {
        message: error.originalError.message,
        code: error.originalError.code || error.originalError.name
      } : null,
      context: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        degradationMode: this.globalState.degradationMode
      }
    };
    
    // Add to error log
    this.errorLog.push(errorEntry);
    
    // Maintain log size limit
    if (this.errorLog.length > ERROR_LOG_MAX_SIZE) {
      this.errorLog.splice(0, this.errorLog.length - ERROR_LOG_MAX_SIZE);
    }
    
    // Update error statistics
    this.updateErrorStats(errorEntry);
    
    // Update stores
    this.updateErrorLogStore();
    
    // Update global state
    this.globalState.errorCount++;
    this.globalState.lastError = errorEntry;
    this.updateStateStore();
    
    // Log to console based on severity
    const logMethod = severity === ERROR_SEVERITY.CRITICAL ? 'error' : 
                     severity === ERROR_SEVERITY.HIGH ? 'error' :
                     severity === ERROR_SEVERITY.MEDIUM ? 'warn' : 'log';
    
    console[logMethod](`🚨 [${severity.toUpperCase()}] ${category}: ${error.message}`, {
      code: errorEntry.code,
      serviceName: errorEntry.serviceName,
      attempts: errorEntry.attempts
    });
    
    // Trigger alerts for critical errors
    if (severity === ERROR_SEVERITY.CRITICAL) {
      this.triggerCriticalErrorAlert(errorEntry);
    }
  }

  /**
   * Update error statistics
   */
  updateErrorStats(errorEntry) {
    this.errorStats.totalErrors++;
    
    // Update category stats
    if (!this.errorStats.errorsByCategory[errorEntry.category]) {
      this.errorStats.errorsByCategory[errorEntry.category] = 0;
    }
    this.errorStats.errorsByCategory[errorEntry.category]++;
    
    // Update severity stats
    if (!this.errorStats.errorsBySeverity[errorEntry.severity]) {
      this.errorStats.errorsBySeverity[errorEntry.severity] = 0;
    }
    this.errorStats.errorsBySeverity[errorEntry.severity]++;
    
    // Update service stats
    if (!this.errorStats.errorsByService[errorEntry.serviceName]) {
      this.errorStats.errorsByService[errorEntry.serviceName] = 0;
    }
    this.errorStats.errorsByService[errorEntry.serviceName]++;
  }

  /**
   * Trigger critical error alert
   */
  triggerCriticalErrorAlert(errorEntry) {
    console.error('🚨 CRITICAL ERROR ALERT:', {
      id: errorEntry.id,
      message: errorEntry.message,
      serviceName: errorEntry.serviceName,
      timestamp: new Date(errorEntry.timestamp).toISOString()
    });
    
    // In a real implementation, this would:
    // - Send notifications to administrators
    // - Trigger automated recovery procedures
    // - Update monitoring dashboards
    // - Log to external monitoring services
  }

  /**
   * Start health monitoring for services
   */
  startHealthMonitoring() {
    if (this.healthCheckTimer) {
      return;
    }
    
    console.log('🏥 Starting service health monitoring');
    
    this.healthCheckTimer = setInterval(async () => {
      if (this.isHealthChecking) {
        return; // Skip if already checking
      }
      
      try {
        this.isHealthChecking = true;
        await this.performHealthChecks();
      } catch (error) {
        console.warn('⚠️ Health check error:', error.message);
      } finally {
        this.isHealthChecking = false;
      }
    }, this.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      console.log('⏹️ Stopped service health monitoring');
    }
  }

  /**
   * Perform health checks on all registered services
   */
  async performHealthChecks() {
    const healthChecks = Array.from(this.healthCheckers.entries());
    
    if (healthChecks.length === 0) {
      return;
    }
    
    console.log(`🏥 Performing health checks on ${healthChecks.length} services`);
    
    const results = await Promise.allSettled(
      healthChecks.map(([serviceName, checker]) => 
        this.performSingleHealthCheck(serviceName, checker)
      )
    );
    
    // Process results
    results.forEach((result, index) => {
      const [serviceName] = healthChecks[index];
      
      if (result.status === 'rejected') {
        console.warn(`⚠️ Health check failed for ${serviceName}:`, result.reason.message);
        this.updateServiceState(serviceName, 'unhealthy', result.reason.message);
      }
    });
    
    // Update global degradation mode based on health check results
    this.updateGlobalDegradationMode();
  }

  /**
   * Perform health check for a single service
   */
  async performSingleHealthCheck(serviceName, checker) {
    try {
      const startTime = Date.now();
      const result = await Promise.race([
        checker(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      
      const duration = Date.now() - startTime;
      
      if (result && result.healthy !== false) {
        this.updateServiceState(serviceName, 'healthy', null);
        console.log(`✅ Health check passed for ${serviceName} (${duration}ms)`);
      } else {
        const errorMessage = result?.error || 'Health check failed';
        this.updateServiceState(serviceName, 'unhealthy', errorMessage);
        console.warn(`❌ Health check failed for ${serviceName}: ${errorMessage}`);
      }
      
    } catch (error) {
      this.updateServiceState(serviceName, 'unhealthy', error.message);
      throw error;
    }
  }

  /**
   * Register health checker for a service
   */
  registerHealthChecker(serviceName, checker) {
    if (typeof checker !== 'function') {
      throw new Error('Health checker must be a function');
    }
    
    this.healthCheckers.set(serviceName, checker);
    console.log(`🏥 Health checker registered for ${serviceName}`);
  }

  /**
   * Unregister health checker for a service
   */
  unregisterHealthChecker(serviceName) {
    const removed = this.healthCheckers.delete(serviceName);
    if (removed) {
      console.log(`🗑️ Health checker unregistered for ${serviceName}`);
    }
    return removed;
  }

  /**
   * Setup global error handler for unhandled errors
   */
  setupGlobalErrorHandler() {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        this.logError(error, ERROR_SEVERITY.HIGH, ERROR_CATEGORIES.SYSTEM);
        console.error('🚨 Unhandled promise rejection:', error);
      });
      
      // Handle global errors
      window.addEventListener('error', (event) => {
        const error = event.error || new Error(event.message);
        this.logError(error, ERROR_SEVERITY.HIGH, ERROR_CATEGORIES.SYSTEM);
        console.error('🚨 Global error:', error);
      });
    }
  }

  /**
   * Get error statistics and metrics
   */
  getErrorStats() {
    const uptime = Date.now() - this.globalState.startTime;
    const errorRate = this.errorStats.totalErrors / (uptime / 1000); // errors per second
    
    return {
      ...this.errorStats,
      uptime,
      errorRate,
      globalErrorCount: this.globalState.errorCount,
      degradationMode: this.globalState.degradationMode,
      servicesMonitored: this.serviceStates.size,
      healthyServices: Array.from(this.serviceStates.values()).filter(s => s.status === 'healthy').length,
      unhealthyServices: Array.from(this.serviceStates.values()).filter(s => s.status === 'unhealthy').length
    };
  }

  /**
   * Get recent errors with filtering
   */
  getRecentErrors(options = {}) {
    const { 
      limit = 50, 
      severity = null, 
      category = null, 
      serviceName = null,
      since = null 
    } = options;
    
    let filtered = [...this.errorLog];
    
    // Apply filters
    if (severity) {
      filtered = filtered.filter(error => error.severity === severity);
    }
    
    if (category) {
      filtered = filtered.filter(error => error.category === category);
    }
    
    if (serviceName) {
      filtered = filtered.filter(error => error.serviceName === serviceName);
    }
    
    if (since) {
      filtered = filtered.filter(error => error.timestamp >= since);
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply limit
    return filtered.slice(0, limit);
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName = null) {
    if (serviceName) {
      return this.serviceStates.get(serviceName) || null;
    }
    
    const result = {};
    for (const [name, state] of this.serviceStates) {
      result[name] = state;
    }
    return result;
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(serviceName = null) {
    if (serviceName) {
      return this.circuitBreakers.get(serviceName) || null;
    }
    
    const result = {};
    for (const [name, breaker] of this.circuitBreakers) {
      result[name] = breaker;
    }
    return result;
  }

  /**
   * Reset circuit breaker for a service
   */
  resetCircuitBreaker(serviceName) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker) {
      breaker.state = 'CLOSED';
      breaker.failureCount = 0;
      breaker.lastFailure = null;
      breaker.nextAttempt = null;
      breaker.successCount = 0;
      
      console.log(`🔄 Circuit breaker reset for ${serviceName}`);
      this.updateStateStore();
      return true;
    }
    return false;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    const clearedCount = this.errorLog.length;
    this.errorLog = [];
    this.updateErrorLogStore();
    
    console.log(`🧹 Cleared ${clearedCount} errors from log`);
    return clearedCount;
  }

  /**
   * Reset error statistics
   */
  resetErrorStats() {
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      errorsByService: {},
      recoveryCount: 0,
      lastReset: Date.now()
    };
    
    this.globalState.errorCount = 0;
    this.globalState.lastError = null;
    
    console.log('📊 Error statistics reset');
    this.updateStateStore();
  }

  /**
   * Update reactive stores
   */
  updateStateStore() {
    const circuitBreakers = {};
    for (const [name, breaker] of this.circuitBreakers) {
      circuitBreakers[name] = breaker;
    }
    
    const serviceStates = {};
    for (const [name, state] of this.serviceStates) {
      serviceStates[name] = state;
    }
    
    errorHandlingStateStore.set({
      globalErrorCount: this.globalState.errorCount,
      serviceStates,
      circuitBreakers,
      degradationMode: this.globalState.degradationMode,
      lastError: this.globalState.lastError
    });
  }

  updateErrorLogStore() {
    errorLogStore.set([...this.errorLog]);
  }

  updateHealthStore() {
    const healthData = {};
    for (const [name, state] of this.serviceStates) {
      healthData[name] = {
        status: state.status,
        lastUpdate: state.lastUpdate,
        consecutiveFailures: state.consecutiveFailures,
        lastSuccess: state.lastSuccess,
        lastFailure: state.lastFailure,
        errorMessage: state.errorMessage
      };
    }
    serviceHealthStore.set(healthData);
  }

  /**
   * Utility function for delays
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get framework status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      enableHealthChecks: this.enableHealthChecks,
      healthCheckInterval: this.healthCheckInterval,
      servicesMonitored: this.serviceStates.size,
      circuitBreakers: this.circuitBreakers.size,
      retryConfigs: this.retryConfigs.size,
      healthCheckers: this.healthCheckers.size,
      degradationHandlers: this.degradationHandlers.size,
      errorLogSize: this.errorLog.length,
      globalDegradationMode: this.globalState.degradationMode,
      uptime: Date.now() - this.globalState.startTime
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopHealthMonitoring();
    
    this.errorLog = [];
    this.serviceStates.clear();
    this.circuitBreakers.clear();
    this.retryConfigs.clear();
    this.healthCheckers.clear();
    this.degradationHandlers.clear();
    
    this.globalState = {
      errorCount: 0,
      degradationMode: DEGRADATION_MODES.NORMAL,
      lastError: null,
      startTime: Date.now()
    };
    
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      errorsByService: {},
      recoveryCount: 0,
      lastReset: Date.now()
    };
    
    this.updateStateStore();
    this.updateErrorLogStore();
    this.updateHealthStore();
    
    this.isInitialized = false;
    
    console.log('🧹 Error Handling Framework cleaned up');
  }
}

// Create and export singleton instance
export const errorHandlingFramework = new ErrorHandlingFramework();

export default errorHandlingFramework;