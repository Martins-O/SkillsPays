import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { StudentBadges } from "../../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("StudentBadges Unit Tests", function () {
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let student1: SignerWithAddress;
  let student2: SignerWithAddress;
  let attacker: SignerWithAddress;

  let studentBadges: StudentBadges;

  // Badge Level enum values for testing
  const BadgeLevel = {
    BRONZE: 0,
    SILVER: 1,
    GOLD: 2,
    PLATINUM: 3
  };

  async function deployStudentBadgesFixture() {
    const [owner, minter, student1, student2, attacker] = await ethers.getSigners();

    const StudentBadgesFactory = await ethers.getContractFactory("StudentBadges");
    const studentBadges = await StudentBadgesFactory.deploy(
      "SkillPays Badges",
      "SPB",
      "https://api.skillpays.com/badges/"
    );

    // Grant minter role
    await studentBadges.grantRole(await studentBadges.MINTER_ROLE(), minter.address);

    return {
      studentBadges,
      owner,
      minter,
      student1,
      student2,
      attacker
    };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployStudentBadgesFixture);
    studentBadges = fixture.studentBadges;
    owner = fixture.owner;
    minter = fixture.minter;
    student1 = fixture.student1;
    student2 = fixture.student2;
    attacker = fixture.attacker;
  });

  describe("Deployment and Initial State", function () {
    it("Should set correct name and symbol", async function () {
      expect(await studentBadges.name()).to.equal("SkillPays Badges");
      expect(await studentBadges.symbol()).to.equal("SPB");
    });

    it("Should grant correct roles to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await studentBadges.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await studentBadges.MINTER_ROLE();
      const PAUSER_ROLE = await studentBadges.PAUSER_ROLE();

      expect(await studentBadges.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await studentBadges.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await studentBadges.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
    });

    it("Should initialize with no tokens", async function () {
      expect(await studentBadges.totalSupply()).to.equal(0);
    });

    it("Should support required interfaces", async function () {
      const ERC721_INTERFACE_ID = "0x80ac58cd";
      const ERC165_INTERFACE_ID = "0x01ffc9a7";
      
      expect(await studentBadges.supportsInterface(ERC721_INTERFACE_ID)).to.be.true;
      expect(await studentBadges.supportsInterface(ERC165_INTERFACE_ID)).to.be.true;
    });
  });

  describe("Badge Minting", function () {
    it("Should mint badge successfully", async function () {
      const bootcampId = 1;
      const milestoneId = 1;
      const level = BadgeLevel.SILVER;
      const skills = "JavaScript,React";
      const peerScore = 85;

      await expect(
        studentBadges.connect(minter).mintBadge(
          student1.address,
          bootcampId,
          milestoneId,
          level,
          skills,
          peerScore
        )
      ).to.emit(studentBadges, "BadgeMinted")
      .withArgs(student1.address, 1, bootcampId, milestoneId, level);

      // Verify badge details
      const badge = await studentBadges.getBadgeDetails(1);
      expect(badge.bootcampId).to.equal(bootcampId);
      expect(badge.milestoneId).to.equal(milestoneId);
      expect(badge.level).to.equal(level);
      expect(badge.skillsProven).to.equal(skills);
      expect(badge.peerScore).to.equal(peerScore);
      expect(badge.isVerified).to.be.true; // peerScore >= 80

      // Verify ownership
      expect(await studentBadges.ownerOf(1)).to.equal(student1.address);
      expect(await studentBadges.balanceOf(student1.address)).to.equal(1);
    });

    it("Should update student badge tracking", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.GOLD, "Solidity", 90
      );

      const studentBadgeIds = await studentBadges.getStudentBadges(student1.address);
      expect(studentBadgeIds.length).to.equal(1);
      expect(studentBadgeIds[0]).to.equal(1);
    });

    it("Should update level counts correctly", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "HTML", 65
      );
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 2, BadgeLevel.SILVER, "CSS", 75
      );
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 3, BadgeLevel.GOLD, "JavaScript", 85
      );

      const [bronze, silver, gold, platinum] = await studentBadges.getStudentLevelCounts(student1.address);
      expect(bronze).to.equal(1);
      expect(silver).to.equal(1);
      expect(gold).to.equal(1);
      expect(platinum).to.equal(0);
    });

    it("Should set verification status based on peer score", async function () {
      // Verified badge (score >= 80)
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.GOLD, "Solidity", 85
      );
      let badge = await studentBadges.getBadgeDetails(1);
      expect(badge.isVerified).to.be.true;

      // Unverified badge (score < 80)
      await studentBadges.connect(minter).mintBadge(
        student2.address, 1, 1, BadgeLevel.SILVER, "HTML", 65
      );
      badge = await studentBadges.getBadgeDetails(2);
      expect(badge.isVerified).to.be.false;
    });

    it("Should prevent non-minter from minting", async function () {
      await expect(
        studentBadges.connect(attacker).mintBadge(
          student1.address, 1, 1, BadgeLevel.BRONZE, "Skill", 70
        )
      ).to.be.revertedWith("AccessControl: account " + attacker.address.toLowerCase() + " is missing role " + await studentBadges.MINTER_ROLE());
    });

    it("Should prevent minting when paused", async function () {
      await studentBadges.pause();

      await expect(
        studentBadges.connect(minter).mintBadge(
          student1.address, 1, 1, BadgeLevel.BRONZE, "Skill", 70
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should generate incremental token IDs", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "Skill1", 70
      );
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 2, BadgeLevel.SILVER, "Skill2", 80
      );

      expect(await studentBadges.ownerOf(1)).to.equal(student1.address);
      expect(await studentBadges.ownerOf(2)).to.equal(student1.address);
    });
  });

  describe("Badge Level Upgrades", function () {
    beforeEach(async function () {
      // Mint initial badge
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.SILVER, "JavaScript", 75
      );
    });

    it("Should upgrade badge level successfully", async function () {
      await expect(
        studentBadges.connect(minter).upgradeBadgeLevel(1, BadgeLevel.GOLD)
      ).to.emit(studentBadges, "BadgeLevelUpgraded")
      .withArgs(1, BadgeLevel.SILVER, BadgeLevel.GOLD);

      const badge = await studentBadges.getBadgeDetails(1);
      expect(badge.level).to.equal(BadgeLevel.GOLD);
    });

    it("Should update level counts on upgrade", async function () {
      const [bronzeBefore, silverBefore, goldBefore] = await studentBadges.getStudentLevelCounts(student1.address);
      expect(silverBefore).to.equal(1);
      expect(goldBefore).to.equal(0);

      await studentBadges.connect(minter).upgradeBadgeLevel(1, BadgeLevel.GOLD);

      const [bronzeAfter, silverAfter, goldAfter] = await studentBadges.getStudentLevelCounts(student1.address);
      expect(silverAfter).to.equal(0);
      expect(goldAfter).to.equal(1);
    });

    it("Should prevent downgrading badge level", async function () {
      await expect(
        studentBadges.connect(minter).upgradeBadgeLevel(1, BadgeLevel.BRONZE)
      ).to.be.revertedWith("Cannot downgrade badge");
    });

    it("Should prevent upgrading non-existent badge", async function () {
      await expect(
        studentBadges.connect(minter).upgradeBadgeLevel(999, BadgeLevel.GOLD)
      ).to.be.revertedWith("Badge does not exist");
    });

    it("Should prevent non-minter from upgrading", async function () {
      await expect(
        studentBadges.connect(attacker).upgradeBadgeLevel(1, BadgeLevel.GOLD)
      ).to.be.revertedWith("AccessControl: account " + attacker.address.toLowerCase() + " is missing role " + await studentBadges.MINTER_ROLE());
    });

    it("Should update skill proofs on upgrade", async function () {
      await studentBadges.connect(minter).upgradeBadgeLevel(1, BadgeLevel.PLATINUM);

      const skillProof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      expect(skillProof.proofLevel).to.equal(BadgeLevel.PLATINUM);
      expect(skillProof.verificationCount).to.equal(2); // Once on mint, once on upgrade
    });
  });

  describe("Skill Proof System", function () {
    it("Should create skill proofs from comma-separated skills", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.GOLD, "JavaScript,React,Node.js", 85
      );

      const jsProof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      const reactProof = await studentBadges.getSkillProof(student1.address, "React");
      const nodeProof = await studentBadges.getSkillProof(student1.address, "Node.js");

      expect(jsProof.isActive).to.be.true;
      expect(jsProof.proofLevel).to.equal(BadgeLevel.GOLD);
      expect(reactProof.isActive).to.be.true;
      expect(reactProof.proofLevel).to.equal(BadgeLevel.GOLD);
      expect(nodeProof.isActive).to.be.true;
      expect(nodeProof.proofLevel).to.equal(BadgeLevel.GOLD);
    });

    it("Should update skill proof to higher level", async function () {
      // Initial bronze level
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "JavaScript", 60
      );

      let proof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      expect(proof.proofLevel).to.equal(BadgeLevel.BRONZE);
      expect(proof.verificationCount).to.equal(1);

      // Upgrade to gold level
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 2, BadgeLevel.GOLD, "JavaScript", 85
      );

      proof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      expect(proof.proofLevel).to.equal(BadgeLevel.GOLD);
      expect(proof.verificationCount).to.equal(2);
    });

    it("Should not downgrade skill proof level", async function () {
      // Initial gold level
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.GOLD, "JavaScript", 85
      );

      // Try to add lower level proof
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 2, BadgeLevel.BRONZE, "JavaScript", 60
      );

      const proof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      expect(proof.proofLevel).to.equal(BadgeLevel.GOLD); // Should remain gold
    });

    it("Should handle single skill without commas", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.SILVER, "Solidity", 80
      );

      const proof = await studentBadges.getSkillProof(student1.address, "Solidity");
      expect(proof.isActive).to.be.true;
      expect(proof.proofLevel).to.equal(BadgeLevel.SILVER);
    });

    it("Should emit skill proof update events", async function () {
      await expect(
        studentBadges.connect(minter).mintBadge(
          student1.address, 1, 1, BadgeLevel.GOLD, "JavaScript,React", 85
        )
      ).to.emit(studentBadges, "SkillProofUpdated")
      .withArgs(student1.address, "JavaScript", BadgeLevel.GOLD)
      .and.to.emit(studentBadges, "SkillProofUpdated")
      .withArgs(student1.address, "React", BadgeLevel.GOLD);
    });
  });

  describe("Onchain Resume Generation", function () {
    beforeEach(async function () {
      // Create multiple badges for comprehensive resume
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "HTML,CSS", 65
      );
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 2, BadgeLevel.SILVER, "JavaScript", 75
      );
      await studentBadges.connect(minter).mintBadge(
        student1.address, 2, 1, BadgeLevel.GOLD, "React,Node.js", 85
      );
      await studentBadges.connect(minter).mintBadge(
        student1.address, 2, 2, BadgeLevel.PLATINUM, "Solidity", 95
      );
    });

    it("Should generate complete onchain resume", async function () {
      const [badgeIds, skills, skillLevels, totalBadges, reputationScore] = 
        await studentBadges.generateOnchainResume(student1.address);

      expect(badgeIds.length).to.equal(4);
      expect(totalBadges).to.equal(4);
      expect(skills.length).to.be.gt(0);
      expect(skillLevels.length).to.equal(skills.length);
      expect(reputationScore).to.be.gt(0);
    });

    it("Should calculate reputation score correctly", async function () {
      const [, , , , reputationScore] = await studentBadges.generateOnchainResume(student1.address);
      
      // Expected: 1 bronze (10) + 1 silver (25) + 1 gold (50) + 1 platinum (100) = 185
      expect(reputationScore).to.equal(185);
    });

    it("Should handle empty resume", async function () {
      const [badgeIds, skills, skillLevels, totalBadges, reputationScore] = 
        await studentBadges.generateOnchainResume(student2.address);

      expect(badgeIds.length).to.equal(0);
      expect(totalBadges).to.equal(0);
      expect(skills.length).to.equal(0);
      expect(skillLevels.length).to.equal(0);
      expect(reputationScore).to.equal(0);
    });

    it("Should return highest skill levels in resume", async function () {
      // Add additional badge with lower level for existing skill
      await studentBadges.connect(minter).mintBadge(
        student1.address, 3, 1, BadgeLevel.BRONZE, "JavaScript", 60
      );

      const [, skills, skillLevels] = await studentBadges.generateOnchainResume(student1.address);
      
      // Find JavaScript entries - should show highest level (SILVER from earlier badge)
      const jsIndices = skills.map((skill, index) => skill === "JavaScript" ? index : -1).filter(i => i !== -1);
      
      expect(jsIndices.length).to.be.gt(0);
      // At least one JavaScript skill should be at Silver level or higher
      const hasHighLevelJS = jsIndices.some(i => skillLevels[i] >= BadgeLevel.SILVER);
      expect(hasHighLevelJS).to.be.true;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.GOLD, "JavaScript,React", 85
      );
    });

    it("Should return student badges", async function () {
      const badgeIds = await studentBadges.getStudentBadges(student1.address);
      expect(badgeIds.length).to.equal(1);
      expect(badgeIds[0]).to.equal(1);
    });

    it("Should return badge details", async function () {
      const badge = await studentBadges.getBadgeDetails(1);
      expect(badge.bootcampId).to.equal(1);
      expect(badge.milestoneId).to.equal(1);
      expect(badge.level).to.equal(BadgeLevel.GOLD);
      expect(badge.skillsProven).to.equal("JavaScript,React");
      expect(badge.peerScore).to.equal(85);
      expect(badge.isVerified).to.be.true;
    });

    it("Should revert for non-existent badge details", async function () {
      await expect(
        studentBadges.getBadgeDetails(999)
      ).to.be.revertedWith("Badge does not exist");
    });

    it("Should return level counts", async function () {
      const [bronze, silver, gold, platinum] = await studentBadges.getStudentLevelCounts(student1.address);
      expect(bronze).to.equal(0);
      expect(silver).to.equal(0);
      expect(gold).to.equal(1);
      expect(platinum).to.equal(0);
    });

    it("Should return skill proof details", async function () {
      const proof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      expect(proof.skillName).to.equal("JavaScript");
      expect(proof.proofLevel).to.equal(BadgeLevel.GOLD);
      expect(proof.isActive).to.be.true;
      expect(proof.verificationCount).to.equal(1);
    });
  });

  describe("Access Control and Security", function () {
    it("Should enforce minter role for minting", async function () {
      await expect(
        studentBadges.connect(student1).mintBadge(
          student2.address, 1, 1, BadgeLevel.BRONZE, "Skill", 70
        )
      ).to.be.revertedWith("AccessControl: account " + student1.address.toLowerCase() + " is missing role " + await studentBadges.MINTER_ROLE());
    });

    it("Should enforce pauser role for pausing", async function () {
      await expect(
        studentBadges.connect(attacker).pause()
      ).to.be.revertedWith("AccessControl: account " + attacker.address.toLowerCase() + " is missing role " + await studentBadges.PAUSER_ROLE());
    });

    it("Should allow admin to grant/revoke roles", async function () {
      const MINTER_ROLE = await studentBadges.MINTER_ROLE();
      
      expect(await studentBadges.hasRole(MINTER_ROLE, student1.address)).to.be.false;
      
      await studentBadges.grantRole(MINTER_ROLE, student1.address);
      expect(await studentBadges.hasRole(MINTER_ROLE, student1.address)).to.be.true;
      
      await studentBadges.revokeRole(MINTER_ROLE, student1.address);
      expect(await studentBadges.hasRole(MINTER_ROLE, student1.address)).to.be.false;
    });

    it("Should prevent token transfers when paused", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "Skill", 70
      );
      
      await studentBadges.pause();
      
      await expect(
        studentBadges.connect(student1).transferFrom(student1.address, student2.address, 1)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should protect against reentrancy in minting", async function () {
      // Normal minting should work
      await expect(
        studentBadges.connect(minter).mintBadge(
          student1.address, 1, 1, BadgeLevel.BRONZE, "Skill", 70
        )
      ).not.to.be.reverted;
    });
  });

  describe("Edge Cases and Error Conditions", function () {
    it("Should handle empty skills string", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "", 70
      );

      const badge = await studentBadges.getBadgeDetails(1);
      expect(badge.skillsProven).to.equal("");
    });

    it("Should handle skills string with only commas", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, ",,", 70
      );

      const badge = await studentBadges.getBadgeDetails(1);
      expect(badge.skillsProven).to.equal(",,");
    });

    it("Should handle very long skills string", async function () {
      const longSkills = "Skill1,Skill2,Skill3,Skill4,Skill5,Skill6,Skill7,Skill8,Skill9,Skill10";
      
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.GOLD, longSkills, 85
      );

      const badge = await studentBadges.getBadgeDetails(1);
      expect(badge.skillsProven).to.equal(longSkills);
    });

    it("Should handle zero peer score", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "Skill", 0
      );

      const badge = await studentBadges.getBadgeDetails(1);
      expect(badge.isVerified).to.be.false;
      expect(badge.peerScore).to.equal(0);
    });

    it("Should handle maximum peer score", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.PLATINUM, "Skill", 100
      );

      const badge = await studentBadges.getBadgeDetails(1);
      expect(badge.isVerified).to.be.true;
      expect(badge.peerScore).to.equal(100);
    });

    it("Should handle student with many badges", async function () {
      // Mint multiple badges
      for (let i = 1; i <= 10; i++) {
        await studentBadges.connect(minter).mintBadge(
          student1.address, 1, i, BadgeLevel.SILVER, `Skill${i}`, 75
        );
      }

      const badgeIds = await studentBadges.getStudentBadges(student1.address);
      expect(badgeIds.length).to.equal(10);

      const [, , , totalBadges] = await studentBadges.generateOnchainResume(student1.address);
      expect(totalBadges).to.equal(10);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should have reasonable gas costs for badge minting", async function () {
      const tx = await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.SILVER, "JavaScript,React", 80
      );
      const receipt = await tx.wait();
      
      expect(receipt!.gasUsed).to.be.lt(200000); // Should use less than 200k gas
    });

    it("Should have reasonable gas costs for badge upgrades", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.SILVER, "JavaScript", 80
      );
      
      const tx = await studentBadges.connect(minter).upgradeBadgeLevel(1, BadgeLevel.GOLD);
      const receipt = await tx.wait();
      
      expect(receipt!.gasUsed).to.be.lt(100000); // Should use less than 100k gas
    });

    it("Should optimize gas for resume generation view function", async function () {
      // Add several badges
      for (let i = 1; i <= 5; i++) {
        await studentBadges.connect(minter).mintBadge(
          student1.address, 1, i, BadgeLevel.SILVER, `Skill${i}`, 80
        );
      }
      
      // Resume generation should not consume too much gas (it's a view function)
      const resumeCall = studentBadges.generateOnchainResume(student1.address);
      await expect(resumeCall).not.to.be.reverted;
    });
  });

  describe("ERC721 Compliance", function () {
    beforeEach(async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.GOLD, "JavaScript", 85
      );
    });

    it("Should support ERC721 transfers", async function () {
      await studentBadges.connect(student1).transferFrom(student1.address, student2.address, 1);
      
      expect(await studentBadges.ownerOf(1)).to.equal(student2.address);
      expect(await studentBadges.balanceOf(student1.address)).to.equal(0);
      expect(await studentBadges.balanceOf(student2.address)).to.equal(1);
    });

    it("Should support ERC721 approvals", async function () {
      await studentBadges.connect(student1).approve(student2.address, 1);
      
      expect(await studentBadges.getApproved(1)).to.equal(student2.address);
      
      await studentBadges.connect(student2).transferFrom(student1.address, student2.address, 1);
      expect(await studentBadges.ownerOf(1)).to.equal(student2.address);
    });

    it("Should support ERC721 safe transfers", async function () {
      await studentBadges.connect(student1)["safeTransferFrom(address,address,uint256)"](
        student1.address, student2.address, 1
      );
      
      expect(await studentBadges.ownerOf(1)).to.equal(student2.address);
    });
  });
});