import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { SkillPaysCore, StudentBadges } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Debug Badge Minting", function () {
  let owner: SignerWithAddress;
  let student1: SignerWithAddress;
  let creator: SignerWithAddress;
  let treasury: SignerWithAddress;
  let skillPaysCore: SkillPaysCore;
  let studentBadges: StudentBadges;

  async function deployDebugFixture() {
    const [owner, student1, creator, treasury] = await ethers.getSigners();

    const mockPriceFeed = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
    const initialPlatformFee = 250;

    const SkillPaysCoreFactory = await ethers.getContractFactory("SkillPaysCore");
    const skillPaysCore = await SkillPaysCoreFactory.deploy(treasury.address, initialPlatformFee, mockPriceFeed);

    const StudentBadgesFactory = await ethers.getContractFactory("StudentBadges");
    const studentBadges = await StudentBadgesFactory.deploy(
      "SkillPays Badges",
      "SPB", 
      "https://api.skillpays.com/badges/"
    );

    // Set up connections
    await skillPaysCore.setContract("badge", studentBadges.target);
    await studentBadges.grantRole(await studentBadges.MINTER_ROLE(), skillPaysCore.target);
    await skillPaysCore.grantBootcampCreatorRole(creator.address);

    return { skillPaysCore, studentBadges, owner, student1, creator, treasury };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployDebugFixture);
    skillPaysCore = fixture.skillPaysCore;
    studentBadges = fixture.studentBadges;
    owner = fixture.owner;
    student1 = fixture.student1;
    creator = fixture.creator;
    treasury = fixture.treasury;
  });

  it("Should mint badge when milestone is completed", async function () {
    // Register student
    await skillPaysCore.connect(student1).registerStudent("Alice");

    // Create bootcamp
    await skillPaysCore.connect(creator).createBootcamp(
      "Test Bootcamp", 
      "Learn testing", 
      30, 
      ethers.parseEther("0.1")
    );

    // Add milestone
    await skillPaysCore.connect(creator).addMilestone(
      1,
      "Test Milestone",
      "Complete test",
      75,
      false,
      ethers.parseEther("0.05")
    );

    // Enroll student
    await skillPaysCore.connect(student1).enrollInBootcamp(1, {
      value: ethers.parseEther("0.1")
    });

    // Check initial badge count
    const initialBadges = await studentBadges.getStudentBadges(student1.address);
    console.log("Initial badges:", initialBadges.length);

    // Check badge contract address is set
    const badgeContractAddress = await skillPaysCore.badgeContract();
    console.log("Badge contract address:", badgeContractAddress);
    console.log("StudentBadges address:", studentBadges.target);
    console.log("Addresses match:", badgeContractAddress === studentBadges.target);

    // Check if core has MINTER_ROLE on badges
    const minterRole = await studentBadges.MINTER_ROLE();
    const hasMinterRole = await studentBadges.hasRole(minterRole, skillPaysCore.target);
    console.log("Core has MINTER_ROLE:", hasMinterRole);

    // Complete milestone
    const tx = await skillPaysCore.connect(student1).completeMilestone(1, 1, "0x");
    const receipt = await tx.wait();
    console.log("Gas used:", receipt?.gasUsed.toString());

    // Check if milestone was completed
    const isCompleted = await skillPaysCore.isMilestoneCompleted(student1.address, 1, 1);
    console.log("Milestone completed:", isCompleted);

    // Check student data
    const studentData = await skillPaysCore.getStudent(student1.address);
    console.log("Student total badges:", studentData.totalBadges.toString());

    // Check actual badges minted
    const finalBadges = await studentBadges.getStudentBadges(student1.address);
    console.log("Final badges:", finalBadges.length);

    expect(finalBadges.length).to.equal(1);
  });
});