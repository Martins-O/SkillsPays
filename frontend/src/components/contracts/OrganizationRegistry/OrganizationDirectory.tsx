'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrganizationRegistry } from '@/hooks/useContracts';
import { Card, CardHeader, CardTitle, CardContent, Badge, Input } from '@/components/ui';
import { getSafeImageProps, isValidExternalUrl } from '@/utils/security';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { 
  Building2, 
  Users, 
  BookOpen, 
  Star, 
  Globe, 
  Mail, 
  Search,
  Shield,
  Filter,
  ExternalLink
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

export default function OrganizationDirectory() {
  const { getTotalOrganizations, getOrganization, getOrganizationSpecializations } = useOrganizationRegistry();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | null>(1); // Default to Active only
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const ORGS_PER_PAGE = 12;

  const loadSingleOrganization = useCallback(async (id: number): Promise<Organization | null> => {
    try {
      const orgData = await getOrganization(id);
      
      if (!orgData || !orgData.name) {
        return null;
      }

      // Load specializations
      let specializations: string[] = [];
      try {
        specializations = await getOrganizationSpecializations(id) || [];
      } catch (err) {
        console.warn(`Could not load specializations for org ${id}:`, err);
      }

      return {
        id: Number(orgData.id),
        name: orgData.name || '',
        description: orgData.description || '',
        website: orgData.website || '',
        logoUrl: orgData.logoUrl || '',
        contactEmail: orgData.contactEmail || '',
        walletAddress: orgData.walletAddress || '',
        verificationLevel: Number(orgData.verificationLevel || 0),
        status: Number(orgData.status || 0),
        registrationDate: Number(orgData.registrationDate || 0),
        lastUpdated: Number(orgData.lastUpdated || 0),
        totalBootcamps: Number(orgData.totalBootcamps || 0),
        totalStudents: Number(orgData.totalStudents || 0),
        reputationScore: Number(orgData.reputationScore || 0),
        specializations: specializations,
        canCreateBootcamps: Boolean(orgData.canCreateBootcamps),
        canIssueCertificates: Boolean(orgData.canIssueCertificates),
        stakingAmount: Number(orgData.stakingAmount || 0)
      };
    } catch (error) {
      console.error(`Error loading organization ${id}:`, error);
      return null;
    }
  }, [getOrganization, getOrganizationSpecializations]);

  const loadOrganizations = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const totalOrgs = await getTotalOrganizations();
      const totalOrgCount = Number(totalOrgs);
      
      // Calculate pagination
      const startIndex = (page - 1) * ORGS_PER_PAGE + 1;
      const endIndex = Math.min(page * ORGS_PER_PAGE, totalOrgCount);
      
      // Load batch of organizations concurrently  
      const orgPromises = [];
      for (let i = startIndex; i <= endIndex; i++) {
        orgPromises.push(loadSingleOrganization(i));
      }

      const loadedOrgs = await Promise.all(orgPromises);
      const validOrgs = loadedOrgs.filter(org => org !== null) as Organization[];
      
      if (append) {
        setOrganizations(prev => [...prev, ...validOrgs]);
      } else {
        setOrganizations(validOrgs);
      }
      
      // Check if there are more organizations to load
      setHasMore(endIndex < totalOrgCount);
      
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getTotalOrganizations, loadSingleOrganization, ORGS_PER_PAGE]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadOrganizations(nextPage, true);
    }
  }, [currentPage, loadingMore, hasMore, loadOrganizations]);

  const filterOrganizations = useCallback(() => {
    let filtered = [...organizations];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(org => 
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.specializations.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by verification level
    if (verificationFilter !== null) {
      filtered = filtered.filter(org => org.verificationLevel === verificationFilter);
    }

    // Filter by status
    if (statusFilter !== null) {
      filtered = filtered.filter(org => org.status === statusFilter);
    }

    // Filter by specialization
    if (specializationFilter) {
      filtered = filtered.filter(org =>
        org.specializations.some(spec => 
          spec.toLowerCase().includes(specializationFilter.toLowerCase())
        )
      );
    }

    setFilteredOrgs(filtered);
  }, [organizations, searchTerm, verificationFilter, statusFilter, specializationFilter]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    filterOrganizations();
  }, [filterOrganizations]);

  const getVerificationLevelText = (level: number) => {
    const levels = ['Unverified', 'Verified', 'Premium', 'Enterprise'];
    return levels[level] || 'Unknown';
  };

  const getVerificationLevelColor = (level: number): 'secondary' | 'primary' | 'success' | 'warning' => {
    const colorMap: Record<number, 'secondary' | 'primary' | 'success' | 'warning'> = {
      0: 'secondary', // Unverified
      1: 'primary',   // Verified
      2: 'warning',   // Premium
      3: 'success'    // Enterprise
    };
    return colorMap[level] || 'secondary';
  };

  const getStatusText = (status: number) => {
    const statuses = ['Pending', 'Active', 'Suspended', 'Blacklisted'];
    return statuses[status] || 'Unknown';
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3 animate-pulse"></div>
        </div>

        {/* Filters Skeleton */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-300 rounded w-1/2 mb-2 animate-pulse"></div>
                  <div className="h-10 bg-gray-300 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: ORGS_PER_PAGE }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Organization Directory</h1>
        <p className="text-gray-600">
          Discover verified educational organizations on the SkillPays platform.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Search Organizations
              </label>
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, description, or specialization..."
                aria-label="Search organizations"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="w-4 h-4 inline mr-1" />
                Verification Level
              </label>
              <select
                value={verificationFilter ?? ''}
                onChange={(e) => setVerificationFilter(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Filter by verification level"
              >
                <option value="">All Levels</option>
                <option value="0">Unverified</option>
                <option value="1">Verified</option>
                <option value="2">Premium</option>
                <option value="3">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Status
              </label>
              <select
                value={statusFilter ?? ''}
                onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Filter by organization status"
              >
                <option value="">All Statuses</option>
                <option value="0">Pending</option>
                <option value="1">Active</option>
                <option value="2">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialization
              </label>
              <Input
                type="text"
                value={specializationFilter}
                onChange={(e) => setSpecializationFilter(e.target.value)}
                placeholder="Filter by specialization..."
                aria-label="Filter by specialization"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing {filteredOrgs.length} of {organizations.length} organizations
        </p>
      </div>

      {/* Organizations Grid */}
      {filteredOrgs.length === 0 ? (
        <Card className="text-center">
          <CardContent className="p-12">
            <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Organizations Found</h3>
            <p className="text-gray-600">
              {organizations.length === 0 
                ? 'No organizations have been registered yet.' 
                : 'Try adjusting your filters to see more results.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrgs.map((org) => (
            <Card 
              key={org.id} 
              className="hover:shadow-lg transition-shadow focus-within:ring-2 focus-within:ring-blue-500" 
              role="article" 
              aria-labelledby={`org-title-${org.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {org.logoUrl ? (
                      <img 
                        {...getSafeImageProps(org.logoUrl, `${org.name} logo`)}
                        className="w-12 h-12 rounded-lg object-cover border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center ${org.logoUrl ? 'hidden' : ''}`}>
                      <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <CardTitle id={`org-title-${org.id}`} className="text-lg">{org.name}</CardTitle>
                      <p className="text-sm text-gray-500" aria-label="Wallet address">{formatAddress(org.walletAddress)}</p>
                    </div>
                  </div>
                  <Badge variant={getVerificationLevelColor(org.verificationLevel)} className="text-xs">
                    {getVerificationLevelText(org.verificationLevel)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {org.description}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span className="text-lg font-semibold text-gray-900">{org.totalBootcamps}</span>
                      </div>
                      <p className="text-xs text-gray-500">Bootcamps</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-4 h-4 text-green-600" />
                        <span className="text-lg font-semibold text-gray-900">{org.totalStudents}</span>
                      </div>
                      <p className="text-xs text-gray-500">Students</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-yellow-600" />
                        <span className="text-lg font-semibold text-gray-900">{org.reputationScore}</span>
                      </div>
                      <p className="text-xs text-gray-500">Reputation</p>
                    </div>
                  </div>

                  {/* Specializations */}
                  {org.specializations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">Specializations</p>
                      <div className="flex flex-wrap gap-1">
                        {org.specializations.slice(0, 3).map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                        {org.specializations.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{org.specializations.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    {org.website && isValidExternalUrl(org.website) ? (
                      <a 
                        href={org.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded text-sm"
                        aria-label={`Visit ${org.name} website`}
                      >
                        <Globe className="w-4 h-4" />
                        Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <div></div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {org.canCreateBootcamps && (
                        <Badge variant="success" className="text-xs">
                          Creates Bootcamps
                        </Badge>
                      )}
                      {org.canIssueCertificates && (
                        <Badge variant="primary" className="text-xs">
                          Issues Certificates
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Registered: {formatDate(org.registrationDate)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Loading More Skeleton */}
        {loadingMore && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {Array.from({ length: Math.min(ORGS_PER_PAGE, 6) }, (_, i) => (
              <CardSkeleton key={`loading-${i}`} />
            ))}
          </div>
        )}
        
        {/* Load More Button */}
        {hasMore && !loading && filteredOrgs.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              aria-label={loadingMore ? 'Loading more organizations' : 'Load more organizations'}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {loadingMore && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loadingMore ? 'Loading...' : 'Load More Organizations'}
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}