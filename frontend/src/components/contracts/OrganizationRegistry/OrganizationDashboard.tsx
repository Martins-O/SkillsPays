'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrganizationRegistry } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';
import { Card, CardHeader, CardTitle, CardContent, Badge, TransactionButton } from '@/components/ui';
import { getSafeImageProps, isValidExternalUrl } from '@/utils/security';
import { 
  Building2, 
  Users, 
  BookOpen, 
  Star, 
  Globe, 
  Mail, 
  Calendar,
  Shield,
  DollarSign,
  TrendingUp,
  Edit,
  Plus
} from 'lucide-react';

interface Organization {
  id: number;
  name: string;
  description: string;
  website: string;
  logoUrl: string;
  contactEmail: string;
  walletAddress: string;
  verificationLevel: number;
  status: number;
  registrationDate: number;
  lastUpdated: number;
  totalBootcamps: number;
  totalStudents: number;
  reputationScore: number;
  specializations: string[];
  canCreateBootcamps: boolean;
  canIssueCertificates: boolean;
  stakingAmount: number;
}

export default function OrganizationDashboard() {
  const { account } = useWeb3();
  const { 
    getOrganizationByAddress, 
    getOrganizationSpecializations,
    depositStake,
    loading, 
    error 
  } = useOrganizationRegistry();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [stakeAmount, setStakeAmount] = useState('0.1');
  const [isLoading, setIsLoading] = useState(true);

  const loadOrganizationData = useCallback(async () => {
    if (!account) return;
    
    try {
      setIsLoading(true);
      const orgData = await getOrganizationByAddress(account);
      
      if (orgData && orgData.id && orgData.id > 0) {
        setOrganization({
          id: Number(orgData.id),
          name: orgData.name || '',
          description: orgData.description || '',
          website: orgData.website || '',
          logoUrl: orgData.logoUrl || '',
          contactEmail: orgData.contactEmail || '',
          walletAddress: orgData.walletAddress || account,
          verificationLevel: Number(orgData.verificationLevel || 0),
          status: Number(orgData.status || 0),
          registrationDate: Number(orgData.registrationDate || 0),
          lastUpdated: Number(orgData.lastUpdated || 0),
          totalBootcamps: Number(orgData.totalBootcamps || 0),
          totalStudents: Number(orgData.totalStudents || 0),
          reputationScore: Number(orgData.reputationScore || 0),
          specializations: orgData.specializations || [],
          canCreateBootcamps: Boolean(orgData.canCreateBootcamps),
          canIssueCertificates: Boolean(orgData.canIssueCertificates),
          stakingAmount: Number(orgData.stakingAmount || 0)
        });
        
        // Load specializations
        try {
          const specs = await getOrganizationSpecializations(Number(orgData.id));
          setSpecializations(specs || []);
        } catch (err) {
          console.warn('Could not load specializations:', err);
        }
      }
    } catch (err) {
      console.error('Error loading organization data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [account, getOrganizationByAddress, getOrganizationSpecializations]);

  useEffect(() => {
    if (account) {
      loadOrganizationData();
    }
  }, [account, loadOrganizationData]);

  const handleDepositStake = async () => {
    try {
      await depositStake(stakeAmount);
      await loadOrganizationData();
      setStakeAmount('0.1');
    } catch (error) {
      console.error('Error depositing stake:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatEth = (wei: number) => {
    return (wei / 1e18).toFixed(3);
  };

  const getVerificationLevelText = (level: number) => {
    const levels = ['Unverified', 'Verified', 'Premium', 'Enterprise'];
    return levels[level] || 'Unknown';
  };

  const getVerificationLevelColor = (level: number) => {
    const colors = ['gray', 'blue', 'purple', 'green'];
    return colors[level] || 'gray';
  };

  const getStatusText = (status: number) => {
    const statuses = ['Pending', 'Active', 'Suspended', 'Blacklisted'];
    return statuses[status] || 'Unknown';
  };

  const getStatusColor = (status: number) => {
    const colors = ['yellow', 'green', 'red', 'red'];
    return colors[status] || 'gray';
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!organization || organization.id === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="text-center">
          <CardContent className="p-12">
            <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Organization Not Found</h3>
            <p className="text-gray-600 mb-6">
              This wallet address is not registered as an organization. 
              Register your organization to start creating bootcamps and managing students.
            </p>
            <a
              href="/organizations"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Register Organization
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {organization.logoUrl ? (
              <img 
                {...getSafeImageProps(organization.logoUrl, `${organization.name} logo`)}
                className="w-16 h-16 rounded-lg object-cover border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center ${organization.logoUrl ? 'hidden' : ''}`}>
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={getStatusColor(organization.status) as any}>
                  {getStatusText(organization.status)}
                </Badge>
                <Badge variant={getVerificationLevelColor(organization.verificationLevel) as any}>
                  <Shield className="w-3 h-3 mr-1" />
                  {getVerificationLevelText(organization.verificationLevel)}
                </Badge>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bootcamps</p>
                <p className="text-2xl font-bold text-gray-900">{organization.totalBootcamps}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{organization.totalStudents}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reputation Score</p>
                <p className="text-2xl font-bold text-gray-900">{organization.reputationScore}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Staked Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatEth(organization.stakingAmount)} ETH</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Description</p>
                <p className="text-gray-900">{organization.description}</p>
              </div>
              
              {organization.website && isValidExternalUrl(organization.website) && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Website</p>
                  <a 
                    href={organization.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Globe className="w-4 h-4" />
                    {organization.website}
                  </a>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-600">Contact Email</p>
                <a 
                  href={`mailto:${organization.contactEmail}`}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Mail className="w-4 h-4" />
                  {organization.contactEmail}
                </a>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Registration Date</p>
                <p className="text-gray-900 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(organization.registrationDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Specializations & Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle>Capabilities & Specializations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Capabilities</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={organization.canCreateBootcamps ? "success" : "secondary"}>
                    <BookOpen className="w-3 h-3 mr-1" />
                    {organization.canCreateBootcamps ? 'Can Create Bootcamps' : 'Cannot Create Bootcamps'}
                  </Badge>
                  <Badge variant={organization.canIssueCertificates ? "primary" : "secondary"}>
                    <Shield className="w-3 h-3 mr-1" />
                    {organization.canIssueCertificates ? 'Can Issue Certificates' : 'Cannot Issue Certificates'}
                  </Badge>
                </div>
              </div>
              
              {(specializations.length > 0 || organization.specializations.length > 0) && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {(specializations.length > 0 ? specializations : organization.specializations).map((spec) => (
                      <Badge key={spec} variant="outline">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Staking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Increase Reputation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Deposit additional stake to increase your organization&apos;s trust score and unlock premium features.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stake Amount (ETH)
                </label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <TransactionButton
                onTransaction={handleDepositStake}
                disabled={loading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                className="w-full"
              >
                {loading ? 'Processing...' : `Deposit ${stakeAmount} ETH`}
              </TransactionButton>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Plus className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Create New Bootcamp</p>
                  <p className="text-sm text-gray-600">Start a new learning program</p>
                </div>
              </button>
              
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Users className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Manage Students</p>
                  <p className="text-sm text-gray-600">View enrolled students and progress</p>
                </div>
              </button>
              
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Shield className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Request Verification</p>
                  <p className="text-sm text-gray-600">Upgrade your verification level</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}