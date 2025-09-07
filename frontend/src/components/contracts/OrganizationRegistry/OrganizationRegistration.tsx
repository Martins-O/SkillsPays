'use client';

import { useState } from 'react';
import { useOrganizationRegistry } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';
import { Card, CardHeader, CardTitle, CardContent, Input, TransactionButton } from '@/components/ui';
import { Building2, Globe, Mail, Image, FileText, Tags } from 'lucide-react';

export default function OrganizationRegistration() {
  const { account, connect } = useWeb3();
  const { registerOrganization, loading, error } = useOrganizationRegistry();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    logoUrl: '',
    contactEmail: '',
    specializations: [] as string[],
    registrationFee: '0.01'
  });
  
  const [currentSpecialization, setCurrentSpecialization] = useState('');

  const predefinedSpecializations = [
    'Web Development',
    'Blockchain Development',
    'Data Science',
    'Machine Learning',
    'Mobile Development',
    'DevOps',
    'Cybersecurity',
    'UI/UX Design',
    'Game Development',
    'Cloud Computing'
  ];

  const addSpecialization = () => {
    if (currentSpecialization.trim() && !formData.specializations.includes(currentSpecialization.trim())) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, currentSpecialization.trim()]
      }));
      setCurrentSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s !== spec)
    }));
  };

  const addPredefinedSpecialization = (spec: string) => {
    if (!formData.specializations.includes(spec)) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, spec]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) {
      await connect();
      return;
    }

    if (!formData.name.trim() || !formData.description.trim() || !formData.contactEmail.trim()) {
      return;
    }

    try {
      await registerOrganization(
        formData.name.trim(),
        formData.description.trim(),
        formData.website.trim(),
        formData.logoUrl.trim(),
        formData.contactEmail.trim(),
        formData.specializations,
        formData.registrationFee
      );
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        website: '',
        logoUrl: '',
        contactEmail: '',
        specializations: [],
        registrationFee: '0.01'
      });
    } catch (error) {
      console.error('Error registering organization:', error);
    }
  };

  const updateFormData = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!account) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6 text-center">
          <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600 mb-4">
            Please connect your wallet to register your organization on the SkillPays platform.
          </p>
          <TransactionButton onClick={connect}>
            Connect Wallet
          </TransactionButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Register Your Organization
        </CardTitle>
        <p className="text-gray-600">
          Join the SkillPays platform as a verified educational organization. Create bootcamps, 
          issue certificates, and help students achieve their learning goals.
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Organization Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="e.g., TechEdu Academy"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Contact Email *
              </label>
              <Input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateFormData('contactEmail', e.target.value)}
                placeholder="contact@organization.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Describe your organization's mission, values, and educational approach..."
              required
              disabled={loading}
            />
          </div>

          {/* Website and Logo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                Website (optional)
              </label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => updateFormData('website', e.target.value)}
                placeholder="https://your-organization.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Image className="w-4 h-4 inline mr-1" />
                Logo URL (optional)
              </label>
              <Input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => updateFormData('logoUrl', e.target.value)}
                placeholder="https://your-organization.com/logo.png"
                disabled={loading}
              />
            </div>
          </div>

          {/* Specializations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tags className="w-4 h-4 inline mr-1" />
              Specializations
            </label>
            
            {/* Quick add buttons */}
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {predefinedSpecializations.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => addPredefinedSpecialization(spec)}
                    disabled={formData.specializations.includes(spec) || loading}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full border"
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom specialization input */}
            <div className="flex gap-2 mb-3">
              <Input
                type="text"
                value={currentSpecialization}
                onChange={(e) => setCurrentSpecialization(e.target.value)}
                placeholder="Add custom specialization..."
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
              />
              <button
                type="button"
                onClick={addSpecialization}
                disabled={!currentSpecialization.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            {/* Selected specializations */}
            {formData.specializations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.specializations.map((spec) => (
                  <span
                    key={spec}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {spec}
                    <button
                      type="button"
                      onClick={() => removeSpecialization(spec)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                      disabled={loading}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Registration Fee */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium text-yellow-800">Registration Fee</h4>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              A registration fee of {formData.registrationFee} ETH is required to register your organization. 
              This helps maintain platform quality and prevents spam registrations.
            </p>
            <div>
              <label className="block text-sm font-medium text-yellow-700 mb-2">
                Fee Amount (ETH)
              </label>
              <Input
                type="number"
                value={formData.registrationFee}
                onChange={(e) => updateFormData('registrationFee', e.target.value)}
                min="0.01"
                step="0.001"
                disabled={loading}
                className="max-w-xs"
              />
            </div>
          </div>

          {/* Terms and Submit */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your application will be reviewed by our team</li>
              <li>• You'll receive approval notification within 2-3 business days</li>
              <li>• Once approved, you can create bootcamps and manage students</li>
              <li>• Additional verification levels unlock premium features</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <TransactionButton
            type="submit"
            disabled={loading || !formData.name.trim() || !formData.description.trim() || !formData.contactEmail.trim()}
            className="w-full"
          >
            {loading ? 'Registering...' : `Register Organization (${formData.registrationFee} ETH)`}
          </TransactionButton>
        </form>
      </CardContent>
    </Card>
  );
}