'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      errorId: Math.random().toString(36).substring(7)
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(7)
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error for monitoring
    if (typeof window !== 'undefined') {
      // In production, you'd send this to your error monitoring service
      console.error('Error ID:', this.state.errorId);
      console.error('Component Stack:', errorInfo.componentStack);
    }
    
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined,
      errorId: Math.random().toString(36).substring(7)
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="p-4 bg-red-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              
              <p className="text-sm text-gray-400">
                Error ID: {this.state.errorId}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Web3 specific error boundary
interface Web3ErrorBoundaryProps extends Props {
  networkName?: string;
}

export class Web3ErrorBoundary extends ErrorBoundary {
  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const isWeb3Error = error?.message?.includes('user rejected') ||
                         error?.message?.includes('insufficient funds') ||
                         error?.message?.includes('network') ||
                         error?.message?.includes('MetaMask');
      
      if (isWeb3Error) {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  Web3 Transaction Error
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {this.getWeb3ErrorMessage(error)}
                </p>
                <button
                  onClick={this.handleRetry}
                  className="text-sm text-yellow-800 underline hover:no-underline mt-2"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        );
      }
    }

    return super.render();
  }

  private getWeb3ErrorMessage(error?: Error): string {
    if (!error) return 'Unknown Web3 error occurred';
    
    const message = error.message.toLowerCase();
    
    if (message.includes('user rejected')) {
      return 'Transaction was cancelled. Please try again and confirm the transaction.';
    }
    if (message.includes('insufficient funds')) {
      return 'Insufficient funds to complete this transaction. Please check your wallet balance.';
    }
    if (message.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (message.includes('gas')) {
      return 'Transaction failed due to gas issues. Please try again with higher gas limit.';
    }
    
    return error.message;
  }
}

export default ErrorBoundary;