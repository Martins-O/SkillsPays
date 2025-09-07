// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PeerReviewSystem
 * @author SkillPays Team
 * @notice A comprehensive peer review system with anti-collusion mechanisms
 * @dev This contract manages peer reviews for student submissions with reputation staking
 */
contract PeerReviewSystem is AccessControl, ReentrancyGuard, Pausable {
    /// @notice Role for registered reviewers who can submit reviews
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");
    
    /// @notice Role for administrators who can manage the system
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Minimum number of reviews required per request
    uint256 public constant MIN_REVIEWS_REQUIRED = 3;
    
    /// @notice Maximum number of reviews allowed per request
    uint256 public constant MAX_REVIEWS_PER_REQUEST = 7;
    
    /// @notice Minimum stake required to become a reviewer
    uint256 public constant MIN_REVIEWER_STAKE = 0.1 ether;
    
    /// @notice Deadline for completing reviews (in hours)
    uint256 public constant REVIEW_DEADLINE_HOURS = 72;
    
    /// @notice Maximum reviews per reviewer per day (anti-spam)
    uint256 public constant MAX_REVIEWS_PER_REVIEWER_PER_DAY = 10;
    
    /// @notice Minimum time between reviews of the same student
    uint256 public constant MIN_TIME_BETWEEN_REVIEWS_SAME_STUDENT = 24 hours;
    
    /// @dev Custom errors for gas optimization
    error PeerReview__InsufficientStake();
    error PeerReview__AlreadyRegistered();
    error PeerReview__NotEnoughRequiredReviews();
    error PeerReview__TooManyRequiredReviews();
    error PeerReview__ReviewCompleted();
    error PeerReview__DeadlinePassed();
    error PeerReview__AlreadyReviewed();
    error PeerReview__InvalidScore();
    error PeerReview__CannotSelfReview();
    error PeerReview__AntiCollusionFailed();
    error PeerReview__ReviewNotCompleted();
    error PeerReview__InvalidReviewIndex();
    error PeerReview__ReviewerNotActive();
    
    /**
     * @notice Represents a review request for student submissions
     * @param id Unique identifier for this request
     * @param student The student who submitted work for review
     * @param bootcampId The ID of the bootcamp this submission belongs to
     * @param milestoneId The ID of the milestone being reviewed
     * @param submissionHash IPFS hash of the submission
     * @param createdAt Timestamp when the request was created
     * @param deadline Deadline for completing all reviews
     * @param isCompleted Whether all required reviews have been submitted
     * @param requiredReviews Number of reviews needed
     * @param completedReviews Number of reviews submitted so far
     */
    struct ReviewRequest {
        uint256 id;
        address student;
        uint256 bootcampId;
        uint256 milestoneId;
        string submissionHash;
        uint256 createdAt;
        uint256 deadline;
        bool isCompleted;
        uint256 requiredReviews;
        uint256 completedReviews;
    }
    
    /**
     * @notice Represents a single review from a peer reviewer
     * @param requestId The ID of the review request this belongs to
     * @param reviewer The address of the reviewer
     * @param score Numerical score from 0-100
     * @param feedback Textual feedback for the student
     * @param evidenceHash IPFS hash of review evidence/justification
     * @param submittedAt Timestamp when review was submitted
     * @param isVerified Whether this review has been verified
     * @param helpfulnessScore Peer rating of review quality (0-100)
     */
    struct Review {
        uint256 requestId;
        address reviewer;
        uint256 score;
        string feedback;
        string evidenceHash;
        uint256 submittedAt;
        bool isVerified;
        uint256 helpfulnessScore;
    }
    
    /**
     * @notice Profile information for registered peer reviewers
     * @param reviewerAddress The reviewer's address
     * @param totalReviews Total number of reviews completed
     * @param averageScore Average score given across all reviews
     * @param reputationScore Reputation score (0-1000)
     * @param specializations Bitmap representing areas of expertise
     * @param isActive Whether the reviewer is currently active
     * @param stakingAmount Amount of ETH staked by the reviewer
     * @param joinedAt Timestamp when reviewer registered
     */
    struct ReviewerProfile {
        address reviewerAddress;
        uint256 totalReviews;
        uint256 averageScore;
        uint256 reputationScore;
        uint256 specializations;
        bool isActive;
        uint256 stakingAmount;
        uint256 joinedAt;
    }
    
    /**
     * @notice Anti-collusion tracking metrics
     * @param reviewHistory Tracks review count between reviewer-student pairs
     * @param recentReviews Tracks recent review timestamps for each reviewer
     * @param requestReviewers Maps request IDs to their reviewers
     * @param reviewerReputationStake Tracks reputation stakes for slashing
     */
    struct AntiCollusionMetrics {
        mapping(address => mapping(address => uint256)) reviewHistory;
        mapping(address => uint256[]) recentReviews;
        mapping(uint256 => address[]) requestReviewers;
        mapping(address => uint256) reviewerReputationStake;
    }
    
    /// @notice Mapping from request ID to review request data
    mapping(uint256 => ReviewRequest) public reviewRequests;
    
    /// @notice Mapping from request ID to array of reviews
    mapping(uint256 => Review[]) public requestReviews;
    
    /// @notice Mapping from reviewer address to their profile
    mapping(address => ReviewerProfile) public reviewerProfiles;
    
    /// @notice Tracks whether a reviewer has reviewed a specific request
    mapping(uint256 => mapping(address => bool)) public hasReviewed;
    
    /// @dev Anti-collusion metrics for detecting suspicious behavior
    AntiCollusionMetrics private antiCollusion;
    
    /// @dev Counter for generating unique request IDs
    uint256 private _requestIds;
    
    /// @notice Emitted when a new review request is created
    event ReviewRequestCreated(uint256 indexed requestId, address indexed student, uint256 bootcampId);
    
    /// @notice Emitted when a reviewer submits a review
    event ReviewSubmitted(uint256 indexed requestId, address indexed reviewer, uint256 score);
    
    /// @notice Emitted when a new reviewer registers
    event ReviewerRegistered(address indexed reviewer, uint256 stakingAmount);
    
    /// @notice Emitted when all required reviews are completed
    event ReviewCompleted(uint256 indexed requestId, uint256 averageScore);
    
    /// @notice Emitted when potential collusion is detected
    event CollusionDetected(address indexed reviewer, address indexed student, string reason);
    
    /// @notice Emitted when a reviewer is penalized
    event ReviewerPenalized(address indexed reviewer, uint256 penaltyAmount, string reason);
    
    /**
     * @notice Initializes the PeerReviewSystem contract
     * @dev Sets up admin roles for contract management
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @notice Registers a new peer reviewer with staking requirement
     * @param specializations Bitmap representing reviewer's areas of expertise
     * @dev Requires minimum stake and reviewer must not be already registered
     */
    function registerAsReviewer(uint256 specializations) external payable whenNotPaused {
        if (msg.value < MIN_REVIEWER_STAKE) revert PeerReview__InsufficientStake();
        if (reviewerProfiles[msg.sender].isActive) revert PeerReview__AlreadyRegistered();
        
        reviewerProfiles[msg.sender] = ReviewerProfile({
            reviewerAddress: msg.sender,
            totalReviews: 0,
            averageScore: 0,
            reputationScore: 100, // Start with 100 reputation
            specializations: specializations,
            isActive: true,
            stakingAmount: msg.value,
            joinedAt: block.timestamp
        });
        
        antiCollusion.reviewerReputationStake[msg.sender] = msg.value;
        
        _grantRole(REVIEWER_ROLE, msg.sender);
        
        emit ReviewerRegistered(msg.sender, msg.value);
    }
    
    /**
     * @notice Creates a new review request for a student submission
     * @param student The address of the student whose work needs review
     * @param bootcampId The ID of the bootcamp this submission belongs to
     * @param milestoneId The ID of the milestone being reviewed
     * @param submissionHash IPFS hash of the student's submission
     * @param requiredReviews Number of reviews required for completion
     * @return requestId The ID of the newly created review request
     * @dev Only admins can create review requests
     */
    function createReviewRequest(
        address student,
        uint256 bootcampId,
        uint256 milestoneId,
        string memory submissionHash,
        uint256 requiredReviews
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256) {
        if (requiredReviews < MIN_REVIEWS_REQUIRED) revert PeerReview__NotEnoughRequiredReviews();
        if (requiredReviews > MAX_REVIEWS_PER_REQUEST) revert PeerReview__TooManyRequiredReviews();
        
        _requestIds++;
        uint256 requestId = _requestIds;
        
        reviewRequests[requestId] = ReviewRequest({
            id: requestId,
            student: student,
            bootcampId: bootcampId,
            milestoneId: milestoneId,
            submissionHash: submissionHash,
            createdAt: block.timestamp,
            deadline: block.timestamp + (REVIEW_DEADLINE_HOURS * 1 hours),
            isCompleted: false,
            requiredReviews: requiredReviews,
            completedReviews: 0
        });
        
        emit ReviewRequestCreated(requestId, student, bootcampId);
        return requestId;
    }
    
    /**
     * @notice Submits a peer review for a student submission
     * @param requestId The ID of the review request
     * @param score Numerical score from 0-100
     * @param feedback Textual feedback for the student
     * @param evidenceHash IPFS hash of review evidence/justification
     * @dev Only registered reviewers can submit reviews, includes anti-collusion checks
     */
    function submitReview(
        uint256 requestId,
        uint256 score,
        string memory feedback,
        string memory evidenceHash
    ) external onlyRole(REVIEWER_ROLE) whenNotPaused nonReentrant {
        if (reviewRequests[requestId].isCompleted) revert PeerReview__ReviewCompleted();
        if (block.timestamp > reviewRequests[requestId].deadline) revert PeerReview__DeadlinePassed();
        if (hasReviewed[requestId][msg.sender]) revert PeerReview__AlreadyReviewed();
        if (score > 100) revert PeerReview__InvalidScore();
        
        ReviewRequest storage request = reviewRequests[requestId];
        if (request.student == msg.sender) revert PeerReview__CannotSelfReview();
        
        // Anti-collusion checks
        if (!_passesAntiCollusionChecks(msg.sender, request.student)) revert PeerReview__AntiCollusionFailed();
        
        Review memory review = Review({
            requestId: requestId,
            reviewer: msg.sender,
            score: score,
            feedback: feedback,
            evidenceHash: evidenceHash,
            submittedAt: block.timestamp,
            isVerified: false,
            helpfulnessScore: 0
        });
        
        requestReviews[requestId].push(review);
        hasReviewed[requestId][msg.sender] = true;
        request.completedReviews++;
        
        // Update anti-collusion metrics
        _updateAntiCollusionMetrics(msg.sender, request.student, requestId);
        
        // Update reviewer profile
        _updateReviewerProfile(msg.sender, score);
        
        emit ReviewSubmitted(requestId, msg.sender, score);
        
        // Check if review is complete
        if (request.completedReviews >= request.requiredReviews) {
            _completeReview(requestId);
        }
    }
    
    function _passesAntiCollusionChecks(address reviewer, address student) private view returns (bool) {
        // Check 1: Not too many reviews of same student
        if (antiCollusion.reviewHistory[reviewer][student] >= 5) {
            return false;
        }
        
        // Check 2: Minimum time between reviews of same student
        uint256[] memory recentReviews = antiCollusion.recentReviews[reviewer];
        if (recentReviews.length > 0) {
            uint256 lastReviewTime = recentReviews[recentReviews.length - 1];
            if (block.timestamp - lastReviewTime < MIN_TIME_BETWEEN_REVIEWS_SAME_STUDENT) {
                return false;
            }
        }
        
        // Check 3: Daily review limit
        uint256 reviewsToday = 0;
        uint256 oneDayAgo = block.timestamp - 1 days;
        for (uint256 i = 0; i < recentReviews.length; i++) {
            if (recentReviews[i] >= oneDayAgo) {
                reviewsToday++;
            }
        }
        if (reviewsToday >= MAX_REVIEWS_PER_REVIEWER_PER_DAY) {
            return false;
        }
        
        // Check 4: Reviewer has sufficient reputation
        if (reviewerProfiles[reviewer].reputationScore < 50) {
            return false;
        }
        
        return true;
    }
    
    function _updateAntiCollusionMetrics(address reviewer, address student, uint256 requestId) private {
        // Update review history
        antiCollusion.reviewHistory[reviewer][student]++;
        
        // Update recent reviews
        antiCollusion.recentReviews[reviewer].push(block.timestamp);
        
        // Keep only last 50 recent reviews to manage gas costs
        if (antiCollusion.recentReviews[reviewer].length > 50) {
            for (uint256 i = 0; i < 49; i++) {
                antiCollusion.recentReviews[reviewer][i] = antiCollusion.recentReviews[reviewer][i + 1];
            }
            antiCollusion.recentReviews[reviewer].pop();
        }
        
        // Add to request reviewers
        antiCollusion.requestReviewers[requestId].push(reviewer);
    }
    
    function _updateReviewerProfile(address reviewer, uint256 score) private {
        ReviewerProfile storage profile = reviewerProfiles[reviewer];
        
        // Update average score
        uint256 totalScore = (profile.averageScore * profile.totalReviews) + score;
        profile.totalReviews++;
        profile.averageScore = totalScore / profile.totalReviews;
        
        // Update reputation based on consistency and quality
        if (score >= 70 && score <= 90) {
            // Reasonable scores increase reputation slightly
            profile.reputationScore = profile.reputationScore + 1;
            if (profile.reputationScore > 1000) profile.reputationScore = 1000;
        } else if (score < 30 || score > 95) {
            // Extreme scores decrease reputation
            if (profile.reputationScore > 2) {
                profile.reputationScore = profile.reputationScore - 2;
            }
        }
    }
    
    function _completeReview(uint256 requestId) private {
        ReviewRequest storage request = reviewRequests[requestId];
        request.isCompleted = true;
        
        // Calculate average score
        Review[] memory reviews = requestReviews[requestId];
        uint256 totalScore = 0;
        for (uint256 i = 0; i < reviews.length; i++) {
            totalScore += reviews[i].score;
        }
        uint256 averageScore = totalScore / reviews.length;
        
        // Detect potential collusion based on score clustering
        _detectScoreCollusion(requestId, averageScore);
        
        emit ReviewCompleted(requestId, averageScore);
    }
    
    function _detectScoreCollusion(uint256 requestId, uint256 averageScore) private {
        Review[] memory reviews = requestReviews[requestId];
        
        // Check for suspicious score patterns
        uint256 identicalScores = 0;
        uint256 veryCloseScores = 0;
        
        for (uint256 i = 0; i < reviews.length; i++) {
            for (uint256 j = i + 1; j < reviews.length; j++) {
                if (reviews[i].score == reviews[j].score) {
                    identicalScores++;
                } else if (_abs(reviews[i].score, reviews[j].score) <= 3) {
                    veryCloseScores++;
                }
            }
        }
        
        // Flag potential collusion
        if (identicalScores > reviews.length / 2 || veryCloseScores > reviews.length * 2 / 3) {
            for (uint256 i = 0; i < reviews.length; i++) {
                emit CollusionDetected(reviews[i].reviewer, reviewRequests[requestId].student, "Suspicious score clustering");
                _penalizeReviewer(reviews[i].reviewer, "Score clustering");
            }
        }
    }
    
    function _abs(uint256 a, uint256 b) private pure returns (uint256) {
        return a > b ? a - b : b - a;
    }
    
    function _penalizeReviewer(address reviewer, string memory reason) private {
        ReviewerProfile storage profile = reviewerProfiles[reviewer];
        
        // Reduce reputation
        if (profile.reputationScore > 10) {
            profile.reputationScore -= 10;
        }
        
        // Slash staking amount
        uint256 penalty = profile.stakingAmount / 20; // 5% penalty
        if (penalty > 0) {
            profile.stakingAmount -= penalty;
            // Send penalty to treasury (simplified - would need treasury address)
        }
        
        emit ReviewerPenalized(reviewer, penalty, reason);
        
        // Suspend reviewer if reputation too low
        if (profile.reputationScore < 30) {
            profile.isActive = false;
            _revokeRole(REVIEWER_ROLE, reviewer);
        }
    }
    
    /**
     * @notice Allows users to rate the helpfulness of a review
     * @param requestId The ID of the review request
     * @param reviewIndex The index of the review to rate
     * @param rating The helpfulness rating (0-100)
     * @dev Can only rate reviews for completed requests
     */
    function rateReviewHelpfulness(uint256 requestId, uint256 reviewIndex, uint256 rating) 
        external whenNotPaused {
        if (!reviewRequests[requestId].isCompleted) revert PeerReview__ReviewNotCompleted();
        if (rating > 100) revert PeerReview__InvalidScore();
        if (reviewIndex >= requestReviews[requestId].length) revert PeerReview__InvalidReviewIndex();
        
        Review storage review = requestReviews[requestId][reviewIndex];
        review.helpfulnessScore = (review.helpfulnessScore + rating) / 2; // Simple averaging
        
        // Update reviewer reputation based on helpfulness
        if (rating >= 80) {
            reviewerProfiles[review.reviewer].reputationScore++;
        } else if (rating <= 30) {
            if (reviewerProfiles[review.reviewer].reputationScore > 1) {
                reviewerProfiles[review.reviewer].reputationScore--;
            }
        }
    }
    
    /**
     * @notice Gets a review request by ID
     * @param requestId The ID of the review request
     * @return request The review request data
     */
    function getReviewRequest(uint256 requestId) external view returns (ReviewRequest memory) {
        return reviewRequests[requestId];
    }
    
    /**
     * @notice Gets all reviews for a specific request
     * @param requestId The ID of the review request
     * @return reviews Array of reviews for this request
     */
    function getReviews(uint256 requestId) external view returns (Review[] memory) {
        return requestReviews[requestId];
    }
    
    /**
     * @notice Gets a reviewer's profile information
     * @param reviewer The address of the reviewer
     * @return profile The reviewer's profile data
     */
    function getReviewerProfile(address reviewer) external view returns (ReviewerProfile memory) {
        return reviewerProfiles[reviewer];
    }
    
    /**
     * @notice Gets the review history between a reviewer and student
     * @param reviewer The address of the reviewer
     * @param student The address of the student
     * @return count Number of times this reviewer has reviewed this student
     */
    function getReviewHistory(address reviewer, address student) external view returns (uint256) {
        return antiCollusion.reviewHistory[reviewer][student];
    }
    
    /**
     * @notice Checks if a reviewer can review a specific student
     * @param reviewer The address of the reviewer
     * @param student The address of the student
     * @return canReview Whether the reviewer passes all anti-collusion checks
     */
    function canReview(address reviewer, address student) external view returns (bool) {
        if (!reviewerProfiles[reviewer].isActive) return false;
        if (!hasRole(REVIEWER_ROLE, reviewer)) return false;
        return _passesAntiCollusionChecks(reviewer, student);
    }
    
    /**
     * @notice Calculates the average score for a completed review request
     * @param requestId The ID of the review request
     * @return averageScore The average of all submitted scores
     */
    function getAverageScore(uint256 requestId) external view returns (uint256) {
        Review[] memory reviews = requestReviews[requestId];
        if (reviews.length == 0) return 0;
        
        uint256 totalScore = 0;
        for (uint256 i = 0; i < reviews.length; i++) {
            totalScore += reviews[i].score;
        }
        return totalScore / reviews.length;
    }
    
    /**
     * @notice Allows admin to add additional stake for a reviewer
     * @param reviewer The address of the reviewer
     * @dev Only active reviewers can receive additional stake
     */
    function addReviewerStake(address reviewer) external payable onlyRole(ADMIN_ROLE) {
        if (!reviewerProfiles[reviewer].isActive) revert PeerReview__ReviewerNotActive();
        reviewerProfiles[reviewer].stakingAmount += msg.value;
        antiCollusion.reviewerReputationStake[reviewer] += msg.value;
    }
    
    /**
     * @notice Allows admin to penalize a reviewer in emergency situations
     * @param reviewer The address of the reviewer to penalize
     * @param reason The reason for the penalty
     * @dev Should be used carefully as it affects reviewer reputation and stake
     */
    function emergencyPenalizeReviewer(address reviewer, string memory reason) 
        external onlyRole(ADMIN_ROLE) {
        _penalizeReviewer(reviewer, reason);
    }
    
    /**
     * @notice Pauses the contract, preventing new reviews and registrations
     * @dev Only admins can pause the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpauses the contract, allowing normal operations
     * @dev Only admins can unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}