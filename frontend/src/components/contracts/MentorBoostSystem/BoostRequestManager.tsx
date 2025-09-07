'use client';

import React, { useState, useEffect } from 'react';
import { useMentorBoostSystem } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface BoostRequest {
  id: number;
  student: string;
  mentor: string;
  bootcampId: number;
  milestoneId: number;
  submissionHash: string;
  boostType: string;
  requestedAmount: number;
  justification: string;
  isApproved: boolean;
  isCompleted: boolean;
  createdAt: number;
  processedAt: number;
}

interface MicroReward {
  id: number;
  student: string;
  mentor: string;
  amount: number;
  reason: string;
  evidenceHash: string;
  timestamp: number;
  isClaimed: boolean;
}

export default function BoostRequestManager() {
  const { account } = useWeb3();
  const mentorBoost = useMentorBoostSystem();
  
  const [activeTab, setActiveTab] = useState<'requests' | 'rewards' | 'issue'>('requests');
  const [boostRequests, setBoostRequests] = useState<BoostRequest[]>([]);
  const [microRewards, setMicroRewards] = useState<MicroReward[]>([]);
  
  // Issue reward form state
  const [rewardForm, setRewardForm] = useState({
    studentAddress: '',
    amount: '0.001',
    reason: '',
    evidenceHash: ''
  });

  useEffect(() => {
    if (account) {
      loadBoostData();
    }
  }, [account]);

  const loadBoostData = async () => {
    if (!account) return;
    
    try {
      // Load real boost request and reward data from contracts
      // For now, set empty until real data is implemented
      setBoostRequests([]);
      setMicroRewards([]);
    } catch (error) {
      console.error('Error loading boost data:', error);
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      // In real implementation, call contract method
      setBoostRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, isApproved: true, processedAt: Date.now() / 1000 }
            : req
        )
      );
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleCompleteBoost = async (requestId: number) => {
    try {
      // In real implementation, call contract method
      setBoostRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, isCompleted: true, processedAt: Date.now() / 1000 }
            : req
        )
      );
    } catch (error) {
      console.error('Error completing boost:', error);
    }
  };

  const handleIssueMicroReward = async () => {
    if (!rewardForm.studentAddress || !rewardForm.amount || !rewardForm.reason) return;
    
    try {
      const newReward: MicroReward = {
        id: microRewards.length + 1,
        student: rewardForm.studentAddress,
        mentor: account!,
        amount: parseFloat(rewardForm.amount) * 1e18,
        reason: rewardForm.reason,
        evidenceHash: rewardForm.evidenceHash,
        timestamp: Date.now() / 1000,
        isClaimed: false
      };

      setMicroRewards(prev => [newReward, ...prev]);
      
      // Reset form
      setRewardForm({
        studentAddress: '',
        amount: '0.001',
        reason: '',
        evidenceHash: ''
      });
    } catch (error) {
      console.error('Error issuing micro-reward:', error);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatEther = (wei: number) => {
    return (wei / 1e18).toFixed(4);
  };

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please connect your wallet to manage boost requests.</p>
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
              onClick={() => setActiveTab('requests')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Boost Requests ({boostRequests.filter(r => !r.isCompleted).length})
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'rewards'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Issued Rewards ({microRewards.length})
            </button>
            <button
              onClick={() => setActiveTab('issue')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'issue'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Issue Reward
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'requests' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Boost Requests</h2>
              
              {boostRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No boost requests at the moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {boostRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Boost Request #{request.id}
                          </h3>
                          <p className="text-sm text-gray-600">
                            From: {formatAddress(request.student)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Bootcamp #{request.bootcampId} - Milestone #{request.milestoneId}
                          </p>
                          <p className="text-sm text-gray-600">
                            Type: {request.boostType.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            Requested: {formatDate(request.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            request.isCompleted 
                              ? 'bg-green-100 text-green-800'
                              : request.isApproved 
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {request.isCompleted ? 'Completed' : 
                             request.isApproved ? 'Approved' : 'Pending'}
                          </span>
                          {request.requestedAmount > 0 && (
                            <p className="text-sm text-gray-600 mt-2">
                              {formatEther(request.requestedAmount)} ETH
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Justification:</h4>
                        <p className="text-gray-700 text-sm">{request.justification}</p>
                      </div>
                      
                      <div className="flex space-x-3">
                        {request.submissionHash && (
                          <a
                            href={`https://ipfs.io/ipfs/${request.submissionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                          >
                            View Submission
                          </a>
                        )}
                        
                        {!request.isApproved && (
                          <button
                            onClick={() => handleApproveRequest(request.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Approve Request
                          </button>
                        )}
                        
                        {request.isApproved && !request.isCompleted && (
                          <button
                            onClick={() => handleCompleteBoost(request.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                          >
                            Complete Boost
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rewards' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Issued Micro-Rewards</h2>
              
              {microRewards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No micro-rewards issued yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {microRewards.map((reward) => (
                    <div key={reward.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Micro-Reward #{reward.id}
                          </h3>
                          <p className="text-sm text-gray-600">
                            To: {formatAddress(reward.student)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Amount: {formatEther(reward.amount)} ETH
                          </p>
                          <p className="text-sm text-gray-600">
                            Issued: {formatDate(reward.timestamp)}
                          </p>
                          <p className="text-sm text-gray-700 mt-2">
                            <strong>Reason:</strong> {reward.reason}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            reward.isClaimed 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {reward.isClaimed ? 'Claimed' : 'Pending Claim'}
                          </span>
                        </div>
                      </div>
                      
                      {reward.evidenceHash && (
                        <div className="mt-4">
                          <a
                            href={`https://ipfs.io/ipfs/${reward.evidenceHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            View Evidence
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'issue' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Issue Micro-Reward</h2>
              
              <div className="max-w-2xl space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Micro-Reward Guidelines</h3>
                  <ul className="text-blue-800 space-y-1 text-sm">
                    <li>• Maximum reward amount: 0.01 ETH</li>
                    <li>• Provide clear justification for the reward</li>
                    <li>• Include evidence when possible (IPFS hash)</li>
                    <li>• Rewards should recognize exceptional effort or achievement</li>
                  </ul>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Address
                  </label>
                  <input
                    type="text"
                    value={rewardForm.studentAddress}
                    onChange={(e) => setRewardForm(prev => ({ ...prev, studentAddress: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0x..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reward Amount (ETH)
                  </label>
                  <input
                    type="number"
                    value={rewardForm.amount}
                    onChange={(e) => setRewardForm(prev => ({ ...prev, amount: e.target.value }))}
                    min="0.001"
                    max="0.01"
                    step="0.001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Reward
                  </label>
                  <textarea
                    value={rewardForm.reason}
                    onChange={(e) => setRewardForm(prev => ({ ...prev, reason: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe why this student deserves a micro-reward..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evidence Hash (IPFS, optional)
                  </label>
                  <input
                    type="text"
                    value={rewardForm.evidenceHash}
                    onChange={(e) => setRewardForm(prev => ({ ...prev, evidenceHash: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="QmXXXXXX... (optional)"
                  />
                </div>
                
                <button
                  onClick={handleIssueMicroReward}
                  disabled={
                    !rewardForm.studentAddress || 
                    !rewardForm.amount || 
                    !rewardForm.reason ||
                    parseFloat(rewardForm.amount) > 0.01
                  }
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Issue Micro-Reward
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}