'use client';

import { useState } from 'react';
import { useSkillPaysCore } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface StudentRegistrationProps {
  onSuccess?: () => void;
}

export default function StudentRegistration({ onSuccess }: StudentRegistrationProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { registerStudent, loading, error } = useSkillPaysCore();
  const { account, connect } = useWeb3();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) {
      await connect();
      return;
    }

    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await registerStudent(name.trim());
      setName('');
      onSuccess?.();
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Student Registration</h2>
      <p className="text-gray-600 mb-6">Join SkillPays to start your learning journey</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading || isSubmitting}
            required
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isSubmitting || !name.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!account ? 'Connect Wallet' : loading || isSubmitting ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
}