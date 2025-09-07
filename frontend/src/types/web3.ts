// Web3 Type Definitions

import { ContractTransactionResponse, TransactionReceipt } from 'ethers';

export interface TransactionResponse {
  hash: string;
  wait(): Promise<TransactionReceipt>;
}

export interface TransactionResult {
  hash?: string;
  wait?: () => Promise<TransactionReceipt>;
}

export type TransactionStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

export interface TransactionState {
  status: TransactionStatus;
  hash?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  error?: string;
}

// Type guards
export function isTransactionResponse(obj: unknown): obj is TransactionResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hash' in obj &&
    typeof (obj as any).hash === 'string' &&
    'wait' in obj &&
    typeof (obj as any).wait === 'function'
  );
}

export function hasTransactionHash(obj: unknown): obj is { hash: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hash' in obj &&
    typeof (obj as any).hash === 'string'
  );
}

export function isTransactionReceipt(obj: unknown): obj is TransactionReceipt {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hash' in obj &&
    'blockNumber' in obj
  );
}