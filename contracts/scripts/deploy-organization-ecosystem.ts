import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Parameters
  const treasuryAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const ethUsdPriceFeed = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // Mainnet ETH/USD price feed
  const initialPlatformFee = 250; // 2.5%

  console.log("\n=== Deploying Base Contracts ===");

  // Deploy OrganizationRegistry first
  const OrganizationRegistry = await ethers.getContractFactory("OrganizationRegistry");
  const organizationRegistry = await OrganizationRegistry.deploy(treasuryAddress);
  await organizationRegistry.waitForDeployment();
  console.log("OrganizationRegistry deployed to:", await organizationRegistry.getAddress());

  // Deploy utility contracts
  const StudentBadges = await ethers.getContractFactory("StudentBadges");
  const studentBadges = await StudentBadges.deploy(
    "SkillPays Badges",
    "SPB", 
    "https://api.skillpays.com/badges/"
  );
  await studentBadges.waitForDeployment();
  console.log("StudentBadges deployed to:", await studentBadges.getAddress());

  const SkillGraph = await ethers.getContractFactory("SkillGraph");
  const skillGraph = await SkillGraph.deploy();
  await skillGraph.waitForDeployment();
  console.log("SkillGraph deployed to:", await skillGraph.getAddress());

  const LeaderboardSocial = await ethers.getContractFactory("LeaderboardSocial");
  const leaderboardSocial = await LeaderboardSocial.deploy();
  await leaderboardSocial.waitForDeployment();
  console.log("LeaderboardSocial deployed to:", await leaderboardSocial.getAddress());

  const PeerReviewSystem = await ethers.getContractFactory("PeerReviewSystem");
  const peerReviewSystem = await PeerReviewSystem.deploy();
  await peerReviewSystem.waitForDeployment();
  console.log("PeerReviewSystem deployed to:", await peerReviewSystem.getAddress());

  const MicroRewardsSystem = await ethers.getContractFactory("MicroRewardsSystem");
  const microRewardsSystem = await MicroRewardsSystem.deploy();
  await microRewardsSystem.waitForDeployment();
  console.log("MicroRewardsSystem deployed to:", await microRewardsSystem.getAddress());

  console.log("\n=== Deploying Core Contract ===");

  // Deploy enhanced core contract with organization support
  const SkillPaysCoreV2 = await ethers.getContractFactory("SkillPaysCoreV2");
  const skillPaysCore = await SkillPaysCoreV2.deploy(
    treasuryAddress,
    initialPlatformFee,
    ethUsdPriceFeed,
    await organizationRegistry.getAddress()
  );
  await skillPaysCore.waitForDeployment();
  console.log("SkillPaysCoreV2 deployed to:", await skillPaysCore.getAddress());

  console.log("\n=== Deploying Additional Contracts ===");

  // Deploy mentor boost system
  const MentorBoostSystem = await ethers.getContractFactory("MentorBoostSystem");
  const mentorBoostSystem = await MentorBoostSystem.deploy(await microRewardsSystem.getAddress());
  await mentorBoostSystem.waitForDeployment();
  console.log("MentorBoostSystem deployed to:", await mentorBoostSystem.getAddress());

  // Deploy other contracts
  const AntiCheatingSystem = await ethers.getContractFactory("AntiCheatingSystem");
  const antiCheatingSystem = await AntiCheatingSystem.deploy();
  await antiCheatingSystem.waitForDeployment();
  console.log("AntiCheatingSystem deployed to:", await antiCheatingSystem.getAddress());

  const DecentralizedVerification = await ethers.getContractFactory("DecentralizedVerification");
  const decentralizedVerification = await DecentralizedVerification.deploy();
  await decentralizedVerification.waitForDeployment();
  console.log("DecentralizedVerification deployed to:", await decentralizedVerification.getAddress());

  // Deploy ecosystem contracts
  const GraduateDAO = await ethers.getContractFactory("GraduateDAO");
  const graduateDAO = await GraduateDAO.deploy(
    await skillPaysCore.getAddress(),
    await studentBadges.getAddress()
  );
  await graduateDAO.waitForDeployment();
  console.log("GraduateDAO deployed to:", await graduateDAO.getAddress());

  const CrossBootcampRegistry = await ethers.getContractFactory("CrossBootcampRegistry");
  const crossBootcampRegistry = await CrossBootcampRegistry.deploy();
  await crossBootcampRegistry.waitForDeployment();
  console.log("CrossBootcampRegistry deployed to:", await crossBootcampRegistry.getAddress());

  const JobBoardIntegration = await ethers.getContractFactory("JobBoardIntegration");
  const jobBoardIntegration = await JobBoardIntegration.deploy(
    await skillGraph.getAddress(),
    await studentBadges.getAddress()
  );
  await jobBoardIntegration.waitForDeployment();
  console.log("JobBoardIntegration deployed to:", await jobBoardIntegration.getAddress());

  console.log("\n=== Setting up Contract Connections ===");

  // Set up contract connections
  await skillPaysCore.setContract("badge", await studentBadges.getAddress());
  console.log("✓ Set badge contract");

  await skillPaysCore.setContract("peerReview", await peerReviewSystem.getAddress());
  console.log("✓ Set peer review contract");

  await skillPaysCore.setContract("leaderboard", await leaderboardSocial.getAddress());
  console.log("✓ Set leaderboard contract");

  await skillPaysCore.setContract("mentorBoost", await mentorBoostSystem.getAddress());
  console.log("✓ Set mentor boost contract");

  await skillPaysCore.setContract("microRewards", await microRewardsSystem.getAddress());
  console.log("✓ Set micro rewards contract");

  // Set up organization registry connection
  await organizationRegistry.setSkillPaysCoreAddress(await skillPaysCore.getAddress());
  console.log("✓ Set SkillPaysCore address in OrganizationRegistry");

  console.log("\n=== Granting Roles ===");

  // Grant necessary roles
  const MINTER_ROLE = await studentBadges.MINTER_ROLE();
  await studentBadges.grantRole(MINTER_ROLE, await skillPaysCore.getAddress());
  console.log("✓ Granted MINTER_ROLE to SkillPaysCore");

  console.log("\n=== Deployment Summary ===");
  console.log("OrganizationRegistry:", await organizationRegistry.getAddress());
  console.log("SkillPaysCoreV2:", await skillPaysCore.getAddress());
  console.log("StudentBadges:", await studentBadges.getAddress());
  console.log("SkillGraph:", await skillGraph.getAddress());
  console.log("PeerReviewSystem:", await peerReviewSystem.getAddress());
  console.log("LeaderboardSocial:", await leaderboardSocial.getAddress());
  console.log("MentorBoostSystem:", await mentorBoostSystem.getAddress());
  console.log("MicroRewardsSystem:", await microRewardsSystem.getAddress());
  console.log("GraduateDAO:", await graduateDAO.getAddress());
  console.log("CrossBootcampRegistry:", await crossBootcampRegistry.getAddress());
  console.log("JobBoardIntegration:", await jobBoardIntegration.getAddress());
  console.log("AntiCheatingSystem:", await antiCheatingSystem.getAddress());
  console.log("DecentralizedVerification:", await decentralizedVerification.getAddress());

  console.log("\n✅ All contracts deployed and configured successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});