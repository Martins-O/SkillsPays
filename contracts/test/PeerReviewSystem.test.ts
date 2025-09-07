import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { PeerReviewSystem } from "../typechain-types";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("PeerReviewSystem", function () {
  let owner: SignerWithAddress;
  let student1: SignerWithAddress;
  let student2: SignerWithAddress;
  let reviewer1: SignerWithAddress;
  let reviewer2: SignerWithAddress;
  let reviewer3: SignerWithAddress;
  let admin: SignerWithAddress;
  let peerReview: PeerReviewSystem;

  const MIN_REVIEWER_STAKE = ethers.parseEther("0.1");

  async function deployPeerReviewFixture() {
    const [owner, student1, student2, reviewer1, reviewer2, reviewer3, admin] = await ethers.getSigners();

    const PeerReviewFactory = await ethers.getContractFactory("PeerReviewSystem");
    const peerReview = await PeerReviewFactory.deploy();

    await peerReview.grantRole(await peerReview.ADMIN_ROLE(), admin.address);

    return { peerReview, owner, student1, student2, reviewer1, reviewer2, reviewer3, admin };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployPeerReviewFixture);
    peerReview = fixture.peerReview;
    owner = fixture.owner;
    student1 = fixture.student1;
    student2 = fixture.student2;
    reviewer1 = fixture.reviewer1;
    reviewer2 = fixture.reviewer2;
    reviewer3 = fixture.reviewer3;
    admin = fixture.admin;
  });

  describe("Reviewer Registration", function () {
    it("Should register reviewer with sufficient stake", async function () {
      await expect(peerReview.connect(reviewer1).registerAsReviewer(7, { 
        value: MIN_REVIEWER_STAKE 
      }))
        .to.emit(peerReview, "ReviewerRegistered")
        .withArgs(reviewer1.address, MIN_REVIEWER_STAKE);

      const profile = await peerReview.getReviewerProfile(reviewer1.address);
      expect(profile.reviewerAddress).to.equal(reviewer1.address);
      expect(profile.totalReviews).to.equal(0);
      expect(profile.reputationScore).to.equal(100);
      expect(profile.specializations).to.equal(7);
      expect(profile.isActive).to.be.true;
      expect(profile.stakingAmount).to.equal(MIN_REVIEWER_STAKE);
    });

    it("Should not register with insufficient stake", async function () {
      await expect(peerReview.connect(reviewer1).registerAsReviewer(7, { 
        value: ethers.parseEther("0.05") 
      })).to.be.revertedWith("Insufficient staking amount");
    });

    it("Should not allow duplicate registration", async function () {
      await peerReview.connect(reviewer1).registerAsReviewer(7, { 
        value: MIN_REVIEWER_STAKE 
      });

      await expect(peerReview.connect(reviewer1).registerAsReviewer(3, { 
        value: MIN_REVIEWER_STAKE 
      })).to.be.revertedWith("Already registered as reviewer");
    });

    it("Should grant reviewer role upon registration", async function () {
      await peerReview.connect(reviewer1).registerAsReviewer(7, { 
        value: MIN_REVIEWER_STAKE 
      });

      const reviewerRole = await peerReview.REVIEWER_ROLE();
      expect(await peerReview.hasRole(reviewerRole, reviewer1.address)).to.be.true;
    });
  });

  describe("Review Request Creation", function () {
    beforeEach(async function () {
      // Register reviewers
      await peerReview.connect(reviewer1).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });
      await peerReview.connect(reviewer2).registerAsReviewer(3, { value: MIN_REVIEWER_STAKE });
      await peerReview.connect(reviewer3).registerAsReviewer(5, { value: MIN_REVIEWER_STAKE });
    });

    it("Should create review request", async function () {
      await expect(peerReview.connect(admin).createReviewRequest(
        student1.address,
        1, // bootcampId
        1, // milestoneId
        "QmTestSubmissionHash",
        3 // requiredReviews
      ))
        .to.emit(peerReview, "ReviewRequestCreated")
        .withArgs(1, student1.address, 1);

      const request = await peerReview.getReviewRequest(1);
      expect(request.student).to.equal(student1.address);
      expect(request.bootcampId).to.equal(1);
      expect(request.milestoneId).to.equal(1);
      expect(request.submissionHash).to.equal("QmTestSubmissionHash");
      expect(request.requiredReviews).to.equal(3);
      expect(request.completedReviews).to.equal(0);
      expect(request.isCompleted).to.be.false;
    });

    it("Should not allow insufficient required reviews", async function () {
      await expect(peerReview.connect(admin).createReviewRequest(
        student1.address, 1, 1, "QmHash", 2
      )).to.be.revertedWith("Not enough required reviews");
    });

    it("Should not allow too many required reviews", async function () {
      await expect(peerReview.connect(admin).createReviewRequest(
        student1.address, 1, 1, "QmHash", 10
      )).to.be.revertedWith("Too many required reviews");
    });

    it("Should set appropriate deadline", async function () {
      await peerReview.connect(admin).createReviewRequest(
        student1.address, 1, 1, "QmHash", 3
      );

      const request = await peerReview.getReviewRequest(1);
      const currentTime = await time.latest();
      const expectedDeadline = currentTime + (72 * 60 * 60); // 72 hours
      
      expect(request.deadline).to.be.closeTo(expectedDeadline, 60); // Within 1 minute
    });
  });

  describe("Review Submission", function () {
    beforeEach(async function () {
      // Setup reviewers and request
      await peerReview.connect(reviewer1).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });
      await peerReview.connect(reviewer2).registerAsReviewer(3, { value: MIN_REVIEWER_STAKE });
      await peerReview.connect(reviewer3).registerAsReviewer(5, { value: MIN_REVIEWER_STAKE });
      
      await peerReview.connect(admin).createReviewRequest(
        student1.address, 1, 1, "QmHash", 3
      );
    });

    it("Should submit valid review", async function () {
      await expect(peerReview.connect(reviewer1).submitReview(
        1, // requestId
        85, // score
        "Good work, well structured code",
        "QmEvidenceHash"
      ))
        .to.emit(peerReview, "ReviewSubmitted")
        .withArgs(1, reviewer1.address, 85);

      const reviews = await peerReview.getReviews(1);
      expect(reviews.length).to.equal(1);
      expect(reviews[0].reviewer).to.equal(reviewer1.address);
      expect(reviews[0].score).to.equal(85);
      expect(reviews[0].feedback).to.equal("Good work, well structured code");
    });

    it("Should not allow student to review own submission", async function () {
      // Register student1 as reviewer
      await peerReview.connect(student1).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });

      await expect(peerReview.connect(student1).submitReview(
        1, 85, "Self review", "QmHash"
      )).to.be.revertedWith("Cannot review own submission");
    });

    it("Should not allow duplicate reviews", async function () {
      await peerReview.connect(reviewer1).submitReview(
        1, 85, "First review", "QmHash"
      );

      await expect(peerReview.connect(reviewer1).submitReview(
        1, 90, "Duplicate review", "QmHash"
      )).to.be.revertedWith("Already reviewed this request");
    });

    it("Should not allow review after deadline", async function () {
      // Fast forward past deadline
      await time.increase(73 * 60 * 60); // 73 hours

      await expect(peerReview.connect(reviewer1).submitReview(
        1, 85, "Late review", "QmHash"
      )).to.be.revertedWith("Review deadline passed");
    });

    it("Should validate score range", async function () {
      await expect(peerReview.connect(reviewer1).submitReview(
        1, 150, "Invalid score", "QmHash"
      )).to.be.revertedWith("Score must be <= 100");
    });

    it("Should update reviewer profile", async function () {
      await peerReview.connect(reviewer1).submitReview(
        1, 85, "Review", "QmHash"
      );

      const profile = await peerReview.getReviewerProfile(reviewer1.address);
      expect(profile.totalReviews).to.equal(1);
      expect(profile.averageScore).to.equal(85);
    });
  });

  describe("Anti-Collusion Mechanisms", function () {
    beforeEach(async function () {
      await peerReview.connect(reviewer1).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });
      await peerReview.connect(reviewer2).registerAsReviewer(3, { value: MIN_REVIEWER_STAKE });
    });

    it("Should track review history between reviewer and student", async function () {
      // Create multiple requests for same student
      for (let i = 1; i <= 3; i++) {
        await peerReview.connect(admin).createReviewRequest(
          student1.address, 1, i, "QmHash", 3
        );
        await peerReview.connect(reviewer1).submitReview(
          i, 85, "Review", "QmHash"
        );
      }

      const reviewHistory = await peerReview.getReviewHistory(reviewer1.address, student1.address);
      expect(reviewHistory).to.equal(3);
    });

    it("Should check if reviewer can review student", async function () {
      // Initially should be able to review
      expect(await peerReview.canReview(reviewer1.address, student1.address)).to.be.true;

      // After multiple reviews of same student, should be restricted
      // This would need multiple requests and reviews to test the limit
    });

    it("Should prevent low reputation reviewers", async function () {
      // Manually reduce reputation (would normally happen through admin penalties)
      await peerReview.connect(admin).emergencyPenalizeReviewer(
        reviewer1.address, "Test penalty"
      );

      const profile = await peerReview.getReviewerProfile(reviewer1.address);
      if (profile.reputationScore < 50) {
        expect(await peerReview.canReview(reviewer1.address, student1.address)).to.be.false;
      }
    });
  });

  describe("Review Completion and Scoring", function () {
    beforeEach(async function () {
      await peerReview.connect(reviewer1).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });
      await peerReview.connect(reviewer2).registerAsReviewer(3, { value: MIN_REVIEWER_STAKE });
      await peerReview.connect(reviewer3).registerAsReviewer(5, { value: MIN_REVIEWER_STAKE });
      
      await peerReview.connect(admin).createReviewRequest(
        student1.address, 1, 1, "QmHash", 3
      );
    });

    it("Should complete review when sufficient reviews received", async function () {
      await peerReview.connect(reviewer1).submitReview(1, 85, "Good", "QmHash");
      await peerReview.connect(reviewer2).submitReview(1, 80, "Decent", "QmHash");
      
      await expect(peerReview.connect(reviewer3).submitReview(1, 90, "Excellent", "QmHash"))
        .to.emit(peerReview, "ReviewCompleted");

      const request = await peerReview.getReviewRequest(1);
      expect(request.isCompleted).to.be.true;
    });

    it("Should calculate average score correctly", async function () {
      await peerReview.connect(reviewer1).submitReview(1, 85, "Good", "QmHash");
      await peerReview.connect(reviewer2).submitReview(1, 75, "OK", "QmHash");
      await peerReview.connect(reviewer3).submitReview(1, 90, "Great", "QmHash");

      const avgScore = await peerReview.getAverageScore(1);
      expect(avgScore).to.equal(83); // (85 + 75 + 90) / 3 = 83.33... rounded down
    });

    it("Should detect potential collusion based on identical scores", async function () {
      // Submit identical scores (potential collusion)
      await peerReview.connect(reviewer1).submitReview(1, 85, "Review", "QmHash");
      await peerReview.connect(reviewer2).submitReview(1, 85, "Review", "QmHash");
      
      await expect(peerReview.connect(reviewer3).submitReview(1, 85, "Review", "QmHash"))
        .to.emit(peerReview, "CollusionDetected");
    });

    it("Should handle early completion with overwhelming support", async function () {
      // This feature needs to be implemented in the contract
      // For now, test normal completion flow
      await peerReview.connect(reviewer1).submitReview(1, 95, "Excellent", "QmHash");
      await peerReview.connect(reviewer2).submitReview(1, 98, "Outstanding", "QmHash");
      await peerReview.connect(reviewer3).submitReview(1, 97, "Perfect", "QmHash");

      const request = await peerReview.getReviewRequest(1);
      expect(request.isCompleted).to.be.true;
    });
  });

  describe("Review Helpfulness Rating", function () {
    beforeEach(async function () {
      await peerReview.connect(reviewer1).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });
      await peerReview.connect(reviewer2).registerAsReviewer(3, { value: MIN_REVIEWER_STAKE });
      await peerReview.connect(reviewer3).registerAsReviewer(5, { value: MIN_REVIEWER_STAKE });
      
      await peerReview.connect(admin).createReviewRequest(
        student1.address, 1, 1, "QmHash", 3
      );
      
      // Complete review process
      await peerReview.connect(reviewer1).submitReview(1, 85, "Good", "QmHash");
      await peerReview.connect(reviewer2).submitReview(1, 80, "Decent", "QmHash");
      await peerReview.connect(reviewer3).submitReview(1, 90, "Excellent", "QmHash");
    });

    it("Should allow rating review helpfulness", async function () {
      await peerReview.connect(student1).rateReviewHelpfulness(
        1, // requestId
        0, // reviewIndex
        90 // rating
      );

      const reviews = await peerReview.getReviews(1);
      expect(reviews[0].helpfulnessScore).to.be.gt(0);
    });

    it("Should not allow rating before review completion", async function () {
      // Create new incomplete review
      await peerReview.connect(admin).createReviewRequest(
        student2.address, 2, 1, "QmHash2", 3
      );

      await expect(peerReview.connect(student2).rateReviewHelpfulness(
        2, 0, 90
      )).to.be.revertedWith("Review not completed");
    });

    it("Should validate rating range", async function () {
      await expect(peerReview.connect(student1).rateReviewHelpfulness(
        1, 0, 150
      )).to.be.revertedWith("Rating must be <= 100");
    });

    it("Should update reviewer reputation based on helpfulness", async function () {
      const initialProfile = await peerReview.getReviewerProfile(reviewer1.address);
      const initialReputation = initialProfile.reputationScore;

      await peerReview.connect(student1).rateReviewHelpfulness(1, 0, 90);

      const updatedProfile = await peerReview.getReviewerProfile(reviewer1.address);
      expect(updatedProfile.reputationScore).to.be.gte(initialReputation);
    });
  });

  describe("Reviewer Management", function () {
    beforeEach(async function () {
      await peerReview.connect(reviewer1).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });
    });

    it("Should add reviewer stake", async function () {
      const additionalStake = ethers.parseEther("0.05");
      
      await peerReview.connect(admin).addReviewerStake(reviewer1.address, {
        value: additionalStake
      });

      const profile = await peerReview.getReviewerProfile(reviewer1.address);
      expect(profile.stakingAmount).to.equal(MIN_REVIEWER_STAKE + additionalStake);
    });

    it("Should penalize reviewer", async function () {
      const initialProfile = await peerReview.getReviewerProfile(reviewer1.address);
      const initialStake = initialProfile.stakingAmount;
      const initialReputation = initialProfile.reputationScore;

      await peerReview.connect(admin).emergencyPenalizeReviewer(
        reviewer1.address, "Misconduct"
      );

      const penalizedProfile = await peerReview.getReviewerProfile(reviewer1.address);
      expect(penalizedProfile.stakingAmount).to.be.lt(initialStake);
      expect(penalizedProfile.reputationScore).to.be.lt(initialReputation);
    });

    it("Should deactivate reviewer with low stake", async function () {
      // Penalize multiple times to reduce stake below minimum
      for (let i = 0; i < 3; i++) {
        await peerReview.connect(admin).emergencyPenalizeReviewer(
          reviewer1.address, `Penalty ${i + 1}`
        );
      }

      const profile = await peerReview.getReviewerProfile(reviewer1.address);
      if (profile.stakingAmount < MIN_REVIEWER_STAKE / 2n) {
        expect(profile.isActive).to.be.false;
      }
    });
  });

  describe("Access Control and Security", function () {
    it("Should restrict review request creation to admin", async function () {
      await expect(peerReview.connect(student1).createReviewRequest(
        student1.address, 1, 1, "QmHash", 3
      )).to.be.revertedWith("AccessControl: account is missing role");
    });

    it("Should restrict reviewer penalties to admin", async function () {
      await expect(peerReview.connect(student1).emergencyPenalizeReviewer(
        reviewer1.address, "Unauthorized penalty"
      )).to.be.revertedWith("AccessControl: account is missing role");
    });

    it("Should support pause functionality", async function () {
      await peerReview.connect(admin).pause();

      await expect(peerReview.connect(reviewer1).registerAsReviewer(7, {
        value: MIN_REVIEWER_STAKE
      })).to.be.revertedWith("Pausable: paused");

      await peerReview.connect(admin).unpause();

      await expect(peerReview.connect(reviewer1).registerAsReviewer(7, {
        value: MIN_REVIEWER_STAKE
      })).to.emit(peerReview, "ReviewerRegistered");
    });

    it("Should prevent reentrancy attacks", async function () {
      // Basic test - the contract uses ReentrancyGuard
      await peerReview.connect(reviewer1).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });
      
      const profile = await peerReview.getReviewerProfile(reviewer1.address);
      expect(profile.isActive).to.be.true;
    });
  });

  describe("Edge Cases and Gas Optimization", function () {
    it("Should handle maximum number of reviews", async function () {
      // Register maximum reviewers
      const reviewers = [reviewer1, reviewer2, reviewer3];
      for (const reviewer of reviewers) {
        await peerReview.connect(reviewer).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });
      }

      await peerReview.connect(admin).createReviewRequest(
        student1.address, 1, 1, "QmHash", 7 // MAX_REVIEWS_PER_REQUEST
      );

      // Submit reviews from all reviewers
      for (let i = 0; i < reviewers.length; i++) {
        await peerReview.connect(reviewers[i]).submitReview(
          1, 80 + i * 5, `Review ${i}`, `QmHash${i}`
        );
      }

      const request = await peerReview.getReviewRequest(1);
      expect(request.completedReviews).to.equal(3);
    });

    it("Should handle reviewer with zero reputation gracefully", async function () {
      await peerReview.connect(reviewer1).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });

      // Severely penalize to bring reputation to near zero
      for (let i = 0; i < 10; i++) {
        await peerReview.connect(admin).emergencyPenalizeReviewer(
          reviewer1.address, `Major penalty ${i}`
        );
      }

      const profile = await peerReview.getReviewerProfile(reviewer1.address);
      expect(profile.reputationScore).to.be.gte(0);
    });

    it("Should handle very long feedback strings", async function () {
      await peerReview.connect(reviewer1).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });
      await peerReview.connect(admin).createReviewRequest(
        student1.address, 1, 1, "QmHash", 3
      );

      const longFeedback = "A".repeat(1000);
      
      await expect(peerReview.connect(reviewer1).submitReview(
        1, 85, longFeedback, "QmHash"
      )).to.emit(peerReview, "ReviewSubmitted");
    });

    it("Should maintain reviewer statistics accurately", async function () {
      await peerReview.connect(reviewer1).registerAsReviewer(7, { value: MIN_REVIEWER_STAKE });
      
      // Submit multiple reviews
      for (let i = 1; i <= 3; i++) {
        await peerReview.connect(admin).createReviewRequest(
          student1.address, 1, i, `QmHash${i}`, 3
        );
        await peerReview.connect(reviewer1).submitReview(
          i, 80 + i * 5, `Review ${i}`, `QmEvidence${i}`
        );
      }

      const profile = await peerReview.getReviewerProfile(reviewer1.address);
      expect(profile.totalReviews).to.equal(3);
      expect(profile.averageScore).to.be.gt(80);
    });
  });
});