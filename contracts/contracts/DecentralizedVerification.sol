// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract DecentralizedVerification is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    struct VerificationRequest {
        uint256 id;
        address student;
        string submissionType; // "assignment", "project", "milestone"
        string submissionHash; // IPFS hash
        uint256 requiredValidators;
        uint256 currentValidators;
        mapping(address => bool) hasValidated;
        mapping(address => VerificationVote) votes;
        address[] validatorList;
        bool isCompleted;
        bool isPassed;
        uint256 createdAt;
        uint256 completedAt;
    }
    
    struct VerificationVote {
        address validator;
        bool isApproved;
        uint256 confidence; // 0-100
        string feedback;
        string evidenceHash;
        uint256 votedAt;
    }
    
    struct ValidatorProfile {
        address validatorAddress;
        uint256 totalVerifications;
        uint256 correctVerifications;
        uint256 accuracyRate; // 0-1000 (0-100%)
        uint256 stakingAmount;
        bool isActive;
        uint256 joinedAt;
        string[] specializations;
    }
    
    struct ValidationReward {
        address validator;
        uint256 amount;
        uint256 requestId;
        bool isClaimed;
        uint256 earnedAt;
    }
    
    mapping(uint256 => VerificationRequest) private verificationRequests;
    mapping(address => ValidatorProfile) public validatorProfiles;
    mapping(uint256 => mapping(address => VerificationVote)) public votes;
    mapping(address => uint256[]) public validatorRequests;
    mapping(uint256 => ValidationReward[]) public requestRewards;
    
    uint256 private _requestIds;
    uint256 public validatorStakeAmount = 0.1 ether;
    uint256 public verificationReward = 0.01 ether;
    uint256 public totalRewardPool;
    uint256 public constant MIN_VALIDATORS = 3;
    uint256 public constant MAX_VALIDATORS = 7;
    
    event ValidatorRegistered(address indexed validator, uint256 stakeAmount);
    event VerificationRequested(uint256 indexed requestId, address indexed student);
    event VerificationVoteSubmitted(uint256 indexed requestId, address indexed validator, bool approved);
    event VerificationCompleted(uint256 indexed requestId, bool passed, uint256 validatorCount);
    event ValidatorRewarded(address indexed validator, uint256 amount, uint256 requestId);
    event ValidatorSlashed(address indexed validator, uint256 amount, string reason);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    function registerValidator(string[] memory specializations) 
        external payable whenNotPaused {
        require(msg.value >= validatorStakeAmount, "Insufficient stake amount");
        require(!validatorProfiles[msg.sender].isActive, "Already registered");
        require(specializations.length > 0, "Must specify specializations");
        
        validatorProfiles[msg.sender] = ValidatorProfile({
            validatorAddress: msg.sender,
            totalVerifications: 0,
            correctVerifications: 0,
            accuracyRate: 1000, // Start with 100% accuracy
            stakingAmount: msg.value,
            isActive: true,
            joinedAt: block.timestamp,
            specializations: specializations
        });
        
        _grantRole(VALIDATOR_ROLE, msg.sender);
        
        emit ValidatorRegistered(msg.sender, msg.value);
    }
    
    function requestVerification(
        string memory submissionType,
        string memory submissionHash,
        uint256 requiredValidators
    ) external whenNotPaused returns (uint256) {
        require(requiredValidators >= MIN_VALIDATORS, "Not enough validators required");
        require(requiredValidators <= MAX_VALIDATORS, "Too many validators required");
        require(bytes(submissionHash).length > 0, "Submission hash required");
        
        _requestIds++;
        uint256 requestId = _requestIds;
        
        VerificationRequest storage request = verificationRequests[requestId];
        request.id = requestId;
        request.student = msg.sender;
        request.submissionType = submissionType;
        request.submissionHash = submissionHash;
        request.requiredValidators = requiredValidators;
        request.currentValidators = 0;
        request.isCompleted = false;
        request.isPassed = false;
        request.createdAt = block.timestamp;
        request.completedAt = 0;
        
        emit VerificationRequested(requestId, msg.sender);
        return requestId;
    }
    
    function submitVerification(
        uint256 requestId,
        bool isApproved,
        uint256 confidence,
        string memory feedback,
        string memory evidenceHash
    ) external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        VerificationRequest storage request = verificationRequests[requestId];
        require(request.id != 0, "Request does not exist");
        require(!request.isCompleted, "Verification already completed");
        require(!request.hasValidated[msg.sender], "Already validated this request");
        require(confidence <= 100, "Confidence must be <= 100");
        require(validatorProfiles[msg.sender].isActive, "Validator not active");
        
        // Record the vote
        request.votes[msg.sender] = VerificationVote({
            validator: msg.sender,
            isApproved: isApproved,
            confidence: confidence,
            feedback: feedback,
            evidenceHash: evidenceHash,
            votedAt: block.timestamp
        });
        
        request.hasValidated[msg.sender] = true;
        request.validatorList.push(msg.sender);
        request.currentValidators++;
        
        validatorRequests[msg.sender].push(requestId);
        validatorProfiles[msg.sender].totalVerifications++;
        
        emit VerificationVoteSubmitted(requestId, msg.sender, isApproved);
        
        // Check if we have enough validators
        if (request.currentValidators >= request.requiredValidators) {
            _completeVerification(requestId);
        }
    }
    
    function _completeVerification(uint256 requestId) private {
        VerificationRequest storage request = verificationRequests[requestId];
        
        uint256 approvalCount = 0;
        uint256 totalConfidence = 0;
        
        // Count approvals and calculate average confidence
        for (uint256 i = 0; i < request.validatorList.length; i++) {
            address validator = request.validatorList[i];
            VerificationVote memory vote = request.votes[validator];
            
            if (vote.isApproved) {
                approvalCount++;
            }
            totalConfidence += vote.confidence;
        }
        
        uint256 averageConfidence = totalConfidence / request.currentValidators;
        
        // Determine if verification passes (majority approval + high confidence)
        bool passes = (approvalCount * 2 > request.currentValidators) && (averageConfidence >= 70);
        
        request.isCompleted = true;
        request.isPassed = passes;
        request.completedAt = block.timestamp;
        
        // Distribute rewards to validators
        _distributeRewards(requestId, passes);
        
        emit VerificationCompleted(requestId, passes, request.currentValidators);
    }
    
    function _distributeRewards(uint256 requestId, bool verificationPassed) private {
        VerificationRequest storage request = verificationRequests[requestId];
        uint256 rewardPerValidator = verificationReward;
        
        require(totalRewardPool >= rewardPerValidator * request.currentValidators, "Insufficient reward pool");
        
        for (uint256 i = 0; i < request.validatorList.length; i++) {
            address validator = request.validatorList[i];
            VerificationVote memory vote = request.votes[validator];
            
            // Calculate reward based on vote quality and confidence
            uint256 baseReward = rewardPerValidator;
            uint256 confidenceBonus = (vote.confidence * baseReward) / 1000; // Up to 10% bonus
            uint256 totalReward = baseReward + confidenceBonus;
            
            // Create reward entry
            requestRewards[requestId].push(ValidationReward({
                validator: validator,
                amount: totalReward,
                requestId: requestId,
                isClaimed: false,
                earnedAt: block.timestamp
            }));
            
            totalRewardPool -= totalReward;
            
            emit ValidatorRewarded(validator, totalReward, requestId);
        }
    }
    
    function claimValidationRewards(uint256[] memory requestIds) 
        external onlyRole(VALIDATOR_ROLE) whenNotPaused nonReentrant {
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < requestIds.length; i++) {
            uint256 requestId = requestIds[i];
            ValidationReward[] storage rewards = requestRewards[requestId];
            
            for (uint256 j = 0; j < rewards.length; j++) {
                if (rewards[j].validator == msg.sender && !rewards[j].isClaimed) {
                    rewards[j].isClaimed = true;
                    totalAmount += rewards[j].amount;
                }
            }
        }
        
        require(totalAmount > 0, "No rewards to claim");
        payable(msg.sender).transfer(totalAmount);
    }
    
    function challengeVerification(uint256 requestId, string memory reason) 
        external whenNotPaused {
        VerificationRequest storage request = verificationRequests[requestId];
        require(request.isCompleted, "Verification not completed");
        require(msg.sender == request.student, "Only student can challenge");
        
        // This would start a dispute resolution process
        // Simplified implementation - in production, this would involve additional validators
        
        // For now, just flag for admin review
        emit VerificationCompleted(requestId, false, 0); // Re-emit with challenge flag
    }
    
    function updateValidatorAccuracy(address validator, bool wasCorrect) 
        external onlyRole(ADMIN_ROLE) {
        ValidatorProfile storage profile = validatorProfiles[validator];
        require(profile.isActive, "Validator not active");
        
        if (wasCorrect) {
            profile.correctVerifications++;
        }
        
        // Recalculate accuracy rate
        if (profile.totalVerifications > 0) {
            profile.accuracyRate = (profile.correctVerifications * 1000) / profile.totalVerifications;
        }
        
        // Slash stake for poor performance
        if (profile.accuracyRate < 600 && profile.totalVerifications >= 10) { // Less than 60% accuracy
            uint256 slashAmount = profile.stakingAmount / 10; // 10% slash
            profile.stakingAmount -= slashAmount;
            totalRewardPool += slashAmount; // Add to reward pool
            
            emit ValidatorSlashed(validator, slashAmount, "Low accuracy rate");
            
            // Deactivate if stake too low
            if (profile.stakingAmount < validatorStakeAmount / 2) {
                profile.isActive = false;
                _revokeRole(VALIDATOR_ROLE, validator);
            }
        }
    }
    
    // View functions
    function getVerificationRequest(uint256 requestId) external view returns (
        address student,
        string memory submissionType,
        string memory submissionHash,
        uint256 requiredValidators,
        uint256 currentValidators,
        bool isCompleted,
        bool isPassed,
        uint256 createdAt,
        uint256 completedAt
    ) {
        VerificationRequest storage request = verificationRequests[requestId];
        return (
            request.student,
            request.submissionType,
            request.submissionHash,
            request.requiredValidators,
            request.currentValidators,
            request.isCompleted,
            request.isPassed,
            request.createdAt,
            request.completedAt
        );
    }
    
    function getVerificationVote(uint256 requestId, address validator) 
        external view returns (VerificationVote memory) {
        return verificationRequests[requestId].votes[validator];
    }
    
    function getValidatorRequests(address validator) external view returns (uint256[] memory) {
        return validatorRequests[validator];
    }
    
    function getRequestValidators(uint256 requestId) external view returns (address[] memory) {
        return verificationRequests[requestId].validatorList;
    }
    
    function getValidatorProfile(address validator) external view returns (ValidatorProfile memory) {
        return validatorProfiles[validator];
    }
    
    function getPendingRewards(address validator) external view returns (uint256) {
        uint256 totalPending = 0;
        uint256[] memory requests = validatorRequests[validator];
        
        for (uint256 i = 0; i < requests.length; i++) {
            uint256 requestId = requests[i];
            ValidationReward[] memory rewards = requestRewards[requestId];
            
            for (uint256 j = 0; j < rewards.length; j++) {
                if (rewards[j].validator == validator && !rewards[j].isClaimed) {
                    totalPending += rewards[j].amount;
                }
            }
        }
        
        return totalPending;
    }
    
    // Admin functions
    function addToRewardPool() external payable onlyRole(ADMIN_ROLE) {
        totalRewardPool += msg.value;
    }
    
    function updateStakeAmount(uint256 newAmount) external onlyRole(ADMIN_ROLE) {
        validatorStakeAmount = newAmount;
    }
    
    function updateRewardAmount(uint256 newAmount) external onlyRole(ADMIN_ROLE) {
        verificationReward = newAmount;
    }
    
    function forceCompleteVerification(uint256 requestId, bool isPassed) 
        external onlyRole(ADMIN_ROLE) {
        VerificationRequest storage request = verificationRequests[requestId];
        require(!request.isCompleted, "Already completed");
        
        request.isCompleted = true;
        request.isPassed = isPassed;
        request.completedAt = block.timestamp;
        
        emit VerificationCompleted(requestId, isPassed, request.currentValidators);
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