// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title SkillPaysCore
 * @dev Main orchestrator contract for the SkillPays learning ecosystem
 * @notice This contract manages students, bootcamps, and milestone completions
 * @author SkillPays Team
 */
contract SkillPaysCore is AccessControl, ReentrancyGuard, Pausable {
    using Address for address payable;
    using Math for uint256;

    /// @dev Role identifiers using keccak256 for gas optimization
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BOOTCAMP_CREATOR_ROLE = keccak256("BOOTCAMP_CREATOR_ROLE");
    bytes32 public constant MENTOR_ROLE = keccak256("MENTOR_ROLE");

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
        uint256 duration; // in days
        uint256 fee; // in wei
        bool isActive;
        uint256 createdAt;
        uint256 totalEnrollments;
        uint256 totalCompletions;
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
        uint256 fee,
        uint256 duration
    );
    event StudentEnrolled(
        address indexed student, 
        uint256 indexed bootcampId, 
        uint256 amountPaid,
        uint256 timestamp
    );
    event MilestoneAdded(
        uint256 indexed bootcampId, 
        uint256 indexed milestoneId, 
        string name,
        uint256 requiredScore
    );
    event MilestoneCompleted(
        address indexed student, 
        uint256 indexed bootcampId, 
        uint256 indexed milestoneId,
        uint256 reputationGained
    );
    event ContractUpdated(
        string indexed contractType, 
        address indexed oldAddress, 
        address indexed newAddress
    );
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    /// @dev Custom errors for gas optimization
    error InvalidAddress();
    error InvalidName();
    error InvalidDuration();
    error InvalidFee();
    error StudentNotRegistered();
    error StudentAlreadyRegistered();
    error BootcampNotFound();
    error BootcampNotActive();
    error MilestoneNotFound();
    error AlreadyEnrolled();
    error NotEnrolled();
    error InsufficientPayment();
    error MilestoneAlreadyCompleted();
    error NotBootcampCreator();
    error FeeExceedsMaximum();

    /// @dev Modifiers for access control and validation
    modifier onlyValidAddress(address _addr) {
        if (_addr == address(0)) revert InvalidAddress();
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

    /**
     * @dev Constructor sets up the contract with initial parameters
     * @param treasuryAddress Address to receive platform fees
     * @param initialPlatformFee Initial platform fee in basis points
     * @param priceFeed Chainlink price feed address (optional)
     */
    constructor(
        address payable treasuryAddress,
        uint256 initialPlatformFee,
        address priceFeed
    ) onlyValidAddress(treasuryAddress) {
        if (initialPlatformFee > MAX_FEE) revert FeeExceedsMaximum();

        _treasury = treasuryAddress;
        _platformFee = initialPlatformFee;
        
        if (priceFeed != address(0)) {
            _priceFeed = AggregatorV3Interface(priceFeed);
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
            reputationScore: 0,
            isActive: true,
            joinedAt: block.timestamp
        });

        emit StudentRegistered(msg.sender, name, block.timestamp);
    }

    /**
     * @notice Create a new bootcamp
     * @param name Name of the bootcamp
     * @param description Description of the bootcamp
     * @param duration Duration in days
     * @param fee Fee in wei
     * @return bootcampId The ID of the created bootcamp
     */
    function createBootcamp(
        string calldata name,
        string calldata description,
        uint256 duration,
        uint256 fee
    ) 
        external 
        onlyRole(BOOTCAMP_CREATOR_ROLE) 
        whenNotPaused 
        returns (uint256 bootcampId) 
    {
        if (bytes(name).length == 0) revert InvalidName();
        if (duration < MIN_BOOTCAMP_DURATION || duration > MAX_BOOTCAMP_DURATION) {
            revert InvalidDuration();
        }

        bootcampId = ++_bootcampIdCounter;

        _bootcamps[bootcampId] = Bootcamp({
            id: bootcampId,
            name: name,
            description: description,
            creator: msg.sender,
            duration: duration,
            fee: fee,
            isActive: true,
            createdAt: block.timestamp,
            totalEnrollments: 0,
            totalCompletions: 0
        });

        emit BootcampCreated(bootcampId, name, msg.sender, fee, duration);
    }

    /**
     * @notice Add a milestone to a bootcamp
     * @param bootcampId ID of the bootcamp
     * @param name Name of the milestone
     * @param description Description of the milestone
     * @param requiredScore Required score to pass
     * @param requiresPeerReview Whether peer review is required
     * @param rewardAmount Reward amount for completion
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
        onlyRole(BOOTCAMP_CREATOR_ROLE) 
        onlyActiveBootcamp(bootcampId)
        whenNotPaused 
    {
        if (bytes(name).length == 0) revert InvalidName();
        if (_bootcamps[bootcampId].creator != msg.sender) revert NotBootcampCreator();

        uint256 milestoneId = ++_milestoneIdCounter;

        Milestone memory milestone = Milestone({
            id: milestoneId,
            bootcampId: bootcampId,
            name: name,
            description: description,
            requiredScore: requiredScore,
            requiresPeerReview: requiresPeerReview,
            rewardAmount: rewardAmount
        });

        _bootcampMilestones[bootcampId].push(milestone);

        emit MilestoneAdded(bootcampId, milestoneId, name, requiredScore);
    }

    /**
     * @notice Enroll in a bootcamp
     * @param bootcampId ID of the bootcamp to enroll in
     * @dev Handles payment distribution automatically
     */
    function enrollInBootcamp(uint256 bootcampId) 
        external 
        payable 
        onlyRegisteredStudent(msg.sender)
        onlyActiveBootcamp(bootcampId)
        whenNotPaused 
        nonReentrant 
    {
        if (_enrollments[msg.sender][bootcampId]) revert AlreadyEnrolled();

        Bootcamp storage bootcamp = _bootcamps[bootcampId];
        
        if (msg.value < bootcamp.fee) revert InsufficientPayment();

        // Update state first (Checks-Effects-Interactions)
        _enrollments[msg.sender][bootcampId] = true;
        _studentBootcamps[msg.sender].push(bootcampId);
        _bootcampStudents[bootcampId].push(msg.sender);
        bootcamp.totalEnrollments++;

        // Handle payment distribution
        if (msg.value > 0) {
            _distributePayment(bootcamp.creator, msg.value);
        }

        emit StudentEnrolled(msg.sender, bootcampId, msg.value, block.timestamp);
    }

    /**
     * @notice Complete a milestone
     * @param bootcampId ID of the bootcamp
     * @param milestoneId ID of the milestone
     * @param proof Proof of completion (could be IPFS hash)
     */
    function completeMilestone(
        uint256 bootcampId,
        uint256 milestoneId,
        bytes calldata proof
    ) 
        external 
        onlyRegisteredStudent(msg.sender)
        whenNotPaused 
        nonReentrant 
    {
        if (!_enrollments[msg.sender][bootcampId]) revert NotEnrolled();
        if (_completedMilestones[msg.sender][bootcampId][milestoneId]) {
            revert MilestoneAlreadyCompleted();
        }

        Milestone memory milestone = _getMilestone(bootcampId, milestoneId);
        if (milestone.id == 0) revert MilestoneNotFound();

        // Update state
        _completedMilestones[msg.sender][bootcampId][milestoneId] = true;
        
        Student storage student = _students[msg.sender];
        student.totalBadges++;
        student.reputationScore += milestone.requiredScore;

        // External interactions
        if (_badgeContract != address(0)) {
            _mintBadge(msg.sender, bootcampId, milestoneId, milestone.requiredScore);
        }

        if (milestone.rewardAmount > 0 && address(this).balance >= milestone.rewardAmount) {
            payable(msg.sender).sendValue(milestone.rewardAmount);
        }

        emit MilestoneCompleted(
            msg.sender, 
            bootcampId, 
            milestoneId, 
            milestone.requiredScore
        );
    }

    /**
     * @dev Internal function to distribute enrollment payments
     * @param creator Address of the bootcamp creator
     * @param amount Total payment amount
     */
    function _distributePayment(address creator, uint256 amount) private {
        uint256 feeAmount = (amount * _platformFee) / 10000;
        uint256 creatorAmount = amount - feeAmount;

        if (feeAmount > 0) {
            _treasury.sendValue(feeAmount);
        }
        
        if (creatorAmount > 0) {
            payable(creator).sendValue(creatorAmount);
        }
    }

    /**
     * @dev Internal function to mint badge via external contract
     * @param student Student address
     * @param bootcampId Bootcamp ID
     * @param milestoneId Milestone ID
     * @param score Achievement score
     */
    function _mintBadge(
        address student,
        uint256 bootcampId,
        uint256 milestoneId,
        uint256 score
    ) private {
        // Determine badge level based on score
        uint256 level = _calculateBadgeLevel(score);
        
        (bool success, ) = _badgeContract.call(
            abi.encodeWithSignature(
                "mintBadge(address,uint256,uint256,uint256,string,uint256,string)",
                student,
                bootcampId,
                milestoneId,
                level,
                "General Skills", // Could be made dynamic
                score,
                "" // Empty metadata URI - will use onchain generation
            )
        );
        
        // Log but don't revert if badge minting fails
        if (!success) {
            // Consider emitting an event for monitoring
        }
    }

    /**
     * @dev Calculate badge level based on score
     * @param score The achievement score
     * @return level Badge level (0-3)
     */
    function _calculateBadgeLevel(uint256 score) private pure returns (uint256 level) {
        if (score >= 95) return 3; // Platinum
        if (score >= 85) return 2; // Gold
        if (score >= 75) return 1; // Silver
        return 0; // Bronze
    }

    /**
     * @dev Get milestone by bootcamp and milestone ID
     * @param bootcampId Bootcamp ID
     * @param milestoneId Milestone ID
     * @return milestone The milestone struct
     */
    function _getMilestone(uint256 bootcampId, uint256 milestoneId) 
        private 
        view 
        returns (Milestone memory milestone) 
    {
        Milestone[] memory milestones = _bootcampMilestones[bootcampId];
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].id == milestoneId) {
                return milestones[i];
            }
        }
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get student information
     * @param studentAddress Address of the student
     * @return student Student struct
     */
    function getStudent(address studentAddress) 
        external 
        view 
        returns (Student memory student) 
    {
        return _students[studentAddress];
    }

    /**
     * @notice Get bootcamp information
     * @param bootcampId ID of the bootcamp
     * @return bootcamp Bootcamp struct
     */
    function getBootcamp(uint256 bootcampId) 
        external 
        view 
        returns (Bootcamp memory bootcamp) 
    {
        return _bootcamps[bootcampId];
    }

    /**
     * @notice Get all milestones for a bootcamp
     * @param bootcampId ID of the bootcamp
     * @return milestones Array of milestone structs
     */
    function getBootcampMilestones(uint256 bootcampId) 
        external 
        view 
        returns (Milestone[] memory milestones) 
    {
        return _bootcampMilestones[bootcampId];
    }

    /**
     * @notice Get all bootcamps a student is enrolled in
     * @param student Address of the student
     * @return bootcampIds Array of bootcamp IDs
     */
    function getStudentBootcamps(address student) 
        external 
        view 
        returns (uint256[] memory bootcampIds) 
    {
        return _studentBootcamps[student];
    }

    /**
     * @notice Check if student is enrolled in bootcamp
     * @param student Student address
     * @param bootcampId Bootcamp ID
     * @return enrolled True if enrolled
     */
    function isEnrolled(address student, uint256 bootcampId) 
        external 
        view 
        returns (bool enrolled) 
    {
        return _enrollments[student][bootcampId];
    }

    /**
     * @notice Check if milestone is completed by student
     * @param student Student address
     * @param bootcampId Bootcamp ID
     * @param milestoneId Milestone ID
     * @return completed True if completed
     */
    function isMilestoneCompleted(
        address student, 
        uint256 bootcampId, 
        uint256 milestoneId
    ) 
        external 
        view 
        returns (bool completed) 
    {
        return _completedMilestones[student][bootcampId][milestoneId];
    }

    /**
     * @notice Get current ETH/USD price from Chainlink (if available)
     * @return price Current ETH price in USD (8 decimals)
     * @return timestamp Last update timestamp
     */
    function getETHPrice() 
        external 
        view 
        returns (int256 price, uint256 timestamp) 
    {
        if (address(_priceFeed) == address(0)) {
            return (0, 0);
        }
        
        (, price, , timestamp, ) = _priceFeed.latestRoundData();
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Set external contract addresses
     * @param contractType Type of contract
     * @param contractAddress New contract address
     */
    function setContract(
        string calldata contractType, 
        address contractAddress
    ) 
        external 
        onlyRole(ADMIN_ROLE)
        onlyValidAddress(contractAddress)
    {
        bytes32 typeHash = keccak256(bytes(contractType));
        address oldAddress;

        if (typeHash == keccak256("badge")) {
            oldAddress = _badgeContract;
            _badgeContract = contractAddress;
        } else if (typeHash == keccak256("peerReview")) {
            oldAddress = _peerReviewContract;
            _peerReviewContract = contractAddress;
        } else if (typeHash == keccak256("leaderboard")) {
            oldAddress = _leaderboardContract;
            _leaderboardContract = contractAddress;
        } else if (typeHash == keccak256("mentorBoost")) {
            oldAddress = _mentorBoostContract;
            _mentorBoostContract = contractAddress;
        } else if (typeHash == keccak256("microRewards")) {
            oldAddress = _microRewardsContract;
            _microRewardsContract = contractAddress;
        }

        emit ContractUpdated(contractType, oldAddress, contractAddress);
    }

    /**
     * @notice Update platform fee
     * @param newFee New fee in basis points
     */
    function setPlatformFee(uint256 newFee) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (newFee > MAX_FEE) revert FeeExceedsMaximum();
        
        uint256 oldFee = _platformFee;
        _platformFee = newFee;
        
        emit PlatformFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address payable newTreasury) 
        external 
        onlyRole(ADMIN_ROLE)
        onlyValidAddress(newTreasury)
    {
        address oldTreasury = _treasury;
        _treasury = newTreasury;
        
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Update Chainlink price feed
     * @param newPriceFeed New price feed address
     */
    function setPriceFeed(address newPriceFeed) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        _priceFeed = AggregatorV3Interface(newPriceFeed);
    }

    /**
     * @notice Grant bootcamp creator role
     * @param account Address to grant role to
     */
    function grantBootcampCreatorRole(address account) 
        external 
        onlyRole(ADMIN_ROLE)
        onlyValidAddress(account)
    {
        grantRole(BOOTCAMP_CREATOR_ROLE, account);
    }

    /**
     * @notice Grant mentor role
     * @param account Address to grant role to
     */
    function grantMentorRole(address account) 
        external 
        onlyRole(ADMIN_ROLE)
        onlyValidAddress(account)
    {
        grantRole(MENTOR_ROLE, account);
    }

    /**
     * @notice Emergency pause
     * @dev Only admin can pause/unpause
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Emergency withdrawal (only for stuck funds)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        nonReentrant 
    {
        require(amount <= address(this).balance, "Insufficient balance");
        _treasury.sendValue(amount);
    }

    // ============ GETTERS FOR EXTERNAL CONTRACTS ============

    function badgeContract() external view returns (address) { return _badgeContract; }
    function peerReviewContract() external view returns (address) { return _peerReviewContract; }
    function leaderboardContract() external view returns (address) { return _leaderboardContract; }
    function mentorBoostContract() external view returns (address) { return _mentorBoostContract; }
    function microRewardsContract() external view returns (address) { return _microRewardsContract; }
    function treasury() external view returns (address) { return _treasury; }
    function platformFee() external view returns (uint256) { return _platformFee; }

    /**
     * @notice Receive function to accept ETH deposits
     * @dev Funds can be used for milestone rewards
     */
    receive() external payable {}
}