import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';

// Arbitrum Sepolia network configuration
export const ARBITRUM_SEPOLIA_CHAIN_ID = '0x66eee'; // 421614 in hex
export const ARBITRUM_SEPOLIA_CONFIG = {
  chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
  chainName: 'Arbitrum Sepolia',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
  blockExplorerUrls: ['https://sepolia.arbiscan.io/'],
};

// Initialize provider - defaults to localhost for development
export function getProvider(): ethers.Provider {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  // Fallback to localhost for development
  return new ethers.JsonRpcProvider('http://localhost:8545');
}

// Get signer for transactions
export async function getSigner(): Promise<ethers.Signer> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet detected');
  }
  
  // Check network before getting signer
  const isCorrectNetwork = await checkNetwork();
  if (!isCorrectNetwork) {
    throw new Error('Please switch to Arbitrum Sepolia network to perform transactions');
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

// Check if user is on correct network
export async function checkNetwork(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return false;
  }

  try {
    const chainId = await window.ethereum.request({
      method: 'eth_chainId',
    }) as string;

    return chainId === ARBITRUM_SEPOLIA_CHAIN_ID;
  } catch (error) {
    console.error('Failed to check network:', error);
    return false;
  }
}

// Switch to Arbitrum Sepolia network
export async function switchToArbitrumSepolia(): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not detected');
  }

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARBITRUM_SEPOLIA_CHAIN_ID }],
    });
  } catch (switchError: any) {
    // If the network doesn't exist, add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [ARBITRUM_SEPOLIA_CONFIG],
        });
      } catch (addError) {
        throw new Error('Failed to add Arbitrum Sepolia network to wallet');
      }
    } else {
      throw new Error('Failed to switch to Arbitrum Sepolia network');
    }
  }
}

// Connect wallet with network validation
export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not detected');
  }

  // First, request account access
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  }) as string[];

  // Check if on correct network
  const isCorrectNetwork = await checkNetwork();
  if (!isCorrectNetwork) {
    throw new Error('Please switch to Arbitrum Sepolia network');
  }

  return accounts[0];
}

// Check if wallet is connected
export async function getConnectedAccount(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  const accounts = await window.ethereum.request({
    method: 'eth_accounts',
  }) as string[];

  return accounts.length > 0 ? accounts[0] : null;
}

// Contract factory function
export function getContract(contractName: keyof typeof CONTRACT_ADDRESSES, abi: ethers.InterfaceAbi, signer?: ethers.Signer) {
  const address = CONTRACT_ADDRESSES[contractName];
  const provider = signer || getProvider();
  return new ethers.Contract(address, abi, provider);
}

// Add global types for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isConnected: () => boolean;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}