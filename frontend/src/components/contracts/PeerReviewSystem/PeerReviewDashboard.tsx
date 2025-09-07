'use client';

import React, { useState, useEffect } from 'react';
import { usePeerReviewSystem } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface ReviewRequest {
  id: number;
  student: string;
  bootcampId: number;
  milestoneId: number;
  submissionHash: string;
  createdAt: number;
  deadline: number;
  isCompleted: boolean;
  requiredReviews: number;
  completedReviews: number;
}

interface Review {
  requestId: number;
  reviewer: string;
  score: number;
  feedback: string;
  evidenceHash: string;
  submittedAt: number;
  isVerified: boolean;
  helpfulnessScore: number;
}

interface ReviewerProfile {
  reviewerAddress: string;
  totalReviews: number;
  averageScore: number;
  reputationScore: number;
  specializations: number;
  isActive: boolean;
  stakingAmount: number;
  joinedAt: number;
}

export default function PeerReviewDashboard() {
  const { account } = useWeb3();
  const peerReview = usePeerReviewSystem();
  
  const [activeTab, setActiveTab] = useState<'reviews' | 'submit' | 'profile'>('reviews');
  const [pendingReviews, setPendingReviews] = useState<ReviewRequest[]>([]);
  const [reviewerProfile, setReviewerProfile] = useState<ReviewerProfile | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  
  // Registration form state
  const [stakeAmount, setStakeAmount] = useState('0.1');
  
  // Review submission form state
  const [selectedRequest, setSelectedRequest] = useState<ReviewRequest | null>(null);
  const [reviewScore, setReviewScore] = useState(80);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [evidenceHash, setEvidenceHash] = useState('');

  useEffect(() => {
    if (account) {
      loadReviewerData();
    }
  }, [account]);

  const loadReviewerData = async () => {
    if (!account) return;
    
    try {
      const profile = await peerReview.getReviewerProfile(account);
      if (profile && profile.isActive) {
        setReviewerProfile(profile);
        setIsRegistered(true);
        
        const pending = await peerReview.getPendingReviews(account);
        setPendingReviews(pending || []);
      }
    } catch (error) {
      console.error('Error loading reviewer data:', error);
    }
  };

  const handleRegisterReviewer = async () => {
    if (!account || peerReview.loading) return;
    
    try {
      await peerReview.registerReviewer(stakeAmount);
      await loadReviewerData();
    } catch (error) {
      console.error('Error registering reviewer:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest || !account || peerReview.loading) return;
    
    try {
      await peerReview.submitReview(
        selectedRequest.id,
        reviewScore,
        reviewFeedback,
        evidenceHash
      );
      
      setSelectedRequest(null);
      setReviewScore(80);
      setReviewFeedback('');
      setEvidenceHash('');
      await loadReviewerData();
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please connect your wallet to access the Peer Review System.</p>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Register as Peer Reviewer</h2>
          
          <div className="space-y-6">
            <div>
              <p className="text-gray-600 mb-4">
                Join the peer review network to help evaluate student submissions and earn rewards.
                You&apos;ll need to stake ETH to ensure quality reviews.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">Requirements:</h3>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>• Minimum stake: 0.1 ETH</li>
                  <li>• Commit to providing quality, detailed reviews</li>
                  <li>• Complete reviews within 72-hour deadline</li>
                  <li>• Maintain good reputation score</li>
                </ul>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stake Amount (ETH)
              </label>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                min="0.1"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.1"
              />
            </div>
            
            <button
              onClick={handleRegisterReviewer}
              disabled={peerReview.loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {peerReview.loading ? 'Registering...' : `Register & Stake ${stakeAmount} ETH`}
            </button>
            
            {peerReview.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{peerReview.error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'reviews'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending Reviews ({pendingReviews.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'reviews' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Pending Reviews</h2>
              
              {pendingReviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending reviews at the moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReviews.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Review #{request.id}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Student: {formatAddress(request.student)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Bootcamp #{request.bootcampId} - Milestone #{request.milestoneId}
                          </p>
                          <p className="text-sm text-gray-600">
                            Deadline: {formatDate(request.deadline)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {request.completedReviews}/{request.requiredReviews} reviews
                          </p>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(request.completedReviews / request.requiredReviews) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Review Submission
                        </button>
                        <a
                          href={`https://ipfs.io/ipfs/${request.submissionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                        >
                          View Submission
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && reviewerProfile && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Reviewer Profile</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Statistics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Reviews:</span>
                      <span className="font-semibold">{reviewerProfile.totalReviews}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Score Given:</span>
                      <span className="font-semibold">{reviewerProfile.averageScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reputation Score:</span>
                      <span className="font-semibold text-green-600">
                        {reviewerProfile.reputationScore}/1000
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Staked Amount:</span>
                      <span className="font-semibold">
                        {(reviewerProfile.stakingAmount / 1e18).toFixed(3)} ETH
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-semibold px-2 py-1 rounded text-sm ${
                        reviewerProfile.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {reviewerProfile.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Joined:</span>
                      <span className="font-semibold">
                        {formatDate(reviewerProfile.joinedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Submission Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Submit Review for #{selectedRequest.id}
                </h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Submission Details</h4>
                  <p className="text-sm text-gray-600">Student: {formatAddress(selectedRequest.student)}</p>
                  <p className="text-sm text-gray-600">Bootcamp #{selectedRequest.bootcampId} - Milestone #{selectedRequest.milestoneId}</p>
                  <a
                    href={`https://ipfs.io/ipfs/${selectedRequest.submissionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm underline mt-2 inline-block"
                  >
                    View Submission on IPFS
                  </a>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Score (0-100)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={reviewScore}
                    onChange={(e) => setReviewScore(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>0</span>
                    <span className="font-semibold">{reviewScore}</span>
                    <span>100</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detailed Feedback
                  </label>
                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Provide detailed feedback on code quality, architecture, best practices, areas for improvement..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evidence/Justification Hash (IPFS)
                  </label>
                  <input
                    type="text"
                    value={evidenceHash}
                    onChange={(e) => setEvidenceHash(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="QmXXXXXX... (optional)"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    IPFS hash of detailed review evidence or supporting materials
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleSubmitReview}
                    disabled={peerReview.loading || !reviewFeedback.trim()}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {peerReview.loading ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
                
                {peerReview.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{peerReview.error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}