import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SkillPaysEcosystemModule = buildModule("SkillPaysEcosystem", (m) => {
  // Parameters
  const treasuryAddress = m.getParameter("treasuryAddress", "0x742d35Cc6671C0532925a3b8D2E6f7C7d4B7f9B6");
  const ethUsdPriceFeed = m.getParameter("ethUsdPriceFeed", "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"); // Mainnet ETH/USD price feed
  const initialPlatformFee = m.getParameter("initialPlatformFee", 250); // 2.5%

  // Deploy base utility contracts first
  const studentBadges = m.contract("StudentBadges", [
    "SkillPays Badges",
    "SPB",
    "https://api.skillpays.com/badges/"
  ]);
  const skillGraph = m.contract("SkillGraph", []);
  const leaderboardSocial = m.contract("LeaderboardSocial", []);
  const peerReviewSystem = m.contract("PeerReviewSystem", []);

  // Deploy core contract with treasury, platform fee, and price feed
  const skillPaysCore = m.contract("SkillPaysCore", [treasuryAddress, initialPlatformFee, ethUsdPriceFeed]);

  // Deploy micro rewards system first (needed by mentor boost system)
  const microRewardsSystem = m.contract("MicroRewardsSystem", []);

  // Deploy mentor boost system with reward pool address (use micro rewards system)
  const mentorBoostSystem = m.contract("MentorBoostSystem", [microRewardsSystem]);

  // Deploy other advanced contracts
  const antiCheatingSystem = m.contract("AntiCheatingSystem", []);
  const decentralizedVerification = m.contract("DecentralizedVerification", []);

  // Deploy ecosystem contracts
  const graduateDAO = m.contract("GraduateDAO", [skillPaysCore, studentBadges]);
  const crossBootcampRegistry = m.contract("CrossBootcampRegistry", []);
  const jobBoardIntegration = m.contract("JobBoardIntegration", [skillGraph, studentBadges]);

  // Set up contract connections
  m.call(skillPaysCore, "setContract", ["badge", studentBadges], { id: "setBadgeContract" });
  m.call(skillPaysCore, "setContract", ["peerReview", peerReviewSystem], { id: "setPeerReviewContract" });
  m.call(skillPaysCore, "setContract", ["leaderboard", leaderboardSocial], { id: "setLeaderboardContract" });
  m.call(skillPaysCore, "setContract", ["mentorBoost", mentorBoostSystem], { id: "setMentorBoostContract" });
  m.call(skillPaysCore, "setContract", ["microRewards", microRewardsSystem], { id: "setMicroRewardsContract" });

  // Grant necessary roles
  m.call(studentBadges, "grantRole", [
    "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", // MINTER_ROLE
    skillPaysCore
  ], { id: "grantMinterRole" });

  m.call(skillGraph, "grantRole", [
    "0x85a8c6c9b3c1b2d6a3c4e7f8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0", // SKILL_UPDATER_ROLE
    skillPaysCore
  ], { id: "grantSkillUpdaterRole" });

  m.call(leaderboardSocial, "grantRole", [
    "0x7b21e7d7de6ef3f1e0b2c1a6a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1", // SCORE_UPDATER_ROLE
    skillPaysCore
  ], { id: "grantScoreUpdaterRole" });

  m.call(microRewardsSystem, "grantRole", [
    "0x8d5a7e2f1c9b6a3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7", // REWARDS_DISTRIBUTOR_ROLE
    skillPaysCore
  ], { id: "grantRewardsDistributorRole" });

  // Add initial funding to reward pools (if these functions exist in the refactored contracts)
  // Note: These may need to be adjusted based on the actual contract interfaces

  // Fund the micro rewards system directly via contract value
  m.send(microRewardsSystem, m.bigint(5n * 10n ** 17n), { // 0.5 ETH
    id: "fundMicroRewardsPool"
  });

  // Send ETH to other contracts if they accept it
  m.send(decentralizedVerification, m.bigint(5n * 10n ** 17n), { // 0.5 ETH
    id: "fundVerificationPool"
  });

  return {
    skillPaysCore,
    studentBadges,
    skillGraph,
    peerReviewSystem,
    leaderboardSocial,
    mentorBoostSystem,
    microRewardsSystem,
    graduateDAO,
    crossBootcampRegistry,
    jobBoardIntegration,
    antiCheatingSystem,
    decentralizedVerification
  };
});

export default SkillPaysEcosystemModule;