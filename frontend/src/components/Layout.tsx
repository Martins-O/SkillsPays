'use client';

import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 py-16 px-4 sm:px-6 lg:px-8">
            {/* SkillPays Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  SkillPays
                </h3>
                <p className="text-gray-300 leading-relaxed max-w-md">
                  The world&apos;s first decentralized learning platform where education meets blockchain technology. 
                  Earn cryptocurrency rewards, gain verified credentials, and unlock opportunities while you learn.
                </p>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-blue-300">Platform Features</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-300">Blockchain Verified Credentials</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-sm text-gray-300">Cryptocurrency Rewards</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-sm text-gray-300">Expert Peer Review</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-sm text-gray-300">Global Mentorship Network</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold">Quick Links</h4>
              <div className="space-y-3">
                <a href="/skills" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  Browse Skills
                </a>
                <a href="/bootcamps" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  Bootcamps
                </a>
                <a href="/mentor" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  Find a Mentor
                </a>
                <a href="/peer-review" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  Peer Review
                </a>
                <a href="/rewards" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  Rewards
                </a>
                <a href="/leaderboard" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  Leaderboard
                </a>
              </div>
            </div>

            {/* Resources */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold">Resources</h4>
              <div className="space-y-3">
                <a href="#" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  Documentation
                </a>
                <a href="#" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  API Reference
                </a>
                <a href="#" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  Smart Contracts
                </a>
                <a href="#" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  Whitepaper
                </a>
                <a href="#" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  GitHub
                </a>
                <a href="#" className="block text-gray-300 hover:text-blue-400 transition-colors">
                  Support Center
                </a>
              </div>
            </div>
          </div>

          {/* Arbitrum Network Section */}
          <div className="border-t border-gray-700">
            <div className="py-12 px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">Ⓐ</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-blue-400">Built on Arbitrum</h3>
                      <p className="text-sm text-gray-400">Layer 2 Ethereum Scaling Solution</p>
                    </div>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    SkillPays is built on Arbitrum, a leading Layer 2 scaling solution for Ethereum that provides 
                    fast, low-cost transactions while maintaining the security and decentralization of the Ethereum mainnet. 
                    This enables us to offer seamless user experiences with minimal transaction fees.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-800/50">
                      <div className="text-blue-400 font-semibold mb-1">Lightning Fast</div>
                      <div className="text-gray-300 text-sm">Transactions confirm in seconds, not minutes</div>
                    </div>
                    <div className="bg-green-900/30 rounded-xl p-4 border border-green-800/50">
                      <div className="text-green-400 font-semibold mb-1">Low Fees</div>
                      <div className="text-gray-300 text-sm">Minimal gas costs for all interactions</div>
                    </div>
                    <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-800/50">
                      <div className="text-purple-400 font-semibold mb-1">Ethereum Security</div>
                      <div className="text-gray-300 text-sm">Inherits Ethereum&apos;s proven security model</div>
                    </div>
                    <div className="bg-orange-900/30 rounded-xl p-4 border border-orange-800/50">
                      <div className="text-orange-400 font-semibold mb-1">EVM Compatible</div>
                      <div className="text-gray-300 text-sm">Full compatibility with Ethereum tools</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-800/50 to-purple-800/50 rounded-2xl p-8 border border-blue-700/50">
                    <h4 className="text-xl font-bold text-white mb-4">Why Arbitrum for Education?</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <div>
                          <div className="font-semibold text-blue-200">Affordable Learning</div>
                          <div className="text-gray-300 text-sm">Low transaction costs make micro-rewards and frequent interactions economically viable</div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <div>
                          <div className="font-semibold text-green-200">Instant Feedback</div>
                          <div className="text-gray-300 text-sm">Fast block times enable immediate reward distribution and credential verification</div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <div>
                          <div className="font-semibold text-purple-200">Global Access</div>
                          <div className="text-gray-300 text-sm">Decentralized infrastructure ensures learning opportunities for everyone, everywhere</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <a 
                      href="https://arbitrum.io" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold"
                    >
                      Learn More About Arbitrum
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700">
            <div className="py-8 px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-8">
                  <p className="text-gray-400 text-sm">
                    © 2024 SkillPays. Revolutionizing education through blockchain technology.
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-gray-400 text-xs">Platform Status: Beta</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-400 text-xs font-mono">Chain ID: 421614</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    <span className="sr-only">Twitter</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    <span className="sr-only">GitHub</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    <span className="sr-only">Discord</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}