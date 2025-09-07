import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';

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
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

// Connect wallet
export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not detected');
  }

  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  }) as string[];

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