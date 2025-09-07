// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MentorBoostSystem
 * @author SkillPays Team
 * @notice A comprehensive mentorship and micro-rewards system for student guidance
 * @dev Manages mentor registration, boost requests, micro-rewards, and mentorship sessions
 */
contract MentorBoostSystem is AccessControl, ReentrancyGuard, Pausable {
    /// @notice Role for registered mentors who can provide boosts
    bytes32 public constant MENTOR_ROLE = keccak256("MENTOR_ROLE");
    
    /// @notice Role for administrators who can manage the system
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Minimum stake required to become a mentor
    uint256 public constant MIN_MENTOR_STAKE = 0.5 ether;
    
    /// @notice Maximum amount for micro-rewards
    uint256 public constant MAX_MICRO_REWARD = 0.01 ether;
    
    /// @notice Minimum reputation score for certain mentor privileges
    uint256 public constant REPUTATION_THRESHOLD = 80;
    
    /// @dev Custom errors for gas optimization
    error MentorBoost__InsufficientStake();
    error MentorBoost__AlreadyMentor();
    error MentorBoost__NotMentor();
    error MentorBoost__InvalidRequest();
    error MentorBoost__RequestNotApproved();
    error MentorBoost__RequestAlreadyProcessed();
    error MentorBoost__ExcessiveMicroReward();
    error MentorBoost__MentorshipNotActive();
    error MentorBoost__SessionNotFound();
    error MentorBoost__InvalidRating();
    
    /**
     * @notice Profile information for registered mentors
     * @param mentorAddress The mentor's wallet address
     * @param name Display name of the mentor
     * @param bio Biography or description
     * @param expertise Comma-separated areas of expertise
     * @param totalBoosts Total number of boosts provided
     * @param successfulMentorships Number of successful mentorship relationships
     * @param averageRating Average rating from students (0-100)
     * @param reputationScore Reputation score based on performance
     * @param stakingAmount Amount of ETH staked by the mentor
     * @param isActive Whether the mentor is currently active
     * @param joinedAt Timestamp when mentor registered
     */
    struct MentorProfile {
        address mentorAddress;
        string name;
        string bio;
        string expertise;
        uint256 totalBoosts;
        uint256 successfulMentorships;
        uint256 averageRating;
        uint256 reputationScore;
        uint256 stakingAmount;
        bool isActive;
        uint256 joinedAt;
    }
    
    /**
     * @notice Request for a mentor boost from a student
     * @param id Unique identifier for this request
     * @param student The student requesting the boost
     * @param mentor The mentor who will provide the boost
     * @param bootcampId ID of the bootcamp context
     * @param milestoneId ID of the milestone context
     * @param submissionHash IPFS hash of student's submission
     * @param boostType Type of boost (recognition, micro_reward, skill_validation)
     * @param requestedAmount Amount requested for micro-reward boosts
     * @param justification Student's justification for the boost
     * @param isApproved Whether the mentor has approved this request
     * @param isCompleted Whether the boost has been processed
     * @param createdAt When the request was created
     * @param processedAt When the request was processed
     */
    struct BoostRequest {
        uint256 id;
        address student;
        address mentor;
        uint256 bootcampId;
        uint256 milestoneId;
        string submissionHash;
        string boostType;
        uint256 requestedAmount;
        string justification;
        bool isApproved;
        bool isCompleted;
        uint256 createdAt;
        uint256 processedAt;
    }
    
    /**
     * @notice A micro-reward issued by a mentor to a student
     * @param id Unique identifier for this reward
     * @param student The student receiving the reward
     * @param mentor The mentor issuing the reward
     * @param amount Amount of the reward in Wei
     * @param reason Reason for issuing the reward
     * @param evidenceHash IPFS hash of supporting evidence
     * @param timestamp When the reward was issued
     * @param isClaimed Whether the reward has been claimed
     */
    struct MicroReward {
        uint256 id;
        address student;
        address mentor;
        uint256 amount;
        string reason;
        string evidenceHash;
        uint256 timestamp;
        bool isClaimed;
    }
    
    /**
     * @notice A mentorship session between mentor and student
     * @param id Unique identifier for this session
     * @param mentor The mentor conducting the session
     * @param student The student participating
     * @param sessionType Type of session (1on1, group, review)
     * @param duration Duration of the session in minutes
     * @param contentHash IPFS hash of session notes/content
     * @param studentRating Rating given by student (0-100)
     * @param feedback Student's feedback about the session
     * @param scheduledAt When the session was scheduled
     * @param completedAt When the session was completed
     * @param isCompleted Whether the session has been completed
     */
    struct MentorshipSession {
        uint256 id;
        address mentor;
        address student;
        string sessionType;
        uint256 duration;
        string contentHash;
        uint256 studentRating;
        string feedback;
        uint256 scheduledAt;
        uint256 completedAt;
        bool isCompleted;
    }
    
    /**
     * @notice Reward tracking for mentors
     * @param totalEarned Total rewards earned by the mentor
     * @param totalDistributed Total rewards distributed by the mentor
     * @param pendingRewards Rewards awaiting distribution
     * @param reputationBonus Bonus based on reputation score
     * @param lastRewardTime When rewards were last calculated
     */
    struct MentorRewards {
        uint256 totalEarned;
        uint256 totalDistributed;
        uint256 pendingRewards;
        uint256 reputationBonus;
        uint256 lastRewardTime;
    }
    
    /// @notice Mapping from mentor address to their profile
    mapping(address => MentorProfile) public mentors;
    
    /// @notice Mapping from request ID to boost request details
    mapping(uint256 => BoostRequest) public boostRequests;
    
    /// @notice Mapping from reward ID to micro-reward details
    mapping(uint256 => MicroReward) public microRewards;
    
    /// @notice Mapping from session ID to mentorship session details
    mapping(uint256 => MentorshipSession) public mentorshipSessions;
    
    /// @notice Mapping from mentor address to their reward information
    mapping(address => MentorRewards) public mentorRewards;
    
    /// @notice Mapping from mentor to their students
    mapping(address => address[]) public mentorStudents;
    
    /// @notice Mapping from student to their mentors
    mapping(address => address[]) public studentMentors;
    
    /// @notice Mapping to track active mentorship relationships
    mapping(address => mapping(address => bool)) public activeMentorships;
    
    /// @dev Counter for generating unique boost request IDs
    uint256 private _boostRequestIds;
    
    /// @dev Counter for generating unique micro-reward IDs
    uint256 private _microRewardIds;
    
    /// @dev Counter for generating unique session IDs
    uint256 private _sessionIds;
    
    /// @notice Address of the reward pool contract
    address public rewardPool;
    
    /// @notice Total amount in the reward pool
    uint256 public totalRewardPool;
    
    /// @notice Emitted when a new mentor registers
    event MentorRegistered(address indexed mentor, string name);
    
    /// @notice Emitted when a student requests a boost
    event BoostRequested(uint256 indexed requestId, address indexed student, address indexed mentor);
    
    /// @notice Emitted when a mentor approves a boost request
    event BoostApproved(uint256 indexed requestId, uint256 amount);
    
    /// @notice Emitted when a micro-reward is issued
    event MicroRewardIssued(uint256 indexed rewardId, address indexed student, address indexed mentor, uint256 amount);
    
    /// @notice Emitted when a new mentorship relationship starts
    event MentorshipStarted(address indexed mentor, address indexed student);
    
    /// @notice Emitted when a mentorship session is scheduled
    event SessionScheduled(uint256 indexed sessionId, address indexed mentor, address indexed student);
    
    /// @notice Emitted when a mentorship session is completed
    event SessionCompleted(uint256 indexed sessionId, uint256 rating);
    
    /// @notice Emitted when a mentor receives rewards
    event MentorRewarded(address indexed mentor, uint256 amount);
    
    /**
     * @notice Initializes the MentorBoostSystem contract
     * @param _rewardPool Address of the reward pool contract
     * @dev Sets up roles and reward pool configuration
     */
    constructor(address _rewardPool) {
        if (_rewardPool == address(0)) revert MentorBoost__InvalidRequest();
        rewardPool = _rewardPool;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @notice Registers a new mentor with staking requirement
     * @param name Display name of the mentor
     * @param bio Biography or description
     * @param expertise Areas of expertise (comma-separated)
     * @dev Requires minimum stake and mentor must not be already registered
     */
    function registerAsMentor(
        string memory name,
        string memory bio,
        string memory expertise
    ) external payable whenNotPaused {
        if (msg.value < MIN_MENTOR_STAKE) revert MentorBoost__InsufficientStake();
        require(!mentors[msg.sender].isActive, "Already registered as mentor");
        require(bytes(name).length > 0, "Name cannot be empty");
        
        mentors[msg.sender] = MentorProfile({
            mentorAddress: msg.sender,
            name: name,
            bio: bio,
            expertise: expertise,
            totalBoosts: 0,
            successfulMentorships: 0,
            averageRating: 0,
            reputationScore: 100, // Start with good reputation
            stakingAmount: msg.value,
            isActive: true,
            joinedAt: block.timestamp
        });
        
        _grantRole(MENTOR_ROLE, msg.sender);
        
        emit MentorRegistered(msg.sender, name);
    }
    
    function requestBoost(
        address mentor,
        uint256 bootcampId,
        uint256 milestoneId,
        string memory submissionHash,
        string memory boostType,
        uint256 requestedAmount,
        string memory justification
    ) external whenNotPaused returns (uint256) {
        require(mentors[mentor].isActive, "Mentor not active");
        require(requestedAmount <= MAX_MICRO_REWARD, "Requested amount too high");
        require(bytes(justification).length > 0, "Justification required");
        
        _boostRequestIds++;
        uint256 requestId = _boostRequestIds;
        
        boostRequests[requestId] = BoostRequest({
            id: requestId,
            student: msg.sender,
            mentor: mentor,
            bootcampId: bootcampId,
            milestoneId: milestoneId,
            submissionHash: submissionHash,
            boostType: boostType,
            requestedAmount: requestedAmount,
            justification: justification,
            isApproved: false,
            isCompleted: false,
            createdAt: block.timestamp,
            processedAt: 0
        });
        
        emit BoostRequested(requestId, msg.sender, mentor);
        return requestId;
    }
    
    function approveBoost(uint256 requestId) external onlyRole(MENTOR_ROLE) whenNotPaused nonReentrant {
        BoostRequest storage request = boostRequests[requestId];
        require(request.mentor == msg.sender, "Not the assigned mentor");
        require(!request.isApproved, "Already approved");
        require(mentors[msg.sender].reputationScore >= REPUTATION_THRESHOLD, "Insufficient reputation");
        
        request.isApproved = true;
        request.processedAt = block.timestamp;
        
        // Issue micro reward if requested
        if (request.requestedAmount > 0) {
            _issueMicroReward(request.student, msg.sender, request.requestedAmount, request.justification);
        }
        
        // Update mentor stats
        mentors[msg.sender].totalBoosts++;
        
        // Start mentorship if not already active
        if (!activeMentorships[msg.sender][request.student]) {
            _startMentorship(msg.sender, request.student);
        }
        
        emit BoostApproved(requestId, request.requestedAmount);
    }
    
    function _issueMicroReward(
        address student,
        address mentor,
        uint256 amount,
        string memory reason
    ) private {
        require(totalRewardPool >= amount, "Insufficient reward pool");
        
        _microRewardIds++;
        uint256 rewardId = _microRewardIds;
        
        microRewards[rewardId] = MicroReward({
            id: rewardId,
            student: student,
            mentor: mentor,
            amount: amount,
            reason: reason,
            evidenceHash: "",
            timestamp: block.timestamp,
            isClaimed: false
        });
        
        // Update reward tracking
        mentorRewards[mentor].totalDistributed += amount;
        totalRewardPool -= amount;
        
        // Transfer reward to student
        payable(student).transfer(amount);
        
        emit MicroRewardIssued(rewardId, student, mentor, amount);
    }
    
    function _startMentorship(address mentor, address student) private {
        activeMentorships[mentor][student] = true;
        mentorStudents[mentor].push(student);
        studentMentors[student].push(mentor);
        
        emit MentorshipStarted(mentor, student);
    }
    
    function scheduleSession(
        address student,
        string memory sessionType,
        uint256 duration,
        uint256 scheduledTime
    ) external onlyRole(MENTOR_ROLE) whenNotPaused {
        require(activeMentorships[msg.sender][student], "Not an active mentorship");
        require(scheduledTime > block.timestamp, "Cannot schedule in the past");
        
        _sessionIds++;
        uint256 sessionId = _sessionIds;
        
        mentorshipSessions[sessionId] = MentorshipSession({
            id: sessionId,
            mentor: msg.sender,
            student: student,
            sessionType: sessionType,
            duration: duration,
            contentHash: "",
            studentRating: 0,
            feedback: "",
            scheduledAt: scheduledTime,
            completedAt: 0,
            isCompleted: false
        });
        
        emit SessionScheduled(sessionId, msg.sender, student);
    }
    
    function completeSession(
        uint256 sessionId,
        string memory contentHash
    ) external onlyRole(MENTOR_ROLE) whenNotPaused {
        MentorshipSession storage session = mentorshipSessions[sessionId];
        require(session.mentor == msg.sender, "Not the session mentor");
        require(!session.isCompleted, "Session already completed");
        require(block.timestamp >= session.scheduledAt, "Session not started yet");
        
        session.contentHash = contentHash;
        session.completedAt = block.timestamp;
        session.isCompleted = true;
        
        // Update mentor session count
        mentors[msg.sender].successfulMentorships++;
        
        // Reward mentor based on session completion
        _rewardMentor(msg.sender, session.duration);
    }
    
    function rateSession(uint256 sessionId, uint256 rating, string memory feedback) external whenNotPaused {
        MentorshipSession storage session = mentorshipSessions[sessionId];
        require(session.student == msg.sender, "Not the session student");
        require(session.isCompleted, "Session not completed");
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        require(session.studentRating == 0, "Already rated");
        
        session.studentRating = rating;
        session.feedback = feedback;
        
        // Update mentor average rating
        _updateMentorRating(session.mentor, rating);
        
        emit SessionCompleted(sessionId, rating);
    }
    
    function _updateMentorRating(address mentor, uint256 newRating) private {
        MentorProfile storage profile = mentors[mentor];
        
        if (profile.averageRating == 0) {
            profile.averageRating = newRating * 20; // Scale to 0-100
        } else {
            // Weighted average with more weight on recent ratings
            profile.averageRating = (profile.averageRating * 70 + newRating * 20 * 30) / 100;
        }
        
        // Update reputation based on rating
        if (newRating >= 4) {
            if (profile.reputationScore < 1000) {
                profile.reputationScore += 2;
            }
        } else if (newRating <= 2) {
            if (profile.reputationScore > 10) {
                profile.reputationScore -= 5;
            }
        }
    }
    
    function _rewardMentor(address mentor, uint256 sessionDuration) private {
        // Calculate reward based on session duration and mentor reputation
        uint256 baseReward = (sessionDuration * 0.001 ether) / 60; // Base rate per minute
        uint256 reputationMultiplier = mentors[mentor].reputationScore;
        uint256 totalReward = (baseReward * reputationMultiplier) / 100;
        
        if (totalReward > totalRewardPool) {
            totalReward = totalRewardPool;
        }
        
        if (totalReward > 0) {
            MentorRewards storage rewards = mentorRewards[mentor];
            rewards.totalEarned += totalReward;
            rewards.pendingRewards += totalReward;
            rewards.lastRewardTime = block.timestamp;
            
            totalRewardPool -= totalReward;
            
            emit MentorRewarded(mentor, totalReward);
        }
    }
    
    function claimRewards() external onlyRole(MENTOR_ROLE) whenNotPaused nonReentrant {
        MentorRewards storage rewards = mentorRewards[msg.sender];
        require(rewards.pendingRewards > 0, "No pending rewards");
        
        uint256 amount = rewards.pendingRewards;
        rewards.pendingRewards = 0;
        
        payable(msg.sender).transfer(amount);
    }
    
    function addExpertise(string memory newExpertise) external onlyRole(MENTOR_ROLE) {
        MentorProfile storage profile = mentors[msg.sender];
        require(profile.isActive, "Mentor not active");
        
        if (bytes(profile.expertise).length == 0) {
            profile.expertise = newExpertise;
        } else {
            profile.expertise = string(abi.encodePacked(profile.expertise, ",", newExpertise));
        }
    }
    
    // View functions
    function getMentorProfile(address mentor) external view returns (MentorProfile memory) {
        return mentors[mentor];
    }
    
    function getBoostRequest(uint256 requestId) external view returns (BoostRequest memory) {
        return boostRequests[requestId];
    }
    
    function getMentorshipSession(uint256 sessionId) external view returns (MentorshipSession memory) {
        return mentorshipSessions[sessionId];
    }
    
    function getMentorStudents(address mentor) external view returns (address[] memory) {
        return mentorStudents[mentor];
    }
    
    function getStudentMentors(address student) external view returns (address[] memory) {
        return studentMentors[student];
    }
    
    function getMentorRewards(address mentor) external view returns (MentorRewards memory) {
        return mentorRewards[mentor];
    }
    
    function isActiveMentorship(address mentor, address student) external view returns (bool) {
        return activeMentorships[mentor][student];
    }
    
    // Admin functions
    function addToRewardPool() external payable onlyRole(ADMIN_ROLE) {
        totalRewardPool += msg.value;
    }
    
    function emergencyWithdrawRewards(uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(amount <= totalRewardPool, "Insufficient pool balance");
        totalRewardPool -= amount;
        payable(msg.sender).transfer(amount);
    }
    
    function penalizeMentor(address mentor, uint256 penaltyAmount, string memory reason) 
        external onlyRole(ADMIN_ROLE) {
        require(mentors[mentor].isActive, "Mentor not active");
        require(penaltyAmount <= mentors[mentor].stakingAmount, "Penalty exceeds stake");
        
        mentors[mentor].stakingAmount -= penaltyAmount;
        mentors[mentor].reputationScore = mentors[mentor].reputationScore > 20 ? 
            mentors[mentor].reputationScore - 20 : 0;
        
        // Send penalty to reward pool
        totalRewardPool += penaltyAmount;
        
        if (mentors[mentor].stakingAmount < MIN_MENTOR_STAKE) {
            mentors[mentor].isActive = false;
            _revokeRole(MENTOR_ROLE, mentor);
        }
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    receive() external payable {
        totalRewardPool += msg.value;
    }
}