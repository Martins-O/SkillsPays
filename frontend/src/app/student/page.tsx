'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useSkillPaysCore } from '@/hooks/useContracts';
import { Student, Bootcamp, Milestone } from '@/types/contracts';
import { formatEther } from '@/lib/utils';
import { 
  User, 
  BookOpen, 
  Trophy, 
  CheckCircle, 
  Coins,
  AlertCircle,
  Plus
} from 'lucide-react';

export default function StudentPage() {
  const { account, isConnected } = useWeb3();
  const { 
    loading, 
    error, 
    registerStudent, 
    getStudent, 
    enrollInBootcamp, 
    completeMilestone 
  } = useSkillPaysCore();

  const [student, setStudent] = useState<Student | null>(null);
  const [bootcamps, setBootcamps] = useState<Bootcamp[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [, ] = useState<number | null>(null);
  const [registrationName, setRegistrationName] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);


  useEffect(() => {
    if (isConnected && account) {
      loadStudentData();
    }
  }, [isConnected, account]);

  const loadStudentData = async () => {
    if (!account) return;
    
    try {
      const studentData = await getStudent(account);
      setStudent(studentData);
      
      // Only load real contract data - no mock data
      // Bootcamps and milestones will be empty until real data is available
      setBootcamps([]);
      setMilestones([]);
    } catch (err) {
      console.error('Error loading student data:', err);
      // Set empty arrays on error
      setBootcamps([]);
      setMilestones([]);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationName.trim()) return;

    try {
      await registerStudent(registrationName);
      setShowRegistration(false);
      setRegistrationName('');
      await loadStudentData();
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const handleEnroll = async (bootcampId: number, fee: bigint) => {
    try {
      await enrollInBootcamp(bootcampId, formatEther(fee));
      await loadStudentData();
    } catch (err) {
      console.error('Enrollment failed:', err);
    }
  };

  const handleCompleteMilestone = async (bootcampId: number, milestoneId: number) => {
    try {
      await completeMilestone(bootcampId, milestoneId);
      await loadStudentData();
    } catch (err) {
      console.error('Milestone completion failed:', err);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600">
          Please connect your wallet to access student features
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        {!student && (
          <button
            onClick={() => setShowRegistration(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <User className="w-4 h-4" />
            <span>Register as Student</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Registration Modal */}
      {showRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Register as Student</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={registrationName}
                  onChange={(e) => setRegistrationName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading || !registrationName.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegistration(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {student ? (
        <>
          {/* Student Profile */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{student.name}</h2>
                <p className="text-gray-600">Registered Student</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{student.reputationScore}</div>
                <div className="text-sm text-gray-600">Reputation Score</div>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <div className="text-lg font-semibold">{student.totalBadges}</div>
                <div className="text-sm text-gray-600">Badges Earned</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <BookOpen className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="text-lg font-semibold">{student.enrolledBootcamps.length}</div>
                <div className="text-sm text-gray-600">Bootcamps Joined</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-lg font-semibold">{student.isActive ? 'Active' : 'Inactive'}</div>
                <div className="text-sm text-gray-600">Status</div>
              </div>
            </div>
          </div>

          {/* Available Bootcamps */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Bootcamps</h2>
            <div className="space-y-4">
              {bootcamps.map((bootcamp) => (
                <div key={bootcamp.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{bootcamp.name}</h3>
                      <p className="text-gray-600 text-sm">{bootcamp.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-blue-600">
                        {formatEther(bootcamp.fee)} ETH
                      </div>
                      <div className="text-sm text-gray-600">{bootcamp.duration} days</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{bootcamp.totalEnrolled} enrolled</span>
                      <span>Created by {bootcamp.creator.slice(0, 8)}...</span>
                    </div>
                    <button
                      onClick={() => handleEnroll(bootcamp.id, bootcamp.fee)}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Enroll</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Milestones */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Milestones</h2>
            <div className="space-y-4">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{milestone.name}</h3>
                        {milestone.isCompulsory && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{milestone.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Required Score: {milestone.requiredScore}%</span>
                        <span className="flex items-center space-x-1">
                          <Coins className="w-4 h-4" />
                          <span>{formatEther(milestone.rewardAmount)} ETH reward</span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCompleteMilestone(milestone.bootcampId, milestone.id)}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to SkillPays</h2>
          <p className="text-gray-600 mb-6">
            Register as a student to start your learning journey
          </p>
          <button
            onClick={() => setShowRegistration(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mx-auto"
          >
            <User className="w-5 h-5" />
            <span>Register Now</span>
          </button>
        </div>
      )}
    </div>
  );
}