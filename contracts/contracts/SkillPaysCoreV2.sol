// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./interfaces/IOrganizationRegistry.sol";

/**
 * @title SkillPaysCoreV2
 * @dev Enhanced main orchestrator contract for the SkillPays learning ecosystem with Organization support
 * @notice This contract manages students, bootcamps, organizations, and milestone completions
 * @author SkillPays Team
 */
contract SkillPaysCoreV2 is AccessControl, ReentrancyGuard, Pausable {
    using Address for address payable;
    using Math for uint256;

    /// @dev Role identifiers using keccak256 for gas optimization
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BOOTCAMP_CREATOR_ROLE = keccak256("BOOTCAMP_CREATOR_ROLE");
    bytes32 public constant MENTOR_ROLE = keccak256("MENTOR_ROLE");
    bytes32 public constant ORGANIZATION_ROLE = keccak256("ORGANIZATION_ROLE");

    /// @dev Maximum platform fee in basis points (10%)
    uint256 public constant MAX_FEE = 1000;
    
    /// @dev Minimum and maximum bootcamp duration in days
    uint256 public constant MIN_BOOTCAMP_DURATION = 1;
    uint256 public constant MAX_BOOTCAMP_DURATION = 365;

    struct Student {
        string name;
        uint256 totalBadges;
        uint256 reputationScore;
        bool isActive;
        uint256 joinedAt;
    }

    struct Bootcamp {
        uint256 id;
        string name;
        string description;
        address creator;
        uint256 organizationId; // New: Links to organization
        uint256 duration; // in days
        uint256 fee; // in wei
        bool isActive;
        uint256 createdAt;
        uint256 totalEnrollments;
        uint256 totalCompletions;
        bool requiresVerification; // New: Requires organization verification
        string[] tags; // New: Bootcamp categories/tags
        uint256 maxStudents; // New: Maximum enrollments
    }

    struct Milestone {
        uint256 id;
        uint256 bootcampId;
        string name;
        string description;
        uint256 requiredScore;
        bool requiresPeerReview;
        uint256 rewardAmount; // in wei
    }

    /// @dev Custom errors for gas optimization
    error InvalidAddress();
    error InvalidName();
    error InvalidDuration();
    error FeeExceedsMaximum();
    error InsufficientFee();
    error StudentNotRegistered();
    error StudentAlreadyRegistered();
    error BootcampNotFound();
    error BootcampNotActive();
    error AlreadyEnrolled();
    error NotEnrolled();
    error MilestoneNotFound();
    error MilestoneAlreadyCompleted();
    error NotBootcampCreator();
    error MaxStudentsReached();
    error OrganizationNotAuthorized();
    error OrganizationNotVerified();

    /// @dev State variables with explicit visibility
    mapping(address => Student) private _students;
    mapping(uint256 => Bootcamp) private _bootcamps;
    mapping(uint256 => Milestone[]) private _bootcampMilestones;
    mapping(address => mapping(uint256 => bool)) private _enrollments;
    mapping(address => mapping(uint256 => mapping(uint256 => bool))) private _completedMilestones;
    mapping(address => uint256[]) private _studentBootcamps;
    mapping(uint256 => address[]) private _bootcampStudents;

    /// @dev External contract addresses
    address private _badgeContract;
    address private _peerReviewContract;
    address private _leaderboardContract;
    address private _mentorBoostContract;
    address private _microRewardsContract;
    IOrganizationRegistry private _organizationRegistry; // New: Organization registry

    /// @dev Economic parameters
    uint256 private _platformFee; // in basis points
    address payable private _treasury;
    
    /// @dev Counter for unique IDs
    uint256 private _bootcampIdCounter;
    uint256 private _milestoneIdCounter;

    /// @dev Chainlink price feed for ETH/USD (optional)
    AggregatorV3Interface private _priceFeed;

    /// @dev Events following the Checks-Effects-Interactions pattern
    event StudentRegistered(address indexed student, string name, uint256 timestamp);
    event BootcampCreated(
        uint256 indexed bootcampId, 
        string name, 
        address indexed creator, 
        uint256 organizationId,
        uint256 fee,
        uint256 duration
    );
    event StudentEnrolled(
        uint256 indexed bootcampId, 
        address indexed student, 
        uint256 fee,
        uint256 timestamp
    );
    event MilestoneCompleted(
        uint256 indexed bootcampId,
        uint256 indexed milestoneId,
        address indexed student,
        uint256 score,
        uint256 timestamp
    );
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event ContractUpdated(string contractType, address contractAddress);
    event OrganizationRegistryUpdated(address oldRegistry, address newRegistry);

    /// @dev Modifiers
    modifier onlyValidAddress(address _address) {
        if (_address == address(0)) revert InvalidAddress();
        _;
    }

    modifier onlyRegisteredStudent(address _student) {
        if (!_students[_student].isActive) revert StudentNotRegistered();
        _;
    }

    modifier onlyActiveBootcamp(uint256 _bootcampId) {
        if (!_bootcamps[_bootcampId].isActive) revert BootcampNotActive();
        _;
    }

    modifier onlyAuthorizedOrganization() {
        require(
            address(_organizationRegistry) != address(0) && 
            _organizationRegistry.canCreateBootcamps(msg.sender),
            "Not authorized organization"
        );
        _;
    }

    /**
     * @dev Constructor sets up the contract with initial parameters
     * @param treasuryAddress Address to receive platform fees
     * @param initialPlatformFee Initial platform fee in basis points
     * @param priceFeed Chainlink price feed address (optional)
     * @param organizationRegistry OrganizationRegistry contract address
     */
    constructor(
        address payable treasuryAddress,
        uint256 initialPlatformFee,
        address priceFeed,
        address organizationRegistry
    ) onlyValidAddress(treasuryAddress) {
        if (initialPlatformFee > MAX_FEE) revert FeeExceedsMaximum();

        _treasury = treasuryAddress;
        _platformFee = initialPlatformFee;
        
        if (priceFeed != address(0)) {
            _priceFeed = AggregatorV3Interface(priceFeed);
        }

        if (organizationRegistry != address(0)) {
            _organizationRegistry = IOrganizationRegistry(organizationRegistry);
        }

        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(BOOTCAMP_CREATOR_ROLE, msg.sender);

        emit PlatformFeeUpdated(0, initialPlatformFee);
        emit TreasuryUpdated(address(0), treasuryAddress);
    }

    /**
     * @notice Register a new student in the system
     * @param name Display name for the student
     * @dev Emits StudentRegistered event
     */
    function registerStudent(string calldata name) 
        external 
        whenNotPaused 
    {
        if (bytes(name).length == 0) revert InvalidName();
        if (_students[msg.sender].isActive) revert StudentAlreadyRegistered();

        _students[msg.sender] = Student({
            name: name,
            totalBadges: 0,
            reputationScore: 100, // Starting reputation
            isActive: true,
            joinedAt: block.timestamp
        });

        emit StudentRegistered(msg.sender, name, block.timestamp);
    }

    /**
     * @notice Create a new bootcamp (Organizations only)
     * @param name Bootcamp name
     * @param description Bootcamp description
     * @param duration Duration in days
     * @param fee Fee in wei
     * @param tags Bootcamp tags/categories
     * @param maxStudents Maximum number of students (0 for unlimited)
     * @param requiresVerification Whether organization must be verified
     */
    function createBootcamp(
        string calldata name,
        string calldata description,
        uint256 duration,
        uint256 fee,
        string[] calldata tags,
        uint256 maxStudents,
        bool requiresVerification
    ) 
        external 
        onlyAuthorizedOrganization
        whenNotPaused 
        returns (uint256 bootcampId) 
    {
        if (bytes(name).length == 0) revert InvalidName();
        if (duration < MIN_BOOTCAMP_DURATION || duration > MAX_BOOTCAMP_DURATION) {
            revert InvalidDuration();
        }

        // Check if verification is required and organization is verified
        if (requiresVerification) {
            IOrganizationRegistry.Organization memory org = _organizationRegistry.getOrganizationByAddress(msg.sender);
            if (org.verificationLevel == IOrganizationRegistry.VerificationLevel.UNVERIFIED) {
                revert OrganizationNotVerified();
            }
        }

        bootcampId = ++_bootcampIdCounter;

        // Get organization ID
        uint256 organizationId = 0;
        if (address(_organizationRegistry) != address(0)) {
            try _organizationRegistry.getOrganizationByAddress(msg.sender) returns (IOrganizationRegistry.Organization memory org) {
                organizationId = org.id;
                // Increment bootcamp count for organization
                _organizationRegistry.incrementBootcampCount(msg.sender);
            } catch {
                // Handle case where organization might not be found
            }
        }

        _bootcamps[bootcampId] = Bootcamp({
            id: bootcampId,
            name: name,
            description: description,
            creator: msg.sender,
            organizationId: organizationId,
            duration: duration,
            fee: fee,
            isActive: true,
            createdAt: block.timestamp,
            totalEnrollments: 0,
            totalCompletions: 0,
            requiresVerification: requiresVerification,
            tags: tags,
            maxStudents: maxStudents
        });

        emit BootcampCreated(bootcampId, name, msg.sender, organizationId, fee, duration);
    }

    /**
     * @notice Enroll in a bootcamp
     * @param bootcampId Bootcamp ID to enroll in
     */
    function enrollInBootcamp(uint256 bootcampId) 
        external 
        payable 
        nonReentrant 
        onlyRegisteredStudent(msg.sender)
        onlyActiveBootcamp(bootcampId)
        whenNotPaused 
    {
        if (_enrollments[msg.sender][bootcampId]) revert AlreadyEnrolled();
        
        Bootcamp storage bootcamp = _bootcamps[bootcampId];
        
        // Check maximum students limit
        if (bootcamp.maxStudents > 0 && bootcamp.totalEnrollments >= bootcamp.maxStudents) {
            revert MaxStudentsReached();
        }
        
        if (msg.value < bootcamp.fee) revert InsufficientFee();

        // Process enrollment
        _enrollments[msg.sender][bootcampId] = true;
        _studentBootcamps[msg.sender].push(bootcampId);
        _bootcampStudents[bootcampId].push(msg.sender);
        bootcamp.totalEnrollments++;

        // Update organization student count
        if (address(_organizationRegistry) != address(0) && bootcamp.organizationId > 0) {
            _organizationRegistry.incrementStudentCount(bootcamp.creator);
        }

        // Handle fee distribution
        if (msg.value > 0) {
            uint256 platformFeeAmount = (msg.value * _platformFee) / 10000;
            uint256 creatorAmount = msg.value - platformFeeAmount;

            if (platformFeeAmount > 0) {
                _treasury.sendValue(platformFeeAmount);
            }
            if (creatorAmount > 0) {
                payable(bootcamp.creator).sendValue(creatorAmount);
            }
        }

        // Refund excess payment
        if (msg.value > bootcamp.fee) {
            payable(msg.sender).sendValue(msg.value - bootcamp.fee);
        }

        emit StudentEnrolled(bootcampId, msg.sender, bootcamp.fee, block.timestamp);
    }

    /**
     * @notice Add a milestone to a bootcamp
     * @param bootcampId Bootcamp ID
     * @param name Milestone name
     * @param description Milestone description
     * @param requiredScore Required score to complete milestone
     * @param requiresPeerReview Whether milestone requires peer review
     * @param rewardAmount Reward amount in wei
     */
    function addMilestone(
        uint256 bootcampId,
        string calldata name,
        string calldata description,
        uint256 requiredScore,
        bool requiresPeerReview,
        uint256 rewardAmount
    ) 
        external 
        onlyActiveBootcamp(bootcampId)
        whenNotPaused 
    {
        if (msg.sender != _bootcamps[bootcampId].creator) revert NotBootcampCreator();
        if (bytes(name).length == 0) revert InvalidName();

        uint256 milestoneId = ++_milestoneIdCounter;

        _bootcampMilestones[bootcampId].push(Milestone({
            id: milestoneId,
            bootcampId: bootcampId,
            name: name,
            description: description,
            requiredScore: requiredScore,
            requiresPeerReview: requiresPeerReview,
            rewardAmount: rewardAmount
        }));
    }

    /**
     * @notice Complete a milestone
     * @param bootcampId Bootcamp ID
     * @param milestoneId Milestone ID
     * @param data Optional data for completion proof
     */
    function completeMilestone(
        uint256 bootcampId,
        uint256 milestoneId,
        bytes calldata data
    ) 
        external 
        onlyRegisteredStudent(msg.sender)
        onlyActiveBootcamp(bootcampId)
        whenNotPaused 
    {
        if (!_enrollments[msg.sender][bootcampId]) revert NotEnrolled();
        if (_completedMilestones[msg.sender][bootcampId][milestoneId]) {
            revert MilestoneAlreadyCompleted();
        }

        // Find milestone
        Milestone[] memory milestones = _bootcampMilestones[bootcampId];
        bool milestoneFound = false;
        Milestone memory milestone;
        
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].id == milestoneId) {
                milestone = milestones[i];
                milestoneFound = true;
                break;
            }
        }
        
        if (!milestoneFound) revert MilestoneNotFound();

        _completedMilestones[msg.sender][bootcampId][milestoneId] = true;

        // Award reputation points
        _students[msg.sender].reputationScore += 10;

        // Update organization reputation
        if (address(_organizationRegistry) != address(0)) {
            Bootcamp memory bootcamp = _bootcamps[bootcampId];
            if (bootcamp.organizationId > 0) {
                _organizationRegistry.updateReputation(bootcamp.organizationId, 5);
            }
        }

        emit MilestoneCompleted(bootcampId, milestoneId, msg.sender, milestone.requiredScore, block.timestamp);
    }

    // View functions
    function getStudent(address studentAddress) external view returns (Student memory) {
        return _students[studentAddress];
    }

    function getBootcamp(uint256 bootcampId) external view returns (Bootcamp memory) {
        return _bootcamps[bootcampId];
    }

    function getBootcampMilestones(uint256 bootcampId) external view returns (Milestone[] memory) {
        return _bootcampMilestones[bootcampId];
    }

    function getStudentBootcamps(address student) external view returns (uint256[] memory) {
        return _studentBootcamps[student];
    }

    function getBootcampStudents(uint256 bootcampId) external view returns (address[] memory) {
        return _bootcampStudents[bootcampId];
    }

    function isEnrolled(address student, uint256 bootcampId) external view returns (bool) {
        return _enrollments[student][bootcampId];
    }

    function isMilestoneCompleted(
        address student,
        uint256 bootcampId,
        uint256 milestoneId
    ) external view returns (bool) {
        return _completedMilestones[student][bootcampId][milestoneId];
    }

    function isOrganization(address addr) external view returns (bool) {
        if (address(_organizationRegistry) == address(0)) return false;
        return _organizationRegistry.isOrganization(addr);
    }

    function canCreateBootcamps(address addr) external view returns (bool) {
        if (address(_organizationRegistry) == address(0)) return hasRole(BOOTCAMP_CREATOR_ROLE, addr);
        return _organizationRegistry.canCreateBootcamps(addr) || hasRole(BOOTCAMP_CREATOR_ROLE, addr);
    }

    function getTotalBootcamps() external view returns (uint256) {
        return _bootcampIdCounter;
    }

    function getPlatformFee() external view returns (uint256) {
        return _platformFee;
    }

    function getTreasury() external view returns (address) {
        return _treasury;
    }

    // Admin functions
    function setContract(string calldata contractType, address contractAddress) 
        external 
        onlyRole(ADMIN_ROLE) 
        onlyValidAddress(contractAddress) 
    {
        if (keccak256(bytes(contractType)) == keccak256(bytes("badge"))) {
            _badgeContract = contractAddress;
        } else if (keccak256(bytes(contractType)) == keccak256(bytes("peerReview"))) {
            _peerReviewContract = contractAddress;
        } else if (keccak256(bytes(contractType)) == keccak256(bytes("leaderboard"))) {
            _leaderboardContract = contractAddress;
        } else if (keccak256(bytes(contractType)) == keccak256(bytes("mentorBoost"))) {
            _mentorBoostContract = contractAddress;
        } else if (keccak256(bytes(contractType)) == keccak256(bytes("microRewards"))) {
            _microRewardsContract = contractAddress;
        }

        emit ContractUpdated(contractType, contractAddress);
    }

    function setOrganizationRegistry(address organizationRegistry) 
        external 
        onlyRole(ADMIN_ROLE) 
        onlyValidAddress(organizationRegistry) 
    {
        address oldRegistry = address(_organizationRegistry);
        _organizationRegistry = IOrganizationRegistry(organizationRegistry);
        emit OrganizationRegistryUpdated(oldRegistry, organizationRegistry);
    }

    function updatePlatformFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        if (newFee > MAX_FEE) revert FeeExceedsMaximum();
        
        uint256 oldFee = _platformFee;
        _platformFee = newFee;
        
        emit PlatformFeeUpdated(oldFee, newFee);
    }

    function updateTreasury(address payable newTreasury) 
        external 
        onlyRole(ADMIN_ROLE) 
        onlyValidAddress(newTreasury) 
    {
        address oldTreasury = _treasury;
        _treasury = newTreasury;
        
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw() external onlyRole(ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        _treasury.sendValue(balance);
    }

    receive() external payable {
        // Allow contract to receive ETH
    }
}