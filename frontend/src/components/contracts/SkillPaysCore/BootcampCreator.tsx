'use client';

import { useState, useEffect } from 'react';
import { useSkillPaysCore, useOrganizationRegistry } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface BootcampCreatorProps {
  onSuccess?: (bootcampId: number) => void;
}

export default function BootcampCreator({ onSuccess }: BootcampCreatorProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    fee: '',
    maxStudents: '100',
    requiresVerification: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrg, setIsOrg] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const { createBootcamp, loading, error } = useSkillPaysCore();
  const { isOrganization } = useOrganizationRegistry();
  const { account, connect } = useWeb3();

  useEffect(() => {
    const checkOrgStatus = async () => {
      if (account) {
        setCheckingRole(true);
        try {
          const orgStatus = await isOrganization(account);
          setIsOrg(orgStatus);
        } catch (err) {
          console.error('Failed to check organization status:', err);
          setIsOrg(false);
        } finally {
          setCheckingRole(false);
        }
      } else {
        setIsOrg(null);
        setCheckingRole(false);
      }
    };

    checkOrgStatus();
  }, [account, isOrganization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) {
      await connect();
      return;
    }

    if (!isOrg) {
      return;
    }

    if (!formData.name.trim() || !formData.description.trim() || !formData.duration || !formData.fee || !formData.maxStudents) {
      return;
    }

    try {
      setIsSubmitting(true);
      const tx = await createBootcamp(
        formData.name.trim(),
        formData.description.trim(),
        parseInt(formData.duration),
        formData.fee,
        [], // tags - empty for now
        parseInt(formData.maxStudents), 
        formData.requiresVerification
      );
      
      setFormData({ name: '', description: '', duration: '', fee: '', maxStudents: '100', requiresVerification: false });
      onSuccess?.(parseInt(tx.logs?.[0]?.topics?.[1] || '0'));
    } catch (err) {
      console.error('Bootcamp creation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Show loading while checking role
  if (checkingRole) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Checking permissions...</span>
        </div>
      </div>
    );
  }

  // Show access denied for non-organizations
  if (account && isOrg === false) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600 mb-6">
            Only verified organizations can create bootcamps on this platform. 
            Individual users can browse and enroll in existing bootcamps.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Want to create bootcamps?</h4>
            <p className="text-blue-800 text-sm">
              Contact our team to register your organization and gain bootcamp creation privileges.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Bootcamp</h2>
      <p className="text-gray-600 mb-6">Set up a new learning bootcamp for students</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Bootcamp Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            placeholder="e.g., Full Stack Web Development"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading || isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder="Detailed description of the bootcamp curriculum and goals"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading || isSubmitting}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              Duration (weeks)
            </label>
            <input
              type="number"
              id="duration"
              value={formData.duration}
              onChange={(e) => updateFormData('duration', e.target.value)}
              placeholder="12"
              min="1"
              max="52"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || isSubmitting}
              required
            />
          </div>

          <div>
            <label htmlFor="fee" className="block text-sm font-medium text-gray-700 mb-2">
              Enrollment Fee (ETH)
            </label>
            <input
              type="number"
              id="fee"
              value={formData.fee}
              onChange={(e) => updateFormData('fee', e.target.value)}
              placeholder="0.1"
              min="0"
              step="0.001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || isSubmitting}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="maxStudents" className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Students
            </label>
            <input
              type="number"
              id="maxStudents"
              value={formData.maxStudents}
              onChange={(e) => updateFormData('maxStudents', e.target.value)}
              placeholder="100"
              min="1"
              max="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || isSubmitting}
              required
            />
          </div>

          <div className="flex items-center">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="requiresVerification"
                checked={formData.requiresVerification}
                onChange={(e) => updateFormData('requiresVerification', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading || isSubmitting}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="requiresVerification" className="font-medium text-gray-700">
                Requires Verification
              </label>
              <p className="text-gray-500">Only verified students can enroll</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isSubmitting || !formData.name.trim() || !formData.description.trim() || !formData.duration || !formData.fee || !formData.maxStudents}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!account ? 'Connect Wallet' : loading || isSubmitting ? 'Creating...' : 'Create Bootcamp'}
        </button>
      </form>
    </div>
  );
}