'use client';

import { useState, useEffect } from 'react';
import { useSkillPaysCore } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface Milestone {
  id: number;
  bootcampId: number;
  name: string;
  description: string;
  requiredScore: number;
  isCompulsory: boolean;
  rewardAmount: string;
  completed?: boolean;
}

interface MilestoneTrackerProps {
  bootcampId: number;
  bootcampName?: string;
}

export default function MilestoneTracker({ bootcampId, bootcampName }: MilestoneTrackerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<number | null>(null);
  
  const { getBootcamp, getBootcampMilestones, completeMilestone, error } = useSkillPaysCore();
  const { account, connect } = useWeb3();

  useEffect(() => {
    loadMilestones();
  }, [bootcampId, account]);

  const loadMilestones = async () => {
    try {
      setLoading(true);
      
      // Try to load real milestone data from contract
      const contractMilestones = await getBootcampMilestones(bootcampId);
      
      if (contractMilestones && contractMilestones.length > 0) {
        const formattedMilestones = contractMilestones.map((milestone: unknown, index: number) => {
          const typedMilestone = milestone as Record<string, unknown>;
          return {
            id: (typedMilestone.id as number) || index + 1,
            bootcampId: (typedMilestone.bootcampId as number) || bootcampId,
            name: (typedMilestone.name as string) || `Milestone ${index + 1}`,
            description: (typedMilestone.description as string) || "Complete this milestone to progress",
            requiredScore: Number(typedMilestone.requiredScore) || 100,
            isCompulsory: typedMilestone.requiresPeerReview !== undefined ? (typedMilestone.requiresPeerReview as boolean) : true,
            rewardAmount: (typedMilestone.rewardAmount as string) || "0.01",
            completed: false // Would need to track completion status
          };
        });
        setMilestones(formattedMilestones);
      } else {
        setMilestones([]);
      }
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (milestone: Milestone) => {
    if (!account) {
      await connect();
      return;
    }

    try {
      setCompleting(milestone.id);
      await completeMilestone(bootcampId, milestone.id, '0x');
      await loadMilestones();
    } catch (err) {
      console.error('Milestone completion failed:', err);
    } finally {
      setCompleting(null);
    }
  };

  const completedCount = milestones.filter(m => m.completed).length;
  const progressPercentage = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading milestones...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {bootcampName || `Bootcamp #${bootcampId}`} Milestones
            </h2>
            <p className="text-gray-600">Track your progress through the bootcamp</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {completedCount}/{milestones.length}
            </div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 text-red-600 text-sm bg-red-50 border-b border-red-200">
          {error}
        </div>
      )}

      <div className="p-6">
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <div 
              key={milestone.id} 
              className={`border rounded-lg p-4 transition-all ${
                milestone.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                      milestone.completed 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {milestone.completed ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-xs font-semibold">{milestone.id}</span>
                      )}
                    </div>
                    <h3 className={`text-lg font-semibold ${
                      milestone.completed ? 'text-green-900' : 'text-gray-900'
                    }`}>
                      {milestone.name}
                    </h3>
                    {milestone.isCompulsory && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-3">
                    {milestone.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Required Score:</span>
                      <span className="ml-1 font-medium">{milestone.requiredScore}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Reward:</span>
                      <span className="ml-1 font-medium text-green-600">{milestone.rewardAmount} ETH</span>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  {milestone.completed ? (
                    <div className="flex items-center text-green-600">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleComplete(milestone)}
                      disabled={completing === milestone.id}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {completing === milestone.id ? 'Completing...' : 'Mark Complete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}