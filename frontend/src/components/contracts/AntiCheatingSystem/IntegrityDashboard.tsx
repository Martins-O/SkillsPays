'use client';

import React, { useState, useEffect } from 'react';
import { useAntiCheatingSystem } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface CheatingReport {
  id: number;
  reporter: string;
  accused: string;
  cheatingType: string;
  evidenceHash: string;
  description: string;
  severity: number;
  isVerified: boolean;
  isPenalized: boolean;
  verifiedBy: string;
  reportedAt: number;
  verifiedAt: number;
}

interface StudentRiskProfile {
  studentAddress: string;
  riskScore: number;
  totalReports: number;
  verifiedViolations: number;
  isBlacklisted: boolean;
  lastViolationTime: number;
  suspensionEndTime: number;
}

interface AIDetectionResult {
  submissionId: number;
  student: string;
  submissionHash: string;
  plagiarismScore: number;
  aiGeneratedScore: number;
  similarityScore: number;
  similarSubmissions: string[];
  requiresHumanReview: boolean;
  isApproved: boolean;
  analyzedAt: number;
}

const CHEATING_TYPES = {
  PLAGIARISM: 'plagiarism',
  COLLUSION: 'collusion',
  FAKE_SUBMISSION: 'fake_submission',
  BOT_ACTIVITY: 'bot_activity',
  MULTIPLE_ACCOUNTS: 'multiple_accounts'
};

const SEVERITY_LABELS = {
  1: 'Minor',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Critical'
};

const SEVERITY_COLORS = {
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-green-100 text-green-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-orange-100 text-orange-800',
  5: 'bg-red-100 text-red-800'
};

export default function IntegrityDashboard() {
  const { account } = useWeb3();
  const antiCheating = useAntiCheatingSystem();
  
  const [activeTab, setActiveTab] = useState<'reports' | 'analysis' | 'submit'>('reports');
  const [reports, setReports] = useState<CheatingReport[]>([]);
  const [aiResults, setAIResults] = useState<AIDetectionResult[]>([]);
  const [userRiskProfile, setUserRiskProfile] = useState<StudentRiskProfile | null>(null);
  
  // Report form state
  const [reportForm, setReportForm] = useState({
    accusedAddress: '',
    cheatingType: CHEATING_TYPES.PLAGIARISM,
    evidenceHash: '',
    description: '',
    severity: 3
  });

  // Analysis form state
  const [analysisForm, setAnalysisForm] = useState({
    submissionHash: '',
    submissionType: 'code'
  });

  useEffect(() => {
    if (account) {
      loadIntegrityData();
    }
  }, [account]);

  const loadIntegrityData = async () => {
    if (!account) return;
    
    try {
      // Load real data from smart contract
      let realReports: CheatingReport[] = [];
      let realAIResults: AIDetectionResult[] = [];
      let realRiskProfile: StudentRiskProfile;

      try {
        // Get cheating reports from contract
        const reportData = await antiCheating.getReports();
        if (reportData && reportData.length > 0) {
          realReports = reportData.map((report: any, index: number) => ({
            id: index + 1,
            reporter: report.reporter || '0x0000000000000000000000000000000000000000',
            accused: report.accused || '0x0000000000000000000000000000000000000000',
            cheatingType: report.cheatingType || CHEATING_TYPES.PLAGIARISM,
            evidenceHash: report.evidenceHash || '',
            description: report.description || 'No description provided',
            severity: Number(report.severity || 1),
            isVerified: Boolean(report.isVerified),
            isPenalized: Boolean(report.isPenalized),
            verifiedBy: report.verifiedBy || '0x0000000000000000000000000000000000000000',
            reportedAt: Number(report.reportedAt || Date.now() / 1000),
            verifiedAt: Number(report.verifiedAt || 0)
          }));
        }
      } catch (err) {
        console.log('No cheating reports found in contract');
      }

      try {
        // Get AI analysis results from contract
        const aiData = await antiCheating.getAIResults();
        if (aiData && aiData.length > 0) {
          realAIResults = aiData.map((result: any) => ({
            submissionId: Number(result.submissionId || 0),
            student: result.student || '0x0000000000000000000000000000000000000000',
            submissionHash: result.submissionHash || '',
            plagiarismScore: Number(result.plagiarismScore || 0),
            aiGeneratedScore: Number(result.aiGeneratedScore || 0),
            similarityScore: Number(result.similarityScore || 0),
            similarSubmissions: result.similarSubmissions || [],
            requiresHumanReview: Boolean(result.requiresHumanReview),
            isApproved: Boolean(result.isApproved),
            analyzedAt: Number(result.analyzedAt || Date.now() / 1000)
          }));
        }
      } catch (err) {
        console.log('No AI analysis results found in contract');
      }

      try {
        // Get user's risk profile
        const profileData = await antiCheating.getStudentRiskProfile(account);
        realRiskProfile = {
          studentAddress: account,
          riskScore: Number(profileData.riskScore || 100),
          totalReports: Number(profileData.totalReports || 0),
          verifiedViolations: Number(profileData.verifiedViolations || 0),
          isBlacklisted: Boolean(profileData.isBlacklisted),
          lastViolationTime: Number(profileData.lastViolationTime || 0),
          suspensionEndTime: Number(profileData.suspensionEndTime || 0)
        };
      } catch (err) {
        console.log('No risk profile found, using default');
        realRiskProfile = {
          studentAddress: account,
          riskScore: 100,
          totalReports: 0,
          verifiedViolations: 0,
          isBlacklisted: false,
          lastViolationTime: 0,
          suspensionEndTime: 0
        };
      }

      setReports(realReports);
      setAIResults(realAIResults);
      setUserRiskProfile(realRiskProfile);
    } catch (error) {
      console.error('Error loading integrity data:', error);
      // Set empty states instead of mock data
      setReports([]);
      setAIResults([]);
      setUserRiskProfile({
        studentAddress: account,
        riskScore: 100,
        totalReports: 0,
        verifiedViolations: 0,
        isBlacklisted: false,
        lastViolationTime: 0,
        suspensionEndTime: 0
      });
    }
  };

  const handleSubmitReport = async () => {
    if (!reportForm.accusedAddress || !reportForm.description || !reportForm.evidenceHash) return;
    
    try {
      await antiCheating.reportCheating(
        reportForm.accusedAddress,
        reportForm.cheatingType,
        reportForm.evidenceHash,
        reportForm.description,
        reportForm.severity
      );
      
      // Reset form
      setReportForm({
        accusedAddress: '',
        cheatingType: CHEATING_TYPES.PLAGIARISM,
        evidenceHash: '',
        description: '',
        severity: 3
      });
      
      await loadIntegrityData();
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  const handleSubmitForAnalysis = async () => {
    if (!analysisForm.submissionHash || !analysisForm.submissionType) return;
    
    try {
      await antiCheating.submitForAIAnalysis(
        analysisForm.submissionHash,
        analysisForm.submissionType
      );
      
      setAnalysisForm({
        submissionHash: '',
        submissionType: 'code'
      });
      
      await loadIntegrityData();
    } catch (error) {
      console.error('Error submitting for analysis:', error);
    }
  };

  const handleVerifyReport = async (reportId: number, isValid: boolean) => {
    try {
      await antiCheating.verifyReport(reportId, isValid);
      await loadIntegrityData();
    } catch (error) {
      console.error('Error verifying report:', error);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getRiskScoreColor = (score: number) => {
    if (score < 300) return 'text-green-600';
    if (score < 600) return 'text-yellow-600';
    if (score < 800) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskScoreLabel = (score: number) => {
    if (score < 300) return 'Low Risk';
    if (score < 600) return 'Medium Risk';
    if (score < 800) return 'High Risk';
    return 'Critical Risk';
  };

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please connect your wallet to access the Integrity Dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Platform Integrity Dashboard</h1>
        <p className="text-gray-600">
          AI-powered fraud detection and community reporting system to maintain academic integrity
        </p>
      </div>

      {/* User Risk Profile */}
      {userRiskProfile && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Integrity Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-2xl font-bold ${getRiskScoreColor(userRiskProfile.riskScore)}`}>
                {userRiskProfile.riskScore}
              </div>
              <div className="text-sm text-gray-600">Risk Score</div>
              <div className={`text-xs mt-1 ${getRiskScoreColor(userRiskProfile.riskScore)}`}>
                {getRiskScoreLabel(userRiskProfile.riskScore)}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{userRiskProfile.totalReports}</div>
              <div className="text-sm text-gray-600">Reports Against</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{userRiskProfile.verifiedViolations}</div>
              <div className="text-sm text-gray-600">Verified Violations</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-2xl font-bold ${userRiskProfile.isBlacklisted ? 'text-red-600' : 'text-green-600'}`}>
                {userRiskProfile.isBlacklisted ? 'Blacklisted' : 'Good Standing'}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Cheating Reports ({reports.filter(r => !r.isVerified).length} pending)
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'analysis'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              AI Analysis Results ({aiResults.filter(r => r.requiresHumanReview).length})
            </button>
            <button
              onClick={() => setActiveTab('submit')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'submit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Submit Report/Analysis
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'reports' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Cheating Reports</h2>
              
              {reports.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No cheating reports at the moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Report #{report.id}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Accused: {formatAddress(report.accused)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Type: {report.cheatingType.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            Reported: {formatDate(report.reportedAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${SEVERITY_COLORS[report.severity as keyof typeof SEVERITY_COLORS]}`}>
                            {SEVERITY_LABELS[report.severity as keyof typeof SEVERITY_LABELS]}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            report.isVerified
                              ? report.isPenalized
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {report.isVerified
                              ? report.isPenalized
                                ? 'Violation Confirmed'
                                : 'Cleared'
                              : 'Pending Review'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Description:</h4>
                        <p className="text-gray-700 text-sm">{report.description}</p>
                      </div>
                      
                      <div className="flex space-x-3">
                        {report.evidenceHash && (
                          <a
                            href={`https://ipfs.io/ipfs/${report.evidenceHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                          >
                            View Evidence
                          </a>
                        )}
                        
                        {!report.isVerified && account && (
                          <>
                            <button
                              onClick={() => handleVerifyReport(report.id, true)}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                              disabled={antiCheating.loading}
                            >
                              Confirm Violation
                            </button>
                            <button
                              onClick={() => handleVerifyReport(report.id, false)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                              disabled={antiCheating.loading}
                            >
                              Clear Report
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">AI Analysis Results</h2>
              
              {aiResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No AI analysis results at the moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiResults.map((result) => (
                    <div key={result.submissionId} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Submission #{result.submissionId}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Student: {formatAddress(result.student)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Analyzed: {formatDate(result.analyzedAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            result.requiresHumanReview
                              ? 'bg-orange-100 text-orange-800'
                              : result.isApproved
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {result.requiresHumanReview
                              ? 'Needs Review'
                              : result.isApproved
                                ? 'Approved'
                                : 'Flagged'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className={`text-lg font-bold ${result.plagiarismScore > 70 ? 'text-red-600' : result.plagiarismScore > 40 ? 'text-orange-600' : 'text-green-600'}`}>
                            {result.plagiarismScore}%
                          </div>
                          <div className="text-sm text-gray-600">Plagiarism</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className={`text-lg font-bold ${result.aiGeneratedScore > 70 ? 'text-red-600' : result.aiGeneratedScore > 40 ? 'text-orange-600' : 'text-green-600'}`}>
                            {result.aiGeneratedScore}%
                          </div>
                          <div className="text-sm text-gray-600">AI Generated</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className={`text-lg font-bold ${result.similarityScore > 70 ? 'text-red-600' : result.similarityScore > 40 ? 'text-orange-600' : 'text-green-600'}`}>
                            {result.similarityScore}%
                          </div>
                          <div className="text-sm text-gray-600">Similarity</div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-3">
                        <a
                          href={`https://ipfs.io/ipfs/${result.submissionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          View Submission
                        </a>
                        
                        {result.similarSubmissions.length > 0 && (
                          <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm">
                            View Similar ({result.similarSubmissions.length})
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'submit' && (
            <div className="max-w-4xl">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Report Cheating Form */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Report Cheating</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Accused Student Address
                      </label>
                      <input
                        type="text"
                        value={reportForm.accusedAddress}
                        onChange={(e) => setReportForm(prev => ({ ...prev, accusedAddress: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0x..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cheating Type
                      </label>
                      <select
                        value={reportForm.cheatingType}
                        onChange={(e) => setReportForm(prev => ({ ...prev, cheatingType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={CHEATING_TYPES.PLAGIARISM}>Plagiarism</option>
                        <option value={CHEATING_TYPES.COLLUSION}>Collusion</option>
                        <option value={CHEATING_TYPES.FAKE_SUBMISSION}>Fake Submission</option>
                        <option value={CHEATING_TYPES.BOT_ACTIVITY}>Bot Activity</option>
                        <option value={CHEATING_TYPES.MULTIPLE_ACCOUNTS}>Multiple Accounts</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Severity Level
                      </label>
                      <select
                        value={reportForm.severity}
                        onChange={(e) => setReportForm(prev => ({ ...prev, severity: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Evidence Hash (IPFS)
                      </label>
                      <input
                        type="text"
                        value={reportForm.evidenceHash}
                        onChange={(e) => setReportForm(prev => ({ ...prev, evidenceHash: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="QmXXXXXX..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={reportForm.description}
                        onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe the suspected cheating behavior..."
                        required
                      />
                    </div>
                    
                    <button
                      onClick={handleSubmitReport}
                      disabled={antiCheating.loading || !reportForm.accusedAddress || !reportForm.description || !reportForm.evidenceHash}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {antiCheating.loading ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </div>

                {/* AI Analysis Form */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Submit for AI Analysis</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Submission Hash (IPFS)
                      </label>
                      <input
                        type="text"
                        value={analysisForm.submissionHash}
                        onChange={(e) => setAnalysisForm(prev => ({ ...prev, submissionHash: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="QmXXXXXX..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Submission Type
                      </label>
                      <select
                        value={analysisForm.submissionType}
                        onChange={(e) => setAnalysisForm(prev => ({ ...prev, submissionType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="code">Code</option>
                        <option value="essay">Essay</option>
                        <option value="project">Project</option>
                        <option value="documentation">Documentation</option>
                      </select>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">AI Analysis Includes:</h3>
                      <ul className="text-blue-800 space-y-1 text-sm">
                        <li>• Plagiarism detection against known sources</li>
                        <li>• AI-generated content identification</li>
                        <li>• Similarity analysis with previous submissions</li>
                        <li>• Code pattern and style analysis</li>
                        <li>• Behavioral pattern detection</li>
                      </ul>
                    </div>
                    
                    <button
                      onClick={handleSubmitForAnalysis}
                      disabled={antiCheating.loading || !analysisForm.submissionHash}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {antiCheating.loading ? 'Submitting...' : 'Submit for Analysis'}
                    </button>
                  </div>
                </div>
              </div>
              
              {antiCheating.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
                  <p className="text-red-800">{antiCheating.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}