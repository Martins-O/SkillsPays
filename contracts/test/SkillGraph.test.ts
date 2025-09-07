import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { SkillGraph } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("SkillGraph", function () {
  let owner: SignerWithAddress;
  let student1: SignerWithAddress;
  let student2: SignerWithAddress;
  let updater: SignerWithAddress;
  let skillGraph: SkillGraph;

  async function deploySkillGraphFixture() {
    const [owner, student1, student2, updater] = await ethers.getSigners();

    const SkillGraphFactory = await ethers.getContractFactory("SkillGraph");
    const skillGraph = await SkillGraphFactory.deploy();

    // Grant skill updater role
    await skillGraph.grantRole(await skillGraph.SKILL_UPDATER_ROLE(), updater.address);

    return { skillGraph, owner, student1, student2, updater };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deploySkillGraphFixture);
    skillGraph = fixture.skillGraph;
    owner = fixture.owner;
    student1 = fixture.student1;
    student2 = fixture.student2;
    updater = fixture.updater;
  });

  describe("Deployment and Initialization", function () {
    it("Should initialize common skills", async function () {
      const jsSkillId = await skillGraph.skillNameToId("JavaScript");
      expect(jsSkillId).to.be.gt(0);
      
      const skillInfo = await skillGraph.getSkillInfo(jsSkillId);
      expect(skillInfo.name).to.equal("JavaScript");
      expect(skillInfo.category).to.equal("Programming");
      expect(skillInfo.isActive).to.be.true;
    });

    it("Should set up skill relationships", async function () {
      const jsSkillId = await skillGraph.skillNameToId("JavaScript");
      const reactSkillId = await skillGraph.skillNameToId("React");
      
      const reactPrereqs = await skillGraph.getSkillPrerequisites(reactSkillId);
      expect(reactPrereqs.length).to.be.gt(0);
    });

    it("Should grant roles correctly", async function () {
      const adminRole = await skillGraph.DEFAULT_ADMIN_ROLE();
      const updaterRole = await skillGraph.SKILL_UPDATER_ROLE();
      
      expect(await skillGraph.hasRole(adminRole, owner.address)).to.be.true;
      expect(await skillGraph.hasRole(updaterRole, updater.address)).to.be.true;
    });
  });

  describe("Skill Creation", function () {
    it("Should create new skills", async function () {
      await expect(skillGraph.connect(updater).createSkill(
        "TypeScript",
        "Programming",
        "Strongly typed JavaScript superset"
      ))
        .to.emit(skillGraph, "SkillCreated");

      const skillId = await skillGraph.skillNameToId("TypeScript");
      expect(skillId).to.be.gt(0);
      
      const skillInfo = await skillGraph.getSkillInfo(skillId);
      expect(skillInfo.name).to.equal("TypeScript");
      expect(skillInfo.category).to.equal("Programming");
    });

    it("Should not allow duplicate skill names", async function () {
      await expect(skillGraph.connect(updater).createSkill(
        "JavaScript",
        "Programming",
        "Duplicate skill"
      )).to.be.revertedWith("Skill already exists");
    });

    it("Should not allow empty skill names", async function () {
      await expect(skillGraph.connect(updater).createSkill(
        "",
        "Programming",
        "Empty name skill"
      )).to.be.revertedWith("Skill name cannot be empty");
    });

    it("Should not allow non-updater to create skills", async function () {
      await expect(skillGraph.connect(student1).createSkill(
        "Unauthorized Skill",
        "Category",
        "Description"
      )).to.be.revertedWith("AccessControl: account is missing role");
    });
  });

  describe("Skill Evidence and Progression", function () {
    let jsSkillId: bigint;

    beforeEach(async function () {
      jsSkillId = await skillGraph.skillNameToId("JavaScript");
    });

    it("Should add skill evidence and update levels", async function () {
      await expect(skillGraph.connect(updater).addSkillEvidence(
        student1.address,
        jsSkillId,
        "badge",
        "Completed JavaScript bootcamp",
        85
      ))
        .to.emit(skillGraph, "SkillEvidenceAdded")
        .and.to.emit(skillGraph, "SkillLevelUpdated");

      const skillLevel = await skillGraph.getStudentSkillLevel(student1.address, jsSkillId);
      expect(skillLevel).to.equal(1); // 85 points = level 1 (Beginner)
      
      const skillScore = await skillGraph.getStudentSkillScore(student1.address, jsSkillId);
      expect(skillScore).to.equal(85);
    });

    it("Should accumulate skill scores and level up", async function () {
      // Add multiple evidence entries
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "badge", "Basic JS", 85
      );
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "project", "JS Project", 95
      );
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "assessment", "Advanced JS", 120
      );

      const skillLevel = await skillGraph.getStudentSkillLevel(student1.address, jsSkillId);
      expect(skillLevel).to.equal(3); // 300 total points = level 3 (Advanced)
      
      const skillScore = await skillGraph.getStudentSkillScore(student1.address, jsSkillId);
      expect(skillScore).to.equal(300);
    });

    it("Should cap skill levels at expert (4)", async function () {
      // Add evidence that would exceed expert level
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "mastery", "Expert demonstration", 500
      );

      const skillLevel = await skillGraph.getStudentSkillLevel(student1.address, jsSkillId);
      expect(skillLevel).to.equal(4); // Capped at expert level
    });

    it("Should track learned skills", async function () {
      const soliditySkillId = await skillGraph.skillNameToId("Solidity Programming");
      
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "badge", "JS Badge", 100
      );
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, soliditySkillId, "project", "Smart Contract", 150
      );

      const learnedSkills = await skillGraph.getStudentLearnedSkills(student1.address);
      expect(learnedSkills.length).to.equal(2);
      expect(learnedSkills).to.include(jsSkillId);
      expect(learnedSkills).to.include(soliditySkillId);
    });

    it("Should update total skill points", async function () {
      const reactSkillId = await skillGraph.skillNameToId("React");
      
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "badge", "JS Badge", 100
      );
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, reactSkillId, "project", "React App", 150
      );

      const totalPoints = await skillGraph.getStudentTotalSkillPoints(student1.address);
      expect(totalPoints).to.equal(2); // Level 1 + Level 1 = 2 points
    });

    it("Should validate confidence score range", async function () {
      await expect(skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "invalid", "Invalid confidence", 150
      )).to.be.revertedWith("Confidence score must be <= 100");
    });

    it("Should not add evidence for inactive skills", async function () {
      // Create and deactivate a skill (requires admin function to test fully)
      const inactiveSkillId = 999n; // Non-existent skill ID
      
      await expect(skillGraph.connect(updater).addSkillEvidence(
        student1.address, inactiveSkillId, "badge", "Test", 85
      )).to.be.revertedWith("Skill not active");
    });
  });

  describe("Skill Relationships", function () {
    let jsSkillId: bigint;
    let reactSkillId: bigint;
    let nodeSkillId: bigint;

    beforeEach(async function () {
      jsSkillId = await skillGraph.skillNameToId("JavaScript");
      reactSkillId = await skillGraph.skillNameToId("React");
      
      // Create Node.js skill for testing
      await skillGraph.connect(updater).createSkill(
        "Node.js Advanced",
        "Backend",
        "Advanced Node.js development"
      );
      nodeSkillId = await skillGraph.skillNameToId("Node.js Advanced");
    });

    it("Should add skill relationships", async function () {
      await expect(skillGraph.connect(updater).addSkillRelationship(
        jsSkillId, nodeSkillId, 90
      ))
        .to.emit(skillGraph, "SkillRelationshipAdded")
        .withArgs(jsSkillId, nodeSkillId);

      const prerequisites = await skillGraph.getSkillPrerequisites(nodeSkillId);
      expect(prerequisites.length).to.be.gt(0);
      
      const dependents = await skillGraph.getSkillDependents(jsSkillId);
      expect(dependents.length).to.be.gt(0);
    });

    it("Should not allow self-relationships", async function () {
      await expect(skillGraph.connect(updater).addSkillRelationship(
        jsSkillId, jsSkillId, 80
      )).to.be.revertedWith("Cannot be prerequisite to itself");
    });

    it("Should validate strength weight", async function () {
      await expect(skillGraph.connect(updater).addSkillRelationship(
        jsSkillId, nodeSkillId, 150
      )).to.be.revertedWith("Strength weight must be <= 100");
    });

    it("Should generate skill path recommendations", async function () {
      // Add some skill evidence for prerequisites
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "badge", "JS Basics", 100
      );

      const recommendations = await skillGraph.calculateSkillPathRecommendation(
        student1.address, reactSkillId
      );
      
      expect(recommendations.recommendedSkills.length).to.be.gt(0);
      expect(recommendations.currentLevels.length).to.equal(recommendations.recommendedSkills.length);
    });
  });

  describe("Skill Profile Generation", function () {
    beforeEach(async function () {
      const jsSkillId = await skillGraph.skillNameToId("JavaScript");
      const reactSkillId = await skillGraph.skillNameToId("React");
      const soliditySkillId = await skillGraph.skillNameToId("Solidity Programming");

      // Build diverse skill profile
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "badge", "JS Foundation", 120
      );
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, reactSkillId, "project", "React App", 200
      );
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, soliditySkillId, "assessment", "Smart Contract", 350
      );
    });

    it("Should generate comprehensive skill profile", async function () {
      const profile = await skillGraph.generateSkillProfile(student1.address);
      
      expect(profile.skillIds.length).to.equal(3);
      expect(profile.skillLevels.length).to.equal(3);
      expect(profile.skillScores.length).to.equal(3);
      expect(profile.totalSkillPoints).to.be.gt(0);
      
      // Check skill levels are correctly calculated
      expect(profile.skillLevels[0]).to.equal(1); // JS: 120 points = level 1
      expect(profile.skillLevels[1]).to.equal(2); // React: 200 points = level 2  
      expect(profile.skillLevels[2]).to.equal(3); // Solidity: 350 points = level 3
    });

    it("Should handle empty profiles", async function () {
      const profile = await skillGraph.generateSkillProfile(student2.address);
      
      expect(profile.skillIds.length).to.equal(0);
      expect(profile.skillLevels.length).to.equal(0);
      expect(profile.skillScores.length).to.equal(0);
      expect(profile.totalSkillPoints).to.equal(0);
      expect(profile.profileLastUpdated).to.equal(0);
    });

    it("Should track profile update timestamps", async function () {
      const jsSkillId = await skillGraph.skillNameToId("JavaScript");
      
      await skillGraph.connect(updater).addSkillEvidence(
        student2.address, jsSkillId, "badge", "Recent evidence", 100
      );
      
      const profile = await skillGraph.generateSkillProfile(student2.address);
      expect(profile.profileLastUpdated).to.be.gt(0);
    });
  });

  describe("Skill Evidence Retrieval", function () {
    let jsSkillId: bigint;

    beforeEach(async function () {
      jsSkillId = await skillGraph.skillNameToId("JavaScript");
      
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "badge", "JS Badge", 85
      );
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "project", "JS Project", 95
      );
    });

    it("Should retrieve skill evidences", async function () {
      const evidences = await skillGraph.getSkillEvidences(student1.address, jsSkillId);
      
      expect(evidences.length).to.equal(2);
      expect(evidences[0].evidenceType).to.equal("badge");
      expect(evidences[0].confidenceScore).to.equal(85);
      expect(evidences[1].evidenceType).to.equal("project");
      expect(evidences[1].confidenceScore).to.equal(95);
    });

    it("Should verify skill evidence details", async function () {
      const evidences = await skillGraph.getSkillEvidences(student1.address, jsSkillId);
      const firstEvidence = evidences[0];
      
      expect(firstEvidence.skillId).to.equal(jsSkillId);
      expect(firstEvidence.student).to.equal(student1.address);
      expect(firstEvidence.evidenceData).to.equal("JS Badge");
      expect(firstEvidence.isVerified).to.be.true;
      expect(firstEvidence.timestamp).to.be.gt(0);
    });
  });

  describe("Skill Verification", function () {
    let jsSkillId: bigint;

    beforeEach(async function () {
      jsSkillId = await skillGraph.skillNameToId("JavaScript");
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "badge", "JS Badge", 85
      );
    });

    it("Should verify student skills", async function () {
      await expect(skillGraph.connect(updater).verifyStudentSkill(
        student1.address, jsSkillId
      ))
        .to.emit(skillGraph, "SkillVerified")
        .withArgs(student1.address, jsSkillId, updater.address);
    });

    it("Should not verify skills without evidence", async function () {
      const reactSkillId = await skillGraph.skillNameToId("React");
      
      await expect(skillGraph.connect(updater).verifyStudentSkill(
        student1.address, reactSkillId
      )).to.be.revertedWith("Student has no evidence for this skill");
    });

    it("Should not verify inactive skills", async function () {
      const inactiveSkillId = 999n;
      
      await expect(skillGraph.connect(updater).verifyStudentSkill(
        student1.address, inactiveSkillId
      )).to.be.revertedWith("Skill not active");
    });
  });

  describe("Skill Information Retrieval", function () {
    it("Should get skill by name", async function () {
      const [skillId, skillInfo] = await skillGraph.getSkillByName("JavaScript");
      
      expect(skillId).to.be.gt(0);
      expect(skillInfo.name).to.equal("JavaScript");
      expect(skillInfo.category).to.equal("Programming");
    });

    it("Should return zero for non-existent skills", async function () {
      const [skillId, skillInfo] = await skillGraph.getSkillByName("NonExistentSkill");
      
      expect(skillId).to.equal(0);
      expect(skillInfo.name).to.equal("");
    });

    it("Should get skill info by ID", async function () {
      const jsSkillId = await skillGraph.skillNameToId("JavaScript");
      const skillInfo = await skillGraph.getSkillInfo(jsSkillId);
      
      expect(skillInfo.name).to.equal("JavaScript");
      expect(skillInfo.isActive).to.be.true;
      expect(skillInfo.totalVerifications).to.be.gte(0);
    });
  });

  describe("Access Control and Security", function () {
    it("Should restrict skill creation to updaters", async function () {
      await expect(skillGraph.connect(student1).createSkill(
        "Unauthorized Skill", "Category", "Description"
      )).to.be.revertedWith("AccessControl: account is missing role");
    });

    it("Should restrict evidence addition to updaters", async function () {
      const jsSkillId = await skillGraph.skillNameToId("JavaScript");
      
      await expect(skillGraph.connect(student1).addSkillEvidence(
        student1.address, jsSkillId, "badge", "Unauthorized", 85
      )).to.be.revertedWith("AccessControl: account is missing role");
    });

    it("Should allow admin to grant updater role", async function () {
      await skillGraph.grantRole(await skillGraph.SKILL_UPDATER_ROLE(), student1.address);
      
      const hasRole = await skillGraph.hasRole(
        await skillGraph.SKILL_UPDATER_ROLE(), 
        student1.address
      );
      expect(hasRole).to.be.true;
    });

    it("Should support pause functionality", async function () {
      await skillGraph.pause();
      
      await expect(skillGraph.connect(updater).createSkill(
        "Paused Skill", "Category", "Description"
      )).to.be.revertedWith("Pausable: paused");
      
      await skillGraph.unpause();
      
      await expect(skillGraph.connect(updater).createSkill(
        "Unpaused Skill", "Category", "Description"
      )).to.emit(skillGraph, "SkillCreated");
    });
  });

  describe("Edge Cases and Gas Optimization", function () {
    it("Should handle multiple students with overlapping skills", async function () {
      const jsSkillId = await skillGraph.skillNameToId("JavaScript");
      
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "badge", "Student1 JS", 100
      );
      await skillGraph.connect(updater).addSkillEvidence(
        student2.address, jsSkillId, "badge", "Student2 JS", 150
      );
      
      expect(await skillGraph.getStudentSkillLevel(student1.address, jsSkillId)).to.equal(1);
      expect(await skillGraph.getStudentSkillLevel(student2.address, jsSkillId)).to.equal(1);
      expect(await skillGraph.getStudentSkillScore(student1.address, jsSkillId)).to.equal(100);
      expect(await skillGraph.getStudentSkillScore(student2.address, jsSkillId)).to.equal(150);
    });

    it("Should handle very long skill names and descriptions", async function () {
      const longName = "A".repeat(100);
      const longDescription = "B".repeat(500);
      
      await expect(skillGraph.connect(updater).createSkill(
        longName, "Category", longDescription
      )).to.emit(skillGraph, "SkillCreated");
    });

    it("Should maintain skill verification counts", async function () {
      const jsSkillId = await skillGraph.skillNameToId("JavaScript");
      const initialInfo = await skillGraph.getSkillInfo(jsSkillId);
      const initialVerifications = initialInfo.totalVerifications;
      
      await skillGraph.connect(updater).addSkillEvidence(
        student1.address, jsSkillId, "badge", "JS Badge", 85
      );
      
      const updatedInfo = await skillGraph.getSkillInfo(jsSkillId);
      expect(updatedInfo.totalVerifications).to.equal(initialVerifications + 1n);
    });
  });
});