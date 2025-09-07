'use client';

import { useState } from 'react';

interface Badge {
  tokenId: number;
  skillId: number;
  level: number;
  skillName: string;
  category: string;
  earnedDate: number;
  verificationLevel: 'Basic' | 'Intermediate' | 'Advanced' | 'Expert';
  description: string;
  issuer: string;
  evidence: string[];
}

interface BadgeViewerProps {
  badge: Badge;
  onClose?: () => void;
}

export default function BadgeViewer({ badge, onClose }: BadgeViewerProps) {
  const [activeTab, setActiveTab] = useState('details');

  const getVerificationColor = (level: string) => {
    switch (level) {
      case 'Expert': return 'from-purple-500 to-pink-500';
      case 'Advanced': return 'from-blue-500 to-cyan-500';
      case 'Intermediate': return 'from-green-500 to-emerald-500';
      case 'Basic': return 'from-gray-500 to-slate-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const shareableLink = `https://skillpays.com/verify/${badge.tokenId}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Badge Details</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="text-center">
                <div className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br ${getVerificationColor(badge.verificationLevel)} flex items-center justify-center mb-4`}>
                  <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{badge.skillName}</h3>
                <p className="text-gray-600 mb-4">{badge.description}</p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-center">
                    {[1, 2, 3, 4].map((level) => (
                      <svg
                        key={level}
                        className={`w-6 h-6 ${
                          level <= badge.level ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">Level {badge.level} - {badge.verificationLevel}</p>
                </div>

                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => navigator.clipboard.writeText(shareableLink)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
                  >
                    Share Badge
                  </button>
                  <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm">
                    Download
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  {['details', 'evidence', 'verification'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>

              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Badge Information</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Token ID:</dt>
                          <dd className="text-gray-900 font-mono">#{badge.tokenId}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Skill ID:</dt>
                          <dd className="text-gray-900">{badge.skillId}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Category:</dt>
                          <dd className="text-gray-900">{badge.category}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Level:</dt>
                          <dd className="text-gray-900">{badge.level}/4</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Verification Details</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Status:</dt>
                          <dd className="text-green-600 font-medium">Verified</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Issued Date:</dt>
                          <dd className="text-gray-900">{new Date(badge.earnedDate).toLocaleDateString()}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Issuer:</dt>
                          <dd className="text-gray-900">{badge.issuer || 'SkillPays'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Verification:</dt>
                          <dd className="text-gray-900">{badge.verificationLevel}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Shareable Link</h4>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded border text-sm text-gray-700 font-mono">
                        {shareableLink}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(shareableLink)}
                        className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'evidence' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Supporting Evidence</h4>
                    <div className="space-y-3">
                      {badge.evidence?.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-gray-600 mb-2">Evidence #{index + 1}</p>
                              <p className="text-gray-900">{item}</p>
                            </div>
                            <button className="text-blue-600 hover:text-blue-800 text-sm">
                              View
                            </button>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-8">
                          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-gray-500">No evidence available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'verification' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Verification Trail</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Badge Issued</p>
                          <p className="text-sm text-gray-600">Badge successfully minted and verified</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(badge.earnedDate).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Skill Verified</p>
                          <p className="text-sm text-gray-600">Peer reviewers confirmed skill competency</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(badge.earnedDate - 3600000).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Evidence Submitted</p>
                          <p className="text-sm text-gray-600">Project and documentation uploaded for review</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(badge.earnedDate - 7200000).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}