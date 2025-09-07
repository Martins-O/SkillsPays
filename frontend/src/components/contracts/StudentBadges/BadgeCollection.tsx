'use client';

import { useState, useEffect } from 'react';
import { useStudentBadges } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface Badge {
  tokenId: number;
  skillId: number;
  level: number;
  metadataURI: string;
  skillName: string;
  category: string;
  earnedDate: number;
  verificationLevel: 'Basic' | 'Intermediate' | 'Advanced' | 'Expert';
}

interface BadgeCollectionProps {
  studentAddress?: string;
  onBadgeSelect?: (badge: Badge) => void;
}

export default function BadgeCollection({ studentAddress, onBadgeSelect }: BadgeCollectionProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { getStudentBadges, getBadge, balanceOf } = useStudentBadges();
  const { account, connect } = useWeb3();

  const targetAddress = studentAddress || account;

  useEffect(() => {
    if (targetAddress) {
      loadBadges();
    }
  }, [targetAddress]);

  const loadBadges = async () => {
    if (!targetAddress) return;

    try {
      setLoading(true);
      
      // Try to load real badge data from contract
      const balance = await balanceOf(targetAddress);
      const studentBadges = await getStudentBadges(targetAddress);
      
      if (balance && studentBadges && studentBadges.length > 0) {
        // Transform contract data to badge format
        const contractBadges: Badge[] = await Promise.all(
          studentBadges.map(async (tokenId: number) => {
            const badgeData = await getBadge(tokenId);
            return {
              tokenId: tokenId,
              skillId: Number(badgeData.skillId) || 1,
              level: Number(badgeData.level) || 1,
              metadataURI: badgeData.metadataURI || '',
              skillName: badgeData.skillName || `Skill ${tokenId}`,
              category: badgeData.category || 'General',
              earnedDate: Number(badgeData.earnedDate) || Date.now(),
              verificationLevel: getVerificationLevelFromScore(Number(badgeData.level))
            };
          })
        );
        setBadges(contractBadges);
      } else {
        // Fallback to mock data for demonstration
        const mockBadges: Badge[] = [
          {
            tokenId: 1,
            skillId: 1,
            level: 3,
            metadataURI: 'https://skillpays.com/metadata/1',
            skillName: 'JavaScript Programming',
            category: 'Programming',
            earnedDate: Date.now() - 86400000 * 30,
            verificationLevel: 'Advanced'
          },
          {
            tokenId: 2,
            skillId: 2,
            level: 2,
            metadataURI: 'https://skillpays.com/metadata/2',
            skillName: 'React Development',
            category: 'Frontend',
            earnedDate: Date.now() - 86400000 * 15,
            verificationLevel: 'Intermediate'
          },
          {
            tokenId: 3,
            skillId: 3,
            level: 4,
            metadataURI: 'https://skillpays.com/metadata/3',
            skillName: 'Smart Contract Development',
            category: 'Blockchain',
            earnedDate: Date.now() - 86400000 * 7,
            verificationLevel: 'Expert'
          },
          {
            tokenId: 4,
            skillId: 4,
            level: 1,
            metadataURI: 'https://skillpays.com/metadata/4',
            skillName: 'Node.js Backend',
            category: 'Backend',
            earnedDate: Date.now() - 86400000 * 45,
            verificationLevel: 'Basic'
          },
          {
            tokenId: 5,
            skillId: 5,
            level: 2,
            metadataURI: 'https://skillpays.com/metadata/5',
            skillName: 'Database Design',
            category: 'Backend',
            earnedDate: Date.now() - 86400000 * 60,
            verificationLevel: 'Intermediate'
          }
        ];
        setBadges(mockBadges);
      }
    } catch (err) {
      console.error('Failed to load badges:', err);
      // Show empty state on error
      setBadges([]);
    } finally {
      setLoading(false);
    }
  };

  const getVerificationLevelFromScore = (level: number): Badge['verificationLevel'] => {
    if (level >= 4) return 'Expert';
    if (level >= 3) return 'Advanced';
    if (level >= 2) return 'Intermediate';
    return 'Basic';
  };

  const getVerificationColor = (level: string) => {
    switch (level) {
      case 'Expert': return 'bg-purple-500';
      case 'Advanced': return 'bg-blue-500';
      case 'Intermediate': return 'bg-green-500';
      case 'Basic': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Programming': return 'text-purple-600 bg-purple-100';
      case 'Frontend': return 'text-blue-600 bg-blue-100';
      case 'Backend': return 'text-green-600 bg-green-100';
      case 'Blockchain': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredBadges = badges.filter(badge => {
    const matchesFilter = filter === 'all' || badge.category.toLowerCase() === filter;
    const matchesSearch = searchTerm === '' || 
      badge.skillName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badge.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const categories = ['all', 'programming', 'frontends', 'backend', 'blockchain'];

  if (!targetAddress) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600 mb-4">Connect your wallet to view your badge collection</p>
        <button
          onClick={connect}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your badges...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Badge Collection</h2>
            <p className="text-gray-600">
              {studentAddress ? `Viewing badges for ${studentAddress.slice(0, 6)}...${studentAddress.slice(-4)}` : 'Your verified skill achievements'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{badges.length}</div>
            <div className="text-sm text-gray-500">Total Badges</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search badges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-4 py-2 rounded-md capitalize text-sm font-medium transition-colors ${
                  filter === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredBadges.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No badges found</h3>
          <p className="text-gray-600">
            {filter === 'all' ? 'Complete your first milestone to earn badges!' : `No badges found in ${filter} category`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBadges.map((badge) => (
            <div
              key={badge.tokenId}
              onClick={() => onBadgeSelect?.(badge)}
              className="bg-white rounded-lg shadow-md border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-full ${getVerificationColor(badge.verificationLevel)} flex items-center justify-center`}>
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(badge.category)}`}>
                    {badge.category}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {badge.skillName}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Level:</span>
                    <div className="flex items-center">
                      {[1, 2, 3, 4].map((level) => (
                        <svg
                          key={level}
                          className={`w-4 h-4 ${
                            level <= badge.level ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Verification:</span>
                    <span className={`text-sm font-medium ${
                      badge.verificationLevel === 'Expert' ? 'text-purple-600' :
                      badge.verificationLevel === 'Advanced' ? 'text-blue-600' :
                      badge.verificationLevel === 'Intermediate' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {badge.verificationLevel}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Earned:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(badge.earnedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Token #{badge.tokenId}</span>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium group-hover:underline">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}