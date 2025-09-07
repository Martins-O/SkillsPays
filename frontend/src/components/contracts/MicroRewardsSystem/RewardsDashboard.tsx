'use client';

import React, { useState, useEffect } from 'react';
import { useMicroRewardsSystem } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface RewardCheckpoint {
  id: number;
  student: string;
  checkpointType: string;
  rewardAmount: number;
  streakMultiplier: number;
  evidenceHash: string;
  timestamp: number;
  isClaimed: boolean;
  claimedAt: number;
}

interface StudentRewardProfile {
  studentAddress: string;
  totalEarned: number;
  totalClaimed: number;
  pendingRewards: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: number;
  dailyCheckpoints: number;
  weeklyCheckpoints: number;
}

const CHECKPOINT_TYPES = {
  DAILY_LOGIN: 'daily_login',
  WEEKLY_CONSISTENCY: 'weekly_consistency',
  MILESTONE_COMPLETION: 'milestone_completion',
  PEER_HELP: 'peer_help',
  CODE_REVIEW: 'code_review',
  FORUM_PARTICIPATION: 'forum_participation',
  STREAK_BONUS: 'streak_bonus'
};

const CHECKPOINT_DESCRIPTIONS = {
  [CHECKPOINT_TYPES.DAILY_LOGIN]: 'Daily platform login',
  [CHECKPOINT_TYPES.WEEKLY_CONSISTENCY]: 'Active for 5+ days this week',
  [CHECKPOINT_TYPES.MILESTONE_COMPLETION]: 'Completing bootcamp milestones',
  [CHECKPOINT_TYPES.PEER_HELP]: 'Helping fellow students',
  [CHECKPOINT_TYPES.CODE_REVIEW]: 'Participating in code reviews',
  [CHECKPOINT_TYPES.FORUM_PARTICIPATION]: 'Active forum participation',
  [CHECKPOINT_TYPES.STREAK_BONUS]: 'Streak milestone bonus'
};

export default function RewardsDashboard() {
  const { account } = useWeb3();
  const microRewards = useMicroRewardsSystem();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'checkpoints' | 'claim'>('overview');
  const [studentProfile, setStudentProfile] = useState<StudentRewardProfile | null>(null);
  const [recentCheckpoints, setRecentCheckpoints] = useState<RewardCheckpoint[]>([]);
  const [pendingRewards, setPendingRewards] = useState<RewardCheckpoint[]>([]);

  useEffect(() => {
    if (account) {
      loadRewardsData();
    }
  }, [account]);

  const loadRewardsData = async () => {
    if (!account) return;
    
    try {
      // Load real data from smart contract
      let profile: StudentRewardProfile;
      let checkpoints: RewardCheckpoint[] = [];
      
      try {
        // Get student reward profile from contract
        const profileData = await microRewards.getStudentProfile(account);
        profile = {
          studentAddress: account,
          totalEarned: Number(profileData.totalEarned || 0),
          totalClaimed: Number(profileData.totalClaimed || 0),
          pendingRewards: Number(profileData.pendingRewards || 0),
          currentStreak: Number(profileData.currentStreak || 0),
          longestStreak: Number(profileData.longestStreak || 0),
          lastActivityDate: Number(profileData.lastActivityDate || Date.now() / 1000),
          dailyCheckpoints: Number(profileData.dailyCheckpoints || 0),
          weeklyCheckpoints: Number(profileData.weeklyCheckpoints || 0)
        };
      } catch (err) {
        console.log('No student profile found in contract, using default values');
        // Default profile for new users
        profile = {
          studentAddress: account,
          totalEarned: 0,
          totalClaimed: 0,
          pendingRewards: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: Date.now() / 1000,
          dailyCheckpoints: 0,
          weeklyCheckpoints: 0
        };
      }

      // Real checkpoints would be loaded here - method not yet implemented
      // For now, showing empty state

      setStudentProfile(profile);
      setRecentCheckpoints(checkpoints);
      setPendingRewards(checkpoints.filter(c => !c.isClaimed));
      
    } catch (error) {
      console.error('Error loading rewards data:', error);
      // Set empty state instead of mock data
      setStudentProfile({
        studentAddress: account,
        totalEarned: 0,
        totalClaimed: 0,
        pendingRewards: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: Date.now() / 1000,
        dailyCheckpoints: 0,
        weeklyCheckpoints: 0
      });
      setRecentCheckpoints([]);
      setPendingRewards([]);
    }
  };

  const handleClaimRewards = async () => {
    try {
      await microRewards.claimRewards();
      await loadRewardsData();
    } catch (error) {
      console.error('Error claiming rewards:', error);
    }
  };

  const handleRecordCheckpoint = async (type: string, evidenceHash: string = '') => {
    if (!account) return;
    
    try {
      await microRewards.recordCheckpoint(account, type, evidenceHash);
      await loadRewardsData();
    } catch (error) {
      console.error('Error recording checkpoint:', error);
    }
  };

  const formatEther = (wei: number) => {
    return (wei / 1e18).toFixed(6);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const calculateTotalPendingRewards = () => {
    return pendingRewards.reduce((total, checkpoint) => {
      const baseAmount = checkpoint.rewardAmount;
      const multiplier = checkpoint.streakMultiplier / 100;
      return total + (baseAmount * multiplier);
    }, 0);
  };

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please connect your wallet to access the rewards system.</p>
        </div>
      </div>
    );
  }

  if (!studentProfile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rewards dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Micro-Rewards Dashboard</h1>
        <p className="text-gray-600">
          Earn ETH rewards for daily activities, milestones, and helping the community
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-full mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earned</p>
              <p className="text-2xl font-bold text-gray-900">{formatEther(studentProfile.totalEarned)} ETH</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-full mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Rewards</p>
              <p className="text-2xl font-bold text-gray-900">{formatEther(calculateTotalPendingRewards())} ETH</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-full mr-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900">{studentProfile.currentStreak} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-full mr-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Weekly Checkpoints</p>
              <p className="text-2xl font-bold text-gray-900">{studentProfile.weeklyCheckpoints}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('checkpoints')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'checkpoints'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Activity Checkpoints
            </button>
            <button
              onClick={() => setActiveTab('claim')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'claim'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Claim Rewards ({pendingRewards.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Reward Activity Overview</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Streak Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Streak:</span>
                      <span className="font-semibold text-orange-600">{studentProfile.currentStreak} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Longest Streak:</span>
                      <span className="font-semibold">{studentProfile.longestStreak} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Streak Multiplier:</span>
                      <span className="font-semibold text-green-600">
                        +{Math.min(studentProfile.currentStreak, 20)}% bonus
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">This Week</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Daily Checkpoints:</span>
                      <span className="font-semibold">{studentProfile.dailyCheckpoints}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weekly Checkpoints:</span>
                      <span className="font-semibold">{studentProfile.weeklyCheckpoints}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((studentProfile.dailyCheckpoints / 5) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-semibold text-gray-900 mb-4">Available Checkpoint Types</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(CHECKPOINT_TYPES).map(([key, type]) => (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900 capitalize">
                            {type.replace('_', ' ')}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {CHECKPOINT_DESCRIPTIONS[type]}
                          </p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checkpoints' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity Checkpoints</h2>
              
              {recentCheckpoints.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No checkpoints recorded yet.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Complete activities to start earning micro-rewards!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCheckpoints.map((checkpoint) => (
                    <div key={checkpoint.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900 capitalize">
                            {checkpoint.checkpointType.replace('_', ' ')}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {CHECKPOINT_DESCRIPTIONS[checkpoint.checkpointType]}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            Earned: {formatDate(checkpoint.timestamp)}
                          </p>
                          {checkpoint.evidenceHash && (
                            <a
                              href={`https://ipfs.io/ipfs/${checkpoint.evidenceHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm underline mt-2 inline-block"
                            >
                              View Evidence
                            </a>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {formatEther(checkpoint.rewardAmount * checkpoint.streakMultiplier / 100)} ETH
                          </div>
                          <div className="text-sm text-gray-600">
                            Base: {formatEther(checkpoint.rewardAmount)} ETH
                          </div>
                          <div className="text-sm text-orange-600">
                            +{checkpoint.streakMultiplier - 100}% streak bonus
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full mt-2 inline-block ${
                            checkpoint.isClaimed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {checkpoint.isClaimed ? 'Claimed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'claim' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Claim Pending Rewards</h2>
              
              {pendingRewards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending rewards to claim.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Complete activities to earn rewards!
                  </p>
                </div>
              ) : (
                <div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-900">Ready to Claim</h3>
                        <p className="text-blue-700">
                          {pendingRewards.length} checkpoints worth {formatEther(calculateTotalPendingRewards())} ETH
                        </p>
                      </div>
                      <button
                        onClick={handleClaimRewards}
                        disabled={microRewards.loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {microRewards.loading ? 'Claiming...' : 'Claim All Rewards'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {pendingRewards.map((checkpoint) => (
                      <div key={checkpoint.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-gray-900 capitalize">
                              {checkpoint.checkpointType.replace('_', ' ')}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Earned: {formatDate(checkpoint.timestamp)}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-600">
                              {formatEther(checkpoint.rewardAmount * checkpoint.streakMultiplier / 100)} ETH
                            </div>
                            <div className="text-sm text-orange-600">
                              {checkpoint.streakMultiplier > 100 && `+${checkpoint.streakMultiplier - 100}% bonus`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {microRewards.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
                      <p className="text-red-800">{microRewards.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}