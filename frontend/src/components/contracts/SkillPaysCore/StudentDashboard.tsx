'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSkillPaysCore, useStudentBadges } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Badge } from '@/components/ui';
import { sanitizeText } from '@/utils/security';
import BadgeCollection from '@/components/contracts/StudentBadges/BadgeCollection';
import { UserIcon, TrophyIcon, BookOpenIcon } from '@heroicons/react/24/outline';

interface StudentStats {
  name: string;
  totalBootcamps: number;
  completedMilestones: number;
  totalBadges: number;
  reputationScore: number;
  registrationDate: number;
}

interface EnrolledBootcamp {
  id: number;
  name: string;
  progress: number;
  totalMilestones: number;
  completedMilestones: number;
}

export default function StudentDashboard() {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [bootcamps, setBootcamps] = useState<EnrolledBootcamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBadges, setShowBadges] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [nameError, setNameError] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  
  const { getStudent, getStudentBootcamps, getBootcamp, registerStudent } = useSkillPaysCore();
  const { balanceOf } = useStudentBadges();
  const { account, connect } = useWeb3();

  const loadStudentData = useCallback(async () => {
    if (!account) return;
    
    try {
      setLoading(true);
      
      // Load student profile
      const studentData = await getStudent(account);
      
      // Check if student exists and is registered
      if (!studentData || !studentData.isActive) {
        console.log('Student not found or not active:', studentData);
        setStats(null);
        setBootcamps([]);
        setLoading(false);
        return;
      }
      
      // Load badge count
      const badgeCount = await balanceOf(account);
      
      // Load enrolled bootcamps
      const enrolledBootcampIds = await getStudentBootcamps(account);
      
      setStats({
        name: studentData.name || 'Unknown',
        totalBootcamps: enrolledBootcampIds ? enrolledBootcampIds.length : 0,
        completedMilestones: 8, // This would need milestone tracking
        totalBadges: Number(badgeCount) || Number(studentData.totalBadges) || 0,
        reputationScore: Number(studentData.reputationScore) || 0,
        registrationDate: Number(studentData.joinedAt) || Date.now()
      });
      
      // Load actual bootcamp data
      if (enrolledBootcampIds && enrolledBootcampIds.length > 0) {
        const bootcampDetails = await Promise.all(
            enrolledBootcampIds.map(async (id: number) => {
              try {
                const bootcamp = await getBootcamp(id);
                return {
                  id: id,
                  name: bootcamp.name || `Bootcamp ${id}`,
                  progress: Math.floor(Math.random() * 100), // Mock progress - would calculate from milestones
                  totalMilestones: 8, // Mock - would get from contract
                  completedMilestones: Math.floor(Math.random() * 8)
                };
              } catch (err) {
                console.error(`Failed to load bootcamp ${id}:`, err);
                return null;
              }
            })
        );
        setBootcamps(bootcampDetails.filter(b => b !== null) as EnrolledBootcamp[]);
      } else {
        // No enrolled bootcamps - set empty array
        setBootcamps([]);
      }
    } catch (err) {
      console.error('Failed to load student data:', err);
      setStats(null);
      setBootcamps([]);
    } finally {
      setLoading(false);
    }
  }, [account, getStudent, getStudentBootcamps, getBootcamp, balanceOf]);

  useEffect(() => {
    if (account) {
      loadStudentData();
    }
  }, [account, loadStudentData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const validateStudentName = (name: string) => {
    if (!name.trim()) {
      setNameError('Name is required');
      return false;
    }
    if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    if (name.trim().length > 50) {
      setNameError('Name must be less than 50 characters');
      return false;
    }
    if (!/^[a-zA-Z\s\-'\.]+$/.test(name.trim())) {
      setNameError('Name can only contain letters, spaces, hyphens, apostrophes, and periods');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleStudentNameChange = (value: string) => {
    setStudentName(value);
    if (nameError) {
      validateStudentName(value);
    }
  };

  const handleRegisterStudent = async () => {
    if (!account || !validateStudentName(studentName)) return;
    
    try {
      setRegistering(true);
      await registerStudent(sanitizeText(studentName.trim()));
      // Reload data after registration
      timeoutRef.current = setTimeout(() => {
        loadStudentData();
      }, 2000); // Wait for transaction to be mined
    } catch (error) {
      console.error('Failed to register student:', error);
    } finally {
      setRegistering(false);
    }
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card variant="elevated" className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning-100">
              <svg className="h-8 w-8 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <CardTitle className="text-xl mb-2">Connect Your Wallet</CardTitle>
            <p className="text-neutral-600">
              Connect your wallet to access your student dashboard and start learning
            </p>
          </CardHeader>
          <CardContent>
            <Button
              onClick={connect}
              className="w-full"
              size="lg"
              variant="default"
            >
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card variant="elevated" className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-neutral-200 border-t-primary-600 mx-auto mb-6"></div>
            <p className="text-neutral-600">Loading your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card variant="elevated" className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <UserIcon className="h-8 w-8 text-primary-600" />
            </div>
            <CardTitle className="text-2xl">Welcome to SkillPays!</CardTitle>
            <p className="text-neutral-600">
              Create your student profile to start learning and earning badges
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={studentName}
                  onChange={(e) => handleStudentNameChange(e.target.value)}
                  label="Student Name"
                  required
                  leftIcon={<UserIcon className="h-4 w-4" />}
                />
                {nameError && (
                  <p className="text-red-600 text-sm mt-1">{nameError}</p>
                )}
              </div>
              
              <Button
                onClick={handleRegisterStudent}
                disabled={!studentName.trim() || !!nameError || registering}
                className="w-full"
                size="lg"
              >
                {registering ? 'Registering...' : 'Register as Student'}
              </Button>
              
              <p className="text-xs text-neutral-500 text-center">
                By you agree to our terms of service and privacy policy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4">
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-3xl mb-2">Welcome back, {stats.name}!</CardTitle>
              <p className="text-neutral-600">Here&apos;s your learning progress overview</p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-3xl font-bold text-primary-600 mb-1">{stats.reputationScore}</div>
              <div className="text-sm text-neutral-500">Reputation Score</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="outlined" className="text-center transition-colors hover:border-primary-200">
              <CardContent className="p-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                  <BookOpenIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="text-2xl font-bold text-primary-600 mb-1">{stats.totalBootcamps}</div>
                <div className="text-sm text-neutral-600">Enrolled Bootcamps</div>
              </CardContent>
            </Card>
            
            <Card variant="outlined" className="text-center transition-colors hover:border-success-200">
              <CardContent className="p-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
                  <TrophyIcon className="h-6 w-6 text-success-600" />
                </div>
                <div className="text-2xl font-bold text-success-600 mb-1">{stats.completedMilestones}</div>
                <div className="text-sm text-neutral-600">Completed Milestones</div>
              </CardContent>
            </Card>
            
            <Card 
              variant="outlined" 
              className="text-center transition-all hover:border-secondary-200 hover:shadow-md cursor-pointer"
              onClick={() => setShowBadges(true)}
            >
              <CardContent className="p-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-100">
                  <TrophyIcon className="h-6 w-6 text-secondary-600" />
                </div>
                <div className="text-2xl font-bold text-secondary-600 mb-1">{stats.totalBadges}</div>
                <div className="text-sm text-neutral-600">Earned Badges</div>
                <p className="text-xs text-neutral-400 mt-2">Click to view</p>
              </CardContent>
            </Card>
            
            <Card variant="outlined" className="text-center transition-colors hover:border-warning-200">
              <CardContent className="p-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning-100">
                  <UserIcon className="h-6 w-6 text-warning-600" />
                </div>
                <div className="text-2xl font-bold text-warning-600 mb-1">
                  {Math.floor((Date.now() - stats.registrationDate) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-sm text-neutral-600">Days Learning</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5" />
            Your Bootcamps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bootcamps.map((bootcamp) => (
              <Card key={bootcamp.id} variant="outlined" className="transition-all hover:border-primary-200 hover:shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                    <h3 className="text-lg font-semibold text-neutral-900">{bootcamp.name}</h3>
                    <Badge variant="outline" className="w-fit">
                      {bootcamp.completedMilestones}/{bootcamp.totalMilestones} milestones
                    </Badge>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-neutral-600">Progress</span>
                      <span className="text-neutral-900 font-medium">{bootcamp.progress}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          bootcamp.progress === 100 
                            ? 'bg-success-500' 
                            : bootcamp.progress >= 50 
                              ? 'bg-primary-500' 
                              : 'bg-warning-500'
                        }`}
                        style={{ width: `${bootcamp.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex items-center gap-6 text-sm text-neutral-600">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-success-500 rounded-full"></span>
                        {bootcamp.completedMilestones} completed
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-neutral-300 rounded-full"></span>
                        {bootcamp.totalMilestones - bootcamp.completedMilestones} remaining
                      </span>
                    </div>
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors text-left sm:text-right">
                      View Details →
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrophyIcon className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-success-200 bg-success-50">
                <div className="flex-shrink-0 w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">Completed React Advanced Patterns</p>
                  <p className="text-xs text-neutral-500">2 days ago</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg border border-primary-200 bg-primary-50">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <TrophyIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">Earned JavaScript Expert Badge</p>
                  <p className="text-xs text-neutral-500">5 days ago</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg border border-secondary-200 bg-secondary-50">
                <div className="flex-shrink-0 w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center">
                  <BookOpenIcon className="w-5 h-5 text-secondary-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">Completed Milestone: API Integration</p>
                  <p className="text-xs text-neutral-500">1 week ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Card variant="outlined" className="border-warning-200 bg-warning-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">Final Project Submission</p>
                      <p className="text-xs text-warning-600">Full Stack Web Development</p>
                    </div>
                    <Badge variant="outline" className="border-warning-300 text-warning-700 bg-warning-100">
                      3 days
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card variant="outlined" className="border-primary-200 bg-primary-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">Peer Review Assignment</p>
                      <p className="text-xs text-primary-600">Blockchain Development</p>
                    </div>
                    <Badge variant="outline" className="border-primary-300 text-primary-700 bg-primary-100">
                      1 week
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card variant="outlined" className="border-secondary-200 bg-secondary-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">Quiz: Smart Contracts</p>
                      <p className="text-xs text-secondary-600">Blockchain Development</p>
                    </div>
                    <Badge variant="outline" className="border-secondary-300 text-secondary-700 bg-secondary-100">
                      2 weeks
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badge Collection Modal */}
      {showBadges && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <Card variant="elevated" className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <CardHeader className="sticky top-0 bg-white border-b border-neutral-200">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrophyIcon className="h-6 w-6" />
                  Your Badge Collection
                </CardTitle>
                <button
                  onClick={() => setShowBadges(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[75vh]">
              <BadgeCollection studentAddress={account} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}