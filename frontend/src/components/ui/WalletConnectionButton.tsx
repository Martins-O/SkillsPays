import React from 'react';
import { Button, type ButtonProps } from './Button';
import { Badge } from './Badge';
import { formatAddress } from '@/lib/utils';
import { useWeb3 } from '@/hooks/useWeb3';

interface WalletConnectionButtonProps extends Omit<ButtonProps, 'onClick'> {
  showBalance?: boolean;
  showChainId?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const WalletConnectionButton = React.forwardRef<HTMLButtonElement, WalletConnectionButtonProps>(
  ({
    showBalance = false,
    showChainId = false,
    onConnect,
    onDisconnect,
    children,
    ...props
  }, ref) => {
    const { account, isConnected, isConnecting, error, connect, disconnect } = useWeb3();

    const handleClick = async () => {
      if (isConnected) {
        await disconnect();
        onDisconnect?.();
      } else {
        await connect();
        onConnect?.();
      }
    };

    if (isConnected && account) {
      return (
        <div className="flex items-center space-x-3">
          {/* Account Info */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 rounded-lg bg-neutral-100 px-3 py-2">
              {/* Connection Status Indicator */}
              <div className="h-2 w-2 rounded-full bg-secondary-500"></div>
              
              {/* Address */}
              <span className="font-mono text-sm font-medium text-neutral-900">
                {formatAddress(account)}
              </span>
              
              {/* Chain Badge */}
              {showChainId && (
                <Badge variant="outline" size="sm">
                  Ethereum
                </Badge>
              )}
            </div>
          </div>

          {/* Disconnect Button */}
          <Button
            ref={ref}
            variant="outline"
            size="sm"
            onClick={handleClick}
            {...props}
          >
            Disconnect
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Button
          ref={ref}
          onClick={handleClick}
          loading={isConnecting}
          loadingText="Connecting..."
          leftIcon={
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          }
          {...props}
        >
          {children || 'Connect Wallet'}
        </Button>

        {error && (
          <p className="text-xs text-danger-600">{error}</p>
        )}
      </div>
    );
  }
);

WalletConnectionButton.displayName = 'WalletConnectionButton';

export { WalletConnectionButton };