// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SkillGraph
 * @author SkillPays Team
 * @notice A dynamic skill tracking system that maps student competencies and skill relationships
 * @dev This contract manages skill creation, evidence tracking, and competency progression
 */
contract SkillGraph is AccessControl, Pausable, ReentrancyGuard {
    /// @notice Role for entities that can update skills and evidence
    bytes32 public constant SKILL_UPDATER_ROLE = keccak256("SKILL_UPDATER_ROLE");
    
    /// @notice Maximum confidence score for skill evidence
    uint256 public constant MAX_CONFIDENCE_SCORE = 100;
    
    /// @notice Maximum strength weight for skill relationships
    uint256 public constant MAX_STRENGTH_WEIGHT = 100;
    
    /// @notice Number of skill levels (0-4: None, Beginner, Intermediate, Advanced, Expert)
    uint256 public constant MAX_SKILL_LEVEL = 4;
    
    /// @dev Custom errors for gas optimization
    error SkillGraph__SkillNameEmpty();
    error SkillGraph__SkillAlreadyExists();
    error SkillGraph__SkillNotActive();
    error SkillGraph__InvalidConfidenceScore();
    error SkillGraph__InvalidStrengthWeight();
    error SkillGraph__SelfPrerequisite();
    error SkillGraph__NoSkillEvidence();
    
    /**
     * @notice Represents a skill in the system
     * @param name The human-readable name of the skill
     * @param category The category this skill belongs to
     * @param description Detailed description of the skill
     * @param totalVerifications Total number of times this skill has been verified
     * @param isActive Whether this skill is currently active
     * @param createdAt Timestamp when this skill was created
     */
    struct Skill {
        string name;
        string category;
        string description;
        uint256 totalVerifications;
        bool isActive;
        uint256 createdAt;
    }
    
    /**
     * @notice Evidence supporting a student's skill competency
     * @param skillId The ID of the skill this evidence supports
     * @param student The address of the student this evidence belongs to
     * @param evidenceType Type of evidence (badge, project, peer_review, assessment)
     * @param evidenceData Additional data about the evidence
     * @param confidenceScore How confident we are in this evidence (0-100)
     * @param timestamp When this evidence was submitted
     * @param verifier Who verified this evidence
     * @param isVerified Whether this evidence has been verified
     */
    struct SkillEvidence {
        uint256 skillId;
        address student;
        string evidenceType;
        string evidenceData;
        uint256 confidenceScore;
        uint256 timestamp;
        address verifier;
        bool isVerified;
    }
    
    /**
     * @notice A student's complete skill profile
     * @param skillLevels Mapping from skill ID to level (0-4)
     * @param skillScores Mapping from skill ID to accumulated score
     * @param skillEvidences Mapping from skill ID to array of evidence
     * @param learnedSkills Array of skill IDs this student has learned
     * @param totalSkillPoints Total skill points across all skills
     * @param lastUpdated When this profile was last updated
     */
    struct StudentSkillProfile {
        mapping(uint256 => uint256) skillLevels;
        mapping(uint256 => uint256) skillScores;
        mapping(uint256 => SkillEvidence[]) skillEvidences;
        uint256[] learnedSkills;
        uint256 totalSkillPoints;
        uint256 lastUpdated;
    }
    
    /**
     * @notice Represents a prerequisite relationship between skills
     * @param prerequisiteSkillId The skill that is required first
     * @param dependentSkillId The skill that depends on the prerequisite
     * @param strengthWeight How strong this relationship is (0-100)
     * @param isActive Whether this relationship is currently active
     */
    struct SkillRelationship {
        uint256 prerequisiteSkillId;
        uint256 dependentSkillId;
        uint256 strengthWeight;
        bool isActive;
    }
    
    /// @notice Mapping from skill ID to skill data
    mapping(uint256 => Skill) public skills;
    
    /// @notice Mapping from student address to their skill profile
    mapping(address => StudentSkillProfile) private studentProfiles;
    
    /// @notice Mapping from skill ID to its prerequisites
    mapping(uint256 => SkillRelationship[]) public skillPrerequisites;
    
    /// @notice Mapping from skill ID to skills that depend on it
    mapping(uint256 => SkillRelationship[]) public skillDependents;
    
    /// @notice Mapping from skill name to skill ID for quick lookup
    mapping(string => uint256) public skillNameToId;
    
    /// @dev Counter for generating unique skill IDs
    uint256 private _skillIds;
    
    /// @dev Counter for generating unique evidence IDs
    uint256 private _evidenceIds;
    
    /// @notice Emitted when a new skill is created
    event SkillCreated(uint256 indexed skillId, string name, string category);
    
    /// @notice Emitted when skill evidence is added for a student
    event SkillEvidenceAdded(uint256 indexed evidenceId, address indexed student, uint256 indexed skillId);
    
    /// @notice Emitted when a student's skill level is updated
    event SkillLevelUpdated(address indexed student, uint256 indexed skillId, uint256 oldLevel, uint256 newLevel);
    
    /// @notice Emitted when a skill relationship is added
    event SkillRelationshipAdded(uint256 indexed prerequisiteId, uint256 indexed dependentId);
    
    /// @notice Emitted when a student's skill is verified
    event SkillVerified(address indexed student, uint256 indexed skillId, address verifier);
    
    /**
     * @notice Initializes the SkillGraph contract
     * @dev Sets up roles and creates initial common skills
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SKILL_UPDATER_ROLE, msg.sender);
        
        // Initialize common skills
        _initializeCommonSkills();
    }
    
    /**
     * @dev Initializes common skills used across the platform
     * @dev Called during contract deployment to set up base skills
     */
    function _initializeCommonSkills() private {
        // Web3 Development Skills
        createSkill("Solidity Programming", "Smart Contracts", "Ability to write secure smart contracts in Solidity");
        createSkill("Web3 Frontend", "Frontend", "Building decentralized applications frontend");
        createSkill("DeFi Protocols", "Finance", "Understanding and implementing DeFi mechanisms");
        createSkill("NFT Development", "Tokens", "Creating and managing NFT contracts and marketplaces");
        createSkill("Blockchain Security", "Security", "Identifying and preventing smart contract vulnerabilities");
        
        // Traditional Programming Skills
        createSkill("JavaScript", "Programming", "Proficiency in JavaScript programming");
        createSkill("Python", "Programming", "Python programming and scripting");
        createSkill("React", "Frontend", "Building user interfaces with React");
        createSkill("Node.js", "Backend", "Server-side JavaScript development");
        createSkill("Database Management", "Backend", "Managing and designing databases");
        
        // Add skill relationships
        addSkillRelationship(skillNameToId["JavaScript"], skillNameToId["Web3 Frontend"], 80);
        addSkillRelationship(skillNameToId["JavaScript"], skillNameToId["React"], 90);
        addSkillRelationship(skillNameToId["Solidity Programming"], skillNameToId["DeFi Protocols"], 85);
        addSkillRelationship(skillNameToId["Solidity Programming"], skillNameToId["NFT Development"], 75);
    }
    
    /**
     * @notice Creates a new skill in the system
     * @param name The name of the skill
     * @param category The category this skill belongs to
     * @param description A detailed description of the skill
     * @return skillId The ID of the newly created skill
     * @dev Only accounts with SKILL_UPDATER_ROLE can create skills
     */
    function createSkill(string memory name, string memory category, string memory description) 
        public onlyRole(SKILL_UPDATER_ROLE) returns (uint256) {
        if (bytes(name).length == 0) revert SkillGraph__SkillNameEmpty();
        if (skillNameToId[name] != 0) revert SkillGraph__SkillAlreadyExists();
        
        _skillIds++;
        uint256 skillId = _skillIds;
        
        skills[skillId] = Skill({
            name: name,
            category: category,
            description: description,
            totalVerifications: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        skillNameToId[name] = skillId;
        
        emit SkillCreated(skillId, name, category);
        return skillId;
    }
    
    /**
     * @notice Adds evidence for a student's skill competency
     * @param student The address of the student
     * @param skillId The ID of the skill the evidence supports
     * @param evidenceType The type of evidence (badge, project, peer_review, assessment)
     * @param evidenceData Additional data about the evidence
     * @param confidenceScore How confident we are in this evidence (0-100)
     * @return evidenceId The ID of the newly created evidence
     * @dev Only accounts with SKILL_UPDATER_ROLE can add evidence
     */
    function addSkillEvidence(
        address student,
        uint256 skillId,
        string memory evidenceType,
        string memory evidenceData,
        uint256 confidenceScore
    ) external onlyRole(SKILL_UPDATER_ROLE) whenNotPaused nonReentrant returns (uint256) {
        if (!skills[skillId].isActive) revert SkillGraph__SkillNotActive();
        if (confidenceScore > MAX_CONFIDENCE_SCORE) revert SkillGraph__InvalidConfidenceScore();
        
        _evidenceIds++;
        uint256 evidenceId = _evidenceIds;
        
        SkillEvidence memory evidence = SkillEvidence({
            skillId: skillId,
            student: student,
            evidenceType: evidenceType,
            evidenceData: evidenceData,
            confidenceScore: confidenceScore,
            timestamp: block.timestamp,
            verifier: msg.sender,
            isVerified: true
        });
        
        StudentSkillProfile storage profile = studentProfiles[student];
        profile.skillEvidences[skillId].push(evidence);
        
        // Update skill score and level
        _updateStudentSkillLevel(student, skillId, confidenceScore);
        
        emit SkillEvidenceAdded(evidenceId, student, skillId);
        return evidenceId;
    }
    
    /**
     * @dev Updates a student's skill level based on new evidence
     * @param student The address of the student
     * @param skillId The ID of the skill being updated
     * @param newScore The new score to add to the student's skill
     */
    function _updateStudentSkillLevel(address student, uint256 skillId, uint256 newScore) private {
        StudentSkillProfile storage profile = studentProfiles[student];
        
        // Add to existing score
        uint256 oldScore = profile.skillScores[skillId];
        uint256 totalScore = oldScore + newScore;
        profile.skillScores[skillId] = totalScore;
        
        // Calculate new level (0-4 scale)
        uint256 oldLevel = profile.skillLevels[skillId];
        uint256 newLevel = _calculateSkillLevel(totalScore);
        
        if (newLevel != oldLevel) {
            profile.skillLevels[skillId] = newLevel;
            
            // Add to learned skills if first time learning
            if (oldLevel == 0) {
                profile.learnedSkills.push(skillId);
            }
            
            // Update total skill points
            profile.totalSkillPoints = profile.totalSkillPoints - oldLevel + newLevel;
            profile.lastUpdated = block.timestamp;
            
            emit SkillLevelUpdated(student, skillId, oldLevel, newLevel);
        }
        
        // Update global skill verification count
        skills[skillId].totalVerifications++;
    }
    
    /**
     * @dev Calculates skill level based on total accumulated score
     * @param totalScore The total score accumulated for this skill
     * @return level The skill level (0-4)
     */
    function _calculateSkillLevel(uint256 totalScore) private pure returns (uint256) {
        if (totalScore >= 400) return 4; // Expert
        if (totalScore >= 300) return 3; // Advanced
        if (totalScore >= 200) return 2; // Intermediate
        if (totalScore >= 100) return 1; // Beginner
        return 0; // No skill
    }
    
    /**
     * @notice Adds a prerequisite relationship between two skills
     * @param prerequisiteSkillId The skill that must be learned first
     * @param dependentSkillId The skill that depends on the prerequisite
     * @param strengthWeight How strong this relationship is (0-100)
     * @dev Only accounts with SKILL_UPDATER_ROLE can add relationships
     */
    function addSkillRelationship(uint256 prerequisiteSkillId, uint256 dependentSkillId, uint256 strengthWeight)
        public onlyRole(SKILL_UPDATER_ROLE) {
        if (!skills[prerequisiteSkillId].isActive) revert SkillGraph__SkillNotActive();
        if (!skills[dependentSkillId].isActive) revert SkillGraph__SkillNotActive();
        if (prerequisiteSkillId == dependentSkillId) revert SkillGraph__SelfPrerequisite();
        if (strengthWeight > MAX_STRENGTH_WEIGHT) revert SkillGraph__InvalidStrengthWeight();
        
        SkillRelationship memory relationship = SkillRelationship({
            prerequisiteSkillId: prerequisiteSkillId,
            dependentSkillId: dependentSkillId,
            strengthWeight: strengthWeight,
            isActive: true
        });
        
        skillPrerequisites[dependentSkillId].push(relationship);
        skillDependents[prerequisiteSkillId].push(relationship);
        
        emit SkillRelationshipAdded(prerequisiteSkillId, dependentSkillId);
    }
    
    /**
     * @notice Verifies a student's competency in a specific skill
     * @param student The address of the student
     * @param skillId The ID of the skill to verify
     * @dev Only accounts with SKILL_UPDATER_ROLE can verify skills
     * @dev Student must have existing evidence for the skill
     */
    function verifyStudentSkill(address student, uint256 skillId) 
        external onlyRole(SKILL_UPDATER_ROLE) {
        if (!skills[skillId].isActive) revert SkillGraph__SkillNotActive();
        if (studentProfiles[student].skillLevels[skillId] == 0) revert SkillGraph__NoSkillEvidence();
        
        emit SkillVerified(student, skillId, msg.sender);
    }
    
    /**
     * @notice Gets a student's level for a specific skill
     * @param student The address of the student
     * @param skillId The ID of the skill
     * @return level The student's level for this skill (0-4)
     */
    function getStudentSkillLevel(address student, uint256 skillId) external view returns (uint256) {
        return studentProfiles[student].skillLevels[skillId];
    }
    
    /**
     * @notice Gets a student's total score for a specific skill
     * @param student The address of the student
     * @param skillId The ID of the skill
     * @return score The student's accumulated score for this skill
     */
    function getStudentSkillScore(address student, uint256 skillId) external view returns (uint256) {
        return studentProfiles[student].skillScores[skillId];
    }
    
    /**
     * @notice Gets all skills that a student has learned (level > 0)
     * @param student The address of the student
     * @return skillIds Array of skill IDs the student has learned
     */
    function getStudentLearnedSkills(address student) external view returns (uint256[] memory) {
        return studentProfiles[student].learnedSkills;
    }
    
    /**
     * @notice Gets a student's total skill points across all skills
     * @param student The address of the student
     * @return totalPoints The sum of all skill levels
     */
    function getStudentTotalSkillPoints(address student) external view returns (uint256) {
        return studentProfiles[student].totalSkillPoints;
    }
    
    /**
     * @notice Gets all evidence for a student's specific skill
     * @param student The address of the student
     * @param skillId The ID of the skill
     * @return evidences Array of skill evidence for this student and skill
     */
    function getSkillEvidences(address student, uint256 skillId) external view returns (SkillEvidence[] memory) {
        return studentProfiles[student].skillEvidences[skillId];
    }
    
    /**
     * @notice Gets all prerequisites for a specific skill
     * @param skillId The ID of the skill
     * @return prerequisites Array of skills that are prerequisites for this skill
     */
    function getSkillPrerequisites(uint256 skillId) external view returns (SkillRelationship[] memory) {
        return skillPrerequisites[skillId];
    }
    
    /**
     * @notice Gets all skills that depend on a specific skill
     * @param skillId The ID of the skill
     * @return dependents Array of skills that depend on this skill
     */
    function getSkillDependents(uint256 skillId) external view returns (SkillRelationship[] memory) {
        return skillDependents[skillId];
    }
    
    /**
     * @notice Generates a complete skill profile for a student
     * @param student The address of the student
     * @return skillIds Array of skill IDs the student has learned
     * @return skillLevels Array of corresponding skill levels
     * @return skillScores Array of corresponding skill scores
     * @return totalSkillPoints Total skill points across all skills
     * @return profileLastUpdated When the profile was last updated
     */
    function generateSkillProfile(address student) external view returns (
        uint256[] memory skillIds,
        uint256[] memory skillLevels,
        uint256[] memory skillScores,
        uint256 totalSkillPoints,
        uint256 profileLastUpdated
    ) {
        StudentSkillProfile storage profile = studentProfiles[student];
        skillIds = profile.learnedSkills;
        
        skillLevels = new uint256[](skillIds.length);
        skillScores = new uint256[](skillIds.length);
        
        for (uint256 i = 0; i < skillIds.length; i++) {
            skillLevels[i] = profile.skillLevels[skillIds[i]];
            skillScores[i] = profile.skillScores[skillIds[i]];
        }
        
        totalSkillPoints = profile.totalSkillPoints;
        profileLastUpdated = profile.lastUpdated;
    }
    
    /**
     * @notice Gets detailed information about a specific skill
     * @param skillId The ID of the skill
     * @return skill The skill data structure
     */
    function getSkillInfo(uint256 skillId) external view returns (Skill memory) {
        return skills[skillId];
    }
    
    /**
     * @notice Gets skill information by name
     * @param name The name of the skill
     * @return skillId The ID of the skill
     * @return skill The skill data structure
     */
    function getSkillByName(string memory name) external view returns (uint256, Skill memory) {
        uint256 skillId = skillNameToId[name];
        return (skillId, skills[skillId]);
    }
    
    /**
     * @notice Calculates skill path recommendations for a target skill
     * @param student The address of the student
     * @param targetSkillId The ID of the target skill
     * @return recommendedSkills Array of prerequisite skill IDs
     * @return currentLevels Array of student's current levels for prerequisites
     */
    function calculateSkillPathRecommendation(address student, uint256 targetSkillId) 
        external view returns (uint256[] memory recommendedSkills, uint256[] memory currentLevels) {
        
        SkillRelationship[] memory prerequisites = skillPrerequisites[targetSkillId];
        recommendedSkills = new uint256[](prerequisites.length);
        currentLevels = new uint256[](prerequisites.length);
        
        for (uint256 i = 0; i < prerequisites.length; i++) {
            recommendedSkills[i] = prerequisites[i].prerequisiteSkillId;
            currentLevels[i] = studentProfiles[student].skillLevels[prerequisites[i].prerequisiteSkillId];
        }
    }
    
    /**
     * @notice Pauses the contract, preventing evidence submission
     * @dev Only accounts with DEFAULT_ADMIN_ROLE can pause
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpauses the contract, allowing evidence submission
     * @dev Only accounts with DEFAULT_ADMIN_ROLE can unpause
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}