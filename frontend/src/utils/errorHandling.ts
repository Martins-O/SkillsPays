/**
 * Error handling utilities for robust application behavior
 */

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
}

/**
 * Retries an async function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    retryCondition = () => true
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if condition fails or it's the last attempt
      if (!retryCondition(lastError) || attempt === maxAttempts) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network errors are usually retryable
  if (message.includes('network') || 
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('fetch')) {
    return true;
  }
  
  // RPC errors that are retryable
  if (message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('server error') ||
      message.includes('internal error')) {
    return true;
  }
  
  return false;
}

/**
 * Safe async function wrapper that never throws
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  errorHandler?: (error: Error) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    errorHandler?.(err);
    console.error('SafeAsync caught error:', err);
    return fallback;
  }
}

/**
 * Contract call wrapper with error handling and retries
 */
export async function safeContractCall<T>(
  contractCall: () => Promise<T>,
  fallback: T,
  options: RetryOptions = {}
): Promise<T> {
  return safeAsync(
    () => withRetry(contractCall, {
      retryCondition: isRetryableError,
      ...options
    }),
    fallback,
    (error) => console.error('Contract call failed:', error)
  );
}

/**
 * User-friendly error messages
 */
export function getUserFriendlyError(error: Error): string {
  const message = error.message.toLowerCase();

  // Wallet errors
  if (message.includes('user rejected') || message.includes('user denied')) {
    return 'Transaction was cancelled by user';
  }
  
  if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
    return 'Insufficient funds to complete this transaction';
  }
  
  if (message.includes('gas')) {
    return 'Transaction failed due to gas estimation error. Please try again.';
  }

  // Network errors
  if (message.includes('network') || message.includes('connection')) {
    return 'Network connection error. Please check your internet and try again.';
  }

  // Contract errors
  if (message.includes('revert') || message.includes('execution reverted')) {
    return 'Transaction was rejected by the smart contract. Please check your input.';
  }

  // Wallet connection errors
  if (message.includes('wallet') && message.includes('connect')) {
    return 'Please connect your wallet to continue';
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Generic fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Toast notification helper for errors
 */
export interface ErrorNotification {
  show: (message: string, type?: 'error' | 'warning' | 'info') => void;
}

export function handleUserError(
  error: Error,
  notification?: ErrorNotification,
  context?: string
) {
  const userMessage = getUserFriendlyError(error);
  const fullMessage = context ? `${context}: ${userMessage}` : userMessage;
  
  console.error('User error:', error);
  notification?.show(fullMessage, 'error');
}

/**
 * Circuit breaker for failing operations
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private maxFailures = 5,
    private resetTimeout = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - too many recent failures');
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'half-open') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.maxFailures) {
      this.state = 'open';
    }
  }

  private reset() {
    this.failureCount = 0;
    this.state = 'closed';
  }
}