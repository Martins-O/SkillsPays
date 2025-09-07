'use client';

import React, { useState } from 'react';
import PeerReviewDashboard from '@/components/contracts/PeerReviewSystem/PeerReviewDashboard';
import ReviewRequestForm from '@/components/contracts/PeerReviewSystem/ReviewRequestForm';

export default function PeerReviewPage() {
  const [activeTab, setActiveTab] = useState<'submit' | 'review'>('submit');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Peer Review System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get quality feedback on your code from experienced developers and help others
            improve their skills by providing thoughtful reviews.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex justify-center">
              <button
                onClick={() => setActiveTab('submit')}
                className={`py-4 px-8 border-b-2 font-medium text-lg ${
                  activeTab === 'submit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Submit for Review
              </button>
              <button
                onClick={() => setActiveTab('review')}
                className={`py-4 px-8 border-b-2 font-medium text-lg ${
                  activeTab === 'review'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Review Others&apos; Work
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'submit' && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Submit Your Work
                  </h2>
                  <p className="text-gray-600">
                    Upload your project or milestone submission to get peer feedback
                  </p>
                </div>
                <ReviewRequestForm />
              </div>
            )}

            {activeTab === 'review' && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Review Dashboard
                  </h2>
                  <p className="text-gray-600">
                    Review student submissions and earn rewards for quality feedback
                  </p>
                </div>
                <PeerReviewDashboard />
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Quality Assurance</h3>
              <p className="text-gray-600 text-sm">
                Anti-collusion mechanisms and reputation scoring ensure high-quality, unbiased reviews
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Earn Rewards</h3>
              <p className="text-gray-600 text-sm">
                Earn ETH and reputation points for providing thorough, helpful reviews to fellow students
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Turnaround</h3>
              <p className="text-gray-600 text-sm">
                Get comprehensive feedback within 72 hours from multiple qualified reviewers
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}