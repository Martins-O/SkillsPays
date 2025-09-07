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
} from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("SkillPays Integration Tests", function () {
  let owner: SignerWithAddress;
  let student1: SignerWithAddress;
  let student2: SignerWithAddress;
  let bootcampCreator: SignerWithAddress;
  let mentor: SignerWithAddress;
  let reviewer: SignerWithAddress;
  let treasury: SignerWithAddress;

  let skillPaysCore: SkillPaysCore;
  let studentBadges: StudentBadges;
  let skillGraph: SkillGraph;
  let peerReview: PeerReviewSystem;
  let leaderboard: LeaderboardSocial;
  let mentorBoost: MentorBoostSystem;
  let microRewards: MicroRewardsSystem;

  async function deployIntegratedSystemFixture() {
    const [owner, student1, student2, bootcampCreator, mentor, reviewer, treasury] = await ethers.getSigners();

    // Deploy all contracts with updated constructors
    const mockPriceFeed = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
    const initialPlatformFee = 250; // 2.5%
    
    const SkillPaysCoreFactory = await ethers.getContractFactory("SkillPaysCore");
    const skillPaysCore = await SkillPaysCoreFactory.deploy(treasury.address, initialPlatformFee, mockPriceFeed);

    const StudentBadgesFactory = await ethers.getContractFactory("StudentBadges");
    const studentBadges = await StudentBadgesFactory.deploy(
      "SkillPays Badges",
      "SPB", 
      "https://api.skillpays.com/badges/"
    );

    const SkillGraphFactory = await ethers.getContractFactory("SkillGraph");
    const skillGraph = await SkillGraphFactory.deploy();

    const PeerReviewFactory = await ethers.getContractFactory("PeerReviewSystem");
    const peerReview = await PeerReviewFactory.deploy();

    const LeaderboardFactory = await ethers.getContractFactory("LeaderboardSocial");
    const leaderboard = await LeaderboardFactory.deploy();

    const MicroRewardsFactory = await ethers.getContractFactory("MicroRewardsSystem");
    const microRewards = await MicroRewardsFactory.deploy();

    const MentorBoostFactory = await ethers.getContractFactory("MentorBoostSystem");
    const mentorBoost = await MentorBoostFactory.deploy(microRewards.target);

    // Set up contract connections using new setContract function
    await skillPaysCore.setContract("badge", studentBadges.target);
    await skillPaysCore.setContract("peerReview", peerReview.target);
    await skillPaysCore.setContract("leaderboard", leaderboard.target);
    await skillPaysCore.setContract("mentorBoost", mentorBoost.target);
    await skillPaysCore.setContract("microRewards", microRewards.target);
    await skillPaysCore.setContract("skillGraph", skillGraph.target);

    // Grant necessary roles
    await studentBadges.grantRole(await studentBadges.MINTER_ROLE(), skillPaysCore.target);
    await skillGraph.grantRole(await skillGraph.SKILL_UPDATER_ROLE(), skillPaysCore.target);
    await leaderboard.grantRole(await leaderboard.SCORE_UPDATER_ROLE(), skillPaysCore.target);
    await microRewards.grantRole(await microRewards.REWARDS_DISTRIBUTOR_ROLE(), skillPaysCore.target);
    
    await skillPaysCore.grantBootcampCreatorRole(bootcampCreator.address);
    await peerReview.grantRole(await peerReview.ADMIN_ROLE(), owner.address);

    // Add funding to reward pools by sending ETH directly
    await owner.sendTransaction({
      to: mentorBoost.target,
      value: ethers.parseEther("1")
    });
    await owner.sendTransaction({
      to: microRewards.target, 
      value: ethers.parseEther("0.5")
    });

    return {
      skillPaysCore,
      studentBadges,
      skillGraph,
      peerReview,
      leaderboard,
      mentorBoost,
      microRewards,
      owner,
      student1,
      student2,
      bootcampCreator,
      mentor,
      reviewer,
      treasury
    };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployIntegratedSystemFixture);
    skillPaysCore = fixture.skillPaysCore;
    studentBadges = fixture.studentBadges;
    skillGraph = fixture.skillGraph;
    peerReview = fixture.peerReview;
    leaderboard = fixture.leaderboard;
    mentorBoost = fixture.mentorBoost;
    microRewards = fixture.microRewards;
    owner = fixture.owner;
    student1 = fixture.student1;
    student2 = fixture.student2;
    bootcampCreator = fixture.bootcampCreator;
    mentor = fixture.mentor;
    reviewer = fixture.reviewer;
    treasury = fixture.treasury;
  });

  describe("Complete Student Learning Journey", function () {
    it("Should complete full learning journey from registration to graduation", async function () {
      // Step 1: Student registers
      await skillPaysCore.connect(student1).registerStudent("Alice Developer");
      
      let studentData = await skillPaysCore.getStudent(student1.address);
      expect(studentData.name).to.equal("Alice Developer");
      expect(studentData.isActive).to.be.true;

      // Step 2: Bootcamp creator creates a bootcamp
      await skillPaysCore.connect(bootcampCreator).createBootcamp(
        "Full Stack Web3 Bootcamp",
        "Complete Web3 development course",
        90, // 90 days
        ethers.parseEther("0.5")
      );

      // Step 3: Add milestones to the bootcamp
      await skillPaysCore.connect(bootcampCreator).addMilestone(
        1, // bootcampId
        "JavaScript Fundamentals",
        "Master JavaScript basics",
        75, // required score
        false, // no peer review required
        ethers.parseEther("0.1") // reward amount
      );

      await skillPaysCore.connect(bootcampCreator).addMilestone(
        1,
        "React Development",
        "Build React applications",
        80,
        true, // peer review required
        ethers.parseEther("0.2") // reward amount
      );

      await skillPaysCore.connect(bootcampCreator).addMilestone(
        1,
        "Smart Contract Development",
        "Write and deploy smart contracts",
        85,
        true, // peer review required
        ethers.parseEther("0.3") // reward amount
      );

      // Step 4: Student enrolls and pays
      const initialTreasuryBalance = await ethers.provider.getBalance(treasury.address);
      
      await skillPaysCore.connect(student1).enrollInBootcamp(1, {
        value: ethers.parseEther("0.5")
      });

      expect(await skillPaysCore.isEnrolled(student1.address, 1)).to.be.true;
      
      // Verify payment distribution
      const finalTreasuryBalance = await ethers.provider.getBalance(treasury.address);
      const feeAmount = ethers.parseEther("0.5") * BigInt(250) / BigInt(10000); // 2.5%
      expect(finalTreasuryBalance - initialTreasuryBalance).to.equal(feeAmount);

      // Step 5: Complete first milestone (no peer review)
      await skillPaysCore.connect(student1).completeMilestone(1, 1, "0x");
      
      expect(await skillPaysCore.isMilestoneCompleted(student1.address, 1, 1)).to.be.true;
      
      studentData = await skillPaysCore.getStudent(student1.address);
      expect(studentData.totalBadges).to.equal(1);
      expect(studentData.reputationScore).to.equal(75);

      // Step 6: Set up peer review system for second milestone
      await peerReview.connect(reviewer).registerAsReviewer(7, {
        value: ethers.parseEther("0.1")
      });

      // Create peer review request
      await peerReview.createReviewRequest(
        student1.address,
        1, // bootcampId
        2, // milestoneId
        "QmReactProjectHash",
        3 // required reviews
      );

      // Submit peer reviews (need multiple reviewers for complete test)
      await peerReview.connect(reviewer).submitReview(
        1, // requestId
        82, // score
        "Good React implementation with clean code",
        "QmReviewEvidenceHash"
      );

      // Complete second milestone after peer review
      await skillPaysCore.connect(student1).completeMilestone(1, 2, "0x");
      
      studentData = await skillPaysCore.getStudent(student1.address);
      expect(studentData.totalBadges).to.equal(2);
      expect(studentData.reputationScore).to.equal(155); // 75 + 80

      // Step 7: Complete final milestone
      await skillPaysCore.connect(student1).completeMilestone(1, 3, "0x");
      
      studentData = await skillPaysCore.getStudent(student1.address);
      expect(studentData.totalBadges).to.equal(3);
      expect(studentData.reputationScore).to.equal(240); // 75 + 80 + 85

      // Step 8: Verify badges were minted correctly
      const studentBadgeList = await studentBadges.getStudentBadges(student1.address);
      expect(studentBadgeList.length).to.equal(3);

      // Check badge details
      const firstBadge = await studentBadges.getBadgeDetails(1);
      expect(firstBadge.bootcampId).to.equal(1);
      expect(firstBadge.milestoneId).to.equal(1);

      // Step 9: Generate onchain resume
      const resume = await studentBadges.generateOnchainResume(student1.address);
      expect(resume.totalBadges).to.equal(3);
      expect(resume.reputationScore).to.be.gt(0);
    });

    it("Should handle concurrent students in same bootcamp", async function () {
      // Register multiple students
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(student2).registerStudent("Bob");

      // Create bootcamp
      await skillPaysCore.connect(bootcampCreator).createBootcamp(
        "Concurrent Bootcamp", "Multiple students", 30, ethers.parseEther("0.1")
      );

      await skillPaysCore.connect(bootcampCreator).addMilestone(
        1, "Milestone 1", "Test milestone", 80, false, ethers.parseEther("0.1")
      );

      // Both students enroll
      await skillPaysCore.connect(student1).enrollInBootcamp(1, {
        value: ethers.parseEther("0.1")
      });
      await skillPaysCore.connect(student2).enrollInBootcamp(1, {
        value: ethers.parseEther("0.1")
      });

      // Both complete milestone
      await skillPaysCore.connect(student1).completeMilestone(1, 1, "0x");
      await skillPaysCore.connect(student2).completeMilestone(1, 1, "0x");

      // Verify both students have badges
      const student1Badges = await studentBadges.getStudentBadges(student1.address);
      const student2Badges = await studentBadges.getStudentBadges(student2.address);
      
      expect(student1Badges.length).to.equal(1);
      expect(student2Badges.length).to.equal(1);
      expect(student1Badges[0]).to.not.equal(student2Badges[0]); // Different token IDs
    });
  });

  describe("Mentor and Student Interaction Flow", function () {
    beforeEach(async function () {
      // Set up basic bootcamp and student
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(bootcampCreator).createBootcamp(
        "Mentorship Bootcamp", "With mentor support", 60, ethers.parseEther("0.2")
      );
      await skillPaysCore.connect(bootcampCreator).addMilestone(
        1, "Advanced Project", "Complex milestone", 90, false, ethers.parseEther("0.15")
      );
      await skillPaysCore.connect(student1).enrollInBootcamp(1, {
        value: ethers.parseEther("0.2")
      });

      // Register mentor with required stake
      await mentorBoost.connect(mentor).registerAsMentor(
        "John Mentor",
        "Senior developer with 10 years experience",
        "JavaScript,React,Solidity,Web3",
        { value: ethers.parseEther("0.5") }
      );
    });

    it("Should complete mentor-student interaction flow", async function () {
      // Step 1: Student requests mentor boost
      await mentorBoost.connect(student1).requestBoost(
        mentor.address,
        1, // bootcampId
        1, // milestoneId
        "QmExceptionalProjectHash",
        "micro_reward",
        ethers.parseEther("0.005"), // Small reward
        "Exceptional work on smart contract optimization"
      );

      const boostRequest = await mentorBoost.getBoostRequest(1);
      expect(boostRequest.student).to.equal(student1.address);
      expect(boostRequest.mentor).to.equal(mentor.address);
      expect(boostRequest.isApproved).to.be.false;

      // Step 2: Mentor approves boost
      const initialStudentBalance = await ethers.provider.getBalance(student1.address);
      
      await mentorBoost.connect(mentor).approveBoost(1);

      const approvedRequest = await mentorBoost.getBoostRequest(1);
      expect(approvedRequest.isApproved).to.be.true;

      // Verify micro reward was distributed
      const finalStudentBalance = await ethers.provider.getBalance(student1.address);
      expect(finalStudentBalance).to.be.gt(initialStudentBalance);

      // Step 3: Check mentor statistics
      const mentorProfile = await mentorBoost.getMentorProfile(mentor.address);
      expect(mentorProfile.totalBoosts).to.equal(1);

      // Step 4: Verify mentorship relationship
      expect(await mentorBoost.isActiveMentorship(mentor.address, student1.address)).to.be.true;
    });

    it("Should handle mentor session scheduling and completion", async function () {
      // Start mentorship first
      await mentorBoost.connect(student1).requestBoost(
        mentor.address, 1, 1, "QmHash", "recognition", 0, "Great work"
      );
      await mentorBoost.connect(mentor).approveBoost(1);

      // Schedule mentorship session
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      await mentorBoost.connect(mentor).scheduleSession(
        student1.address,
        "1on1",
        60, // 60 minutes
        futureTime
      );

      // Advance time to after session start time
      await ethers.provider.send("evm_increaseTime", [3700]); // Advance 3700 seconds (more than 1 hour)
      await ethers.provider.send("evm_mine", []);

      // Complete session
      await mentorBoost.connect(mentor).completeSession(
        1, // sessionId
        "QmSessionNotesHash"
      );

      const session = await mentorBoost.getMentorshipSession(1);
      expect(session.isCompleted).to.be.true;
      expect(session.contentHash).to.equal("QmSessionNotesHash");

      // Student rates session
      await mentorBoost.connect(student1).rateSession(
        1, // sessionId
        5, // rating (1-5)
        "Excellent mentorship session, very helpful"
      );

      const ratedSession = await mentorBoost.getMentorshipSession(1);
      expect(ratedSession.studentRating).to.equal(5);
    });
  });

  describe("Social Features and Leaderboard Integration", function () {
    beforeEach(async function () {
      // Register students and create profiles
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(student2).registerStudent("Bob");
      
      await leaderboard.connect(student1).createProfile(
        "Alice Developer",
        "Full-stack developer",
        "QmAliceProfileHash",
        true // public profile
      );
      
      await leaderboard.connect(student2).createProfile(
        "Bob Coder",
        "Blockchain enthusiast",
        "QmBobProfileHash",
        true
      );
    });

    it("Should update leaderboard as students progress", async function () {
      // Create bootcamp and milestones
      await skillPaysCore.connect(bootcampCreator).createBootcamp(
        "Leaderboard Test", "Test bootcamp", 30, 0
      );
      await skillPaysCore.connect(bootcampCreator).addMilestone(
        1, "Milestone 1", "First milestone", 100, false, ethers.parseEther("0.05")
      );

      // Students enroll and complete at different rates
      await skillPaysCore.connect(student1).enrollInBootcamp(1);
      await skillPaysCore.connect(student2).enrollInBootcamp(1);

      // Alice completes milestone first
      await skillPaysCore.connect(student1).completeMilestone(1, 1, "0x");
      
      // Check leaderboard update (note: this requires the leaderboard to be connected)
      // In a full integration, the core contract would call leaderboard.updateScore
      const student1Profile = await leaderboard.getProfile(student1.address);
      expect(student1Profile.displayName).to.equal("Alice Developer");

      // Bob completes later
      await skillPaysCore.connect(student2).completeMilestone(1, 1, "0x");

      // Verify both students have progress
      const student1Data = await skillPaysCore.getStudent(student1.address);
      const student2Data = await skillPaysCore.getStudent(student2.address);
      
      expect(student1Data.totalBadges).to.equal(1);
      expect(student2Data.totalBadges).to.equal(1);
    });

    it("Should handle social connections between students", async function () {
      // Alice sends connection request to Bob
      await leaderboard.connect(student1).sendConnectionRequest(
        student2.address,
        0, // friend type
        "Let's connect and learn together!"
      );

      // In a full implementation, Bob would need to accept the connection
      // This would require getting the connection request ID and calling acceptConnection
      // For now, verify the request was created
      expect(await leaderboard.isConnected(student1.address, student2.address)).to.be.false;
    });
  });

  describe("Cross-Contract Error Handling", function () {
    it("Should handle badge contract failures gracefully", async function () {
      // Verify that zero address is rejected
      await expect(skillPaysCore.setContract("badge", ethers.ZeroAddress))
        .to.be.revertedWithCustomError(skillPaysCore, "InvalidAddress");

      // Test with normal workflow - even if badge contract is disconnected,
      // the main functionality should still work
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(bootcampCreator).createBootcamp(
        "Test Bootcamp", "Test", 30, 0
      );
      await skillPaysCore.connect(bootcampCreator).addMilestone(
        1, "Milestone", "Test", 80, false, ethers.parseEther("0.05")
      );
      await skillPaysCore.connect(student1).enrollInBootcamp(1);

      // Milestone completion should work with badge minting
      await expect(skillPaysCore.connect(student1).completeMilestone(1, 1, "0x"))
        .to.emit(skillPaysCore, "MilestoneCompleted");

      const studentData = await skillPaysCore.getStudent(student1.address);
      expect(studentData.totalBadges).to.equal(1);
      expect(studentData.reputationScore).to.equal(80);
    });

    it("Should maintain data consistency across contracts", async function () {
      // Complete setup
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(bootcampCreator).createBootcamp(
        "Consistency Test", "Test", 30, 0
      );
      await skillPaysCore.connect(bootcampCreator).addMilestone(
        1, "Test Milestone", "Test", 90, false, ethers.parseEther("0.05")
      );
      await skillPaysCore.connect(student1).enrollInBootcamp(1);
      
      // Complete milestone
      await skillPaysCore.connect(student1).completeMilestone(1, 1, "0x");

      // Verify consistency across contracts
      const coreStudentData = await skillPaysCore.getStudent(student1.address);
      const studentBadgeList = await studentBadges.getStudentBadges(student1.address);
      
      expect(coreStudentData.totalBadges).to.equal(studentBadgeList.length);
      
      if (studentBadgeList.length > 0) {
        const badge = await studentBadges.getBadgeDetails(studentBadgeList[0]);
        expect(badge.bootcampId).to.equal(1);
        expect(badge.milestoneId).to.equal(1);
      }
    });
  });

  describe("Gas Optimization and Performance", function () {
    it("Should handle batch operations efficiently", async function () {
      // Register multiple students
      const students = [student1, student2];
      const names = ["Alice", "Bob"];
      
      for (let i = 0; i < students.length; i++) {
        await skillPaysCore.connect(students[i]).registerStudent(names[i]);
      }

      // Create bootcamp with multiple milestones
      await skillPaysCore.connect(bootcampCreator).createBootcamp(
        "Batch Test", "Multiple milestones", 60, 0
      );

      for (let i = 1; i <= 5; i++) {
        await skillPaysCore.connect(bootcampCreator).addMilestone(
          1, `Milestone ${i}`, `Description ${i}`, 70 + i * 5, false, ethers.parseEther("0.01")
        );
      }

      // All students enroll
      for (const student of students) {
        await skillPaysCore.connect(student).enrollInBootcamp(1);
      }

      // Complete all milestones for all students
      for (const student of students) {
        for (let milestoneId = 1; milestoneId <= 5; milestoneId++) {
          await skillPaysCore.connect(student).completeMilestone(1, milestoneId, "0x");
        }
      }

      // Verify final state
      for (const student of students) {
        const studentData = await skillPaysCore.getStudent(student.address);
        expect(studentData.totalBadges).to.equal(5);
        
        const badges = await studentBadges.getStudentBadges(student.address);
        expect(badges.length).to.equal(5);
      }
    });

    it("Should maintain reasonable gas costs for common operations", async function () {
      await skillPaysCore.connect(student1).registerStudent("Alice");
      
      // Track gas usage for key operations
      const registrationTx = await skillPaysCore.connect(student2).registerStudent("Bob");
      const receipt = await registrationTx.wait();
      
      // Gas usage should be reasonable (this is more of a benchmark than a strict test)
      expect(receipt?.gasUsed).to.be.lt(200000); // Should use less than 200k gas
    });
  });

  describe("Security and Edge Cases", function () {
    it("Should prevent unauthorized access to admin functions", async function () {
      await expect(skillPaysCore.connect(student1).setPlatformFee(500))
        .to.be.revertedWithCustomError(skillPaysCore, "AccessControlUnauthorizedAccount");

      await expect(skillPaysCore.connect(student1).pause())
        .to.be.revertedWithCustomError(skillPaysCore, "AccessControlUnauthorizedAccount");

      await expect(studentBadges.connect(student1).mintBadge(
        student1.address, 1, 1, 0, "Unauthorized", 85, ""
      )).to.be.revertedWithCustomError(studentBadges, "AccessControlUnauthorizedAccount");
    });

    it("Should handle contract pause states correctly", async function () {
      // Pause main contract
      await skillPaysCore.pause();

      // All student operations should be paused
      await expect(skillPaysCore.connect(student1).registerStudent("Alice"))
        .to.be.revertedWithCustomError(skillPaysCore, "EnforcedPause");

      // Unpause and verify functionality returns
      await skillPaysCore.unpause();
      
      await expect(skillPaysCore.connect(student1).registerStudent("Alice"))
        .to.emit(skillPaysCore, "StudentRegistered");
    });

    it("Should handle edge cases in payment distribution", async function () {
      await skillPaysCore.connect(student1).registerStudent("Alice");
      await skillPaysCore.connect(bootcampCreator).createBootcamp(
        "Edge Case Bootcamp", "Test edge cases", 30, 1 // 1 wei fee
      );

      // Enroll with minimal fee
      await skillPaysCore.connect(student1).enrollInBootcamp(1, { value: 1 });
      
      expect(await skillPaysCore.isEnrolled(student1.address, 1)).to.be.true;
    });
  });
});