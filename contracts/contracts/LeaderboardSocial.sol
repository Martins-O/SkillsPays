// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LeaderboardSocial
 * @author SkillPays Team
 * @notice A comprehensive leaderboard and social interaction system for students
 * @dev Manages student profiles, connections, achievements, and competitive rankings
 */
contract LeaderboardSocial is AccessControl, Pausable, ReentrancyGuard {
    /// @notice Role for entities that can update student scores
    bytes32 public constant SCORE_UPDATER_ROLE =
        keccak256("SCORE_UPDATER_ROLE");

    /// @notice Role for administrators who can manage the system
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Maximum number of entries per leaderboard
    uint256 public constant MAX_LEADERBOARD_SIZE = 100;

    /// @notice Grace period for maintaining streak (in seconds)
    uint256 public constant STREAK_GRACE_PERIOD = 2 days;

    /// @dev Custom errors for gas optimization
    error LeaderboardSocial__ProfileAlreadyExists();
    error LeaderboardSocial__ProfileNotFound();
    error LeaderboardSocial__InvalidConnectionType();
    error LeaderboardSocial__ConnectionAlreadyExists();
    error LeaderboardSocial__CannotConnectToSelf();
    error LeaderboardSocial__ConnectionNotFound();
    error LeaderboardSocial__LeaderboardNotFound();
    error LeaderboardSocial__AchievementNotFound();
    error LeaderboardSocial__InvalidScore();

    /**
     * @notice Represents an entry in a leaderboard
     * @param student The address of the student
     * @param score The student's score in this category
     * @param rank The student's current rank
     * @param badgeCount Number of badges earned by the student
     * @param streakDays Current streak in days
     * @param lastActiveDate When the student was last active
     * @param displayName The student's display name
     */
    struct LeaderboardEntry {
        address student;
        uint256 score;
        uint256 rank;
        uint256 badgeCount;
        uint256 streakDays;
        uint256 lastActiveDate;
        string displayName;
    }

    /**
     * @notice Student's social profile information
     * @param studentAddress The student's wallet address
     * @param displayName Public display name
     * @param bio Student's biography/description
     * @param profileImageHash IPFS hash of profile image
     * @param totalScore Total accumulated score
     * @param currentStreak Current daily activity streak
     * @param longestStreak Longest streak achieved
     * @param lastActiveDate Last time student was active
     * @param totalBadges Number of badges earned
     * @param totalConnections Number of social connections
     * @param isPublic Whether profile is publicly visible
     * @param joinedAt When the student joined
     */
    struct StudentSocialProfile {
        address studentAddress;
        string displayName;
        string bio;
        string profileImageHash;
        uint256 totalScore;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 lastActiveDate;
        uint256 totalBadges;
        uint256 totalConnections;
        bool isPublic;
        uint256 joinedAt;
    }

    /**
     * @notice Represents a social connection between students
     * @param requester The student who initiated the connection
     * @param target The student who received the request
     * @param isAccepted Whether the connection has been accepted
     * @param connectionType Type of connection (0=friend, 1=mentor, 2=collaborator)
     * @param createdAt When the connection was created
     * @param connectionNote Optional note about the connection
     */
    struct SocialConnection {
        address requester;
        address target;
        bool isAccepted;
        uint256 connectionType;
        uint256 createdAt;
        string connectionNote;
    }

    /**
     * @notice Represents an achievement that students can earn
     * @param id Unique identifier for this achievement
     * @param name Display name of the achievement
     * @param description Detailed description
     * @param iconHash IPFS hash of the achievement icon
     * @param requiredScore Minimum score required
     * @param requiredBadges Minimum badges required
     * @param requiredStreak Minimum streak required
     * @param isActive Whether this achievement can still be earned
     * @param totalEarned How many students have earned this
     */
    struct Achievement {
        uint256 id;
        string name;
        string description;
        string iconHash;
        uint256 requiredScore;
        uint256 requiredBadges;
        uint256 requiredStreak;
        bool isActive;
        uint256 totalEarned;
    }

    /**
     * @notice Represents a leaderboard category
     * @param name Name of the leaderboard category
     * @param scores Mapping from student address to their score
     * @param participants Array of participating students
     * @param lastUpdated When this leaderboard was last updated
     * @param isActive Whether this leaderboard is currently active
     */
    struct LeaderboardCategory {
        string name;
        mapping(address => uint256) scores;
        address[] participants;
        uint256 lastUpdated;
        bool isActive;
    }

    /// @notice Mapping from student address to their social profile
    mapping(address => StudentSocialProfile) public profiles;

    /// @notice Mapping to check if two students are connected
    mapping(address => mapping(address => bool)) public connections;

    /// @notice Mapping from connection hash to connection details
    mapping(bytes32 => SocialConnection) public connectionRequests;

    /// @notice Mapping from user to their connection request hashes
    mapping(address => bytes32[]) public userConnections;

    /// @notice Mapping to track which achievements each user has earned
    mapping(address => mapping(uint256 => bool)) public userAchievements;

    /// @notice Mapping from achievement ID to achievement details
    mapping(uint256 => Achievement) public achievements;

    /// @notice Mapping from category name to leaderboard data
    mapping(string => LeaderboardCategory) private leaderboards;

    /// @notice Mapping from category to array of leaderboard entries
    mapping(string => LeaderboardEntry[]) public leaderboardEntries;

    /// @notice Mapping from category and student to their position
    mapping(string => mapping(address => uint256)) public leaderboardPositions;

    /// @notice Array of active leaderboard names
    string[] public activeLeaderboards;

    /// @dev Counter for generating unique achievement IDs
    uint256 private _achievementIds;

    /// @notice Emitted when a new student profile is created
    event ProfileCreated(address indexed student, string displayName);

    /// @notice Emitted when a student profile is updated
    event ProfileUpdated(address indexed student);

    /// @notice Emitted when a connection request is made
    event ConnectionRequested(
        address indexed requester,
        address indexed target
    );

    /// @notice Emitted when a connection is accepted
    event ConnectionAccepted(address indexed requester, address indexed target);

    /// @notice Emitted when a student's score is updated
    event ScoreUpdated(
        address indexed student,
        string category,
        uint256 newScore,
        uint256 oldScore
    );

    /// @notice Emitted when a student's rank changes
    event RankChanged(
        address indexed student,
        string category,
        uint256 newRank,
        uint256 oldRank
    );

    /// @notice Emitted when a student's streak is updated
    event StreakUpdated(address indexed student, uint256 newStreak);

    /// @notice Emitted when a student earns an achievement
    event AchievementEarned(address indexed student, uint256 achievementId);

    /// @notice Emitted when a new leaderboard is created
    event LeaderboardCreated(string category);

    /**
     * @notice Initializes the LeaderboardSocial contract
     * @dev Sets up roles and creates default leaderboards
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(SCORE_UPDATER_ROLE, msg.sender);

        // Initialize default leaderboards
        _createLeaderboard("overall");
        _createLeaderboard("monthly");
        _createLeaderboard("badges");
        _createLeaderboard("streak");

        // Initialize default achievements
        _createDefaultAchievements();
    }

    /**
     * @notice Creates a new student social profile
     * @param displayName Public display name for the student
     * @param bio Biography or description
     * @param profileImageHash IPFS hash of profile image
     * @param isPublic Whether the profile should be publicly visible
     * @dev Profile can only be created once per address
     */
    function createProfile(
        string memory displayName,
        string memory bio,
        string memory profileImageHash,
        bool isPublic
    ) external whenNotPaused {
        if (bytes(displayName).length == 0)
            revert LeaderboardSocial__InvalidScore();
        if (_profileExists(msg.sender))
            revert LeaderboardSocial__ProfileAlreadyExists();

        profiles[msg.sender] = StudentSocialProfile({
            studentAddress: msg.sender,
            displayName: displayName,
            bio: bio,
            profileImageHash: profileImageHash,
            totalScore: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: block.timestamp,
            totalBadges: 0,
            totalConnections: 0,
            isPublic: isPublic,
            joinedAt: block.timestamp
        });

        emit ProfileCreated(msg.sender, displayName);
    }

    /**
     * @notice Updates an existing student social profile
     * @param displayName New display name
     * @param bio New biography
     * @param profileImageHash New profile image hash
     * @param isPublic New privacy setting
     * @dev Profile must exist to be updated
     */
    function updateProfile(
        string memory displayName,
        string memory bio,
        string memory profileImageHash,
        bool isPublic
    ) external whenNotPaused {
        if (!_profileExists(msg.sender))
            revert LeaderboardSocial__ProfileNotFound();

        StudentSocialProfile storage profile = profiles[msg.sender];
        profile.displayName = displayName;
        profile.bio = bio;
        profile.profileImageHash = profileImageHash;
        profile.isPublic = isPublic;

        emit ProfileUpdated(msg.sender);
    }

    function updateScore(
        address student,
        string memory category,
        uint256 newScore,
        uint256 badgeCount
    ) external onlyRole(SCORE_UPDATER_ROLE) whenNotPaused {
        require(_profileExists(student), "Profile does not exist");

        uint256 oldScore = leaderboards[category].scores[student];
        leaderboards[category].scores[student] = newScore;

        // Update profile
        StudentSocialProfile storage profile = profiles[student];
        profile.totalScore = newScore;
        profile.totalBadges = badgeCount;

        // Update streak
        _updateStreak(student);

        // Update leaderboard position
        _updateLeaderboardPosition(student, category);

        // Check for new achievements
        _checkAchievements(student);

        emit ScoreUpdated(student, category, newScore, oldScore);
    }

    function _updateStreak(address student) private {
        StudentSocialProfile storage profile = profiles[student];
        uint256 daysSinceLastActive = (block.timestamp -
            profile.lastActiveDate) / 1 days;

        if (daysSinceLastActive <= 1) {
            // Continue or start streak
            if (daysSinceLastActive == 1) {
                profile.currentStreak++;
                if (profile.currentStreak > profile.longestStreak) {
                    profile.longestStreak = profile.currentStreak;
                }
                emit StreakUpdated(student, profile.currentStreak);
            }
        } else if (daysSinceLastActive > STREAK_GRACE_PERIOD / 1 days) {
            // Break streak if too many days inactive
            if (profile.currentStreak > 0) {
                profile.currentStreak = 0;
                emit StreakUpdated(student, 0);
            }
        }

        profile.lastActiveDate = block.timestamp;
    }

    function _updateLeaderboardPosition(
        address student,
        string memory category
    ) private {
        LeaderboardEntry[] storage entries = leaderboardEntries[category];
        uint256 studentScore = leaderboards[category].scores[student];

        // Find current position
        uint256 currentPosition = leaderboardPositions[category][student];
        bool isNewEntry = currentPosition == 0;

        if (isNewEntry) {
            // Add new entry
            entries.push(
                LeaderboardEntry({
                    student: student,
                    score: studentScore,
                    rank: entries.length,
                    badgeCount: profiles[student].totalBadges,
                    streakDays: profiles[student].currentStreak,
                    lastActiveDate: profiles[student].lastActiveDate,
                    displayName: profiles[student].displayName
                })
            );
            leaderboardPositions[category][student] = entries.length;
        } else {
            // Update existing entry
            entries[currentPosition - 1].score = studentScore;
            entries[currentPosition - 1].badgeCount = profiles[student]
                .totalBadges;
            entries[currentPosition - 1].streakDays = profiles[student]
                .currentStreak;
            entries[currentPosition - 1].lastActiveDate = block.timestamp;
        }

        // Resort leaderboard (bubble sort for simplicity)
        _sortLeaderboard(category);

        // Trim to max size
        if (entries.length > MAX_LEADERBOARD_SIZE) {
            entries.pop();
        }

        leaderboards[category].lastUpdated = block.timestamp;
    }

    function _sortLeaderboard(string memory category) private {
        LeaderboardEntry[] storage entries = leaderboardEntries[category];

        for (uint256 i = 0; i < entries.length; i++) {
            for (uint256 j = 0; j < entries.length - 1 - i; j++) {
                if (entries[j].score < entries[j + 1].score) {
                    // Swap entries
                    LeaderboardEntry memory temp = entries[j];
                    entries[j] = entries[j + 1];
                    entries[j + 1] = temp;
                }
            }
        }

        // Update ranks and positions
        for (uint256 i = 0; i < entries.length; i++) {
            entries[i].rank = i + 1;
            leaderboardPositions[category][entries[i].student] = i + 1;
        }
    }

    function sendConnectionRequest(
        address target,
        uint256 connectionType,
        string memory note
    ) external whenNotPaused {
        require(_profileExists(msg.sender), "Sender profile does not exist");
        require(_profileExists(target), "Target profile does not exist");
        require(msg.sender != target, "Cannot connect to yourself");
        require(!connections[msg.sender][target], "Already connected");

        bytes32 requestId = keccak256(
            abi.encodePacked(msg.sender, target, block.timestamp)
        );

        connectionRequests[requestId] = SocialConnection({
            requester: msg.sender,
            target: target,
            isAccepted: false,
            connectionType: connectionType,
            createdAt: block.timestamp,
            connectionNote: note
        });

        emit ConnectionRequested(msg.sender, target);
    }

    function acceptConnection(bytes32 requestId) external whenNotPaused {
        SocialConnection storage request = connectionRequests[requestId];
        require(request.target == msg.sender, "Not the target of this request");
        require(!request.isAccepted, "Already accepted");

        request.isAccepted = true;

        // Create bidirectional connection
        connections[request.requester][request.target] = true;
        connections[request.target][request.requester] = true;

        // Update connection counts
        profiles[request.requester].totalConnections++;
        profiles[request.target].totalConnections++;

        // Store connection reference
        userConnections[request.requester].push(requestId);
        userConnections[request.target].push(requestId);

        emit ConnectionAccepted(request.requester, request.target);
    }

    function _checkAchievements(address student) private {
        StudentSocialProfile memory profile = profiles[student];

        for (uint256 i = 1; i <= _achievementIds; i++) {
            if (!userAchievements[student][i] && achievements[i].isActive) {
                Achievement memory achievement = achievements[i];

                bool earned = true;
                if (
                    achievement.requiredScore > 0 &&
                    profile.totalScore < achievement.requiredScore
                ) {
                    earned = false;
                }
                if (
                    achievement.requiredBadges > 0 &&
                    profile.totalBadges < achievement.requiredBadges
                ) {
                    earned = false;
                }
                if (
                    achievement.requiredStreak > 0 &&
                    profile.longestStreak < achievement.requiredStreak
                ) {
                    earned = false;
                }

                if (earned) {
                    userAchievements[student][i] = true;
                    achievements[i].totalEarned++;
                    emit AchievementEarned(student, i);
                }
            }
        }
    }

    function _createDefaultAchievements() private {
        _createAchievement(
            "First Steps",
            "Complete your first milestone",
            "",
            10,
            1,
            0
        );
        _createAchievement("Badge Collector", "Earn 10 badges", "", 0, 10, 0);
        _createAchievement(
            "Dedicated Learner",
            "Maintain a 7-day streak",
            "",
            0,
            0,
            7
        );
        _createAchievement(
            "Rising Star",
            "Reach 500 skill points",
            "",
            500,
            0,
            0
        );
        _createAchievement("Master Student", "Earn 50 badges", "", 0, 50, 0);
        _createAchievement(
            "Streak Master",
            "Maintain a 30-day streak",
            "",
            0,
            0,
            30
        );
        _createAchievement(
            "Elite Learner",
            "Reach 2000 skill points",
            "",
            2000,
            0,
            0
        );
        _createAchievement("Badge Legend", "Earn 100 badges", "", 0, 100, 0);
    }

    function _createAchievement(
        string memory name,
        string memory description,
        string memory iconHash,
        uint256 requiredScore,
        uint256 requiredBadges,
        uint256 requiredStreak
    ) private {
        _achievementIds++;
        achievements[_achievementIds] = Achievement({
            id: _achievementIds,
            name: name,
            description: description,
            iconHash: iconHash,
            requiredScore: requiredScore,
            requiredBadges: requiredBadges,
            requiredStreak: requiredStreak,
            isActive: true,
            totalEarned: 0
        });
    }

    function _createLeaderboard(string memory category) private {
        leaderboards[category].name = category;
        leaderboards[category].isActive = true;
        leaderboards[category].lastUpdated = block.timestamp;
        activeLeaderboards.push(category);

        emit LeaderboardCreated(category);
    }

    function _profileExists(address student) private view returns (bool) {
        return profiles[student].studentAddress != address(0);
    }

    // View functions
    function getProfile(
        address student
    ) external view returns (StudentSocialProfile memory) {
        return profiles[student];
    }

    function getLeaderboard(
        string memory category
    ) external view returns (LeaderboardEntry[] memory) {
        return leaderboardEntries[category];
    }

    function getLeaderboardPosition(
        address student,
        string memory category
    ) external view returns (uint256) {
        return leaderboardPositions[category][student];
    }

    function getUserConnections(
        address user
    ) external view returns (bytes32[] memory) {
        return userConnections[user];
    }

    function getConnectionRequest(
        bytes32 requestId
    ) external view returns (SocialConnection memory) {
        return connectionRequests[requestId];
    }

    function getAchievement(
        uint256 achievementId
    ) external view returns (Achievement memory) {
        return achievements[achievementId];
    }

    function getUserAchievements(
        address user
    ) external view returns (uint256[] memory) {
        uint256[] memory earnedAchievements = new uint256[](_achievementIds);
        uint256 count = 0;

        for (uint256 i = 1; i <= _achievementIds; i++) {
            if (userAchievements[user][i]) {
                earnedAchievements[count] = i;
                count++;
            }
        }

        // Trim array to actual size
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = earnedAchievements[i];
        }

        return result;
    }

    function getActiveLeaderboards() external view returns (string[] memory) {
        return activeLeaderboards;
    }

    function isConnected(
        address user1,
        address user2
    ) external view returns (bool) {
        return connections[user1][user2];
    }

    // Admin functions
    function createLeaderboard(
        string memory category
    ) external onlyRole(ADMIN_ROLE) {
        require(!leaderboards[category].isActive, "Leaderboard already exists");
        _createLeaderboard(category);
    }

    function createAchievement(
        string memory name,
        string memory description,
        string memory iconHash,
        uint256 requiredScore,
        uint256 requiredBadges,
        uint256 requiredStreak
    ) external onlyRole(ADMIN_ROLE) {
        _createAchievement(
            name,
            description,
            iconHash,
            requiredScore,
            requiredBadges,
            requiredStreak
        );
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
