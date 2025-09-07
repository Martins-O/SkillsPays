// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CrossBootcampRegistry is AccessControl, Pausable {
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
    bytes32 public constant BOOTCAMP_ADMIN_ROLE = keccak256("BOOTCAMP_ADMIN_ROLE");
    
    struct BootcampRegistry {
        uint256 id;
        address contractAddress;
        string name;
        string description;
        address admin;
        string[] supportedSkills;
        mapping(string => uint256) skillWeights; // skill => importance weight
        bool isActive;
        bool isVerified;
        uint256 registeredAt;
        uint256 totalGraduates;
        uint256 averageRating;
    }
    
    struct BadgeRecognition {
        uint256 sourceBootcampId;
        uint256 targetBootcampId;
        uint256 sourceBadgeId;
        string recognizedSkill;
        uint256 equivalentLevel; // 0-4
        uint256 creditValue; // How much credit this gives in target bootcamp
        bool isActive;
        address verifiedBy;
        uint256 createdAt;
    }
    
    struct StudentProfile {
        address studentAddress;
        mapping(uint256 => uint256[]) bootcampBadges; // bootcampId => badge IDs
        mapping(string => uint256) aggregatedSkills; // skill => total level across all bootcamps
        mapping(uint256 => bool) completedBootcamps;
        uint256[] participatedBootcamps;
        uint256 totalCrossCredits;
        bool isPortable;
    }
    
    struct SkillStandard {
        string skillName;
        string category;
        string description;
        mapping(uint256 => string) levelDescriptions; // level => description
        uint256 totalBootcampsUsing;
        bool isStandardized;
        address standardizedBy;
        uint256 createdAt;
    }
    
    struct TransferRequest {
        uint256 id;
        address student;
        uint256 sourceBootcampId;
        uint256 targetBootcampId;
        uint256[] sourceBadgeIds;
        uint256 requestedCredits;
        string justification;
        bool isApproved;
        bool isProcessed;
        address approvedBy;
        uint256 createdAt;
        uint256 processedAt;
    }
    
    mapping(uint256 => BootcampRegistry) private bootcampRegistries;
    mapping(address => uint256) public contractToBootcampId;
    mapping(uint256 => mapping(uint256 => BadgeRecognition)) public badgeRecognitions;
    mapping(address => StudentProfile) private studentProfiles;
    mapping(string => SkillStandard) private skillStandards;
    mapping(uint256 => TransferRequest) public transferRequests;
    mapping(string => uint256[]) public skillBootcamps; // skill => bootcamp IDs that teach it
    
    uint256 private _bootcampIds;
    uint256 private _transferRequestIds;
    
    string[] public standardizedSkills;
    uint256[] public registeredBootcamps;
    
    event BootcampRegistered(uint256 indexed bootcampId, address contractAddress, string name);
    event BadgeRecognitionCreated(uint256 indexed sourceBootcamp, uint256 indexed targetBootcamp, string skill);
    event SkillStandardized(string skillName, address standardizedBy);
    event TransferRequested(uint256 indexed requestId, address student, uint256 sourceBootcamp, uint256 targetBootcamp);
    event TransferApproved(uint256 indexed requestId, uint256 creditsGranted);
    event CrossCreditsAwarded(address indexed student, uint256 bootcampId, uint256 credits);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRY_ADMIN_ROLE, msg.sender);
        
        // Initialize common skill standards
        _initializeSkillStandards();
    }
    
    function _initializeSkillStandards() private {
        _createSkillStandard("Solidity Development", "Blockchain", "Smart contract development with Solidity");
        _createSkillStandard("Web3 Frontend", "Frontend", "Building decentralized application interfaces");
        _createSkillStandard("DeFi Protocols", "Finance", "Decentralized finance mechanisms and protocols");
        _createSkillStandard("JavaScript", "Programming", "JavaScript programming language");
        _createSkillStandard("React Development", "Frontend", "React.js application development");
        _createSkillStandard("Python Programming", "Programming", "Python programming language");
        _createSkillStandard("Database Design", "Backend", "Database architecture and management");
        _createSkillStandard("API Development", "Backend", "RESTful API design and implementation");
    }
    
    function _createSkillStandard(string memory skillName, string memory category, string memory description) private {
        SkillStandard storage standard = skillStandards[skillName];
        standard.skillName = skillName;
        standard.category = category;
        standard.description = description;
        standard.totalBootcampsUsing = 0;
        standard.isStandardized = true;
        standard.standardizedBy = msg.sender;
        standard.createdAt = block.timestamp;
        
        // Set level descriptions
        standard.levelDescriptions[0] = "No knowledge";
        standard.levelDescriptions[1] = "Basic understanding";
        standard.levelDescriptions[2] = "Intermediate proficiency";
        standard.levelDescriptions[3] = "Advanced skills";
        standard.levelDescriptions[4] = "Expert level";
        
        standardizedSkills.push(skillName);
        
        emit SkillStandardized(skillName, msg.sender);
    }
    
    function registerBootcamp(
        address contractAddress,
        string memory name,
        string memory description,
        string[] memory supportedSkills,
        uint256[] memory skillWeights
    ) external onlyRole(REGISTRY_ADMIN_ROLE) whenNotPaused returns (uint256) {
        require(contractAddress != address(0), "Invalid contract address");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(contractToBootcampId[contractAddress] == 0, "Contract already registered");
        require(supportedSkills.length == skillWeights.length, "Skills and weights length mismatch");
        
        _bootcampIds++;
        uint256 bootcampId = _bootcampIds;
        
        BootcampRegistry storage registry = bootcampRegistries[bootcampId];
        registry.id = bootcampId;
        registry.contractAddress = contractAddress;
        registry.name = name;
        registry.description = description;
        registry.admin = msg.sender;
        registry.supportedSkills = supportedSkills;
        registry.isActive = true;
        registry.isVerified = false; // Requires separate verification
        registry.registeredAt = block.timestamp;
        registry.totalGraduates = 0;
        registry.averageRating = 0;
        
        // Set skill weights
        for (uint256 i = 0; i < supportedSkills.length; i++) {
            registry.skillWeights[supportedSkills[i]] = skillWeights[i];
            skillBootcamps[supportedSkills[i]].push(bootcampId);
        }
        
        contractToBootcampId[contractAddress] = bootcampId;
        registeredBootcamps.push(bootcampId);
        
        _grantRole(BOOTCAMP_ADMIN_ROLE, msg.sender);
        
        emit BootcampRegistered(bootcampId, contractAddress, name);
        return bootcampId;
    }
    
    function createBadgeRecognition(
        uint256 sourceBootcampId,
        uint256 targetBootcampId,
        uint256 sourceBadgeId,
        string memory recognizedSkill,
        uint256 equivalentLevel,
        uint256 creditValue
    ) external onlyRole(BOOTCAMP_ADMIN_ROLE) whenNotPaused {
        require(bootcampRegistries[sourceBootcampId].isActive, "Source bootcamp not active");
        require(bootcampRegistries[targetBootcampId].isActive, "Target bootcamp not active");
        require(equivalentLevel <= 4, "Invalid equivalent level");
        require(_isBootcampAdmin(msg.sender, targetBootcampId), "Not target bootcamp admin");
        
        badgeRecognitions[sourceBootcampId][targetBootcampId] = BadgeRecognition({
            sourceBootcampId: sourceBootcampId,
            targetBootcampId: targetBootcampId,
            sourceBadgeId: sourceBadgeId,
            recognizedSkill: recognizedSkill,
            equivalentLevel: equivalentLevel,
            creditValue: creditValue,
            isActive: true,
            verifiedBy: msg.sender,
            createdAt: block.timestamp
        });
        
        emit BadgeRecognitionCreated(sourceBootcampId, targetBootcampId, recognizedSkill);
    }
    
    function requestCrossBootcampTransfer(
        uint256 sourceBootcampId,
        uint256 targetBootcampId,
        uint256[] memory sourceBadgeIds,
        string memory justification
    ) external whenNotPaused returns (uint256) {
        require(bootcampRegistries[sourceBootcampId].isActive, "Source bootcamp not active");
        require(bootcampRegistries[targetBootcampId].isActive, "Target bootcamp not active");
        require(sourceBadgeIds.length > 0, "Must provide source badges");
        
        // Verify student owns these badges (simplified - would check with badge contract)
        // require(_verifyBadgeOwnership(msg.sender, sourceBootcampId, sourceBadgeIds), "Badge ownership verification failed");
        
        _transferRequestIds++;
        uint256 requestId = _transferRequestIds;
        
        // Calculate requested credits based on badge recognition
        uint256 requestedCredits = _calculateTransferCredits(sourceBootcampId, targetBootcampId, sourceBadgeIds);
        
        transferRequests[requestId] = TransferRequest({
            id: requestId,
            student: msg.sender,
            sourceBootcampId: sourceBootcampId,
            targetBootcampId: targetBootcampId,
            sourceBadgeIds: sourceBadgeIds,
            requestedCredits: requestedCredits,
            justification: justification,
            isApproved: false,
            isProcessed: false,
            approvedBy: address(0),
            createdAt: block.timestamp,
            processedAt: 0
        });
        
        emit TransferRequested(requestId, msg.sender, sourceBootcampId, targetBootcampId);
        return requestId;
    }
    
    function approveTransferRequest(uint256 requestId, uint256 creditsGranted) 
        external onlyRole(BOOTCAMP_ADMIN_ROLE) whenNotPaused {
        TransferRequest storage request = transferRequests[requestId];
        require(!request.isProcessed, "Request already processed");
        require(_isBootcampAdmin(msg.sender, request.targetBootcampId), "Not target bootcamp admin");
        require(creditsGranted <= request.requestedCredits, "Credits exceed requested amount");
        
        request.isApproved = true;
        request.isProcessed = true;
        request.approvedBy = msg.sender;
        request.processedAt = block.timestamp;
        
        // Award cross-credits to student
        StudentProfile storage profile = studentProfiles[request.student];
        profile.totalCrossCredits += creditsGranted;
        
        // Update aggregated skills based on transferred badges
        _updateAggregatedSkills(request.student, request.sourceBootcampId, request.sourceBadgeIds);
        
        emit TransferApproved(requestId, creditsGranted);
        emit CrossCreditsAwarded(request.student, request.targetBootcampId, creditsGranted);
    }
    
    function _calculateTransferCredits(
        uint256 sourceBootcampId,
        uint256 targetBootcampId,
        uint256[] memory sourceBadgeIds
    ) private view returns (uint256) {
        uint256 totalCredits = 0;
        
        for (uint256 i = 0; i < sourceBadgeIds.length; i++) {
            BadgeRecognition memory recognition = badgeRecognitions[sourceBootcampId][targetBootcampId];
            if (recognition.isActive && recognition.sourceBadgeId == sourceBadgeIds[i]) {
                totalCredits += recognition.creditValue;
            }
        }
        
        // If no specific recognitions, calculate based on skill overlap
        if (totalCredits == 0) {
            totalCredits = _calculateSkillOverlapCredits(sourceBootcampId, targetBootcampId, sourceBadgeIds);
        }
        
        return totalCredits;
    }
    
    function _calculateSkillOverlapCredits(
        uint256 sourceBootcampId,
        uint256 targetBootcampId,
        uint256[] memory sourceBadgeIds
    ) private view returns (uint256) {
        // This would analyze skill overlap between bootcamps
        // Simplified implementation
        BootcampRegistry storage sourceBootcamp = bootcampRegistries[sourceBootcampId];
        BootcampRegistry storage targetBootcamp = bootcampRegistries[targetBootcampId];
        
        uint256 overlapScore = 0;
        uint256 commonSkills = 0;
        
        for (uint256 i = 0; i < sourceBootcamp.supportedSkills.length; i++) {
            string memory sourceSkill = sourceBootcamp.supportedSkills[i];
            
            for (uint256 j = 0; j < targetBootcamp.supportedSkills.length; j++) {
                if (keccak256(bytes(sourceSkill)) == keccak256(bytes(targetBootcamp.supportedSkills[j]))) {
                    commonSkills++;
                    overlapScore += sourceBootcamp.skillWeights[sourceSkill];
                    break;
                }
            }
        }
        
        // Calculate credits based on overlap (max 50% of badge count)
        uint256 maxCredits = sourceBadgeIds.length * 50 / 100;
        uint256 calculatedCredits = (overlapScore * sourceBadgeIds.length) / 1000;
        
        return calculatedCredits > maxCredits ? maxCredits : calculatedCredits;
    }
    
    function _updateAggregatedSkills(
        address student,
        uint256 sourceBootcampId,
        uint256[] memory sourceBadgeIds
    ) private {
        StudentProfile storage profile = studentProfiles[student];
        BootcampRegistry storage bootcamp = bootcampRegistries[sourceBootcampId];
        
        // For each skill supported by the source bootcamp, increase aggregated level
        for (uint256 i = 0; i < bootcamp.supportedSkills.length; i++) {
            string memory skill = bootcamp.supportedSkills[i];
            uint256 currentLevel = profile.aggregatedSkills[skill];
            
            // Increase skill level based on number of relevant badges (simplified)
            uint256 skillIncrease = sourceBadgeIds.length / 2; // 2 badges = 1 skill level
            if (skillIncrease == 0) skillIncrease = 1;
            
            uint256 newLevel = currentLevel + skillIncrease;
            if (newLevel > 4) newLevel = 4; // Cap at expert level
            
            profile.aggregatedSkills[skill] = newLevel;
        }
        
        // Mark participation in source bootcamp
        if (!profile.completedBootcamps[sourceBootcampId]) {
            profile.participatedBootcamps.push(sourceBootcampId);
        }
    }
    
    function _isBootcampAdmin(address admin, uint256 bootcampId) private view returns (bool) {
        return bootcampRegistries[bootcampId].admin == admin || hasRole(REGISTRY_ADMIN_ROLE, admin);
    }
    
    function enablePortability(bool isPortable) external {
        studentProfiles[msg.sender].isPortable = isPortable;
    }
    
    // View functions
    function getBootcampRegistry(uint256 bootcampId) external view returns (
        uint256 id,
        address contractAddress,
        string memory name,
        string memory description,
        address admin,
        string[] memory supportedSkills,
        bool isActive,
        bool isVerified,
        uint256 registeredAt,
        uint256 totalGraduates,
        uint256 averageRating
    ) {
        BootcampRegistry storage registry = bootcampRegistries[bootcampId];
        return (
            registry.id,
            registry.contractAddress,
            registry.name,
            registry.description,
            registry.admin,
            registry.supportedSkills,
            registry.isActive,
            registry.isVerified,
            registry.registeredAt,
            registry.totalGraduates,
            registry.averageRating
        );
    }
    
    function getBadgeRecognition(uint256 sourceBootcampId, uint256 targetBootcampId) 
        external view returns (BadgeRecognition memory) {
        return badgeRecognitions[sourceBootcampId][targetBootcampId];
    }
    
    function getStudentProfile(address student) external view returns (
        uint256[] memory participatedBootcamps,
        uint256 totalCrossCredits,
        bool isPortable
    ) {
        StudentProfile storage profile = studentProfiles[student];
        return (
            profile.participatedBootcamps,
            profile.totalCrossCredits,
            profile.isPortable
        );
    }
    
    function getStudentAggregatedSkills(address student) external view returns (
        string[] memory skills,
        uint256[] memory levels
    ) {
        skills = standardizedSkills;
        levels = new uint256[](skills.length);
        
        for (uint256 i = 0; i < skills.length; i++) {
            levels[i] = studentProfiles[student].aggregatedSkills[skills[i]];
        }
    }
    
    function getSkillStandard(string memory skillName) external view returns (
        string memory category,
        string memory description,
        uint256 totalBootcampsUsing,
        bool isStandardized,
        address standardizedBy,
        uint256 createdAt
    ) {
        SkillStandard storage standard = skillStandards[skillName];
        return (
            standard.category,
            standard.description,
            standard.totalBootcampsUsing,
            standard.isStandardized,
            standard.standardizedBy,
            standard.createdAt
        );
    }
    
    function getBootcampsForSkill(string memory skill) external view returns (uint256[] memory) {
        return skillBootcamps[skill];
    }
    
    function getTransferRequest(uint256 requestId) external view returns (TransferRequest memory) {
        return transferRequests[requestId];
    }
    
    function getRegisteredBootcamps() external view returns (uint256[] memory) {
        return registeredBootcamps;
    }
    
    function getStandardizedSkills() external view returns (string[] memory) {
        return standardizedSkills;
    }
    
    function canTransferBadges(
        address student,
        uint256 sourceBootcampId,
        uint256 targetBootcampId,
        uint256[] memory sourceBadgeIds
    ) external view returns (bool canTransfer, uint256 estimatedCredits, string memory reason) {
        if (!studentProfiles[student].isPortable) {
            return (false, 0, "Student has not enabled portability");
        }
        
        if (!bootcampRegistries[sourceBootcampId].isActive) {
            return (false, 0, "Source bootcamp not active");
        }
        
        if (!bootcampRegistries[targetBootcampId].isActive) {
            return (false, 0, "Target bootcamp not active");
        }
        
        uint256 credits = _calculateTransferCredits(sourceBootcampId, targetBootcampId, sourceBadgeIds);
        
        if (credits == 0) {
            return (false, 0, "No transferable credits found");
        }
        
        return (true, credits, "Transfer possible");
    }
    
    // Admin functions
    function verifyBootcamp(uint256 bootcampId, bool isVerified) 
        external onlyRole(REGISTRY_ADMIN_ROLE) {
        require(bootcampRegistries[bootcampId].id != 0, "Bootcamp not registered");
        bootcampRegistries[bootcampId].isVerified = isVerified;
    }
    
    function createSkillStandard(
        string memory skillName,
        string memory category,
        string memory description
    ) external onlyRole(REGISTRY_ADMIN_ROLE) {
        require(!skillStandards[skillName].isStandardized, "Skill already standardized");
        _createSkillStandard(skillName, category, description);
    }
    
    function updateBootcampRating(uint256 bootcampId, uint256 newRating) 
        external onlyRole(REGISTRY_ADMIN_ROLE) {
        require(bootcampRegistries[bootcampId].id != 0, "Bootcamp not registered");
        require(newRating <= 500, "Rating too high"); // Max 5.00 * 100
        bootcampRegistries[bootcampId].averageRating = newRating;
    }
    
    function pause() external onlyRole(REGISTRY_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(REGISTRY_ADMIN_ROLE) {
        _unpause();
    }
}