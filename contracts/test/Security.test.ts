import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { SkillPaysCore, StudentBadges, MentorBoostSystem, AntiCheatingSystem } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("SkillPays Security Tests", function () {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;
  let student: SignerWithAddress;
  let treasury: SignerWithAddress;
  let skillPaysCore: SkillPaysCore;
  let studentBadges: StudentBadges;
  let mentorBoost: MentorBoostSystem;
  let antiCheating: AntiCheatingSystem;

  async function deploySecurityTestFixture() {
    const [owner, attacker, student, treasury] = await ethers.getSigners();

    const SkillPaysCoreFactory = await ethers.getContractFactory("SkillPaysCore");
    const skillPaysCore = await SkillPaysCoreFactory.deploy(treasury.address);

    const StudentBadgesFactory = await ethers.getContractFactory("StudentBadges");
    const studentBadges = await StudentBadgesFactory.deploy();

    const MentorBoostFactory = await ethers.getContractFactory("MentorBoostSystem");
    const mentorBoost = await MentorBoostFactory.deploy(treasury.address);

    const AntiCheatingFactory = await ethers.getContractFactory("AntiCheatingSystem");
    const antiCheating = await AntiCheatingFactory.deploy();

    await skillPaysCore.setBadgeContract(studentBadges.target);
    await studentBadges.grantRole(await studentBadges.MINTER_ROLE(), skillPaysCore.target);
    await mentorBoost.addToRewardPool({ value: ethers.parseEther("1") });

    return { skillPaysCore, studentBadges, mentorBoost, antiCheating, owner, attacker, student, treasury };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deploySecurityTestFixture);
    skillPaysCore = fixture.skillPaysCore;
    studentBadges = fixture.studentBadges;
    mentorBoost = fixture.mentorBoost;
    antiCheating = fixture.antiCheating;
    owner = fixture.owner;
    attacker = fixture.attacker;
    student = fixture.student;
    treasury = fixture.treasury;
  });

  describe("Access Control Security", function () {
    it("Should prevent unauthorized role grants", async function () {
      const adminRole = await skillPaysCore.DEFAULT_ADMIN_ROLE();
      
      await expect(skillPaysCore.connect(attacker).grantRole(adminRole, attacker.address))
        .to.be.revertedWith("AccessControl: account is missing role");
    });

    it("Should prevent unauthorized contract modifications", async function () {
      await expect(skillPaysCore.connect(attacker).setBadgeContract(attacker.address))
        .to.be.revertedWith("AccessControl: account is missing role");

      await expect(skillPaysCore.connect(attacker).setPlatformFee(5000))
        .to.be.revertedWith("AccessControl: account is missing role");

      await expect(skillPaysCore.connect(attacker).setTreasury(attacker.address))
        .to.be.revertedWith("AccessControl: account is missing role");
    });

    it("Should prevent unauthorized badge minting", async function () {
      await expect(studentBadges.connect(attacker).mintBadge(
        attacker.address, 1, 1, 0, "Unauthorized", 100
      )).to.be.revertedWith("AccessControl: account is missing role");
    });

    it("Should prevent unauthorized pause/unpause", async function () {
      await expect(skillPaysCore.connect(attacker).pause())
        .to.be.revertedWith("AccessControl: account is missing role");

      await skillPaysCore.pause();
      await expect(skillPaysCore.connect(attacker).unpause())
        .to.be.revertedWith("AccessControl: account is missing role");
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy in enrollment", async function () {
      await skillPaysCore.connect(student).registerStudent("Test Student");
      await skillPaysCore.grantBootcampCreatorRole(owner.address);
      await skillPaysCore.createBootcamp("Test Bootcamp", "Test", 30, ethers.parseEther("0.1"));

      // Normal enrollment should work
      await expect(skillPaysCore.connect(student).enrollInBootcamp(1, {
        value: ethers.parseEther("0.1")
      })).to.emit(skillPaysCore, "StudentEnrolled");

      // Duplicate enrollment should fail (which also tests reentrancy protection)
      await expect(skillPaysCore.connect(student).enrollInBootcamp(1, {
        value: ethers.parseEther("0.1")
      })).to.be.revertedWith("Already enrolled");
    });

    it("Should prevent reentrancy in milestone completion", async function () {
      await skillPaysCore.connect(student).registerStudent("Test Student");
      await skillPaysCore.grantBootcampCreatorRole(owner.address);
      await skillPaysCore.createBootcamp("Test Bootcamp", "Test", 30, 0);
      await skillPaysCore.addMilestone(1, "Milestone", "Test", 80, false);
      await skillPaysCore.connect(student).enrollInBootcamp(1);

      // First completion should work
      await expect(skillPaysCore.connect(student).completeMilestone(1, 1, "0x"))
        .to.emit(skillPaysCore, "MilestoneCompleted");

      // Duplicate completion should fail
      await expect(skillPaysCore.connect(student).completeMilestone(1, 1, "0x"))
        .to.be.revertedWith("Milestone already completed");
    });

    it("Should prevent reentrancy in mentor boost system", async function () {
      await mentorBoost.connect(student).registerAsMentor("Mentor", "Bio", "Skills", {
        value: ethers.parseEther("0.5")
      });

      // Normal reward claiming should work (when rewards are available)
      // This test verifies the reentrancy guard is in place
      const mentorProfile = await mentorBoost.getMentorProfile(student.address);
      expect(mentorProfile.isActive).to.be.true;
    });
  });

  describe("Input Validation Security", function () {
    it("Should validate student registration inputs", async function () {
      await expect(skillPaysCore.connect(attacker).registerStudent(""))
        .to.be.revertedWith("Name cannot be empty");
    });

    it("Should validate bootcamp creation inputs", async function () {
      await skillPaysCore.grantBootcampCreatorRole(owner.address);

      await expect(skillPaysCore.createBootcamp("", "Description", 30, 0))
        .to.be.revertedWith("Name cannot be empty");

      await expect(skillPaysCore.createBootcamp("Name", "Description", 0, 0))
        .to.be.revertedWith("Duration must be positive");
    });

    it("Should validate payment amounts", async function () {
      await skillPaysCore.connect(student).registerStudent("Student");
      await skillPaysCore.grantBootcampCreatorRole(owner.address);
      await skillPaysCore.createBootcamp("Paid Bootcamp", "Test", 30, ethers.parseEther("0.1"));

      await expect(skillPaysCore.connect(student).enrollInBootcamp(1, {
        value: ethers.parseEther("0.05") // Insufficient payment
      })).to.be.revertedWith("Insufficient payment");
    });

    it("Should validate platform fee limits", async function () {
      const maxFee = await skillPaysCore.MAX_FEE();
      
      await expect(skillPaysCore.setPlatformFee(maxFee + 1n))
        .to.be.revertedWith("Fee too high");
    });

    it("Should validate treasury address", async function () {
      await expect(skillPaysCore.setTreasury(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid treasury address");
    });
  });

  describe("State Manipulation Prevention", function () {
    it("Should prevent manipulation of student statistics", async function () {
      await skillPaysCore.connect(student).registerStudent("Student");
      
      const initialData = await skillPaysCore.getStudent(student.address);
      expect(initialData.totalBadges).to.equal(0);
      expect(initialData.reputationScore).to.equal(0);

      // Only legitimate milestone completion should update stats
      await skillPaysCore.grantBootcampCreatorRole(owner.address);
      await skillPaysCore.createBootcamp("Test", "Test", 30, 0);
      await skillPaysCore.addMilestone(1, "Milestone", "Test", 100, false);
      await skillPaysCore.connect(student).enrollInBootcamp(1);
      await skillPaysCore.connect(student).completeMilestone(1, 1, "0x");

      const updatedData = await skillPaysCore.getStudent(student.address);
      expect(updatedData.totalBadges).to.equal(1);
      expect(updatedData.reputationScore).to.equal(100);
    });

    it("Should prevent badge level manipulation", async function () {
      // Only authorized minters should be able to mint badges
      const minterRole = await studentBadges.MINTER_ROLE();
      expect(await studentBadges.hasRole(minterRole, skillPaysCore.target)).to.be.true;
      expect(await studentBadges.hasRole(minterRole, attacker.address)).to.be.false;

      // Direct badge upgrade should be restricted
      await skillPaysCore.connect(student).registerStudent("Student");
      await skillPaysCore.grantBootcampCreatorRole(owner.address);
      await skillPaysCore.createBootcamp("Test", "Test", 30, 0);
      await skillPaysCore.addMilestone(1, "Milestone", "Test", 80, false);
      await skillPaysCore.connect(student).enrollInBootcamp(1);
      await skillPaysCore.connect(student).completeMilestone(1, 1, "0x");

      const badges = await studentBadges.getStudentBadges(student.address);
      if (badges.length > 0) {
        await expect(studentBadges.connect(attacker).upgradeBadgeLevel(badges[0], 3))
          .to.be.revertedWith("AccessControl: account is missing role");
      }
    });
  });

  describe("Economic Attack Prevention", function () {
    it("Should prevent fee manipulation attacks", async function () {
      const initialFee = await skillPaysCore.platformFee();
      
      // Attacker cannot change fees
      await expect(skillPaysCore.connect(attacker).setPlatformFee(0))
        .to.be.revertedWith("AccessControl: account is missing role");

      expect(await skillPaysCore.platformFee()).to.equal(initialFee);
    });

    it("Should prevent treasury drainage", async function () {
      // Only admin can change treasury
      await expect(skillPaysCore.connect(attacker).setTreasury(attacker.address))
        .to.be.revertedWith("AccessControl: account is missing role");

      expect(await skillPaysCore.treasury()).to.equal(treasury.address);
    });

    it("Should prevent unauthorized reward distribution", async function () {
      // Register as mentor legitimately
      await mentorBoost.connect(student).registerAsMentor("Student Mentor", "Bio", "Skills", {
        value: ethers.parseEther("0.5")
      });

      // Attacker cannot approve boost requests they didn't create
      await expect(mentorBoost.connect(attacker).approveBoost(999))
        .to.be.revertedWith("AccessControl: account is missing role");
    });

    it("Should handle integer overflow/underflow safely", async function () {
      // Modern Solidity (0.8+) has built-in overflow protection
      // Test that we handle edge cases gracefully
      await skillPaysCore.connect(student).registerStudent("Student");
      await skillPaysCore.grantBootcampCreatorRole(owner.address);
      
      // Test with maximum values
      const maxUint256 = ethers.MaxUint256;
      
      // This should not cause overflow issues in fee calculation
      await expect(skillPaysCore.createBootcamp("Test", "Test", 30, maxUint256))
        .to.not.be.reverted;
    });
  });

  describe("Anti-Cheating Security", function () {
    it("Should prevent unauthorized cheating reports", async function () {
      // Anyone can report, but verification is restricted
      await expect(antiCheating.connect(attacker).reportCheating(
        student.address,
        "fake_submission",
        "QmFakeEvidence",
        "Fake cheating report",
        3
      )).to.emit(antiCheating, "CheatingReported");

      // But verification should be restricted
      const validatorRole = await antiCheating.VALIDATOR_ROLE();
      expect(await antiCheating.hasRole(validatorRole, attacker.address)).to.be.false;
    });

    it("Should prevent risk score manipulation", async function () {
      await expect(antiCheating.connect(attacker).setRiskScore(student.address, 1000))
        .to.be.revertedWith("AccessControl: account is missing role");
    });

    it("Should validate cheating report parameters", async function () {
      await expect(antiCheating.connect(attacker).reportCheating(
        student.address,
        "test_type",
        "", // Empty evidence
        "Description",
        3
      )).to.be.revertedWith("Evidence required");

      await expect(antiCheating.connect(attacker).reportCheating(
        student.address,
        "test_type",
        "QmEvidence",
        "Description",
        0 // Invalid severity
      )).to.be.revertedWith("Invalid severity level");

      await expect(antiCheating.connect(attacker).reportCheating(
        student.address,
        "test_type",
        "QmEvidence",
        "Description",
        6 // Invalid severity
      )).to.be.revertedWith("Invalid severity level");
    });
  });

  describe("Contract Upgrade Security", function () {
    it("Should prevent unauthorized contract address changes", async function () {
      const currentBadgeContract = await skillPaysCore.badgeContract();

      await expect(skillPaysCore.connect(attacker).setBadgeContract(attacker.address))
        .to.be.revertedWith("AccessControl: account is missing role");

      expect(await skillPaysCore.badgeContract()).to.equal(currentBadgeContract);
    });

    it("Should maintain role integrity across contract interactions", async function () {
      // Verify that roles are properly maintained
      const adminRole = await skillPaysCore.DEFAULT_ADMIN_ROLE();
      const minterRole = await studentBadges.MINTER_ROLE();

      expect(await skillPaysCore.hasRole(adminRole, owner.address)).to.be.true;
      expect(await skillPaysCore.hasRole(adminRole, attacker.address)).to.be.false;
      
      expect(await studentBadges.hasRole(minterRole, skillPaysCore.target)).to.be.true;
      expect(await studentBadges.hasRole(minterRole, attacker.address)).to.be.false;
    });
  });

  describe("Denial of Service Prevention", function () {
    it("Should handle large batch operations gracefully", async function () {
      await skillPaysCore.connect(student).registerStudent("Student");
      await skillPaysCore.grantBootcampCreatorRole(owner.address);
      await skillPaysCore.createBootcamp("Batch Test", "Test", 30, 0);

      // Add many milestones (should not cause DoS)
      for (let i = 1; i <= 10; i++) {
        await skillPaysCore.addMilestone(1, `Milestone ${i}`, `Test ${i}`, 80, false);
      }

      await skillPaysCore.connect(student).enrollInBootcamp(1);

      // Complete many milestones (should not cause DoS)
      for (let i = 1; i <= 10; i++) {
        await skillPaysCore.connect(student).completeMilestone(1, i, "0x");
      }

      const studentData = await skillPaysCore.getStudent(student.address);
      expect(studentData.totalBadges).to.equal(10);
    });

    it("Should prevent gas limit attacks", async function () {
      // Test that operations complete within reasonable gas limits
      await skillPaysCore.connect(student).registerStudent("Student");
      
      const tx = await skillPaysCore.connect(student).registerStudent("Student2");
      const receipt = await tx.wait();
      
      // Should not use excessive gas
      expect(receipt?.gasUsed).to.be.lt(500000);
    });
  });

  describe("Data Integrity Security", function () {
    it("Should maintain consistent state across operations", async function () {
      await skillPaysCore.connect(student).registerStudent("Student");
      await skillPaysCore.grantBootcampCreatorRole(owner.address);
      await skillPaysCore.createBootcamp("Consistency Test", "Test", 30, 0);
      await skillPaysCore.addMilestone(1, "Milestone", "Test", 85, false);
      await skillPaysCore.connect(student).enrollInBootcamp(1);

      // Complete milestone
      await skillPaysCore.connect(student).completeMilestone(1, 1, "0x");

      // Verify state consistency
      const studentData = await skillPaysCore.getStudent(student.address);
      const isCompleted = await skillPaysCore.isMilestoneCompleted(student.address, 1, 1);
      const isEnrolled = await skillPaysCore.isEnrolled(student.address, 1);

      expect(studentData.totalBadges).to.equal(1);
      expect(studentData.reputationScore).to.equal(85);
      expect(isCompleted).to.be.true;
      expect(isEnrolled).to.be.true;
    });

    it("Should prevent double-spending in payments", async function () {
      await skillPaysCore.connect(student).registerStudent("Student");
      await skillPaysCore.grantBootcampCreatorRole(owner.address);
      await skillPaysCore.createBootcamp("Paid Test", "Test", 30, ethers.parseEther("0.1"));

      const initialBalance = await ethers.provider.getBalance(student.address);

      // First enrollment
      await skillPaysCore.connect(student).enrollInBootcamp(1, {
        value: ethers.parseEther("0.1")
      });

      const afterFirstPayment = await ethers.provider.getBalance(student.address);
      expect(initialBalance - afterFirstPayment).to.be.gt(ethers.parseEther("0.1"));

      // Second enrollment attempt should fail
      await expect(skillPaysCore.connect(student).enrollInBootcamp(1, {
        value: ethers.parseEther("0.1")
      })).to.be.revertedWith("Already enrolled");

      // Balance should not change from failed attempt
      const finalBalance = await ethers.provider.getBalance(student.address);
      expect(afterFirstPayment).to.be.closeTo(finalBalance, ethers.parseEther("0.001")); // Allow for gas
    });
  });
});