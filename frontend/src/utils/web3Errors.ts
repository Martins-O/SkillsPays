// Web3 Error Handling Utilities

export interface Web3Error extends Error {
  code?: number;
  data?: any;
  reason?: string;
}

export function getWeb3ErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Unknown error occurred';
  }

  const err = error as Web3Error;
  const message = err.message?.toLowerCase() || '';

  // User rejection
  if (message.includes('user rejected') || message.includes('user denied') || err.code === 4001) {
    return 'Transaction was cancelled by user. Please try again and approve the transaction.';
  }

  // Insufficient funds
  if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
    return 'Insufficient funds to complete this transaction. Please check your wallet balance.';
  }

  // Gas-related errors
  if (message.includes('gas') || message.includes('out of gas')) {
    if (message.includes('gas price')) {
      return 'Gas price too low. Please try again with a higher gas price.';
    }
    return 'Transaction ran out of gas. Please try again with a higher gas limit.';
  }

  // Network errors
  if (message.includes('network') || message.includes('connection')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }

  // Contract-specific errors
  if (message.includes('execution reverted')) {
    const reason = err.reason || extractRevertReason(message);
    if (reason) {
      return `Transaction failed: ${reason}`;
    }
    return 'Transaction was reverted by the smart contract. Please check your inputs and try again.';
  }

  // Nonce errors
  if (message.includes('nonce') || message.includes('replacement')) {
    return 'Transaction nonce error. Please reset your wallet account or wait for pending transactions to complete.';
  }

  // MetaMask specific
  if (message.includes('metamask') || message.includes('wallet')) {
    return 'Wallet error. Please check your wallet connection and try again.';
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Generic fallback with original message
  return err.message || 'Transaction failed. Please try again.';
}

function extractRevertReason(message: string): string | null {
  // Try to extract revert reason from error message
  const revertMatch = message.match(/execution reverted:?\s*(.+)/i);
  if (revertMatch && revertMatch[1]) {
    return revertMatch[1].trim().replace(/['"]/g, '');
  }

  const reasonMatch = message.match(/reason:\s*(.+)/i);
  if (reasonMatch && reasonMatch[1]) {
    return reasonMatch[1].trim().replace(/['"]/g, '');
  }

  return null;
}

export function isWeb3Error(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as Web3Error;
  const message = err.message?.toLowerCase() || '';

  return (
    message.includes('metamask') ||
    message.includes('web3') ||
    message.includes('ethereum') ||
    message.includes('user rejected') ||
    message.includes('insufficient funds') ||
    message.includes('gas') ||
    message.includes('execution reverted') ||
    message.includes('network') ||
    err.code === 4001 || // User rejection
    err.code === 4100 || // Unauthorized
    err.code === 4200 || // Unsupported method
    err.code === 4900 || // Disconnected
    err.code === 4901    // Chain disconnected
  );
}

export function getErrorSeverity(error: unknown): 'low' | 'medium' | 'high' {
  if (!error || typeof error !== 'object') {
    return 'medium';
  }

  const err = error as Web3Error;
  const message = err.message?.toLowerCase() || '';

  // Low severity - user actions
  if (message.includes('user rejected') || err.code === 4001) {
    return 'low';
  }

  // High severity - system/contract errors
  if (
    message.includes('execution reverted') ||
    message.includes('contract') ||
    message.includes('network') ||
    message.includes('insufficient funds')
  ) {
    return 'high';
  }

  return 'medium';
}