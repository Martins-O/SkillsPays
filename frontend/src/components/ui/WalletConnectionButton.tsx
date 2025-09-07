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
    const { account, isConnected, isConnecting, isCorrectNetwork, isSwitchingNetwork, error, connect, disconnect, switchNetwork } = useWeb3();

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
              
              {/* Network Badge */}
              <Badge 
                variant={isCorrectNetwork ? "success" : "destructive"} 
                size="sm"
              >
                {isCorrectNetwork ? "Arbitrum Sepolia" : "Wrong Network"}
              </Badge>
            </div>
          </div>

          {/* Network Switch / Disconnect Buttons */}
          <div className="flex items-center space-x-2">
            {!isCorrectNetwork && (
              <Button
                variant="warning"
                size="sm"
                onClick={switchNetwork}
                loading={isSwitchingNetwork}
                loadingText="Switching..."
              >
                Switch Network
              </Button>
            )}
            <Button
              ref={ref}
              variant="outline"
              size="sm"
              onClick={handleClick}
              disabled={isSwitchingNetwork}
              {...props}
            >
              Disconnect
            </Button>
          </div>
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
          <div className="flex items-center space-x-2">
            <p className="text-xs text-danger-600">{error}</p>
            {error.includes('switch to Arbitrum Sepolia') && (
              <Button
                variant="warning"
                size="sm"
                onClick={switchNetwork}
                loading={isSwitchingNetwork}
                loadingText="Switching..."
              >
                Switch Network
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

WalletConnectionButton.displayName = 'WalletConnectionButton';

export { WalletConnectionButton };