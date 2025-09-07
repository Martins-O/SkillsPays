'use client';

import { useState, useEffect } from 'react';
import { useMentorBoostSystem } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';
import { formatEther } from '@/lib/utils';
import BoostRequestManager from './BoostRequestManager';
import { 
  User, 
  Star, 
  Clock, 
  DollarSign, 
  BookOpen, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Plus,
  Zap
} from 'lucide-react';

interface MentorProfile {
  name: string;
  bio: string;
  skills: string[];
  isActive: boolean;
  totalBoosts: number;
  averageRating: number;
  totalEarnings: bigint;
  hourlyRate: bigint;
}

interface MentorshipRequest {
  id: number;
  student: string;
  skillId: number;
  skillName: string;
  duration: number;
  justification: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  timestamp: number;
}

interface MentorshipSession {
  id: number;
  student: string;
  sessionType: string;
  duration: number;
  scheduledAt: number;
  isCompleted: boolean;
  studentRating: number;
  studentFeedback: string;
}

export default function MentorDashboard() {
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'boosts'>('overview');
  const [registrationData, setRegistrationData] = useState({
    specializations: '',
    hourlyRate: '',
    availability: ''
  });

  const { 
    registerMentor, 
    acceptMentorship, 
    completeMentorship, 
    getMentor,
    loading: contractLoading,
    error 
  } = useMentorBoostSystem();
  
  const { account, isConnected } = useWeb3();

  useEffect(() => {
    if (isConnected && account) {
      loadMentorData();
    }
  }, [isConnected, account]);

  const loadMentorData = async () => {
    if (!account) return;

    try {
      setLoading(true);
      
      const mentorData = await getMentor(account);
      
      if (mentorData && mentorData.isActive) {
        setProfile({
          name: mentorData.name || 'Anonymous Mentor',
          bio: mentorData.bio || '',
          skills: mentorData.skills ? mentorData.skills.split(',') : [],
          isActive: mentorData.isActive,
          totalBoosts: Number(mentorData.totalBoosts) || 0,
          averageRating: Number(mentorData.averageRating) || 0,
          totalEarnings: mentorData.totalEarnings || BigInt(0),
          hourlyRate: mentorData.hourlyRate || BigInt(0)
        });

        // Mock data for demonstration
        setRequests([
          {
            id: 1,
            student: '0x1234...5678',
            skillId: 1,
            skillName: 'React Development',
            duration: 2,
            justification: 'Need help with advanced hooks and state management',
            status: 'pending',
            timestamp: Date.now() - 3600000
          },
          {
            id: 2,
            student: '0x8765...4321',
            skillId: 2,
            skillName: 'Smart Contract Security',
            duration: 3,
            justification: 'Want to learn about common vulnerabilities and best practices',
            status: 'accepted',
            timestamp: Date.now() - 7200000
          }
        ]);

        setSessions([
          {
            id: 1,
            student: '0x9999...1111',
            sessionType: 'Code Review',
            duration: 1,
            scheduledAt: Date.now() + 86400000,
            isCompleted: false,
            studentRating: 0,
            studentFeedback: ''
          },
          {
            id: 2,
            student: '0x2222...8888',
            sessionType: 'Live Coding',
            duration: 2,
            scheduledAt: Date.now() - 86400000,
            isCompleted: true,
            studentRating: 5,
            studentFeedback: 'Excellent session! Learned a lot about optimization techniques.'
          }
        ]);
      } else {
        setProfile(null);
        setRequests([]);
        setSessions([]);
      }
    } catch (err) {
      console.error('Failed to load mentor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const skillIds = registrationData.specializations
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0)
        .map((_, index) => index + 1); // Mock skill IDs

      await registerMentor(
        skillIds,
        registrationData.hourlyRate,
        registrationData.availability
      );
      
      setShowRegistration(false);
      setRegistrationData({ specializations: '', hourlyRate: '', availability: '' });
      await loadMentorData();
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await acceptMentorship(requestId);
      await loadMentorData();
    } catch (err) {
      console.error('Failed to accept mentorship:', err);
    }
  };

  const handleCompleteSession = async (sessionId: number, feedback: string, rating: number) => {
    try {
      await completeMentorship(sessionId, feedback, rating);
      await loadMentorData();
    } catch (err) {
      console.error('Failed to complete session:', err);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600">
          Please connect your wallet to access mentor features
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading mentor dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Mentor Dashboard</h1>
        {!profile && (
          <button
            onClick={() => setShowRegistration(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <User className="w-4 h-4" />
            <span>Register as Mentor</span>
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
            <h2 className="text-xl font-bold mb-4">Register as Mentor</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specializations (comma-separated)
                </label>
                <input
                  type="text"
                  value={registrationData.specializations}
                  onChange={(e) => setRegistrationData({...registrationData, specializations: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="React, Node.js, Smart Contracts"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={registrationData.hourlyRate}
                  onChange={(e) => setRegistrationData({...registrationData, hourlyRate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.05"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Availability
                </label>
                <textarea
                  value={registrationData.availability}
                  onChange={(e) => setRegistrationData({...registrationData, availability: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Weekdays 9-5 UTC"
                  rows={3}
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={contractLoading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {contractLoading ? 'Registering...' : 'Register'}
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

      {profile ? (
        <>
          {/* Mentor Profile */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
                  <p className="text-gray-600">Mentor</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-600">
                      {profile.averageRating.toFixed(1)} rating
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">
                      {profile.totalBoosts} sessions completed
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {formatEther(profile.totalEarnings)} ETH
                </div>
                <div className="text-sm text-gray-600">Total Earned</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="text-lg font-semibold">{formatEther(profile.hourlyRate)} ETH/hr</div>
                <div className="text-sm text-gray-600">Hourly Rate</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-lg font-semibold">{profile.skills.length}</div>
                <div className="text-sm text-gray-600">Specializations</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="text-lg font-semibold">{profile.isActive ? 'Active' : 'Inactive'}</div>
                <div className="text-sm text-gray-600">Status</div>
              </div>
            </div>

            {profile.skills.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`py-2 px-4 border-b-2 font-medium text-sm ${
                    activeTab === 'sessions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sessions
                </button>
                <button
                  onClick={() => setActiveTab('boosts')}
                  className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center space-x-1 ${
                    activeTab === 'boosts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Boosts & Rewards</span>
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Mentorship Requests</h2>
                  <div className="space-y-4">
                    {requests.filter(r => r.status === 'pending').length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No pending mentorship requests.</p>
                      </div>
                    ) : (
                      requests.filter(r => r.status === 'pending').map((request) => (
                        <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{request.skillName}</h3>
                              <p className="text-sm text-gray-600">
                                From: {request.student.slice(0, 6)}...{request.student.slice(-4)}
                              </p>
                              <p className="text-sm text-gray-600">Duration: {request.duration} hours</p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleAcceptRequest(request.id)}
                                disabled={contractLoading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                Accept
                              </button>
                              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                Decline
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{request.justification}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'sessions' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Sessions</h2>
                  <div className="space-y-4">
                    {sessions.filter(s => !s.isCompleted).length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No active sessions.</p>
                      </div>
                    ) : (
                      sessions.filter(s => !s.isCompleted).map((session) => (
                        <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{session.sessionType}</h3>
                              <p className="text-sm text-gray-600">
                                With: {session.student.slice(0, 6)}...{session.student.slice(-4)}
                              </p>
                              <div className="flex items-center space-x-2 mt-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">{session.duration} minutes</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleCompleteSession(session.id, "Session completed", 5)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Complete Session
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'boosts' && (
                <BoostRequestManager />
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Become a Mentor</h2>
          <p className="text-gray-600 mb-6">
            Share your knowledge and earn rewards by mentoring students
          </p>
          <button
            onClick={() => setShowRegistration(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mx-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Register Now</span>
          </button>
        </div>
      )}
    </div>
  );
}