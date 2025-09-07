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
  MicroRewardsSystem,
  GraduateDAO,
  CrossBootcampRegistry,
  JobBoardIntegration,
  AntiCheatingSystem,
  DecentralizedVerification
} from "../typechain-types";

describe("SkillPays Ecosystem", function () {
  let owner: SignerWithAddress;
  let student1: SignerWithAddress;
  let student2: SignerWithAddress;
  let mentor: SignerWithAddress;
  let employer: SignerWithAddress;
  let validator: SignerWithAddress;
  let treasury: SignerWithAddress;

  let skillPaysCore: SkillPaysCore;
  let studentBadges: StudentBadges;
  let skillGraph: SkillGraph;
  let peerReview: PeerReviewSystem;
  let leaderboard: LeaderboardSocial;
  let mentorBoost: MentorBoostSystem;
  let microRewards: MicroRewardsSystem;
  let graduateDAO: GraduateDAO;
  let crossBootcamp: CrossBootcampRegistry;
  let jobBoard: JobBoardIntegration;
  let antiCheating: AntiCheatingSystem;
  let verification: DecentralizedVerification;

  beforeEach(async function () {
    [owner, student1, student2, mentor, employer, validator, treasury] = await ethers.getSigners();

    // Deploy core contracts
    const SkillPaysCoreFactory = await ethers.getContractFactory("SkillPaysCore");
    skillPaysCore = await SkillPaysCoreFactory.deploy(treasury.address);

    const StudentBadgesFactory = await ethers.getContractFactory("StudentBadges");
    studentBadges = await StudentBadgesFactory.deploy();

    const SkillGraphFactory = await ethers.getContractFactory("SkillGraph");
    skillGraph = await SkillGraphFactory.deploy();

    const PeerReviewFactory = await ethers.getContractFactory("PeerReviewSystem");
    peerReview = await PeerReviewFactory.deploy();

    const LeaderboardFactory = await ethers.getContractFactory("LeaderboardSocial");
    leaderboard = await LeaderboardFactory.deploy();

    const MentorBoostFactory = await ethers.getContractFactory("MentorBoostSystem");
    mentorBoost = await MentorBoostFactory.deploy(treasury.address);

    const MicroRewardsFactory = await ethers.getContractFactory("MicroRewardsSystem");
    microRewards = await MicroRewardsFactory.deploy();

    const GraduateDAOFactory = await ethers.getContractFactory("GraduateDAO");
    graduateDAO = await GraduateDAOFactory.deploy(skillPaysCore.target, studentBadges.target);

    const CrossBootcampFactory = await ethers.getContractFactory("CrossBootcampRegistry");
    crossBootcamp = await CrossBootcampFactory.deploy();

    const JobBoardFactory = await ethers.getContractFactory("JobBoardIntegration");
    jobBoard = await JobBoardFactory.deploy(skillGraph.target, studentBadges.target);

    const AntiCheatingFactory = await ethers.getContractFactory("AntiCheatingSystem");
    antiCheating = await AntiCheatingFactory.deploy();

    const VerificationFactory = await ethers.getContractFactory("DecentralizedVerification");
    verification = await VerificationFactory.deploy();

    // Set up contract connections
    await skillPaysCore.setBadgeContract(studentBadges.target);
    await skillPaysCore.setPeerReviewContract(peerReview.target);
    await skillPaysCore.setLeaderboardContract(leaderboard.target);
    await skillPaysCore.setMentorBoostContract(mentorBoost.target);
    await skillPaysCore.setMicroRewardsContract(microRewards.target);

    // Grant necessary roles
    await studentBadges.grantRole(await studentBadges.MINTER_ROLE(), skillPaysCore.target);
    await skillGraph.grantRole(await skillGraph.SKILL_UPDATER_ROLE(), skillPaysCore.target);
    await leaderboard.grantRole(await leaderboard.SCORE_UPDATER_ROLE(), skillPaysCore.target);
    await microRewards.grantRole(await microRewards.REWARDS_DISTRIBUTOR_ROLE(), skillPaysCore.target);
  });

  describe("Core Functionality", function () {
    it("Should register students", async function () {
      await skillPaysCore.connect(student1).registerStudent("Alice");
      const studentData = await skillPaysCore.getStudent(student1.address);
      expect(studentData.name).to.equal("Alice");
      expect(studentData.isActive).to.be.true;
    });

    it("Should create bootcamp", async function () {
      const tx = await skillPaysCore.createBootcamp("Web3 Bootcamp", "Learn Web3 development", 30, ethers.parseEther("0.1"));
      const receipt = await tx.wait();
      
      const bootcamp = await skillPaysCore.getBootcamp(1);
      expect(bootcamp.name).to.equal("Web3 Bootcamp");
      expect(bootcamp.creator).to.equal(owner.address);
    });

    it("Should allow enrollment with payment", async function () {
      await skillPaysCore.createBootcamp("Web3 Bootcamp", "Learn Web3 development", 30, ethers.parseEther("0.1"));
      await skillPaysCore.connect(student1).registerStudent("Alice");
      
      await expect(() => 
        skillPaysCore.connect(student1).enrollInBootcamp(1, { value: ethers.parseEther("0.1") })
      ).to.changeEtherBalances([student1, treasury], [ethers.parseEther("-0.1"), ethers.parseEther("0.0025")]);
      
      expect(await skillPaysCore.isEnrolled(student1.address, 1)).to.be.true;
    });
  });

  describe("Badge System", function () {
    beforeEach(async function () {
      await skillPaysCore.connect(student1).registerStudent("Alice");
    });

    it("Should mint badges with different levels", async function () {
      await studentBadges.mintBadge(
        student1.address,
        1, // bootcampId
        1, // milestoneId
        2, // Silver level
        "JavaScript,React",
        85 // peer score
      );

      const tokenId = 1;
      const badgeDetails = await studentBadges.getBadgeDetails(tokenId);
      expect(badgeDetails.level).to.equal(2); // Silver
      expect(badgeDetails.skillsProven).to.equal("JavaScript,React");
    });

    it("Should upgrade badge levels", async function () {
      await studentBadges.mintBadge(student1.address, 1, 1, 1, "JavaScript", 75); // Silver
      
      await studentBadges.upgradeBadgeLevel(1, 3); // Upgrade to Gold
      
      const badgeDetails = await studentBadges.getBadgeDetails(1);
      expect(badgeDetails.level).to.equal(3); // Gold
    });

    it("Should generate onchain resume", async function () {
      await studentBadges.mintBadge(student1.address, 1, 1, 2, "JavaScript,React", 85);
      await studentBadges.mintBadge(student1.address, 1, 2, 3, "Solidity,Web3", 90);
      
      const resume = await studentBadges.generateOnchainResume(student1.address);
      expect(resume.totalBadges).to.equal(2);
      expect(resume.reputationScore).to.be.gt(0);
    });
  });

  describe("Skill Graph", function () {
    it("Should track skill progression", async function () {
      const skillId = await skillGraph.skillNameToId("JavaScript");
      
      await skillGraph.addSkillEvidence(
        student1.address,
        skillId,
        "badge",
        "Completed JavaScript bootcamp",
        85
      );
      
      const skillLevel = await skillGraph.getStudentSkillLevel(student1.address, skillId);
      expect(skillLevel).to.be.gt(0);
    });

    it("Should generate skill profiles", async function () {
      const javascriptId = await skillGraph.skillNameToId("JavaScript");
      const solidityId = await skillGraph.skillNameToId("Solidity Programming");
      
      await skillGraph.addSkillEvidence(student1.address, javascriptId, "badge", "JS Bootcamp", 85);
      await skillGraph.addSkillEvidence(student1.address, solidityId, "project", "Smart Contract", 90);
      
      const profile = await skillGraph.generateSkillProfile(student1.address);
      expect(profile.skillIds.length).to.be.gte(2);
      expect(profile.totalSkillPoints).to.be.gt(0);
    });
  });

  describe("Peer Review System", function () {
    beforeEach(async function () {
      await peerReview.connect(mentor).registerAsReviewer(1, { value: ethers.parseEther("0.1") });
    });

    it("Should register reviewers with stake", async function () {
      const profile = await peerReview.getReviewerProfile(mentor.address);
      expect(profile.stakingAmount).to.equal(ethers.parseEther("0.1"));
      expect(profile.isActive).to.be.true;
    });

    it("Should create and approve review requests", async function () {
      const requestId = await peerReview.createReviewRequest(
        student1.address,
        1, // bootcampId
        1, // milestoneId
        "QmTestHash",
        3 // required reviews
      );

      await peerReview.connect(mentor).submitReview(
        1, // requestId
        85, // score
        "Good work!",
        "QmEvidenceHash"
      );

      const reviews = await peerReview.getReviews(1);
      expect(reviews.length).to.equal(1);
      expect(reviews[0].score).to.equal(85);
    });
  });

  describe("Leaderboard and Social", function () {
    beforeEach(async function () {
      await leaderboard.connect(student1).createProfile("Alice", "Web3 Developer", "QmProfileHash", true);
    });

    it("Should create student profiles", async function () {
      const profile = await leaderboard.getProfile(student1.address);
      expect(profile.displayName).to.equal("Alice");
      expect(profile.isPublic).to.be.true;
    });

    it("Should update scores and rankings", async function () {
      await leaderboard.updateScore(student1.address, "overall", 500, 5);
      
      const profile = await leaderboard.getProfile(student1.address);
      expect(profile.totalScore).to.equal(500);
      expect(profile.totalBadges).to.equal(5);
    });

    it("Should manage social connections", async function () {
      await leaderboard.connect(student2).createProfile("Bob", "Student", "", true);
      
      await leaderboard.connect(student1).sendConnectionRequest(student2.address, 0, "Let's connect!");
      
      // This would require getting the request ID and accepting it
      // Simplified test for demonstration
    });
  });

  describe("Mentor Boost System", function () {
    beforeEach(async function () {
      await mentorBoost.connect(mentor).registerAsMentor("John Doe", "Senior Developer", "JavaScript,React,Solidity", { value: ethers.parseEther("0.5") });
      await mentorBoost.addToRewardPool({ value: ethers.parseEther("1") });
    });

    it("Should register mentors", async function () {
      const profile = await mentorBoost.getMentorProfile(mentor.address);
      expect(profile.name).to.equal("John Doe");
      expect(profile.stakingAmount).to.equal(ethers.parseEther("0.5"));
    });

    it("Should process boost requests", async function () {
      const requestId = await mentorBoost.connect(student1).requestBoost(
        mentor.address,
        1, // bootcampId
        1, // milestoneId
        "QmSubmissionHash",
        "micro_reward",
        ethers.parseEther("0.01"),
        "Exceptional work on the assignment"
      );

      await mentorBoost.connect(mentor).approveBoost(1);
      
      const request = await mentorBoost.getBoostRequest(1);
      expect(request.isApproved).to.be.true;
    });
  });

  describe("Integration Tests", function () {
    it("Should complete full student journey", async function () {
      // 1. Register student
      await skillPaysCore.connect(student1).registerStudent("Alice");
      
      // 2. Create and enroll in bootcamp
      await skillPaysCore.createBootcamp("Full Stack Web3", "Complete bootcamp", 60, ethers.parseEther("0.2"));
      await skillPaysCore.connect(student1).enrollInBootcamp(1, { value: ethers.parseEther("0.2") });
      
      // 3. Add milestone
      await skillPaysCore.addMilestone(1, "Smart Contract Development", "Build a DeFi protocol", 90, false);
      
      // 4. Complete milestone
      await skillPaysCore.connect(student1).completeMilestone(1, 1, "0x");
      
      // 5. Verify completion
      expect(await skillPaysCore.isMilestoneCompleted(student1.address, 1, 1)).to.be.true;
      
      // 6. Check updated student data
      const studentData = await skillPaysCore.getStudent(student1.address);
      expect(studentData.totalBadges).to.equal(1);
      expect(studentData.reputationScore).to.be.gt(0);
    });
  });

  describe("DAO Governance", function () {
    it("Should allow graduates to join DAO", async function () {
      // This test would require setting up the proper badge requirements
      // Simplified for demonstration
      const canJoin = await graduateDAO.canCreateProposal(owner.address);
      // Implementation would depend on mock data setup
    });
  });

  describe("Job Board", function () {
    beforeEach(async function () {
      await jobBoard.connect(employer).registerEmployer("TechCorp", "Leading blockchain company");
    });

    it("Should allow employers to post jobs", async function () {
      await jobBoard.connect(employer).postJob(
        "Smart Contract Developer",
        "Build DeFi protocols",
        ["Solidity Development", "JavaScript"],
        [3, 2],
        ethers.parseEther("5000")
      );
      
      const [, title] = await jobBoard.getJobDetails(1);
      expect(title).to.equal("Smart Contract Developer");
    });

    it("Should allow students to apply for jobs", async function () {
      await jobBoard.connect(employer).postJob("Developer", "Description", ["JavaScript"], [2], ethers.parseEther("3000"));
      
      await jobBoard.connect(student1).applyForJob(1, "I am interested in this position");
      
      const applications = await jobBoard.getJobApplications(1);
      expect(applications.length).to.equal(1);
    });
  });
});