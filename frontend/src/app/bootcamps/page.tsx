'use client';

import { useState } from 'react';
import BootcampBrowser from '@/components/contracts/SkillPaysCore/BootcampBrowser';
import BootcampCreator from '@/components/contracts/SkillPaysCore/BootcampCreator';

export default function BootcampsPage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bootcamps</h1>
          <p className="mt-2 text-gray-600">
            Discover and join learning bootcamps or create your own
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('browse')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'browse'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Browse Bootcamps
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Create Bootcamp
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'browse' && <BootcampBrowser />}
            {activeTab === 'create' && (
              <BootcampCreator 
                onSuccess={() => setActiveTab('browse')} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}