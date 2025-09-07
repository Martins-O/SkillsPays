'use client';

import { useState, useEffect } from 'react';
import { useSkillPaysCore, useOrganizationRegistry } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';
import { Card, CardHeader, CardTitle, CardContent, Input, TransactionButton, Badge } from '@/components/ui';
import { BookOpenIcon, MagnifyingGlassIcon, UsersIcon, ClockIcon, CurrencyDollarIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface Organization {
  id: number;
  name: string;
  logoUrl: string;
  verificationLevel: number;
  reputationScore: number;
}

interface Bootcamp {
  id: number;
  name: string;
  description: string;
  creator: string;
  fee: string;
  duration: number;
  isActive: boolean;
  creationDate: number;
  totalEnrolled: number;
  organization?: Organization;
}

interface BootcampBrowserProps {
  onBootcampSelect?: (bootcamp: Bootcamp) => void;
}

export default function BootcampBrowser({ onBootcampSelect }: BootcampBrowserProps) {
  const [bootcamps, setBootcamps] = useState<Bootcamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { getBootcamp, enrollInBootcamp, error } = useSkillPaysCore();
  const { getOrganizationByAddress } = useOrganizationRegistry();
  const { account, connect } = useWeb3();

  useEffect(() => {
    loadBootcamps();
  }, []);

  const loadBootcamps = async () => {
    try {
      setLoading(true);
      const bootcampList: Bootcamp[] = [];
      
      // Try to get bootcamps, but handle the case where they don't exist
      for (let i = 1; i <= 20; i++) {
        try {
          const bootcamp = await getBootcamp(i);
          
          // Check if bootcamp exists and has valid data
          if (bootcamp && 
              bootcamp.name && 
              bootcamp.name.toString().trim() !== '' &&
              bootcamp.creator !== '0x0000000000000000000000000000000000000000') {
            
            // Try to get organization data for the creator
            let organization: Organization | undefined;
            try {
              const orgData = await getOrganizationByAddress(bootcamp.creator);
              if (orgData && orgData.name) {
                organization = {
                  id: Number(orgData.id || 0),
                  name: orgData.name,
                  logoUrl: orgData.logoUrl || '',
                  verificationLevel: Number(orgData.verificationLevel || 0),
                  reputationScore: Number(orgData.reputationScore || 0)
                };
              }
            } catch (err) {
              console.log(`No organization data for creator ${bootcamp.creator}`);
            }

            bootcampList.push({
              id: i,
              name: bootcamp.name.toString(),
              description: bootcamp.description ? bootcamp.description.toString() : '',
              creator: bootcamp.creator,
              fee: bootcamp.fee?.toString() || '0',
              duration: Number(bootcamp.duration || 0),
              isActive: Boolean(bootcamp.isActive),
              creationDate: Number(bootcamp.creationDate || 0),
              totalEnrolled: Number(bootcamp.totalEnrolled || 0),
              organization
            });
          }
        } catch (err) {
          // Log the error but continue checking other IDs
          console.log(`Bootcamp ${i} not found or error:`, err);
          continue;
        }
      }
      
      setBootcamps(bootcampList);
    } catch (err) {
      console.error('Failed to load bootcamps:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (bootcamp: Bootcamp) => {
    if (!account) {
      await connect();
      return;
    }

    try {
      setEnrolling(bootcamp.id);
      await enrollInBootcamp(bootcamp.id, bootcamp.fee);
      await loadBootcamps();
    } catch (err) {
      console.error('Enrollment failed:', err);
    } finally {
      setEnrolling(null);
    }
  };

  const getVerificationLevelText = (level: number) => {
    const levels = ['Unverified', 'Verified', 'Premium', 'Enterprise'];
    return levels[level] || 'Unknown';
  };

  const filteredBootcamps = bootcamps.filter(bootcamp =>
    bootcamp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bootcamp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bootcamp.organization?.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card variant="elevated" className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-neutral-200 border-t-primary-600 mx-auto mb-6"></div>
            <p className="text-neutral-600">Loading bootcamps...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <BookOpenIcon className="h-6 w-6" />
            Browse Bootcamps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Search bootcamps by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            className="w-full"
          />
        </CardContent>
      </Card>

      {error && (
        <Card variant="outlined" className="border-destructive-200 bg-destructive-50">
          <CardContent className="p-4">
            <p className="text-destructive-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {filteredBootcamps.length === 0 ? (
        <Card variant="outlined" className="text-center">
          <CardContent className="py-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <BookOpenIcon className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-neutral-500 text-lg mb-2">No bootcamps found</p>
            <p className="text-neutral-400 text-sm">Try adjusting your search terms</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBootcamps.map((bootcamp) => (
            <Card
              key={bootcamp.id}
              variant="elevated"
              className="transition-all hover:shadow-lg cursor-pointer group"
              onClick={() => onBootcampSelect?.(bootcamp)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {bootcamp.name}
                    </CardTitle>
                    {bootcamp.organization && (
                      <div className="flex items-center gap-2 mt-2">
                        {bootcamp.organization.logoUrl ? (
                          <img 
                            src={bootcamp.organization.logoUrl} 
                            alt={bootcamp.organization.name}
                            className="w-4 h-4 rounded object-cover"
                          />
                        ) : (
                          <BuildingOfficeIcon className="w-4 h-4 text-neutral-400" />
                        )}
                        <span className="text-sm text-neutral-600">{bootcamp.organization.name}</span>
                        <Badge variant="outline" size="sm">
                          {getVerificationLevelText(bootcamp.organization.verificationLevel)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="default"
                    className="shrink-0"
                  >
                    {bootcamp.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-neutral-600 text-sm line-clamp-3 leading-relaxed">
                  {bootcamp.description}
                </p>
                
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-neutral-50">
                    <ClockIcon className="h-4 w-4 text-neutral-400" />
                    <span className="text-xs font-medium text-neutral-600">{bootcamp.duration}w</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-neutral-50">
                    <CurrencyDollarIcon className="h-4 w-4 text-neutral-400" />
                    <span className="text-xs font-medium text-neutral-600">{bootcamp.fee} ETH</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-neutral-50">
                    <UsersIcon className="h-4 w-4 text-neutral-400" />
                    <span className="text-xs font-medium text-neutral-600">{bootcamp.totalEnrolled}</span>
                  </div>
                </div>
                
                <TransactionButton
                  onTransaction={() => handleEnroll(bootcamp)}
                  disabled={!bootcamp.isActive}
                  className="w-full"
                  size="sm"
                  successMessage="Successfully enrolled!"
                  pendingMessage="Confirm enrollment in wallet..."
                  confirmingMessage="Processing enrollment..."
                >
                  {!account ? 'Connect Wallet' : 'Enroll Now'}
                </TransactionButton>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}