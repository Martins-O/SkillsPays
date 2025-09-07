'use client';

import React, { useState, useEffect } from 'react';
import { usePeerReviewSystem, useSkillPaysCore } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface Bootcamp {
  id: number;
  name: string;
  description: string;
  creator: string;
  duration: number;
  fee: number;
  isActive: boolean;
  createdAt: number;
  totalEnrollments: number;
}

export default function ReviewRequestForm() {
  const { account } = useWeb3();
  const peerReview = usePeerReviewSystem();
  const skillPaysCore = useSkillPaysCore();
  
  const [bootcamps, setBootcamps] = useState<Bootcamp[]>([]);
  const [selectedBootcamp, setSelectedBootcamp] = useState<number>(0);
  const [milestoneId, setMilestoneId] = useState<number>(0);
  const [submissionHash, setSubmissionHash] = useState('');
  const [requiredReviews, setRequiredReviews] = useState<number>(3);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (account) {
      loadBootcamps();
    }
  }, [account]);

  const loadBootcamps = async () => {
    try {
      // Load real bootcamp data from contracts
      // For now, set empty until real data is implemented
      setBootcamps([]);
    } catch (error) {
      console.error('Error loading bootcamps:', error);
      setBootcamps([]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSubmissionFile(file);
    }
  };

  // Mock IPFS upload function
  const uploadToIPFS = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);
    
    return new Promise((resolve) => {
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          // Return mock IPFS hash
          resolve(`QmMock${Date.now()}Hash${Math.random().toString(36).substr(2, 9)}`);
        }
      }, 200);
    });
  };

  const handleUploadSubmission = async () => {
    if (!submissionFile) return;
    
    try {
      const hash = await uploadToIPFS(submissionFile);
      setSubmissionHash(hash);
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
    }
  };

  const handleSubmitForReview = async () => {
    if (!account || !submissionHash || peerReview.loading) return;
    
    try {
      await peerReview.createReviewRequest(
        account,
        selectedBootcamp,
        milestoneId,
        submissionHash,
        requiredReviews
      );
      
      // Reset form
      setSubmissionHash('');
      setSubmissionFile(null);
      setMilestoneId(0);
      setRequiredReviews(3);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error creating review request:', error);
    }
  };

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please connect your wallet to submit work for review.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Work for Peer Review</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Bootcamp
            </label>
            <select
              value={selectedBootcamp}
              onChange={(e) => setSelectedBootcamp(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value={0}>Select a bootcamp...</option>
              {bootcamps.map((bootcamp) => (
                <option key={bootcamp.id} value={bootcamp.id}>
                  {bootcamp.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Milestone ID
            </label>
            <input
              type="number"
              value={milestoneId}
              onChange={(e) => setMilestoneId(parseInt(e.target.value))}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter milestone number"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Submission
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Drop files to upload, or{' '}
                      <span className="text-blue-600">browse</span>
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".zip,.tar.gz,.pdf,.md"
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    ZIP, TAR.GZ, PDF, MD up to 50MB
                  </p>
                </div>
              </div>
            </div>
            
            {submissionFile && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-900">
                      {submissionFile.name}
                    </span>
                  </div>
                  <button
                    onClick={handleUploadSubmission}
                    disabled={isUploading}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Upload to IPFS'}
                  </button>
                </div>
                
                {isUploading && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-blue-700 mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {submissionHash && (
                  <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-800">
                      ✓ Uploaded successfully! Hash: {submissionHash}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IPFS Hash (if already uploaded)
            </label>
            <input
              type="text"
              value={submissionHash}
              onChange={(e) => setSubmissionHash(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="QmXXXXXXX... (enter IPFS hash)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Reviews
            </label>
            <select
              value={requiredReviews}
              onChange={(e) => setRequiredReviews(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={3}>3 reviews (Standard)</option>
              <option value={5}>5 reviews (Thorough)</option>
              <option value={7}>7 reviews (Comprehensive)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              More reviews provide better feedback but take longer to complete
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Review Process</h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• Your submission will be reviewed by qualified peer reviewers</li>
              <li>• Reviews are completed within 72 hours</li>
              <li>• You&apos;ll receive detailed feedback and scores (0-100)</li>
              <li>• Anti-collusion mechanisms ensure fair, unbiased reviews</li>
            </ul>
          </div>
          
          <button
            onClick={handleSubmitForReview}
            disabled={
              peerReview.loading || 
              !submissionHash || 
              selectedBootcamp === 0 ||
              milestoneId === 0
            }
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {peerReview.loading ? 'Submitting...' : 'Submit for Peer Review'}
          </button>
          
          {peerReview.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{peerReview.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}