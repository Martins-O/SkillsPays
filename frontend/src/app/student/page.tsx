'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useSkillPaysCore } from '@/hooks/useContracts';
import { Student } from '@/types/contracts';
import StudentDashboard from '@/components/contracts/SkillPaysCore/StudentDashboard';
import { 
  User, 
  AlertCircle
} from 'lucide-react';

export default function StudentPage() {
  const { account, isConnected } = useWeb3();
  const { 
    loading, 
    error, 
    registerStudent, 
    getStudent
  } = useSkillPaysCore();

  const [student, setStudent] = useState<Student | null>(null);
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
    } catch (err) {
      console.error('Error loading student data:', err);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Learning Dashboard</h1>
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Registration Banner for unregistered users */}
      {!student && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Welcome to SkillPays!</h3>
                <p className="text-blue-700">
                  You're viewing the learning dashboard. Register as a student to access advanced features and track your progress on-chain.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowRegistration(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              Register Now
            </button>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Register as Student</h2>
            <p className="text-gray-600 mb-4">
              Register to access advanced features, track progress on-chain, and earn verified credentials.
            </p>
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

      {/* Always show StudentDashboard - it will handle the guest/registered state internally */}
      <StudentDashboard />
    </div>
  );
}