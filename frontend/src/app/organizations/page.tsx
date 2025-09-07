'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useOrganizationRegistry } from '@/hooks/useContracts';
import OrganizationRegistration from '@/components/contracts/OrganizationRegistry/OrganizationRegistration';
import OrganizationDashboard from '@/components/contracts/OrganizationRegistry/OrganizationDashboard';
import OrganizationDirectory from '@/components/contracts/OrganizationRegistry/OrganizationDirectory';

export default function OrganizationsPage() {
  const { account } = useWeb3();
  const { isOrganization } = useOrganizationRegistry();
  const [activeTab, setActiveTab] = useState<'directory' | 'register' | 'dashboard'>('directory');
  const [userIsOrg, setUserIsOrg] = useState<boolean | null>(null);
  const [checkingOrgStatus, setCheckingOrgStatus] = useState(false);

  useEffect(() => {
    if (account) {
      checkOrganizationStatus();
    } else {
      setUserIsOrg(null);
    }
  }, [account]);

  const checkOrganizationStatus = async () => {
    if (!account) return;
    
    try {
      setCheckingOrgStatus(true);
      const orgStatus = await isOrganization(account);
      setUserIsOrg(orgStatus);
      
      // Auto-switch to dashboard if user is an organization
      if (orgStatus && activeTab === 'directory') {
        setActiveTab('dashboard');
      }
    } catch (error) {
      console.error('Error checking organization status:', error);
      setUserIsOrg(false);
    } finally {
      setCheckingOrgStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
          <p className="mt-2 text-gray-600">
            Discover educational organizations, register your own, or manage your organization dashboard.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('directory')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'directory'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Organization Directory
              </button>
              
              {!checkingOrgStatus && userIsOrg && (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  My Dashboard
                </button>
              )}
              
              {!checkingOrgStatus && !userIsOrg && account && (
                <button
                  onClick={() => setActiveTab('register')}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'register'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Register Organization
                </button>
              )}
              
              {!account && (
                <button
                  onClick={() => setActiveTab('register')}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'register'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Register Organization
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {checkingOrgStatus && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Checking organization status...</span>
              </div>
            )}
            
            {!checkingOrgStatus && (
              <>
                {activeTab === 'directory' && <OrganizationDirectory />}
                {activeTab === 'register' && <OrganizationRegistration />}
                {activeTab === 'dashboard' && userIsOrg && <OrganizationDashboard />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}