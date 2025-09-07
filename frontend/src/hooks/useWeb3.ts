import { useState, useEffect, useCallback } from 'react';
import { connectWallet, getConnectedAccount } from '@/lib/web3';

export function useWeb3() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const account = await connectWallet();
      setAccount(account);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
  }, []);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const account = await getConnectedAccount();
        setAccount(account);
      } catch (err) {
        // Ignore errors during initial check
      }
    };

    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      setAccount(accounts.length > 0 ? accounts[0] : null);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  return {
    account,
    isConnected: !!account,
    isConnecting,
    error,
    connect,
    disconnect,
  };
}