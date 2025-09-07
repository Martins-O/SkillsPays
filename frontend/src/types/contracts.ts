// Contract types and interfaces

export interface Student {
  name: string;
  isActive: boolean;
  totalBadges: number;
  reputationScore: number;
  registrationDate: number;
  enrolledBootcamps: number[];
}

export interface Bootcamp {
  id: number;
  name: string;
  description: string;
  creator: string;
  fee: bigint;
  duration: number;
  isActive: boolean;
  creationDate: number;
  totalEnrolled: number;
}

export interface Milestone {
  id: number;
  bootcampId: number;
  name: string;
  description: string;
  requiredScore: number;
  isCompulsory: boolean;
  rewardAmount: bigint;
}

export interface Badge {
  tokenId: number;
  student: string;
  bootcampId: number;
  milestoneId: number;
  level: number;
  skill: string;
  score: number;
  metadataURI: string;
}

export interface MentorProfile {
  name: string;
  bio: string;
  skills: string;
  isActive: boolean;
  totalBoosts: number;
  averageRating: number;
  totalEarnings: bigint;
  stake: bigint;
}

export interface BoostRequest {
  id: number;
  student: string;
  mentor: string;
  bootcampId: number;
  milestoneId: number;
  contentHash: string;
  rewardType: string;
  rewardAmount: bigint;
  description: string;
  isApproved: boolean;
  timestamp: number;
}

export interface MentorshipSession {
  id: number;
  mentor: string;
  student: string;
  sessionType: string;
  duration: number;
  scheduledAt: number;
  completedAt: number;
  contentHash: string;
  isCompleted: boolean;
  studentRating: number;
  studentFeedback: string;
}

export interface PeerReviewRequest {
  id: number;
  student: string;
  contentHash: string;
  requiredReviews: number;
  deadline: number;
  totalReviews: number;
  averageScore: number;
  isCompleted: boolean;
}

export interface PeerReview {
  id: number;
  requestId: number;
  reviewer: string;
  score: number;
  feedback: string;
  timestamp: number;
}

export interface SkillEvidence {
  student: string;
  skillId: number;
  evidenceHash: string;
  confidenceScore: number;
  timestamp: number;
  isVerified: boolean;
}

export interface LeaderboardEntry {
  student: string;
  totalScore: number;
  badgeCount: number;
  rank: number;
}