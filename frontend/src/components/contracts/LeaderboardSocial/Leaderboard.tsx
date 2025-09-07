'use client';

import { useState, useEffect } from 'react';
import { useLeaderboardSocial } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star, 
  Users, 
  Target,
  Award,
  User
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  student: string;
  name: string;
  totalScore: number;
  badgeCount: number;
  reputationScore: number;
  profilePicture?: string;
  skills: string[];
  completedBootcamps: number;
  streak: number;
}

interface SocialProfile {
  username: string;
  bio: string;
  skills: number[];
  isPublic: boolean;
  connections: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userProfile, setUserProfile] = useState<SocialProfile | null>(null);
  const [category, setCategory] = useState('overall');
  const [timeframe, setTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: '',
    bio: '',
    skills: '',
    isPublic: true
  });

  const { 
    getLeaderboard, 
    getProfile, 
    createProfile, 
    
    connectWith,
    loading: contractLoading,
    error 
  } = useLeaderboardSocial();
  
  const { account, isConnected } = useWeb3();

  useEffect(() => {
    if (isConnected && account) {
      loadData();
    }
  }, [isConnected, account, category, timeframe]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      if (account) {
        const profile = await getProfile(account);
        setUserProfile(profile);
      }

      // Load leaderboard data
      const leaderboardData = await getLeaderboard(category, 50);
      
      if (leaderboardData && leaderboardData.length > 0) {
        // Transform contract data
        const transformedEntries = leaderboardData.map((entry: unknown, index: number) => {
          const typedEntry = entry as Record<string, unknown>;
          return {
            rank: index + 1,
            student: (typedEntry.student as string) || (typedEntry.address as string),
            name: (typedEntry.name as string) || `User ${(typedEntry.address as string)?.slice(0, 6)}...${(typedEntry.address as string)?.slice(-4)}`,
            totalScore: Number(typedEntry.totalScore) || 0,
            badgeCount: Number(typedEntry.badgeCount) || 0,
            reputationScore: Number(typedEntry.reputationScore) || 0,
            skills: (typedEntry.skills as string) ? (typedEntry.skills as string).split(',') : [],
            completedBootcamps: Number(typedEntry.completedBootcamps) || 0,
            streak: Number(typedEntry.streak) || 0
          };
        });
        setEntries(transformedEntries);
      } else {
        // No data found in contract - show empty state
        console.log('No leaderboard entries found in contract. Data will be available after students start earning scores.');
        setEntries([]);
      }
    } catch (err) {
      console.error('Failed to load leaderboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const skillIds = profileForm.skills
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0)
        .map((_, index) => index + 1); // Mock skill IDs

      await createProfile(
        profileForm.username,
        profileForm.bio,
        skillIds
      );
      
      setShowProfile(false);
      setProfileForm({ username: '', bio: '', skills: '', isPublic: true });
      await loadData();
    } catch (err) {
      console.error('Profile creation failed:', err);
    }
  };

  const handleConnect = async (userAddress: string) => {
    try {
      await connectWith(userAddress);
      // Show success message or update UI
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'border-yellow-300 bg-yellow-50';
      case 2:
        return 'border-gray-300 bg-gray-50';
      case 3:
        return 'border-orange-300 bg-orange-50';
      default:
        return 'border-gray-200';
    }
  };

  const categories = [
    { id: 'overall', label: 'Overall', icon: Trophy },
    { id: 'badges', label: 'Most Badges', icon: Award },
    { id: 'reputation', label: 'Reputation', icon: Star },
    { id: 'streak', label: 'Learning Streak', icon: Target }
  ];

  const timeframes = [
    { id: 'all', label: 'All Time' },
    { id: 'month', label: 'This Month' },
    { id: 'week', label: 'This Week' }
  ];

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-gray-600">See how you rank among fellow learners</p>
        </div>
        {isConnected && !userProfile && (
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <User className="w-4 h-4" />
            <span>Create Profile</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Profile Creation Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Social Profile</h2>
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your display name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={profileForm.skills}
                  onChange={(e) => setProfileForm({...profileForm, skills: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="React, Solidity, Node.js"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={contractLoading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {contractLoading ? 'Creating...' : 'Create Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProfile(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
                      category === cat.id
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
            <div className="flex space-x-2">
              {timeframes.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm transition-colors ${
                    timeframe === tf.id
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Top Performers</h2>
          <div className="flex items-end justify-center space-x-4">
            {/* 2nd Place */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Medal className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900">{entries[1].name}</h3>
              <p className="text-sm text-gray-600">{entries[1].totalScore} pts</p>
              <p className="text-xs text-gray-500">{entries[1].badgeCount} badges</p>
            </div>

            {/* 1st Place */}
            <div className="text-center -mt-8">
              <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-yellow-300">
                <Crown className="w-12 h-12 text-yellow-500" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{entries[0].name}</h3>
              <p className="text-sm text-gray-600 font-semibold">{entries[0].totalScore} pts</p>
              <p className="text-xs text-gray-500">{entries[0].badgeCount} badges</p>
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="font-semibold text-gray-900">{entries[2].name}</h3>
              <p className="text-sm text-gray-600">{entries[2].totalScore} pts</p>
              <p className="text-xs text-gray-500">{entries[2].badgeCount} badges</p>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            All Rankings ({category.charAt(0).toUpperCase() + category.slice(1)})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {entries.map((entry) => (
            <div
              key={entry.student}
              className={`p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors ${
                entry.student === account ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-center w-12">
                {getRankIcon(entry.rank)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                      <span>{entry.name}</span>
                      {entry.student === account && (
                        <span className="text-blue-600 text-sm">(You)</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {entry.student.slice(0, 8)}...{entry.student.slice(-6)}
                    </p>
                    {entry.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {entry.skills.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{entry.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {category === 'badges' ? entry.badgeCount :
                       category === 'reputation' ? entry.reputationScore :
                       category === 'streak' ? entry.streak :
                       entry.totalScore} {category === 'streak' ? 'days' : 'pts'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {entry.completedBootcamps} bootcamps completed
                    </div>
                  </div>
                </div>
              </div>
              
              {entry.student !== account && isConnected && (
                <button
                  onClick={() => handleConnect(entry.student)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Users className="w-4 h-4" />
                  <span>Connect</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {!isConnected && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Join the Competition</h3>
          <p className="text-gray-600">
            Connect your wallet to see your ranking and compete with other learners
          </p>
        </div>
      )}
    </div>
  );
}