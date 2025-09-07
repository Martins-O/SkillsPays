// Contract ABIs extracted from build artifacts
import SkillPaysCoreAbi from './artifacts/contracts/SkillPaysCore.sol/SkillPaysCore.json';
// TODO: Add SkillPaysCoreV2 and OrganizationRegistry artifacts after deployment
// import SkillPaysCoreV2Abi from './artifacts/contracts/SkillPaysCoreV2.sol/SkillPaysCoreV2.json';
// import OrganizationRegistryAbi from './artifacts/contracts/OrganizationRegistry.sol/OrganizationRegistry.json';
import StudentBadgesAbi from './artifacts/contracts/StudentBadges.sol/StudentBadges.json';
import SkillGraphAbi from './artifacts/contracts/SkillGraph.sol/SkillGraph.json';
import PeerReviewSystemAbi from './artifacts/contracts/PeerReviewSystem.sol/PeerReviewSystem.json';
import MentorBoostSystemAbi from './artifacts/contracts/MentorBoostSystem.sol/MentorBoostSystem.json';
import MicroRewardsSystemAbi from './artifacts/contracts/MicroRewardsSystem.sol/MicroRewardsSystem.json';
import LeaderboardSocialAbi from './artifacts/contracts/LeaderboardSocial.sol/LeaderboardSocial.json';
import GraduateDAOAbi from './artifacts/contracts/GraduateDAO.sol/GraduateDAO.json';
import CrossBootcampRegistryAbi from './artifacts/contracts/CrossBootcampRegistry.sol/CrossBootcampRegistry.json';
import JobBoardIntegrationAbi from './artifacts/contracts/JobBoardIntegration.sol/JobBoardIntegration.json';
import AntiCheatingSystemAbi from './artifacts/contracts/AntiCheatingSystem.sol/AntiCheatingSystem.json';
import DecentralizedVerificationAbi from './artifacts/contracts/DecentralizedVerification.sol/DecentralizedVerification.json';

export const SKILL_PAYS_CORE_ABI = SkillPaysCoreAbi.abi;
// Temporarily use SkillPaysCore ABI for V2 until deployed
export const SKILL_PAYS_CORE_V2_ABI = SkillPaysCoreAbi.abi;
// Create a placeholder ABI for OrganizationRegistry until deployed
export const ORGANIZATION_REGISTRY_ABI = [] as const;
export const STUDENT_BADGES_ABI = StudentBadgesAbi.abi;
export const SKILL_GRAPH_ABI = SkillGraphAbi.abi;
export const PEER_REVIEW_SYSTEM_ABI = PeerReviewSystemAbi.abi;
export const MENTOR_BOOST_SYSTEM_ABI = MentorBoostSystemAbi.abi;
export const MICRO_REWARDS_SYSTEM_ABI = MicroRewardsSystemAbi.abi;
export const LEADERBOARD_SOCIAL_ABI = LeaderboardSocialAbi.abi;
export const GRADUATE_DAO_ABI = GraduateDAOAbi.abi;
export const CROSS_BOOTCAMP_REGISTRY_ABI = CrossBootcampRegistryAbi.abi;
export const JOB_BOARD_INTEGRATION_ABI = JobBoardIntegrationAbi.abi;
export const ANTI_CHEATING_SYSTEM_ABI = AntiCheatingSystemAbi.abi;
export const DECENTRALIZED_VERIFICATION_ABI = DecentralizedVerificationAbi.abi;

export const CONTRACT_ABIS = {
  SKILL_PAYS_CORE: SKILL_PAYS_CORE_ABI,
  SKILL_PAYS_CORE_V2: SKILL_PAYS_CORE_V2_ABI,
  ORGANIZATION_REGISTRY: ORGANIZATION_REGISTRY_ABI,
  STUDENT_BADGES: STUDENT_BADGES_ABI,
  SKILL_GRAPH: SKILL_GRAPH_ABI,
  PEER_REVIEW_SYSTEM: PEER_REVIEW_SYSTEM_ABI,
  MENTOR_BOOST_SYSTEM: MENTOR_BOOST_SYSTEM_ABI,
  MICRO_REWARDS_SYSTEM: MICRO_REWARDS_SYSTEM_ABI,
  LEADERBOARD_SOCIAL: LEADERBOARD_SOCIAL_ABI,
  GRADUATE_DAO: GRADUATE_DAO_ABI,
  CROSS_BOOTCAMP_REGISTRY: CROSS_BOOTCAMP_REGISTRY_ABI,
  JOB_BOARD_INTEGRATION: JOB_BOARD_INTEGRATION_ABI,
  ANTI_CHEATING_SYSTEM: ANTI_CHEATING_SYSTEM_ABI,
  DECENTRALIZED_VERIFICATION: DECENTRALIZED_VERIFICATION_ABI
} as const;