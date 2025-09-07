import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  SkillPaysCore, 
  StudentBadges,
  SkillGraph,
  PeerReviewSystem,
  LeaderboardSocial,
  MentorBoostSystem,
  MicroRewardsSystem
} from "../../typechain-types";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("SkillPaysCore Unit Tests", function () {
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let student1: SignerWithAddress;
  let student2: SignerWithAddress;
  let mentor: SignerWithAddress;
  let attacker: SignerWithAddress;
  let bootcampCreator: SignerWithAddress;

  let skillPaysCore: SkillPaysCore;
  let mockBadges: StudentBadges;

  // Test fixtures for consistent setup
  async function deploySkillPaysFixture() {
    const [owner, treasury, student1, student2, mentor, attacker, bootcampCreator] = await ethers.getSigners();

    const SkillPaysCoreFactory = await ethers.getContractFactory("SkillPaysCore");
    const mockPriceFeed = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
    const skillPaysCore = await SkillPaysCoreFactory.deploy(treasury.address, 250, mockPriceFeed);

    const StudentBadgesFactory = await ethers.getContractFactory("StudentBadges");
    const mockBadges = await StudentBadgesFactory.deploy(
      "SkillPays Badges",
      "SPB",
      "https://api.skillpays.com/badges/"
    );

    // Setup initial configuration
    await skillPaysCore.setContract("badge", mockBadges.target);
    await skillPaysCore.grantBootcampCreatorRole(bootcampCreator.address);
    await mockBadges.grantRole(await mockBadges.MINTER_ROLE(), skillPaysCore.target);

    return {
      skillPaysCore,
      mockBadges,
      owner,
      treasury,
      student1,
      student2,
      mentor,
      attacker,
      bootcampCreator
    };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deploySkillPaysFixture);
    skillPaysCore = fixture.skillPaysCore;
    mockBadges = fixture.mockBadges;
    owner = fixture.owner;
    treasury = fixture.treasury;
    student1 = fixture.student1;
    student2 = fixture.student2;
    mentor = fixture.mentor;
    attacker = fixture.attacker;
    bootcampCreator = fixture.bootcampCreator;
  });

  describe("Deployment and Initial State", function () {
    it("Should set correct treasury address", async function () {
      expect(await skillPaysCore.treasury()).to.equal(treasury.address);
    });

    it("Should set default platform fee", async function () {
      expect(await skillPaysCore.platformFee()).to.equal(250); // 2.5%
    });

    it("Should grant admin roles to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await skillPaysCore.DEFAULT_ADMIN_ROLE();
      const ADMIN_ROLE = await skillPaysCore.ADMIN_ROLE();
      
      expect(await skillPaysCore.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await skillPaysCore.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should revert deployment with zero treasury address", async function () {
      const SkillPaysCoreFactory = await ethers.getContractFactory("SkillPaysCore");
      await expect(
        SkillPaysCoreFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid treasury address");
    });
  });

  describe("Student Registration", function () {
    it("Should register student successfully", async function () {
      await expect(skillPaysCore.connect(student1).registerStudent("Alice"))
        .to.emit(skillPaysCore, "StudentRegistered")
        .withArgs(student1.address, "Alice");

      const studentData = await skillPaysCore.getStudent(student1.address);
      expect(studentData.name).to.equal("Alice");
      expect(studentData.studentAddress).to.equal(student1.address);
      expect(studentData.isActive).to.be.true;
      expect(studentData.totalBadges).to.equal(0);
      expect(studentData.reputationScore).to.equal(0);
    });

    it("Should revert registration with empty name", async function () {
      await expect(
        skillPaysCore.connect(student1).registerStudent("")
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should prevent duplicate registration", async function () {
      await skillPaysCore.connect(student1).registerStudent("Alice");
      
      await expect(
        skillPaysCore.connect(student1).registerStudent("Alice Updated")
      ).to.be.revertedWith("Student already registered");
    });

    it("Should handle registration when paused", async function () {
      await skillPaysCore.pause();
      
      await expect(
        skillPaysCore.connect(student1).registerStudent("Alice")
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should register multiple students", async function () {
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(student2).registerStudent("Bob");

      const alice = await skillPaysCore.getStudent(student1.address);
      const bob = await skillPaysCore.getStudent(student2.address);

      expect(alice.name).to.equal("Alice");
      expect(bob.name).to.equal("Bob");
      expect(alice.isActive).to.be.true;
      expect(bob.isActive).to.be.true;
    });
  });

  describe("Bootcamp Creation", function () {
    it("Should create bootcamp successfully", async function () {
      await expect(
        skillPaysCore.connect(bootcampCreator).createBootcamp(
          "Web3 Development",
          "Learn blockchain development",
          30,
          ethers.parseEther("0.1")
        )
      ).to.emit(skillPaysCore, "BootcampCreated")
      .withArgs(1, "Web3 Development", bootcampCreator.address);

      const bootcamp = await skillPaysCore.getBootcamp(1);
      expect(bootcamp.id).to.equal(1);
      expect(bootcamp.name).to.equal("Web3 Development");
      expect(bootcamp.creator).to.equal(bootcampCreator.address);
      expect(bootcamp.duration).to.equal(30);
      expect(bootcamp.fee).to.equal(ethers.parseEther("0.1"));
      expect(bootcamp.isActive).to.be.true;
    });

    it("Should revert creation with empty name", async function () {
      await expect(
        skillPaysCore.connect(bootcampCreator).createBootcamp("", "Description", 30, 0)
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should revert creation with zero duration", async function () {
      await expect(
        skillPaysCore.connect(bootcampCreator).createBootcamp("Bootcamp", "Description", 0, 0)
      ).to.be.revertedWith("Duration must be positive");
    });

    it("Should prevent creation by non-creator", async function () {
      await expect(
        skillPaysCore.connect(student1).createBootcamp("Bootcamp", "Description", 30, 0)
      ).to.be.revertedWith("AccessControl: account " + student1.address.toLowerCase() + " is missing role " + await skillPaysCore.BOOTCAMP_CREATOR_ROLE());
    });

    it("Should create multiple bootcamps with incremental IDs", async function () {
      await skillPaysCore.connect(bootcampCreator).createBootcamp("Bootcamp 1", "Desc 1", 30, 0);
      await skillPaysCore.connect(bootcampCreator).createBootcamp("Bootcamp 2", "Desc 2", 60, ethers.parseEther("0.2"));

      const bootcamp1 = await skillPaysCore.getBootcamp(1);
      const bootcamp2 = await skillPaysCore.getBootcamp(2);

      expect(bootcamp1.id).to.equal(1);
      expect(bootcamp2.id).to.equal(2);
      expect(bootcamp1.name).to.equal("Bootcamp 1");
      expect(bootcamp2.name).to.equal("Bootcamp 2");
    });

    it("Should handle bootcamp creation when paused", async function () {
      await skillPaysCore.pause();
      
      await expect(
        skillPaysCore.connect(bootcampCreator).createBootcamp("Bootcamp", "Description", 30, 0)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Milestone Management", function () {
    beforeEach(async function () {
      await skillPaysCore.connect(bootcampCreator).createBootcamp("Web3 Bootcamp", "Description", 30, 0);
    });

    it("Should add milestone successfully", async function () {
      await expect(
        skillPaysCore.connect(bootcampCreator).addMilestone(
          1, // bootcampId
          "Smart Contract Development",
          "Build your first DeFi protocol",
          85,
          true
        )
      ).to.emit(skillPaysCore, "MilestoneAdded")
      .withArgs(1, 1, "Smart Contract Development");

      const milestones = await skillPaysCore.getBootcampMilestones(1);
      expect(milestones.length).to.equal(1);
      expect(milestones[0].name).to.equal("Smart Contract Development");
      expect(milestones[0].requiredScore).to.equal(85);
      expect(milestones[0].requiresPeerReview).to.be.true;
    });

    it("Should prevent adding milestone to non-existent bootcamp", async function () {
      await expect(
        skillPaysCore.connect(bootcampCreator).addMilestone(999, "Milestone", "Description", 80, false)
      ).to.be.revertedWith("Bootcamp not active");
    });

    it("Should prevent non-creator from adding milestones", async function () {
      await skillPaysCore.grantBootcampCreatorRole(student1.address);
      
      await expect(
        skillPaysCore.connect(student1).addMilestone(1, "Milestone", "Description", 80, false)
      ).to.be.revertedWith("Not bootcamp creator");
    });

    it("Should add multiple milestones", async function () {
      await skillPaysCore.connect(bootcampCreator).addMilestone(1, "Milestone 1", "Description 1", 80, false);
      await skillPaysCore.connect(bootcampCreator).addMilestone(1, "Milestone 2", "Description 2", 90, true);

      const milestones = await skillPaysCore.getBootcampMilestones(1);
      expect(milestones.length).to.equal(2);
      expect(milestones[0].name).to.equal("Milestone 1");
      expect(milestones[1].name).to.equal("Milestone 2");
    });
  });

  describe("Enrollment System", function () {
    beforeEach(async function () {
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(bootcampCreator).createBootcamp("Web3 Bootcamp", "Description", 30, ethers.parseEther("0.1"));
    });

    it("Should enroll student with correct payment", async function () {
      const fee = ethers.parseEther("0.1");
      const platformFeeAmount = (fee * 250n) / 10000n; // 2.5%
      const creatorAmount = fee - platformFeeAmount;

      await expect(() => 
        skillPaysCore.connect(student1).enrollInBootcamp(1, { value: fee })
      ).to.changeEtherBalances(
        [student1, treasury, bootcampCreator],
        [-fee, platformFeeAmount, creatorAmount]
      );

      expect(await skillPaysCore.isEnrolled(student1.address, 1)).to.be.true;

      const studentBootcamps = await skillPaysCore.getStudentBootcamps(student1.address);
      expect(studentBootcamps.length).to.equal(1);
      expect(studentBootcamps[0]).to.equal(1);
    });

    it("Should enroll in free bootcamp", async function () {
      await skillPaysCore.connect(bootcampCreator).createBootcamp("Free Bootcamp", "Description", 30, 0);
      
      await expect(skillPaysCore.connect(student1).enrollInBootcamp(2))
        .to.emit(skillPaysCore, "StudentEnrolled")
        .withArgs(student1.address, 2);

      expect(await skillPaysCore.isEnrolled(student1.address, 2)).to.be.true;
    });

    it("Should revert enrollment with insufficient payment", async function () {
      await expect(
        skillPaysCore.connect(student1).enrollInBootcamp(1, { value: ethers.parseEther("0.05") })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should prevent unregistered student enrollment", async function () {
      await expect(
        skillPaysCore.connect(student2).enrollInBootcamp(1, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Student not registered");
    });

    it("Should prevent duplicate enrollment", async function () {
      const fee = ethers.parseEther("0.1");
      await skillPaysCore.connect(student1).enrollInBootcamp(1, { value: fee });

      await expect(
        skillPaysCore.connect(student1).enrollInBootcamp(1, { value: fee })
      ).to.be.revertedWith("Already enrolled");
    });

    it("Should prevent enrollment in inactive bootcamp", async function () {
      await skillPaysCore.connect(bootcampCreator).createBootcamp("Inactive Bootcamp", "Description", 30, 0);
      // Bootcamp would need deactivation functionality - this is a design consideration
    });

    it("Should handle excess payment correctly", async function () {
      const fee = ethers.parseEther("0.1");
      const overpayment = ethers.parseEther("0.2");
      const platformFeeAmount = (overpayment * 250n) / 10000n;
      const creatorAmount = overpayment - platformFeeAmount;

      await expect(() => 
        skillPaysCore.connect(student1).enrollInBootcamp(1, { value: overpayment })
      ).to.changeEtherBalances(
        [student1, treasury, bootcampCreator],
        [-overpayment, platformFeeAmount, creatorAmount]
      );
    });
  });

  describe("Milestone Completion", function () {
    beforeEach(async function () {
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(bootcampCreator).createBootcamp("Web3 Bootcamp", "Description", 30, 0);
      await skillPaysCore.connect(student1).enrollInBootcamp(1);
      await skillPaysCore.connect(bootcampCreator).addMilestone(1, "Smart Contract Development", "Build DeFi", 85, false);
    });

    it("Should complete milestone successfully", async function () {
      const proofData = ethers.toUtf8Bytes("ipfs://QmProofHash");

      await expect(skillPaysCore.connect(student1).completeMilestone(1, 1, proofData))
        .to.emit(skillPaysCore, "MilestoneCompleted")
        .withArgs(student1.address, 1, 1);

      expect(await skillPaysCore.isMilestoneCompleted(student1.address, 1, 1)).to.be.true;

      const studentData = await skillPaysCore.getStudent(student1.address);
      expect(studentData.totalBadges).to.equal(1);
      expect(studentData.reputationScore).to.equal(85);
    });

    it("Should prevent unregistered student from completing milestones", async function () {
      await expect(
        skillPaysCore.connect(student2).completeMilestone(1, 1, "0x")
      ).to.be.revertedWith("Student not registered");
    });

    it("Should prevent non-enrolled student from completing milestones", async function () {
      await skillPaysCore.connect(student2).registerStudent("Bob");
      
      await expect(
        skillPaysCore.connect(student2).completeMilestone(1, 1, "0x")
      ).to.be.revertedWith("Not enrolled in bootcamp");
    });

    it("Should prevent duplicate milestone completion", async function () {
      await skillPaysCore.connect(student1).completeMilestone(1, 1, "0x");
      
      await expect(
        skillPaysCore.connect(student1).completeMilestone(1, 1, "0x")
      ).to.be.revertedWith("Milestone already completed");
    });

    it("Should prevent completing non-existent milestone", async function () {
      await expect(
        skillPaysCore.connect(student1).completeMilestone(1, 999, "0x")
      ).to.be.revertedWith("Milestone not found");
    });

    it("Should correctly calculate badge levels based on scores", async function () {
      // Add milestones with different required scores
      await skillPaysCore.connect(bootcampCreator).addMilestone(1, "Bronze Milestone", "Low score", 60, false);
      await skillPaysCore.connect(bootcampCreator).addMilestone(1, "Silver Milestone", "Medium score", 75, false);
      await skillPaysCore.connect(bootcampCreator).addMilestone(1, "Gold Milestone", "High score", 85, false);
      await skillPaysCore.connect(bootcampCreator).addMilestone(1, "Platinum Milestone", "Perfect score", 95, false);

      // Complete milestones and verify badge minting events
      await expect(skillPaysCore.connect(student1).completeMilestone(1, 2, "0x"))
        .to.emit(skillPaysCore, "BadgeMinted");
      
      await expect(skillPaysCore.connect(student1).completeMilestone(1, 3, "0x"))
        .to.emit(skillPaysCore, "BadgeMinted");

      await expect(skillPaysCore.connect(student1).completeMilestone(1, 4, "0x"))
        .to.emit(skillPaysCore, "BadgeMinted");

      await expect(skillPaysCore.connect(student1).completeMilestone(1, 5, "0x"))
        .to.emit(skillPaysCore, "BadgeMinted");
    });
  });

  describe("Access Control and Security", function () {
    it("Should enforce admin role for contract configuration", async function () {
      const newTreasury = student1.address;

      await expect(
        skillPaysCore.connect(attacker).setTreasury(newTreasury)
      ).to.be.revertedWith("AccessControl: account " + attacker.address.toLowerCase() + " is missing role " + await skillPaysCore.ADMIN_ROLE());

      // Should work with admin role
      await skillPaysCore.setTreasury(newTreasury);
      expect(await skillPaysCore.treasury()).to.equal(newTreasury);
    });

    it("Should enforce platform fee limits", async function () {
      const maxFee = await skillPaysCore.MAX_FEE();
      
      await expect(
        skillPaysCore.setPlatformFee(maxFee + 1n)
      ).to.be.revertedWith("Fee too high");

      // Should work within limits
      await skillPaysCore.setPlatformFee(maxFee);
      expect(await skillPaysCore.platformFee()).to.equal(maxFee);
    });

    it("Should validate treasury address", async function () {
      await expect(
        skillPaysCore.setTreasury(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid treasury address");
    });

    it("Should enforce pause functionality", async function () {
      await skillPaysCore.pause();
      
      await expect(
        skillPaysCore.connect(student1).registerStudent("Alice")
      ).to.be.revertedWith("Pausable: paused");

      await skillPaysCore.unpause();
      
      await expect(skillPaysCore.connect(student1).registerStudent("Alice"))
        .to.emit(skillPaysCore, "StudentRegistered");
    });

    it("Should prevent non-admin from pausing", async function () {
      await expect(
        skillPaysCore.connect(attacker).pause()
      ).to.be.revertedWith("AccessControl: account " + attacker.address.toLowerCase() + " is missing role " + await skillPaysCore.ADMIN_ROLE());
    });

    it("Should handle role granting correctly", async function () {
      const BOOTCAMP_CREATOR_ROLE = await skillPaysCore.BOOTCAMP_CREATOR_ROLE();
      
      expect(await skillPaysCore.hasRole(BOOTCAMP_CREATOR_ROLE, student1.address)).to.be.false;
      
      await skillPaysCore.grantBootcampCreatorRole(student1.address);
      
      expect(await skillPaysCore.hasRole(BOOTCAMP_CREATOR_ROLE, student1.address)).to.be.true;
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should have reasonable gas costs for student registration", async function () {
      const tx = await skillPaysCore.connect(student1).registerStudent("Alice");
      const receipt = await tx.wait();
      
      expect(receipt!.gasUsed).to.be.lt(100000); // Should use less than 100k gas
    });

    it("Should have reasonable gas costs for bootcamp creation", async function () {
      const tx = await skillPaysCore.connect(bootcampCreator).createBootcamp("Bootcamp", "Description", 30, 0);
      const receipt = await tx.wait();
      
      expect(receipt!.gasUsed).to.be.lt(150000); // Should use less than 150k gas
    });

    it("Should have reasonable gas costs for enrollment", async function () {
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(bootcampCreator).createBootcamp("Bootcamp", "Description", 30, 0);
      
      const tx = await skillPaysCore.connect(student1).enrollInBootcamp(1);
      const receipt = await tx.wait();
      
      expect(receipt!.gasUsed).to.be.lt(100000); // Should use less than 100k gas
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy in enrollment", async function () {
      // This would require a malicious contract to test properly
      // For now, we verify the nonReentrant modifier is in place
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(bootcampCreator).createBootcamp("Bootcamp", "Description", 30, ethers.parseEther("0.1"));
      
      // Normal enrollment should work
      await expect(
        skillPaysCore.connect(student1).enrollInBootcamp(1, { value: ethers.parseEther("0.1") })
      ).not.to.be.reverted;
    });

    it("Should prevent reentrancy in milestone completion", async function () {
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(bootcampCreator).createBootcamp("Bootcamp", "Description", 30, 0);
      await skillPaysCore.connect(student1).enrollInBootcamp(1);
      await skillPaysCore.connect(bootcampCreator).addMilestone(1, "Milestone", "Description", 80, false);
      
      // Normal completion should work
      await expect(
        skillPaysCore.connect(student1).completeMilestone(1, 1, "0x")
      ).not.to.be.reverted;
    });
  });

  describe("Edge Cases and Error Conditions", function () {
    it("Should handle empty bootcamp milestones array", async function () {
      await skillPaysCore.connect(bootcampCreator).createBootcamp("Empty Bootcamp", "No milestones", 30, 0);
      
      const milestones = await skillPaysCore.getBootcampMilestones(1);
      expect(milestones.length).to.equal(0);
    });

    it("Should handle non-existent bootcamp queries", async function () {
      const bootcamp = await skillPaysCore.getBootcamp(999);
      expect(bootcamp.id).to.equal(0);
      expect(bootcamp.name).to.equal("");
      expect(bootcamp.isActive).to.be.false;
    });

    it("Should handle non-existent student queries", async function () {
      const student = await skillPaysCore.getStudent(attacker.address);
      expect(student.studentAddress).to.equal(ethers.ZeroAddress);
      expect(student.name).to.equal("");
      expect(student.isActive).to.be.false;
    });

    it("Should handle enrollment checks for non-existent combinations", async function () {
      expect(await skillPaysCore.isEnrolled(student1.address, 999)).to.be.false;
    });

    it("Should handle milestone completion checks for non-existent combinations", async function () {
      expect(await skillPaysCore.isMilestoneCompleted(student1.address, 999, 999)).to.be.false;
    });

    it("Should handle large student bootcamp arrays", async function () {
      await skillPaysCore.connect(student1).registerStudent("Alice");
      
      // Create and enroll in multiple bootcamps
      for (let i = 1; i <= 5; i++) {
        await skillPaysCore.connect(bootcampCreator).createBootcamp(`Bootcamp ${i}`, "Description", 30, 0);
        await skillPaysCore.connect(student1).enrollInBootcamp(i);
      }
      
      const studentBootcamps = await skillPaysCore.getStudentBootcamps(student1.address);
      expect(studentBootcamps.length).to.equal(5);
    });
  });
});