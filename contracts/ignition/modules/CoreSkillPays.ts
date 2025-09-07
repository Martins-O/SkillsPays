import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CoreSkillPaysModule = buildModule("CoreSkillPays", (m) => {
  // Parameters
  const treasuryAddress = m.getParameter("treasuryAddress", "0x742d35Cc6671C0532925a3b8D2E6f7C7d4B7f9B6");
  
  // Deploy core contracts first
  const skillPaysCore = m.contract("SkillPaysCore", [treasuryAddress]);
  const studentBadges = m.contract("StudentBadges", []);
  const skillGraph = m.contract("SkillGraph", []);

  // Set up basic connections
  m.call(skillPaysCore, "setBadgeContract", [studentBadges], { id: "setBadgeContract" });
  
  // Grant minter role to core contract
  m.call(studentBadges, "grantRole", [
    "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", // MINTER_ROLE
    skillPaysCore
  ], { id: "grantMinterRole" });

  return {
    skillPaysCore,
    studentBadges,
    skillGraph
  };
});

export default CoreSkillPaysModule;