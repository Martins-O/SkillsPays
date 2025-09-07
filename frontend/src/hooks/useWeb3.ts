import { useState, useEffect, useCallback } from 'react';
import { connectWallet, getConnectedAccount, checkNetwork, switchToArbitrumSepolia } from '@/lib/web3';

export function useWeb3() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchNetwork = useCallback(async () => {
    try {
      setIsSwitchingNetwork(true);
      setError(null);
      await switchToArbitrumSepolia();
      const isCorrect = await checkNetwork();
      setIsCorrectNetwork(isCorrect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch network');
    } finally {
      setIsSwitchingNetwork(false);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Check network first
      const isCorrect = await checkNetwork();
      setIsCorrectNetwork(isCorrect);
      
      if (!isCorrect) {
        setError('Please switch to Arbitrum Sepolia network');
        return;
      }
      
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

  // Check for existing connection and network on mount
  useEffect(() => {
    const checkConnectionAndNetwork = async () => {
      try {
        const account = await getConnectedAccount();
        setAccount(account);
        
        const isCorrect = await checkNetwork();
        setIsCorrectNetwork(isCorrect);
      } catch (err) {
        // Ignore errors during initial check
      }
    };

    checkConnectionAndNetwork();
  }, []);

  // Listen for account and network changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = async (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAccount(accounts.length > 0 ? accounts[0] : null);
      
      // Re-check network when account changes
      if (accounts.length > 0) {
        const isCorrect = await checkNetwork();
        setIsCorrectNetwork(isCorrect);
      }
    };

    const handleChainChanged = async () => {
      const isCorrect = await checkNetwork();
      setIsCorrectNetwork(isCorrect);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  return {
    account,
    isConnected: !!account,
    isConnecting,
    isCorrectNetwork,
    isSwitchingNetwork,
    error,
    connect,
    disconnect,
    switchNetwork,
  };
}