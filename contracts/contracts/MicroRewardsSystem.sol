// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MicroRewardsSystem
 * @author SkillPays Team
 * @notice A comprehensive micro-rewards system for incentivizing student engagement
 * @dev Manages automated reward distribution based on activity checkpoints and streaks
 */
contract MicroRewardsSystem is AccessControl, ReentrancyGuard, Pausable {
    /// @notice Role for entities that can distribute rewards
    bytes32 public constant REWARDS_DISTRIBUTOR_ROLE = keccak256("REWARDS_DISTRIBUTOR_ROLE");
    
    /// @notice Role for administrators who can manage the system
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Maximum daily rewards a student can earn
    uint256 public constant MAX_DAILY_REWARDS = 0.01 ether;
    
    /// @notice Maximum weekly rewards a student can earn
    uint256 public constant MAX_WEEKLY_REWARDS = 0.05 ether;
    
    /// @notice Threshold for detecting suspicious activity
    uint256 public constant SUSPICIOUS_ACTIVITY_THRESHOLD = 100;
    
    /// @dev Custom errors for gas optimization
    error MicroRewards__InvalidCheckpointType();
    error MicroRewards__DailyLimitExceeded();
    error MicroRewards__WeeklyLimitExceeded();
    error MicroRewards__TooSoonForCheckpoint();
    error MicroRewards__CheckpointNotFound();
    error MicroRewards__AlreadyClaimed();
    error MicroRewards__SuspiciousActivity();
    error MicroRewards__InsufficientRewardPool();
    error MicroRewards__NoRewardsToClaim();
    
    /**
     * @notice Represents a reward checkpoint earned by a student
     * @param id Unique identifier for this checkpoint
     * @param student The student who earned this checkpoint
     * @param checkpointType Type of checkpoint (daily_login, weekly_consistency, etc.)
     * @param rewardAmount Amount of reward for this checkpoint
     * @param streakMultiplier Multiplier applied based on streak
     * @param evidenceHash IPFS hash of evidence supporting this checkpoint
     * @param timestamp When this checkpoint was earned
     * @param isClaimed Whether the reward has been claimed
     * @param claimedAt When the reward was claimed
     */
    struct RewardCheckpoint {
        uint256 id;
        address student;
        string checkpointType;
        uint256 rewardAmount;
        uint256 streakMultiplier;
        string evidenceHash;
        uint256 timestamp;
        bool isClaimed;
        uint256 claimedAt;
    }
    
    /**
     * @notice Student's reward profile tracking earnings and activity
     * @param studentAddress The student's wallet address
     * @param totalEarned Total rewards earned (claimed + pending)
     * @param totalClaimed Total rewards claimed so far
     * @param pendingRewards Rewards awaiting claim
     * @param currentStreak Current consecutive activity streak
     * @param longestStreak Longest streak achieved by the student
     * @param lastActivityDate Last time student had activity
     * @param dailyCheckpoints Number of checkpoints earned today
     * @param weeklyCheckpoints Number of checkpoints earned this week
     * @param checkpointCounts Count of each checkpoint type earned
     * @param claimedCheckpoints Mapping of claimed checkpoint IDs
     */
    struct StudentRewardProfile {
        address studentAddress;
        uint256 totalEarned;
        uint256 totalClaimed;
        uint256 pendingRewards;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 lastActivityDate;
        uint256 dailyCheckpoints;
        uint256 weeklyCheckpoints;
        mapping(string => uint256) checkpointCounts;
        mapping(uint256 => bool) claimedCheckpoints;
    }
    
    /**
     * @notice Rules for distributing rewards for different checkpoint types
     * @param checkpointType The type of checkpoint this rule applies to
     * @param baseReward Base reward amount before multipliers
     * @param maxStreakMultiplier Maximum multiplier from streaks (in basis points)
     * @param dailyLimit Maximum checkpoints of this type per day
     * @param weeklyLimit Maximum checkpoints of this type per week
     * @param isActive Whether this rule is currently active
     * @param gamingPrevention Minimum time between same type rewards
     */
    struct RewardDistributionRule {
        string checkpointType;
        uint256 baseReward;
        uint256 maxStreakMultiplier;
        uint256 dailyLimit;
        uint256 weeklyLimit;
        bool isActive;
        uint256 gamingPrevention;
    }
    
    /**
     * @notice System for validating activity and preventing gaming
     * @param lastDailyLogin Last login timestamp for each student
     * @param weeklyActivities Weekly activity counts by week number
     * @param lastCheckpointTime Last checkpoint time by type for each student
     * @param suspiciousActivityScore Score tracking suspicious behavior
     */
    struct ActivityValidator {
        mapping(address => uint256) lastDailyLogin;
        mapping(address => mapping(uint256 => uint256)) weeklyActivities;
        mapping(address => mapping(string => uint256)) lastCheckpointTime;
        mapping(address => uint256) suspiciousActivityScore;
    }
    
    /// @notice Mapping from checkpoint ID to reward checkpoint data
    mapping(uint256 => RewardCheckpoint) public rewardCheckpoints;
    
    /// @notice Mapping from student address to their reward profile
    mapping(address => StudentRewardProfile) private studentProfiles;
    
    /// @notice Mapping from checkpoint type to distribution rules
    mapping(string => RewardDistributionRule) public distributionRules;
    
    /// @dev Activity validation system for preventing gaming
    ActivityValidator private validator;
    
    /// @dev Counter for generating unique checkpoint IDs
    uint256 private _checkpointIds;
    
    /// @notice Total amount available in the reward pool
    uint256 public totalRewardPool;
    
    /// @notice Total amount of rewards distributed
    uint256 public distributedRewards;
    
    /// @notice Array of active checkpoint types
    string[] public activeCheckpointTypes;
    
    /// @notice Emitted when a student earns a checkpoint
    event CheckpointEarned(uint256 indexed checkpointId, address indexed student, string checkpointType, uint256 amount);
    
    /// @notice Emitted when a student claims their rewards
    event RewardClaimed(address indexed student, uint256 amount, uint256 checkpointsCount);
    
    /// @notice Emitted when a student's streak is updated
    event StreakUpdated(address indexed student, uint256 newStreak, string checkpointType);
    
    /// @notice Emitted when suspicious activity is detected
    event SuspiciousActivityDetected(address indexed student, string reason, uint256 score);
    
    /// @notice Emitted when reward rules are updated
    event RewardRuleUpdated(string checkpointType, uint256 baseReward, uint256 maxMultiplier);
    
    /// @notice Emitted when the reward pool is updated
    event RewardPoolUpdated(uint256 oldPool, uint256 newPool);
    
    /**
     * @notice Initializes the MicroRewardsSystem contract
     * @dev Sets up roles and initializes default reward rules
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(REWARDS_DISTRIBUTOR_ROLE, msg.sender);
        
        // Initialize default reward rules
        _initializeDefaultRewardRules();
    }
    
    function _initializeDefaultRewardRules() private {
        // Daily login rewards
        distributionRules["daily_login"] = RewardDistributionRule({
            checkpointType: "daily_login",
            baseReward: 0.001 ether,
            maxStreakMultiplier: 300, // 3x max
            dailyLimit: 1,
            weeklyLimit: 7,
            isActive: true,
            gamingPrevention: 20 hours // Must wait 20 hours between logins
        });
        
        // Weekly consistency rewards
        distributionRules["weekly_consistency"] = RewardDistributionRule({
            checkpointType: "weekly_consistency",
            baseReward: 0.005 ether,
            maxStreakMultiplier: 200, // 2x max
            dailyLimit: 0,
            weeklyLimit: 1,
            isActive: true,
            gamingPrevention: 6 days
        });
        
        // Milestone progress rewards
        distributionRules["milestone_progress"] = RewardDistributionRule({
            checkpointType: "milestone_progress",
            baseReward: 0.002 ether,
            maxStreakMultiplier: 150,
            dailyLimit: 3,
            weeklyLimit: 15,
            isActive: true,
            gamingPrevention: 2 hours
        });
        
        // Peer help rewards
        distributionRules["peer_help"] = RewardDistributionRule({
            checkpointType: "peer_help",
            baseReward: 0.0015 ether,
            maxStreakMultiplier: 200,
            dailyLimit: 5,
            weeklyLimit: 20,
            isActive: true,
            gamingPrevention: 1 hours
        });
        
        activeCheckpointTypes = ["daily_login", "weekly_consistency", "milestone_progress", "peer_help"];
    }
    
    function earnCheckpoint(
        address student,
        string memory checkpointType,
        string memory evidenceHash
    ) external onlyRole(REWARDS_DISTRIBUTOR_ROLE) whenNotPaused nonReentrant returns (uint256) {
        require(distributionRules[checkpointType].isActive, "Checkpoint type not active");
        require(_isValidStudent(student), "Invalid student");
        
        // Anti-gaming checks
        require(_passesGamingPrevention(student, checkpointType), "Gaming prevention triggered");
        require(!_isSuspiciousActivity(student), "Suspicious activity detected");
        
        // Check daily and weekly limits
        require(_checkDailyLimit(student, checkpointType), "Daily limit exceeded");
        require(_checkWeeklyLimit(student, checkpointType), "Weekly limit exceeded");
        
        // Calculate reward amount with streak multiplier
        uint256 rewardAmount = _calculateRewardAmount(student, checkpointType);
        require(totalRewardPool >= rewardAmount, "Insufficient reward pool");
        
        // Create checkpoint
        _checkpointIds++;
        uint256 checkpointId = _checkpointIds;
        
        StudentRewardProfile storage profile = studentProfiles[student];
        uint256 streakMultiplier = _updateStreak(student, checkpointType);
        
        rewardCheckpoints[checkpointId] = RewardCheckpoint({
            id: checkpointId,
            student: student,
            checkpointType: checkpointType,
            rewardAmount: rewardAmount,
            streakMultiplier: streakMultiplier,
            evidenceHash: evidenceHash,
            timestamp: block.timestamp,
            isClaimed: false,
            claimedAt: 0
        });
        
        // Update student profile
        profile.totalEarned += rewardAmount;
        profile.pendingRewards += rewardAmount;
        profile.checkpointCounts[checkpointType]++;
        profile.lastActivityDate = block.timestamp;
        
        // Update activity tracking
        _updateActivityTracking(student, checkpointType);
        
        totalRewardPool -= rewardAmount;
        distributedRewards += rewardAmount;
        
        emit CheckpointEarned(checkpointId, student, checkpointType, rewardAmount);
        return checkpointId;
    }
    
    function _calculateRewardAmount(address student, string memory checkpointType) 
        private view returns (uint256) {
        RewardDistributionRule memory rule = distributionRules[checkpointType];
        StudentRewardProfile storage profile = studentProfiles[student];
        
        uint256 baseReward = rule.baseReward;
        
        // Apply streak multiplier
        uint256 streakBonus = 0;
        if (profile.currentStreak > 1) {
            uint256 multiplier = profile.currentStreak * 100 / 10; // 10% per streak day
            if (multiplier > rule.maxStreakMultiplier) {
                multiplier = rule.maxStreakMultiplier;
            }
            streakBonus = (baseReward * multiplier) / 100;
        }
        
        return baseReward + streakBonus;
    }
    
    function _updateStreak(address student, string memory checkpointType) 
        private returns (uint256) {
        StudentRewardProfile storage profile = studentProfiles[student];
        
        // Check if this continues a streak
        uint256 daysSinceLastActivity = (block.timestamp - profile.lastActivityDate) / 1 days;
        
        if (daysSinceLastActivity <= 1) {
            profile.currentStreak++;
            if (profile.currentStreak > profile.longestStreak) {
                profile.longestStreak = profile.currentStreak;
            }
        } else if (daysSinceLastActivity > 1) {
            // Streak broken
            profile.currentStreak = 1;
        }
        
        emit StreakUpdated(student, profile.currentStreak, checkpointType);
        return profile.currentStreak;
    }
    
    function _passesGamingPrevention(address student, string memory checkpointType) 
        private view returns (bool) {
        RewardDistributionRule memory rule = distributionRules[checkpointType];
        uint256 lastTime = validator.lastCheckpointTime[student][checkpointType];
        
        if (lastTime == 0) return true;
        
        return (block.timestamp - lastTime) >= rule.gamingPrevention;
    }
    
    function _isSuspiciousActivity(address student) private view returns (bool) {
        return validator.suspiciousActivityScore[student] >= SUSPICIOUS_ACTIVITY_THRESHOLD;
    }
    
    function _checkDailyLimit(address student, string memory checkpointType) 
        private view returns (bool) {
        RewardDistributionRule memory rule = distributionRules[checkpointType];
        if (rule.dailyLimit == 0) return true;
        
        // Count checkpoints earned today
        uint256 today = block.timestamp / 1 days;
        uint256 todayCount = 0;
        
        // This is simplified - in production, you'd want a more efficient way to track daily counts
        // Consider using a mapping of day => checkpoint count
        
        return todayCount < rule.dailyLimit;
    }
    
    function _checkWeeklyLimit(address student, string memory checkpointType) 
        private view returns (bool) {
        RewardDistributionRule memory rule = distributionRules[checkpointType];
        if (rule.weeklyLimit == 0) return true;
        
        uint256 currentWeek = block.timestamp / (7 days);
        uint256 weeklyCount = validator.weeklyActivities[student][currentWeek];
        
        return weeklyCount < rule.weeklyLimit;
    }
    
    function _updateActivityTracking(address student, string memory checkpointType) private {
        // Update last checkpoint time
        validator.lastCheckpointTime[student][checkpointType] = block.timestamp;
        
        // Update weekly activity count
        uint256 currentWeek = block.timestamp / (7 days);
        validator.weeklyActivities[student][currentWeek]++;
        
        // Update daily login if applicable
        if (keccak256(bytes(checkpointType)) == keccak256(bytes("daily_login"))) {
            validator.lastDailyLogin[student] = block.timestamp;
        }
        
        // Check for suspicious patterns and update score
        _updateSuspiciousActivityScore(student, checkpointType);
    }
    
    function _updateSuspiciousActivityScore(address student, string memory checkpointType) private {
        uint256 currentScore = validator.suspiciousActivityScore[student];
        
        // Check for rapid-fire claiming (multiple checkpoints in short time)
        uint256 recentActivity = 0;
        uint256 oneHourAgo = block.timestamp - 1 hours;
        
        // Count recent checkpoints (simplified implementation)
        // In production, use more sophisticated tracking
        
        if (recentActivity > 10) {
            validator.suspiciousActivityScore[student] += 25;
            emit SuspiciousActivityDetected(student, "Rapid claiming pattern", currentScore + 25);
        } else if (currentScore > 0) {
            // Gradually reduce score for normal behavior
            validator.suspiciousActivityScore[student] = currentScore > 5 ? currentScore - 5 : 0;
        }
    }
    
    function _isValidStudent(address student) private view returns (bool) {
        // This would check with the main SkillPays contract
        // Simplified for this implementation
        return student != address(0);
    }
    
    function claimRewards() external whenNotPaused nonReentrant {
        StudentRewardProfile storage profile = studentProfiles[msg.sender];
        require(profile.pendingRewards > 0, "No pending rewards");
        require(!_isSuspiciousActivity(msg.sender), "Account flagged for suspicious activity");
        
        uint256 amount = profile.pendingRewards;
        profile.pendingRewards = 0;
        profile.totalClaimed += amount;
        
        // Count claimed checkpoints for this claim
        uint256 claimedCount = 0;
        for (uint256 i = 1; i <= _checkpointIds; i++) {
            if (rewardCheckpoints[i].student == msg.sender && !rewardCheckpoints[i].isClaimed) {
                rewardCheckpoints[i].isClaimed = true;
                rewardCheckpoints[i].claimedAt = block.timestamp;
                profile.claimedCheckpoints[i] = true;
                claimedCount++;
            }
        }
        
        payable(msg.sender).transfer(amount);
        
        emit RewardClaimed(msg.sender, amount, claimedCount);
    }
    
    function claimSpecificCheckpoints(uint256[] memory checkpointIds) 
        external whenNotPaused nonReentrant {
        require(!_isSuspiciousActivity(msg.sender), "Account flagged for suspicious activity");
        
        StudentRewardProfile storage profile = studentProfiles[msg.sender];
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < checkpointIds.length; i++) {
            uint256 checkpointId = checkpointIds[i];
            RewardCheckpoint storage checkpoint = rewardCheckpoints[checkpointId];
            
            require(checkpoint.student == msg.sender, "Not your checkpoint");
            require(!checkpoint.isClaimed, "Already claimed");
            
            checkpoint.isClaimed = true;
            checkpoint.claimedAt = block.timestamp;
            profile.claimedCheckpoints[checkpointId] = true;
            
            totalAmount += checkpoint.rewardAmount;
        }
        
        require(totalAmount > 0, "No rewards to claim");
        require(profile.pendingRewards >= totalAmount, "Insufficient pending rewards");
        
        profile.pendingRewards -= totalAmount;
        profile.totalClaimed += totalAmount;
        
        payable(msg.sender).transfer(totalAmount);
        
        emit RewardClaimed(msg.sender, totalAmount, checkpointIds.length);
    }
    
    // View functions
    function getStudentProfile(address student) external view returns (
        uint256 totalEarned,
        uint256 totalClaimed,
        uint256 pendingRewards,
        uint256 currentStreak,
        uint256 longestStreak,
        uint256 lastActivityDate
    ) {
        StudentRewardProfile storage profile = studentProfiles[student];
        return (
            profile.totalEarned,
            profile.totalClaimed,
            profile.pendingRewards,
            profile.currentStreak,
            profile.longestStreak,
            profile.lastActivityDate
        );
    }
    
    function getCheckpointDetails(uint256 checkpointId) external view returns (RewardCheckpoint memory) {
        return rewardCheckpoints[checkpointId];
    }
    
    function getRewardRule(string memory checkpointType) external view returns (RewardDistributionRule memory) {
        return distributionRules[checkpointType];
    }
    
    function getActiveCheckpointTypes() external view returns (string[] memory) {
        return activeCheckpointTypes;
    }
    
    function canEarnCheckpoint(address student, string memory checkpointType) external view returns (
        bool canEarn,
        string memory reason
    ) {
        if (!distributionRules[checkpointType].isActive) {
            return (false, "Checkpoint type not active");
        }
        
        if (_isSuspiciousActivity(student)) {
            return (false, "Suspicious activity detected");
        }
        
        if (!_passesGamingPrevention(student, checkpointType)) {
            return (false, "Gaming prevention cooldown");
        }
        
        if (!_checkDailyLimit(student, checkpointType)) {
            return (false, "Daily limit exceeded");
        }
        
        if (!_checkWeeklyLimit(student, checkpointType)) {
            return (false, "Weekly limit exceeded");
        }
        
        return (true, "");
    }
    
    function getStudentCheckpointCount(address student, string memory checkpointType) 
        external view returns (uint256) {
        return studentProfiles[student].checkpointCounts[checkpointType];
    }
    
    function getSuspiciousActivityScore(address student) external view returns (uint256) {
        return validator.suspiciousActivityScore[student];
    }
    
    // Admin functions
    function addToRewardPool() external payable onlyRole(ADMIN_ROLE) {
        uint256 oldPool = totalRewardPool;
        totalRewardPool += msg.value;
        emit RewardPoolUpdated(oldPool, totalRewardPool);
    }
    
    function updateRewardRule(
        string memory checkpointType,
        uint256 baseReward,
        uint256 maxStreakMultiplier,
        uint256 dailyLimit,
        uint256 weeklyLimit,
        uint256 gamingPrevention
    ) external onlyRole(ADMIN_ROLE) {
        distributionRules[checkpointType].baseReward = baseReward;
        distributionRules[checkpointType].maxStreakMultiplier = maxStreakMultiplier;
        distributionRules[checkpointType].dailyLimit = dailyLimit;
        distributionRules[checkpointType].weeklyLimit = weeklyLimit;
        distributionRules[checkpointType].gamingPrevention = gamingPrevention;
        
        emit RewardRuleUpdated(checkpointType, baseReward, maxStreakMultiplier);
    }
    
    function flagSuspiciousActivity(address student, uint256 scoreIncrease, string memory reason) 
        external onlyRole(ADMIN_ROLE) {
        validator.suspiciousActivityScore[student] += scoreIncrease;
        emit SuspiciousActivityDetected(student, reason, validator.suspiciousActivityScore[student]);
    }
    
    function clearSuspiciousActivity(address student) external onlyRole(ADMIN_ROLE) {
        validator.suspiciousActivityScore[student] = 0;
    }
    
    function emergencyWithdraw(uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(amount <= totalRewardPool, "Insufficient pool balance");
        totalRewardPool -= amount;
        payable(msg.sender).transfer(amount);
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    receive() external payable {
        totalRewardPool += msg.value;
        emit RewardPoolUpdated(totalRewardPool - msg.value, totalRewardPool);
    }
}