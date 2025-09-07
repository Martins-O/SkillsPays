import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { StudentBadges } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("StudentBadges", function () {
  let owner: SignerWithAddress;
  let student1: SignerWithAddress;
  let student2: SignerWithAddress;
  let minter: SignerWithAddress;
  let studentBadges: StudentBadges;

  enum BadgeLevel {
    BRONZE = 0,
    SILVER = 1,
    GOLD = 2,
    PLATINUM = 3
  }

  async function deployStudentBadgesFixture() {
    const [owner, student1, student2, minter] = await ethers.getSigners();

    const StudentBadgesFactory = await ethers.getContractFactory("StudentBadges");
    const studentBadges = await StudentBadgesFactory.deploy(
      "SkillPays Badges",
      "SPB",
      "https://api.skillpays.com/badges/"
    );

    // Grant minter role to minter account
    await studentBadges.grantRole(await studentBadges.MINTER_ROLE(), minter.address);

    return { studentBadges, owner, student1, student2, minter };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployStudentBadgesFixture);
    studentBadges = fixture.studentBadges;
    owner = fixture.owner;
    student1 = fixture.student1;
    student2 = fixture.student2;
    minter = fixture.minter;
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await studentBadges.name()).to.equal("SkillPays Badges");
      expect(await studentBadges.symbol()).to.equal("SPB");
    });

    it("Should grant admin and minter roles to deployer", async function () {
      const defaultAdminRole = await studentBadges.DEFAULT_ADMIN_ROLE();
      const minterRole = await studentBadges.MINTER_ROLE();
      
      expect(await studentBadges.hasRole(defaultAdminRole, owner.address)).to.be.true;
      expect(await studentBadges.hasRole(minterRole, owner.address)).to.be.true;
    });
  });

  describe("Badge Minting", function () {
    it("Should mint a badge with correct details", async function () {
      await expect(studentBadges.connect(minter).mintBadge(
        student1.address,
        1, // bootcampId
        1, // milestoneId
        BadgeLevel.SILVER,
        "JavaScript,React",
        85 // peerScore
      ))
        .to.emit(studentBadges, "BadgeMinted")
        .withArgs(student1.address, 1, 1, 1, BadgeLevel.SILVER);

      const badgeDetails = await studentBadges.getBadgeDetails(1);
      expect(badgeDetails.bootcampId).to.equal(1);
      expect(badgeDetails.milestoneId).to.equal(1);
      expect(badgeDetails.level).to.equal(BadgeLevel.SILVER);
      expect(badgeDetails.skillsProven).to.equal("JavaScript,React");
      expect(badgeDetails.peerScore).to.equal(85);
      expect(badgeDetails.isVerified).to.be.true; // peerScore >= 80
    });

    it("Should not allow non-minter to mint badges", async function () {
      await expect(studentBadges.connect(student1).mintBadge(
        student1.address,
        1, 1, BadgeLevel.BRONZE, "JavaScript", 75
      )).to.be.revertedWith("AccessControl: account is missing role");
    });

    it("Should update student badge counts", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "JavaScript", 75
      );
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 2, BadgeLevel.SILVER, "React", 85
      );

      const studentBadgeList = await studentBadges.getStudentBadges(student1.address);
      expect(studentBadgeList.length).to.equal(2);
      expect(studentBadgeList[0]).to.equal(1);
      expect(studentBadgeList[1]).to.equal(2);

      const levelCounts = await studentBadges.getStudentLevelCounts(student1.address);
      expect(levelCounts.bronze).to.equal(1);
      expect(levelCounts.silver).to.equal(1);
      expect(levelCounts.gold).to.equal(0);
      expect(levelCounts.platinum).to.equal(0);
    });

    it("Should update skill proofs when minting", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.GOLD, "JavaScript,React", 90
      );

      const jsProof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      expect(jsProof.skillName).to.equal("JavaScript");
      expect(jsProof.proofLevel).to.equal(BadgeLevel.GOLD);
      expect(jsProof.verificationCount).to.equal(1);
      expect(jsProof.isActive).to.be.true;

      const reactProof = await studentBadges.getSkillProof(student1.address, "React");
      expect(reactProof.skillName).to.equal("React");
      expect(reactProof.proofLevel).to.equal(BadgeLevel.GOLD);
    });

    it("Should mark badges as verified based on peer score", async function () {
      // High peer score - should be verified
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.SILVER, "JavaScript", 85
      );
      let badge = await studentBadges.getBadgeDetails(1);
      expect(badge.isVerified).to.be.true;

      // Low peer score - should not be verified
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 2, BadgeLevel.BRONZE, "Python", 70
      );
      badge = await studentBadges.getBadgeDetails(2);
      expect(badge.isVerified).to.be.false;
    });
  });

  describe("Badge Level Upgrades", function () {
    beforeEach(async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "JavaScript", 75
      );
    });

    it("Should upgrade badge level", async function () {
      await expect(studentBadges.connect(minter).upgradeBadgeLevel(1, BadgeLevel.SILVER))
        .to.emit(studentBadges, "BadgeLevelUpgraded")
        .withArgs(1, BadgeLevel.BRONZE, BadgeLevel.SILVER);

      const badge = await studentBadges.getBadgeDetails(1);
      expect(badge.level).to.equal(BadgeLevel.SILVER);

      // Check level counts updated
      const levelCounts = await studentBadges.getStudentLevelCounts(student1.address);
      expect(levelCounts.bronze).to.equal(0);
      expect(levelCounts.silver).to.equal(1);
    });

    it("Should not allow downgrading badges", async function () {
      await studentBadges.connect(minter).upgradeBadgeLevel(1, BadgeLevel.GOLD);
      
      await expect(studentBadges.connect(minter).upgradeBadgeLevel(1, BadgeLevel.SILVER))
        .to.be.revertedWith("Cannot downgrade badge");
    });

    it("Should not upgrade non-existent badges", async function () {
      await expect(studentBadges.connect(minter).upgradeBadgeLevel(999, BadgeLevel.SILVER))
        .to.be.revertedWith("Badge does not exist");
    });

    it("Should update skill proofs on upgrade", async function () {
      await studentBadges.connect(minter).upgradeBadgeLevel(1, BadgeLevel.GOLD);
      
      const jsProof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      expect(jsProof.proofLevel).to.equal(BadgeLevel.GOLD);
      expect(jsProof.verificationCount).to.equal(2); // Initial mint + upgrade
    });
  });

  describe("Onchain Resume Generation", function () {
    beforeEach(async function () {
      // Create diverse badge portfolio
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "JavaScript", 75
      );
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 2, BadgeLevel.SILVER, "React,HTML", 85
      );
      await studentBadges.connect(minter).mintBadge(
        student1.address, 2, 1, BadgeLevel.GOLD, "Solidity,Web3", 95
      );
    });

    it("Should generate comprehensive onchain resume", async function () {
      const resume = await studentBadges.generateOnchainResume(student1.address);
      
      expect(resume.badgeIds.length).to.equal(3);
      expect(resume.totalBadges).to.equal(3);
      expect(resume.reputationScore).to.be.gt(0);
      
      // Check skills are included
      expect(resume.skills.length).to.be.gt(0);
      expect(resume.skillLevels.length).to.equal(resume.skills.length);
    });

    it("Should calculate reputation score correctly", async function () {
      const resume = await studentBadges.generateOnchainResume(student1.address);
      
      // Bronze (10) + Silver (25) + Gold (50) = 85
      const expectedScore = 10 + 25 + 50;
      expect(resume.reputationScore).to.equal(expectedScore);
    });

    it("Should handle empty resume", async function () {
      const resume = await studentBadges.generateOnchainResume(student2.address);
      
      expect(resume.badgeIds.length).to.equal(0);
      expect(resume.totalBadges).to.equal(0);
      expect(resume.reputationScore).to.equal(0);
      expect(resume.skills.length).to.equal(0);
    });
  });

  describe("Skill Management", function () {
    it("Should update skill proof level when higher badge earned", async function () {
      // Start with bronze
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "JavaScript", 75
      );
      
      let jsProof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      expect(jsProof.proofLevel).to.equal(BadgeLevel.BRONZE);
      
      // Earn gold badge with same skill
      await studentBadges.connect(minter).mintBadge(
        student1.address, 2, 1, BadgeLevel.GOLD, "JavaScript,Advanced", 95
      );
      
      jsProof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      expect(jsProof.proofLevel).to.equal(BadgeLevel.GOLD);
      expect(jsProof.verificationCount).to.equal(2);
    });

    it("Should not downgrade skill proof level", async function () {
      // Start with gold
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.GOLD, "JavaScript", 90
      );
      
      // Earn bronze badge with same skill
      await studentBadges.connect(minter).mintBadge(
        student1.address, 2, 1, BadgeLevel.BRONZE, "JavaScript,Basic", 75
      );
      
      const jsProof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      expect(jsProof.proofLevel).to.equal(BadgeLevel.GOLD); // Should remain gold
    });

    it("Should handle complex skill strings", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.SILVER, "JavaScript,React,Node.js,Express", 85
      );
      
      const skills = ["JavaScript", "React", "Node.js", "Express"];
      for (const skill of skills) {
        const proof = await studentBadges.getSkillProof(student1.address, skill);
        expect(proof.proofLevel).to.equal(BadgeLevel.SILVER);
        expect(proof.isActive).to.be.true;
      }
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant roles", async function () {
      await studentBadges.grantRole(await studentBadges.MINTER_ROLE(), student1.address);
      expect(await studentBadges.hasRole(await studentBadges.MINTER_ROLE(), student1.address)).to.be.true;
    });

    it("Should allow admin to revoke roles", async function () {
      await studentBadges.revokeRole(await studentBadges.MINTER_ROLE(), minter.address);
      expect(await studentBadges.hasRole(await studentBadges.MINTER_ROLE(), minter.address)).to.be.false;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(studentBadges.connect(student1).grantRole(
        await studentBadges.MINTER_ROLE(), 
        student2.address
      )).to.be.revertedWith("AccessControl: account is missing role");
    });
  });

  describe("Pause Functionality", function () {
    it("Should pause and prevent minting", async function () {
      await studentBadges.pause();
      
      await expect(studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "JavaScript", 75
      )).to.be.revertedWith("Pausable: paused");
    });

    it("Should unpause and allow minting", async function () {
      await studentBadges.pause();
      await studentBadges.unpause();
      
      await expect(studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "JavaScript", 75
      )).to.emit(studentBadges, "BadgeMinted");
    });

    it("Should not allow non-pauser to pause", async function () {
      await expect(studentBadges.connect(student1).pause())
        .to.be.revertedWith("AccessControl: account is missing role");
    });
  });

  describe("ERC-721 Functionality", function () {
    beforeEach(async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "JavaScript", 75
      );
    });

    it("Should track token ownership correctly", async function () {
      expect(await studentBadges.ownerOf(1)).to.equal(student1.address);
      expect(await studentBadges.balanceOf(student1.address)).to.equal(1);
    });

    it("Should allow token transfers", async function () {
      await studentBadges.connect(student1).transferFrom(
        student1.address, 
        student2.address, 
        1
      );
      
      expect(await studentBadges.ownerOf(1)).to.equal(student2.address);
      expect(await studentBadges.balanceOf(student1.address)).to.equal(0);
      expect(await studentBadges.balanceOf(student2.address)).to.equal(1);
    });

    it("Should support ERC-721 interface", async function () {
      const ERC721InterfaceId = "0x80ac58cd";
      expect(await studentBadges.supportsInterface(ERC721InterfaceId)).to.be.true;
    });

    it("Should handle token approvals", async function () {
      await studentBadges.connect(student1).approve(student2.address, 1);
      expect(await studentBadges.getApproved(1)).to.equal(student2.address);
      
      await studentBadges.connect(student2).transferFrom(
        student1.address, 
        student2.address, 
        1
      );
      expect(await studentBadges.ownerOf(1)).to.equal(student2.address);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle very long skill strings", async function () {
      const longSkillString = Array(50).fill("Skill").join(",");
      
      await expect(studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, longSkillString, 75
      )).to.emit(studentBadges, "BadgeMinted");
    });

    it("Should handle empty skill strings gracefully", async function () {
      await expect(studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.BRONZE, "", 75
      )).to.emit(studentBadges, "BadgeMinted");
      
      const badge = await studentBadges.getBadgeDetails(1);
      expect(badge.skillsProven).to.equal("");
    });

    it("Should handle maximum badge levels", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.PLATINUM, "JavaScript", 100
      );
      
      const badge = await studentBadges.getBadgeDetails(1);
      expect(badge.level).to.equal(BadgeLevel.PLATINUM);
    });

    it("Should prevent integer overflow in reputation calculation", async function () {
      // Mint many high-level badges
      for (let i = 1; i <= 10; i++) {
        await studentBadges.connect(minter).mintBadge(
          student1.address, i, 1, BadgeLevel.PLATINUM, "JavaScript", 100
        );
      }
      
      const resume = await studentBadges.generateOnchainResume(student1.address);
      expect(resume.reputationScore).to.be.gt(0);
      expect(resume.totalBadges).to.equal(10);
    });

    it("Should handle multiple students with same skills", async function () {
      await studentBadges.connect(minter).mintBadge(
        student1.address, 1, 1, BadgeLevel.GOLD, "JavaScript", 90
      );
      await studentBadges.connect(minter).mintBadge(
        student2.address, 1, 1, BadgeLevel.SILVER, "JavaScript", 85
      );
      
      const student1Proof = await studentBadges.getSkillProof(student1.address, "JavaScript");
      const student2Proof = await studentBadges.getSkillProof(student2.address, "JavaScript");
      
      expect(student1Proof.proofLevel).to.equal(BadgeLevel.GOLD);
      expect(student2Proof.proofLevel).to.equal(BadgeLevel.SILVER);
    });
  });
});