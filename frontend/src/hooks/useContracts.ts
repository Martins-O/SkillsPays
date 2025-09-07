import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { getSigner, getContract } from '@/lib/web3';
import { CONTRACT_ABIS } from '@/contracts/abis';
import { getContractAddress, ContractName } from '@/contracts/addresses';
import { safeContractCall, handleUserError, getUserFriendlyError } from '@/utils/errorHandling';

interface ContractHookReturn {
  loading: boolean;
  error: string | null;
}

export function useContract(contractName: ContractName) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getContractInstance = useCallback(async (withSigner = false) => {
    const address = getContractAddress(contractName);
    const abi = CONTRACT_ABIS[contractName];
    
    if (withSigner) {
      const signer = await getSigner();
      return getContract(contractName, abi, signer);
    }
    
    return getContract(contractName, abi);
  }, [contractName]);

  const callContract = useCallback(async (
    methodName: string,
    args: unknown[] = [],
    options: { value?: string; gasLimit?: number } = {}
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const contract = await getContractInstance(true);
      const tx = await contract[methodName](...args, options);
      
      if (tx.wait) {
        await tx.wait();
      }
      
      return tx;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getContractInstance]);

  const readContract = useCallback(async (methodName: string, args: unknown[] = []) => {
    try {
      const contract = await getContractInstance();
      const result = await contract[methodName](...args);
      
      // Handle empty data responses (0x)
      if (result === '0x' || result === null || result === undefined) {
        return null;
      }
      
      return result;
    } catch (err) {
      // Handle specific error cases
      if (err instanceof Error && err.message.includes('could not decode result data')) {
        console.log(`${methodName} returned empty data - entity may not exist`);
        return null;
      }
      console.error(`Failed to read from ${contractName}.${methodName}:`, err);
      return null;
    }
  }, [getContractInstance, contractName]);

  return {
    loading,
    error,
    callContract,
    readContract,
    getContractInstance
  };
}

// SkillPaysCore Hook
export function useSkillPaysCore() {
  const baseHook = useContract('SKILL_PAYS_CORE');
  
  const registerStudent = useCallback(async (name: string) => {
    return baseHook.callContract('registerStudent', [name]);
  }, [baseHook]);

  const getStudent = useCallback(async (address: string) => {
    return baseHook.readContract('getStudent', [address]);
  }, [baseHook]);

  const createBootcamp = useCallback(async (
    name: string,
    description: string,
    duration: number,
    fee: string,
    tags: string[] = [],
    maxStudents: number = 100,
    requiresVerification: boolean = false
  ) => {
    const feeWei = ethers.parseEther(fee);
    return baseHook.callContract('createBootcamp', [
      name, 
      description, 
      duration, 
      feeWei.toString(), 
      tags, 
      maxStudents, 
      requiresVerification
    ]);
  }, [baseHook]);

  const enrollInBootcamp = useCallback(async (bootcampId: number, fee: string) => {
    const feeWei = ethers.parseEther(fee);
    return baseHook.callContract('enrollInBootcamp', [bootcampId], { value: feeWei.toString() });
  }, [baseHook]);

  const getBootcamp = useCallback(async (bootcampId: number) => {
    return baseHook.readContract('getBootcamp', [bootcampId]);
  }, [baseHook]);

  const addMilestone = useCallback(async (
    bootcampId: number,
    name: string,
    description: string,
    requiredScore: number,
    isCompulsory: boolean,
    rewardAmount: string
  ) => {
    const rewardWei = ethers.parseEther(rewardAmount);
    return baseHook.callContract('addMilestone', [
      bootcampId,
      name,
      description,
      requiredScore,
      isCompulsory,
      rewardWei.toString()
    ]);
  }, [baseHook]);

  const completeMilestone = useCallback(async (
    bootcampId: number,
    milestoneId: number,
    data: string = '0x'
  ) => {
    return baseHook.callContract('completeMilestone', [bootcampId, milestoneId, data]);
  }, [baseHook]);

  const getBootcampMilestones = useCallback(async (bootcampId: number) => {
    return baseHook.readContract('getBootcampMilestones', [bootcampId]);
  }, [baseHook]);

  const getStudentBootcamps = useCallback(async (student: string) => {
    return baseHook.readContract('getStudentBootcamps', [student]);
  }, [baseHook]);


  return {
    ...baseHook,
    registerStudent,
    getStudent,
    createBootcamp,
    enrollInBootcamp,
    getBootcamp,
    addMilestone,
    completeMilestone,
    getBootcampMilestones,
    getStudentBootcamps
  };
}

// StudentBadges Hook
export function useStudentBadges() {
  const baseHook = useContract('STUDENT_BADGES');

  const mintBadge = useCallback(async (
    student: string,
    skillId: number,
    level: number,
    metadataURI: string
  ) => {
    return baseHook.callContract('mintBadge', [student, skillId, level, metadataURI]);
  }, [baseHook]);

  const getBadge = useCallback(async (tokenId: number) => {
    return baseHook.readContract('getBadge', [tokenId]);
  }, [baseHook]);

  const getStudentBadges = useCallback(async (student: string) => {
    return baseHook.readContract('getStudentBadges', [student]);
  }, [baseHook]);

  const tokenURI = useCallback(async (tokenId: number) => {
    return baseHook.readContract('tokenURI', [tokenId]);
  }, [baseHook]);

  const balanceOf = useCallback(async (owner: string) => {
    return baseHook.readContract('balanceOf', [owner]);
  }, [baseHook]);

  return {
    ...baseHook,
    mintBadge,
    getBadge,
    getStudentBadges,
    tokenURI,
    balanceOf
  };
}

// SkillGraph Hook
export function useSkillGraph() {
  const baseHook = useContract('SKILL_GRAPH');

  const createSkill = useCallback(async (
    name: string,
    description: string,
    category: string,
    prerequisites: number[]
  ) => {
    return baseHook.callContract('createSkill', [name, description, category, prerequisites]);
  }, [baseHook]);

  const updateSkillProgress = useCallback(async (
    student: string,
    skillId: number,
    evidence: string,
    score: number
  ) => {
    return baseHook.callContract('updateSkillProgress', [student, skillId, evidence, score]);
  }, [baseHook]);

  const getSkill = useCallback(async (skillId: number) => {
    return baseHook.readContract('getSkill', [skillId]);
  }, [baseHook]);

  const getStudentSkillProgress = useCallback(async (student: string, skillId: number) => {
    return baseHook.readContract('getStudentSkillProgress', [student, skillId]);
  }, [baseHook]);

  const getSkillsByCategory = useCallback(async (category: string) => {
    return baseHook.readContract('getSkillsByCategory', [category]);
  }, [baseHook]);

  return {
    ...baseHook,
    createSkill,
    updateSkillProgress,
    getSkill,
    getStudentSkillProgress,
    getSkillsByCategory
  };
}

// PeerReviewSystem Hook
export function usePeerReviewSystem() {
  const baseHook = useContract('PEER_REVIEW_SYSTEM');

  const registerReviewer = useCallback(async (stakeAmount: string) => {
    const stakeWei = ethers.parseEther(stakeAmount);
    return baseHook.callContract('registerReviewer', [], { value: stakeWei.toString() });
  }, [baseHook]);

  const createReviewRequest = useCallback(async (
    student: string,
    bootcampId: number,
    milestoneId: number,
    submissionHash: string,
    requiredReviews: number
  ) => {
    return baseHook.callContract('createReviewRequest', [
      student,
      bootcampId,
      milestoneId,
      submissionHash,
      requiredReviews
    ]);
  }, [baseHook]);

  const submitReview = useCallback(async (
    requestId: number,
    score: number,
    feedback: string,
    evidenceHash: string
  ) => {
    return baseHook.callContract('submitReview', [
      requestId,
      score,
      feedback,
      evidenceHash
    ]);
  }, [baseHook]);

  const getReviewRequest = useCallback(async (requestId: number) => {
    return baseHook.readContract('reviewRequests', [requestId]);
  }, [baseHook]);

  const getRequestReviews = useCallback(async (requestId: number) => {
    return baseHook.readContract('getRequestReviews', [requestId]);
  }, [baseHook]);

  const getReviewerProfile = useCallback(async (reviewer: string) => {
    return baseHook.readContract('reviewerProfiles', [reviewer]);
  }, [baseHook]);

  const getPendingReviews = useCallback(async (reviewer: string) => {
    return baseHook.readContract('getPendingReviews', [reviewer]);
  }, [baseHook]);

  const rateReviewHelpfulness = useCallback(async (
    requestId: number,
    reviewIndex: number,
    helpfulnessScore: number
  ) => {
    return baseHook.callContract('rateReviewHelpfulness', [
      requestId,
      reviewIndex,
      helpfulnessScore
    ]);
  }, [baseHook]);

  return {
    ...baseHook,
    registerReviewer,
    createReviewRequest,
    submitReview,
    getReviewRequest,
    getRequestReviews,
    getReviewerProfile,
    getPendingReviews,
    rateReviewHelpfulness
  };
}

// MentorBoostSystem Hook
export function useMentorBoostSystem() {
  const baseHook = useContract('MENTOR_BOOST_SYSTEM');

  const registerMentor = useCallback(async (
    specializations: number[],
    hourlyRate: string,
    availability: string
  ) => {
    const rateWei = ethers.parseEther(hourlyRate);
    return baseHook.callContract('registerMentor', [specializations, rateWei.toString(), availability]);
  }, [baseHook]);

  const requestMentorship = useCallback(async (
    mentor: string,
    skillId: number,
    duration: number,
    justification: string
  ) => {
    return baseHook.callContract('requestMentorship', [mentor, skillId, duration, justification]);
  }, [baseHook]);

  const acceptMentorship = useCallback(async (requestId: number) => {
    return baseHook.callContract('acceptMentorship', [requestId]);
  }, [baseHook]);

  const completeMentorship = useCallback(async (
    sessionId: number,
    feedback: string,
    rating: number
  ) => {
    return baseHook.callContract('completeMentorship', [sessionId, feedback, rating]);
  }, [baseHook]);

  const getMentor = useCallback(async (mentor: string) => {
    return baseHook.readContract('getMentor', [mentor]);
  }, [baseHook]);

  return {
    ...baseHook,
    registerMentor,
    requestMentorship,
    acceptMentorship,
    completeMentorship,
    getMentor
  };
}

// MicroRewardsSystem Hook
export function useMicroRewardsSystem() {
  const baseHook = useContract('MICRO_REWARDS_SYSTEM');

  const recordCheckpoint = useCallback(async (
    student: string,
    checkpointType: string,
    evidenceHash: string
  ) => {
    return baseHook.callContract('recordCheckpoint', [
      student,
      checkpointType,
      evidenceHash
    ]);
  }, [baseHook]);

  const claimRewards = useCallback(async () => {
    return baseHook.callContract('claimRewards', []);
  }, [baseHook]);

  const getStudentProfile = useCallback(async (student: string) => {
    return baseHook.readContract('getStudentProfile', [student]);
  }, [baseHook]);

  const getRewardCheckpoint = useCallback(async (checkpointId: number) => {
    return baseHook.readContract('rewardCheckpoints', [checkpointId]);
  }, [baseHook]);

  const getPendingRewards = useCallback(async (student: string) => {
    return baseHook.readContract('getPendingRewards', [student]);
  }, [baseHook]);

  const getDistributionRule = useCallback(async (checkpointType: string) => {
    return baseHook.readContract('distributionRules', [checkpointType]);
  }, [baseHook]);

  const getCurrentStreak = useCallback(async (student: string) => {
    return baseHook.readContract('getCurrentStreak', [student]);
  }, [baseHook]);

  const addToRewardPool = useCallback(async (amount: string) => {
    const amountWei = ethers.parseEther(amount);
    return baseHook.callContract('addToRewardPool', [], { value: amountWei.toString() });
  }, [baseHook]);

  return {
    ...baseHook,
    recordCheckpoint,
    claimRewards,
    getStudentProfile,
    getRewardCheckpoint,
    getPendingRewards,
    getDistributionRule,
    getCurrentStreak,
    addToRewardPool
  };
}

// AntiCheatingSystem Hook
export function useAntiCheatingSystem() {
  const baseHook = useContract('ANTI_CHEATING_SYSTEM');

  const reportCheating = useCallback(async (
    accused: string,
    cheatingType: string,
    evidenceHash: string,
    description: string,
    severity: number
  ) => {
    return baseHook.callContract('reportCheating', [
      accused,
      cheatingType,
      evidenceHash,
      description,
      severity
    ]);
  }, [baseHook]);

  const verifyReport = useCallback(async (reportId: number, isValid: boolean) => {
    return baseHook.callContract('verifyReport', [reportId, isValid]);
  }, [baseHook]);

  const getCheatingReport = useCallback(async (reportId: number) => {
    return baseHook.readContract('cheatingReports', [reportId]);
  }, [baseHook]);

  const getStudentRiskScore = useCallback(async (student: string) => {
    return baseHook.readContract('getStudentRiskScore', [student]);
  }, [baseHook]);

  const getAIDetectionResult = useCallback(async (detectionId: number) => {
    return baseHook.readContract('aiDetectionResults', [detectionId]);
  }, [baseHook]);

  const submitForAIAnalysis = useCallback(async (
    submissionHash: string,
    submissionType: string
  ) => {
    return baseHook.callContract('submitForAIAnalysis', [submissionHash, submissionType]);
  }, [baseHook]);

  const getBehaviorPattern = useCallback(async (student: string) => {
    return baseHook.readContract('getBehaviorPattern', [student]);
  }, [baseHook]);

  const getPendingReports = useCallback(async () => {
    return baseHook.readContract('getPendingReports', []);
  }, [baseHook]);

  return {
    ...baseHook,
    reportCheating,
    verifyReport,
    getCheatingReport,
    getStudentRiskScore,
    getAIDetectionResult,
    submitForAIAnalysis,
    getBehaviorPattern,
    getPendingReports
  };
}

// LeaderboardSocial Hook
export function useLeaderboardSocial() {
  const baseHook = useContract('LEADERBOARD_SOCIAL');

  const createProfile = useCallback(async (
    username: string,
    bio: string,
    skills: number[]
  ) => {
    return baseHook.callContract('createProfile', [username, bio, skills]);
  }, [baseHook]);

  const updateProfile = useCallback(async (bio: string, skills: number[]) => {
    return baseHook.callContract('updateProfile', [bio, skills]);
  }, [baseHook]);

  const connectWith = useCallback(async (user: string) => {
    return baseHook.callContract('connectWith', [user]);
  }, [baseHook]);

  const getProfile = useCallback(async (user: string) => {
    return baseHook.readContract('getProfile', [user]);
  }, [baseHook]);

  const getLeaderboard = useCallback(async (category: string, limit: number) => {
    return baseHook.readContract('getLeaderboard', [category, limit]);
  }, [baseHook]);

  const getConnections = useCallback(async (user: string) => {
    return baseHook.readContract('getConnections', [user]);
  }, [baseHook]);

  return {
    ...baseHook,
    createProfile,
    updateProfile,
    connectWith,
    getProfile,
    getLeaderboard,
    getConnections
  };
}

// GraduateDAO Hook
export function useGraduateDAO() {
  const baseHook = useContract('GRADUATE_DAO');

  const joinDAO = useCallback(async (graduationProof: string) => {
    return baseHook.callContract('joinDAO', [graduationProof]);
  }, [baseHook]);

  const createProposal = useCallback(async (
    title: string,
    description: string,
    proposalType: number,
    targetAddress: string,
    amount: string
  ) => {
    const amountWei = ethers.parseEther(amount);
    return baseHook.callContract('createProposal', [
      title,
      description,
      proposalType,
      targetAddress,
      amountWei.toString()
    ]);
  }, [baseHook]);

  const vote = useCallback(async (proposalId: number, support: boolean) => {
    return baseHook.callContract('vote', [proposalId, support]);
  }, [baseHook]);

  const executeProposal = useCallback(async (proposalId: number) => {
    return baseHook.callContract('executeProposal', [proposalId]);
  }, [baseHook]);

  const getProposal = useCallback(async (proposalId: number) => {
    return baseHook.readContract('getProposal', [proposalId]);
  }, [baseHook]);

  const getAllProposals = useCallback(async () => {
    return baseHook.readContract('getAllProposals', []);
  }, [baseHook]);

  return {
    ...baseHook,
    joinDAO,
    createProposal,
    vote,
    executeProposal,
    getProposal,
    getAllProposals
  };
}

// Remaining hooks for other contracts
export function useJobBoardIntegration() {
  const baseHook = useContract('JOB_BOARD_INTEGRATION');

  const registerEmployer = useCallback(async (
    companyName: string,
    description: string,
    website: string
  ) => {
    return baseHook.callContract('registerEmployer', [companyName, description, website]);
  }, [baseHook]);

  const postJob = useCallback(async (
    title: string,
    description: string,
    requiredSkills: number[],
    skillLevels: number[],
    salary: string
  ) => {
    const salaryWei = ethers.parseEther(salary);
    return baseHook.callContract('postJob', [
      title,
      description,
      requiredSkills,
      skillLevels,
      salaryWei.toString()
    ]);
  }, [baseHook]);

  const applyForJob = useCallback(async (jobId: number, coverLetter: string) => {
    return baseHook.callContract('applyForJob', [jobId, coverLetter]);
  }, [baseHook]);

  const getMatchingJobs = useCallback(async (student: string) => {
    return baseHook.readContract('getMatchingJobs', [student]);
  }, [baseHook]);

  return {
    ...baseHook,
    registerEmployer,
    postJob,
    applyForJob,
    getMatchingJobs
  };
}

export function useCrossBootcampRegistry() {
  const baseHook = useContract('CROSS_BOOTCAMP_REGISTRY');

  const registerPlatform = useCallback(async (
    name: string,
    description: string,
    credentialStandard: string
  ) => {
    return baseHook.callContract('registerPlatform', [name, description, credentialStandard]);
  }, [baseHook]);

  const transferCredits = useCallback(async (
    fromPlatform: string,
    toPlatform: string,
    credentialId: number,
    student: string
  ) => {
    return baseHook.callContract('transferCredits', [
      fromPlatform,
      toPlatform,
      credentialId,
      student
    ]);
  }, [baseHook]);

  const verifyCredential = useCallback(async (
    platform: string,
    credentialId: number,
    student: string
  ) => {
    return baseHook.readContract('verifyCredential', [platform, credentialId, student]);
  }, [baseHook]);

  return {
    ...baseHook,
    registerPlatform,
    transferCredits,
    verifyCredential
  };
}

export function useDecentralizedVerification() {
  const baseHook = useContract('DECENTRALIZED_VERIFICATION');

  const registerValidator = useCallback(async (
    specializations: number[],
    stakeAmount: string
  ) => {
    const stakeWei = ethers.parseEther(stakeAmount);
    return baseHook.callContract('registerValidator', [specializations], { value: stakeWei.toString() });
  }, [baseHook]);

  const submitForVerification = useCallback(async (
    skillId: number,
    evidence: string,
    requiredValidators: number
  ) => {
    return baseHook.callContract('submitForVerification', [
      skillId,
      evidence,
      requiredValidators
    ]);
  }, [baseHook]);

  const validateSubmission = useCallback(async (
    verificationId: number,
    approved: boolean,
    feedback: string
  ) => {
    return baseHook.callContract('validateSubmission', [verificationId, approved, feedback]);
  }, [baseHook]);

  const getVerification = useCallback(async (verificationId: number) => {
    return baseHook.readContract('getVerification', [verificationId]);
  }, [baseHook]);

  return {
    ...baseHook,
    registerValidator,
    submitForVerification,
    validateSubmission,
    getVerification
  };
}

// OrganizationRegistry Hook
export function useOrganizationRegistry() {
  // TODO: Implement after OrganizationRegistry is deployed
  const baseHook = useContract('ORGANIZATION_REGISTRY');

  const registerOrganization = useCallback(async (
    name: string,
    description: string,
    website: string,
    logoUrl: string,
    contactEmail: string,
    specializations: string[],
    registrationFee: string
  ) => {
    const feeWei = ethers.parseEther(registrationFee);
    return baseHook.callContract('registerOrganization', [
      name,
      description,
      website,
      logoUrl,
      contactEmail,
      specializations
    ], { value: feeWei.toString() });
  }, [baseHook]);

  const updateOrganization = useCallback(async (
    description: string,
    website: string,
    logoUrl: string,
    contactEmail: string,
    specializations: string[]
  ) => {
    return baseHook.callContract('updateOrganization', [
      description,
      website,
      logoUrl,
      contactEmail,
      specializations
    ]);
  }, [baseHook]);

  const depositStake = useCallback(async (amount: string) => {
    const amountWei = ethers.parseEther(amount);
    return baseHook.callContract('depositStake', [], { value: amountWei.toString() });
  }, [baseHook]);

  const withdrawStake = useCallback(async (amount: string) => {
    const amountWei = ethers.parseEther(amount);
    return baseHook.callContract('withdrawStake', [amountWei.toString()]);
  }, [baseHook]);

  const getOrganization = useCallback(async (organizationId: number) => {
    return baseHook.readContract('getOrganization', [organizationId]);
  }, [baseHook]);

  const getOrganizationByAddress = useCallback(async (address: string) => {
    return baseHook.readContract('getOrganizationByAddress', [address]);
  }, [baseHook]);

  const isOrganization = useCallback(async (address: string) => {
    return baseHook.readContract('isOrganization', [address]);
  }, [baseHook]);

  const canCreateBootcamps = useCallback(async (address: string) => {
    return baseHook.readContract('canCreateBootcamps', [address]);
  }, [baseHook]);

  const canIssueCertificates = useCallback(async (address: string) => {
    return baseHook.readContract('canIssueCertificates', [address]);
  }, [baseHook]);

  const getTotalOrganizations = useCallback(async () => {
    return baseHook.readContract('getTotalOrganizations', []);
  }, [baseHook]);

  const getOrganizationSpecializations = useCallback(async (organizationId: number) => {
    return baseHook.readContract('getOrganizationSpecializations', [organizationId]);
  }, [baseHook]);

  return {
    ...baseHook,
    registerOrganization,
    updateOrganization,
    depositStake,
    withdrawStake,
    getOrganization,
    getOrganizationByAddress,
    isOrganization,
    canCreateBootcamps,
    canIssueCertificates,
    getTotalOrganizations,
    getOrganizationSpecializations
  };
}