'use client';

import React, { useState, useEffect } from 'react';
import { useSkillGraph } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface Skill {
  id: number;
  name: string;
  description: string;
  category: string;
  prerequisites: number[];
  level: number;
  isActive: boolean;
  createdAt: number;
}

interface SkillProgress {
  skillId: number;
  student: string;
  currentLevel: number;
  evidenceCount: number;
  completionPercentage: number;
  lastUpdated: number;
  isValidated: boolean;
}

interface SkillEvidence {
  id: number;
  skillId: number;
  student: string;
  evidenceHash: string;
  description: string;
  confidenceScore: number;
  submittedAt: number;
  isValidated: boolean;
  validatedBy: string;
  validatedAt: number;
}

const SKILL_CATEGORIES = [
  'Frontend',
  'Backend', 
  'Database',
  'DevOps',
  'Testing',
  'Security',
  'Mobile',
  'AI/ML',
  'Project Management',
  'Soft Skills'
];

const SKILL_LEVELS = [
  { value: 0, label: 'None', color: 'bg-gray-200' },
  { value: 1, label: 'Beginner', color: 'bg-green-200' },
  { value: 2, label: 'Intermediate', color: 'bg-blue-200' },
  { value: 3, label: 'Advanced', color: 'bg-purple-200' },
  { value: 4, label: 'Expert', color: 'bg-gold-200' }
];

export default function SkillsDashboard() {
  const { account } = useWeb3();
  const skillGraph = useSkillGraph();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'create'>('overview');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userProgress, setUserProgress] = useState<SkillProgress[]>([]);
  const [evidenceList, setEvidenceList] = useState<SkillEvidence[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Evidence submission form
  const [evidenceForm, setEvidenceForm] = useState({
    skillId: 0,
    evidenceHash: '',
    description: '',
    confidenceScore: 80
  });

  // Skill creation form
  const [skillForm, setSkillForm] = useState({
    name: '',
    description: '',
    category: 'Frontend',
    prerequisites: [] as number[]
  });

  useEffect(() => {
    if (account) {
      loadSkillsData();
    }
  }, [account]);

  const loadSkillsData = async () => {
    if (!account) return;
    
    try {
      // Load skills from blockchain
      const allSkills: Skill[] = [];
      const userProgressData: SkillProgress[] = [];
      
      // Try to load skills by category
      for (const category of SKILL_CATEGORIES) {
        try {
          const categorySkills = await skillGraph.getSkillsByCategory(category);
          if (categorySkills && categorySkills.length > 0) {
            for (let i = 0; i < categorySkills.length; i++) {
              const skillData = categorySkills[i];
              if (skillData && skillData.name) {
                const skill: Skill = {
                  id: Number(skillData.id),
                  name: skillData.name,
                  description: skillData.description || '',
                  category: category,
                  prerequisites: skillData.prerequisites ? skillData.prerequisites.map(Number) : [],
                  level: Number(skillData.level || 1),
                  isActive: Boolean(skillData.isActive),
                  createdAt: Number(skillData.createdAt || Date.now() / 1000)
                };
                allSkills.push(skill);
                
                // Get user progress for this skill
                try {
                  const progress = await skillGraph.getStudentSkillProgress(account, skill.id);
                  if (progress && Number(progress.currentLevel) > 0) {
                    userProgressData.push({
                      skillId: skill.id,
                      student: account,
                      currentLevel: Number(progress.currentLevel),
                      evidenceCount: Number(progress.evidenceCount || 0),
                      completionPercentage: Number(progress.completionPercentage || 0),
                      lastUpdated: Number(progress.lastUpdated || Date.now() / 1000),
                      isValidated: Boolean(progress.isValidated)
                    });
                  }
                } catch (err) {
                  // User hasn't started this skill yet
                  console.log(`No progress found for skill ${skill.id}`);
                }
              }
            }
          }
        } catch (err) {
          console.log(`No skills found in category ${category}`);
        }
      }

      // If no skills found from contract, show message instead of mock data
      if (allSkills.length === 0) {
        console.log('No skills found in smart contract. Skills need to be created first.');
      }

      setSkills(allSkills);
      setUserProgress(userProgressData);
      
      // Evidence list would typically come from events or separate contract calls
      // For now, we'll start with empty and populate as evidence is submitted
      setEvidenceList([]);
      
    } catch (error) {
      console.error('Error loading skills data:', error);
      // Don't show mock data on error - show empty state instead
      setSkills([]);
      setUserProgress([]);
      setEvidenceList([]);
    }
  };

  const handleSubmitEvidence = async () => {
    if (!evidenceForm.skillId || !evidenceForm.evidenceHash || !evidenceForm.description) return;
    
    try {
      await skillGraph.updateSkillProgress(
        account!,
        evidenceForm.skillId,
        evidenceForm.evidenceHash,
        evidenceForm.confidenceScore
      );
      
      // Reset form
      setEvidenceForm({
        skillId: 0,
        evidenceHash: '',
        description: '',
        confidenceScore: 80
      });
      
      await loadSkillsData();
    } catch (error) {
      console.error('Error submitting evidence:', error);
    }
  };

  const handleCreateSkill = async () => {
    if (!skillForm.name || !skillForm.description) return;
    
    try {
      await skillGraph.createSkill(
        skillForm.name,
        skillForm.description,
        skillForm.category,
        skillForm.prerequisites
      );
      
      // Reset form
      setSkillForm({
        name: '',
        description: '',
        category: 'Frontend',
        prerequisites: []
      });
      
      await loadSkillsData();
    } catch (error) {
      console.error('Error creating skill:', error);
    }
  };

  const getSkillProgress = (skillId: number): SkillProgress | undefined => {
    return userProgress.find(p => p.skillId === skillId);
  };

  const getSkillLevelInfo = (level: number) => {
    return SKILL_LEVELS.find(l => l.value === level) || SKILL_LEVELS[0];
  };

  const filteredSkills = selectedCategory === 'All' 
    ? skills 
    : skills.filter(skill => skill.category === selectedCategory);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please connect your wallet to access the Skills Dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Skills Dashboard</h1>
        <p className="text-gray-600">
          Track your skill progression with evidence-based validation and peer review
        </p>
      </div>

      {/* Skills Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-full mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Skills</p>
              <p className="text-2xl font-bold text-gray-900">{userProgress.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-full mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Validated Skills</p>
              <p className="text-2xl font-bold text-gray-900">{userProgress.filter(p => p.isValidated).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-full mr-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Evidence Submitted</p>
              <p className="text-2xl font-bold text-gray-900">{evidenceList.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-full mr-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Average Level</p>
              <p className="text-2xl font-bold text-gray-900">
                {userProgress.length > 0 
                  ? (userProgress.reduce((sum, p) => sum + p.currentLevel, 0) / userProgress.length).toFixed(1)
                  : '0.0'}
              </p>
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
              Skills Overview
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'evidence'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Submit Evidence
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Create Skill
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="All">All Categories</option>
                  {SKILL_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Skills Grid */}
              <div className="grid gap-6">
                {filteredSkills.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No skills found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {skills.length === 0 
                        ? 'No skills have been created yet. Create your first skill to get started.'
                        : 'No skills match the selected category filter.'}
                    </p>
                    {skills.length === 0 && (
                      <div className="mt-6">
                        <button
                          onClick={() => setActiveTab('create')}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Create First Skill
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredSkills.map((skill) => {
                  const progress = getSkillProgress(skill.id);
                  const levelInfo = getSkillLevelInfo(progress?.currentLevel || 0);
                  
                  return (
                    <div key={skill.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{skill.name}</h3>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {skill.category}
                            </span>
                            {progress?.isValidated && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                ✓ Validated
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{skill.description}</p>
                          
                          {skill.prerequisites.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm text-gray-500">
                                Prerequisites: {skill.prerequisites.map(id => {
                                  const prereq = skills.find(s => s.id === id);
                                  return prereq?.name;
                                }).filter(Boolean).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          {progress ? (
                            <>
                              <div className={`px-3 py-1 rounded-full text-sm font-medium ${levelInfo.color} mb-2`}>
                                {levelInfo.label}
                              </div>
                              <div className="text-sm text-gray-600">
                                {progress.completionPercentage}% Complete
                              </div>
                              <div className="text-sm text-gray-600">
                                {progress.evidenceCount} Evidence
                              </div>
                            </>
                          ) : (
                            <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                              Not Started
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {progress && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${progress.completionPercentage}%`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'evidence' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Submit Skill Evidence</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Evidence Submission Form */}
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Skill
                      </label>
                      <select
                        value={evidenceForm.skillId}
                        onChange={(e) => setEvidenceForm(prev => ({ ...prev, skillId: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value={0}>Select a skill...</option>
                        {skills.map(skill => (
                          <option key={skill.id} value={skill.id}>
                            {skill.name} ({skill.category})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Evidence Hash (IPFS)
                      </label>
                      <input
                        type="text"
                        value={evidenceForm.evidenceHash}
                        onChange={(e) => setEvidenceForm(prev => ({ ...prev, evidenceHash: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="QmXXXXXX..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Evidence Description
                      </label>
                      <textarea
                        value={evidenceForm.description}
                        onChange={(e) => setEvidenceForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe what this evidence demonstrates..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confidence Score (0-100)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={evidenceForm.confidenceScore}
                        onChange={(e) => setEvidenceForm(prev => ({ ...prev, confidenceScore: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-500 mt-1">
                        <span>0</span>
                        <span className="font-semibold">{evidenceForm.confidenceScore}</span>
                        <span>100</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleSubmitEvidence}
                      disabled={skillGraph.loading || !evidenceForm.skillId || !evidenceForm.evidenceHash || !evidenceForm.description}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {skillGraph.loading ? 'Submitting...' : 'Submit Evidence'}
                    </button>
                  </div>
                </div>

                {/* Recent Evidence */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Evidence</h3>
                  <div className="space-y-4">
                    {evidenceList.slice(0, 5).map((evidence) => {
                      const skill = skills.find(s => s.id === evidence.skillId);
                      return (
                        <div key={evidence.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{skill?.name || 'Unknown Skill'}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              evidence.isValidated 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {evidence.isValidated ? 'Validated' : 'Pending'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{evidence.description}</p>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Score: {evidence.confidenceScore}%</span>
                            <span>{formatDate(evidence.submittedAt)}</span>
                          </div>
                          <a
                            href={`https://ipfs.io/ipfs/${evidence.evidenceHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm underline mt-2 inline-block"
                          >
                            View Evidence
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {skillGraph.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
                  <p className="text-red-800">{skillGraph.error}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Skill</h2>
              
              <div className="max-w-2xl space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    value={skillForm.name}
                    onChange={(e) => setSkillForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Advanced React Patterns"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={skillForm.description}
                    onChange={(e) => setSkillForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe what this skill encompasses..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={skillForm.category}
                    onChange={(e) => setSkillForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {SKILL_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prerequisites (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {skills.map(skill => (
                      <label key={skill.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={skillForm.prerequisites.includes(skill.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSkillForm(prev => ({
                                ...prev,
                                prerequisites: [...prev.prerequisites, skill.id]
                              }));
                            } else {
                              setSkillForm(prev => ({
                                ...prev,
                                prerequisites: prev.prerequisites.filter(id => id !== skill.id)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{skill.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={handleCreateSkill}
                  disabled={skillGraph.loading || !skillForm.name || !skillForm.description}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {skillGraph.loading ? 'Creating...' : 'Create Skill'}
                </button>
                
                {skillGraph.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{skillGraph.error}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}