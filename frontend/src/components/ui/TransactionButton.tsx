import React, { useState, useCallback } from 'react';
import { Button, type ButtonProps } from './Button';
import { Alert } from './Alert';
import { Badge } from './Badge';
import { cn } from '@/lib/utils';
import { TransactionState, isTransactionResponse, hasTransactionHash } from '@/types/web3';
import { getWeb3ErrorMessage } from '@/utils/web3Errors';

// TransactionState is now imported from types/web3.ts

interface TransactionButtonProps extends Omit<ButtonProps, 'loading' | 'onClick' | 'onError'> {
  onTransaction: () => Promise<unknown>;
  successMessage?: string;
  errorMessage?: string;
  pendingMessage?: string;
  confirmingMessage?: string;
  requiredConfirmations?: number;
  showTransactionHash?: boolean;
  resetOnSuccess?: boolean;
  onSuccess?: (result: unknown) => void;
  onError?: (error: Error) => void;
}

const TransactionButton = React.forwardRef<HTMLButtonElement, TransactionButtonProps>(
  ({
    onTransaction,
    successMessage = 'Transaction successful!',
    errorMessage = 'Transaction failed',
    pendingMessage = 'Confirm in wallet...',
    confirmingMessage = 'Confirming transaction...',
    requiredConfirmations = 1,
    showTransactionHash = true,
    resetOnSuccess = false,
    onSuccess,
    onError,
    children,
    className,
    ...props
  }, ref) => {
    const [txState, setTxState] = useState<TransactionState>({ status: 'idle' });

    const handleTransaction = useCallback(async () => {
      try {
        setTxState({ status: 'pending' });
        
        const result = await onTransaction();
        
        if (hasTransactionHash(result)) {
          setTxState({ 
            status: 'confirming', 
            hash: result.hash,
            confirmations: 0,
            requiredConfirmations 
          });
          
          // Wait for confirmations
          if (isTransactionResponse(result)) {
            const receipt = await result.wait();
            setTxState({ 
              status: 'success', 
              hash: receipt.hash || result.hash,
              confirmations: 1
            });
            onSuccess?.(receipt);
          } else {
            setTxState({ 
              status: 'success', 
              hash: result.hash,
              confirmations: 1
            });
            onSuccess?.(result);
          }
          
          if (resetOnSuccess) {
            setTimeout(() => {
              setTxState({ status: 'idle' });
            }, 3000);
          }
        } else {
          setTxState({ status: 'success' });
          onSuccess?.(result);
          
          if (resetOnSuccess) {
            setTimeout(() => {
              setTxState({ status: 'idle' });
            }, 3000);
          }
        }
      } catch (error) {
        const errorMessage = getWeb3ErrorMessage(error);
        setTxState({ 
          status: 'error', 
          error: errorMessage 
        });
        onError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    }, [onTransaction, onSuccess, onError, requiredConfirmations, resetOnSuccess]);

    const getButtonText = () => {
      switch (txState.status) {
        case 'pending':
          return pendingMessage;
        case 'confirming':
          return confirmingMessage;
        case 'success':
          return 'Success!';
        case 'error':
          return 'Try Again';
        default:
          return children;
      }
    };

    const getButtonVariant = (): ButtonProps['variant'] => {
      switch (txState.status) {
        case 'success':
          return 'success';
        case 'error':
          return 'destructive';
        default:
          return props.variant;
      }
    };

    const isLoading = txState.status === 'pending' || txState.status === 'confirming';

    return (
      <div className="space-y-3">
        <Button
          ref={ref}
          {...props}
          variant={getButtonVariant()}
          loading={isLoading}
          onClick={handleTransaction}
          disabled={props.disabled || isLoading}
          className={cn(className)}
        >
          {getButtonText()}
        </Button>

        {/* Transaction Status */}
        {txState.status === 'confirming' && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Status:</span>
            <Badge variant="pending" pulse>
              {txState.confirmations || 0}/{txState.requiredConfirmations || 1} confirmations
            </Badge>
          </div>
        )}

        {/* Transaction Hash */}
        {showTransactionHash && txState.hash && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Transaction:</span>
            <a
              href={`https://etherscan.io/tx/${txState.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary-600 hover:text-primary-700 truncate max-w-32"
            >
              {txState.hash}
            </a>
          </div>
        )}

        {/* Success Alert */}
        {txState.status === 'success' && (
          <Alert variant="success" dismissible onDismiss={() => setTxState({ status: 'idle' })}>
            {successMessage}
          </Alert>
        )}

        {/* Error Alert */}
        {txState.status === 'error' && (
          <Alert variant="error" dismissible onDismiss={() => setTxState({ status: 'idle' })}>
            {txState.error || errorMessage}
          </Alert>
        )}
      </div>
    );
  }
);

TransactionButton.displayName = 'TransactionButton';

export { TransactionButton, type TransactionButtonProps, type TransactionState };