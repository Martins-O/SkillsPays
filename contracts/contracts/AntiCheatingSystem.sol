// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract AntiCheatingSystem is AccessControl, Pausable {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    struct CheatingReport {
        uint256 id;
        address reporter;
        address accused;
        string cheatingType;
        string evidenceHash; // IPFS hash of evidence
        string description;
        uint256 severity; // 1-5 scale
        bool isVerified;
        bool isPenalized;
        address verifiedBy;
        uint256 reportedAt;
        uint256 verifiedAt;
    }
    
    struct StudentRiskProfile {
        address studentAddress;
        uint256 riskScore; // 0-1000 scale
        uint256 totalReports;
        uint256 verifiedViolations;
        mapping(string => uint256) violationCounts; // cheating type => count
        uint256[] reportIds;
        bool isBlacklisted;
        uint256 lastViolationTime;
        uint256 suspensionEndTime;
    }
    
    struct AIDetectionResult {
        uint256 submissionId;
        address student;
        string submissionHash;
        uint256 plagiarismScore; // 0-100
        uint256 aiGeneratedScore; // 0-100
        uint256 similarityScore; // 0-100
        string[] similarSubmissions;
        bool requiresHumanReview;
        bool isApproved;
        uint256 analyzedAt;
    }
    
    struct BehaviorPattern {
        address student;
        uint256 submissionFrequency; // submissions per day
        uint256 averageCompletionTime; // in minutes
        uint256 consistencyScore; // How consistent is their work quality
        uint256 timePattern; // What times do they usually work
        uint256[] recentSubmissionTimes;
        bool isPotentialBot;
        uint256 lastAnalyzed;
    }
    
    mapping(uint256 => CheatingReport) public cheatingReports;
    mapping(address => StudentRiskProfile) private studentRiskProfiles;
    mapping(uint256 => AIDetectionResult) public aiDetectionResults;
    mapping(address => BehaviorPattern) private behaviorPatterns;
    mapping(string => uint256[]) public submissionHashes; // hash => submission IDs
    
    uint256 private _reportIds;
    uint256 private _detectionIds;
    
    // Thresholds
    uint256 public constant HIGH_RISK_THRESHOLD = 700;
    uint256 public constant BLACKLIST_THRESHOLD = 900;
    uint256 public constant SUSPENSION_DURATION = 30 days;
    uint256 public constant BOT_DETECTION_THRESHOLD = 80;
    
    event CheatingReported(uint256 indexed reportId, address indexed accused, string cheatingType);
    event ViolationVerified(uint256 indexed reportId, address indexed accused, uint256 penalty);
    event StudentSuspended(address indexed student, uint256 duration);
    event BotActivityDetected(address indexed student, uint256 confidence);
    event RiskScoreUpdated(address indexed student, uint256 oldScore, uint256 newScore);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
    }
    
    function reportCheating(
        address accused,
        string memory cheatingType,
        string memory evidenceHash,
        string memory description,
        uint256 severity
    ) external whenNotPaused returns (uint256) {
        require(accused != msg.sender, "Cannot report yourself");
        require(severity >= 1 && severity <= 5, "Invalid severity level");
        require(bytes(evidenceHash).length > 0, "Evidence required");
        
        _reportIds++;
        uint256 reportId = _reportIds;
        
        cheatingReports[reportId] = CheatingReport({
            id: reportId,
            reporter: msg.sender,
            accused: accused,
            cheatingType: cheatingType,
            evidenceHash: evidenceHash,
            description: description,
            severity: severity,
            isVerified: false,
            isPenalized: false,
            verifiedBy: address(0),
            reportedAt: block.timestamp,
            verifiedAt: 0
        });
        
        // Update risk profile
        StudentRiskProfile storage profile = studentRiskProfiles[accused];
        profile.totalReports++;
        profile.reportIds.push(reportId);
        
        // Increase risk score based on severity
        uint256 riskIncrease = severity * 50; // 50-250 points per report
        _updateRiskScore(accused, riskIncrease, true);
        
        emit CheatingReported(reportId, accused, cheatingType);
        return reportId;
    }
    
    function verifyReport(uint256 reportId, bool isValid) 
        external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        CheatingReport storage report = cheatingReports[reportId];
        require(!report.isVerified, "Report already verified");
        require(report.id != 0, "Report does not exist");
        
        report.isVerified = true;
        report.verifiedBy = msg.sender;
        report.verifiedAt = block.timestamp;
        
        if (isValid) {
            // Apply penalties
            _applyPenalty(report.accused, report.cheatingType, report.severity);
            report.isPenalized = true;
            
            emit ViolationVerified(reportId, report.accused, report.severity);
        } else {
            // Remove risk score increase from false report
            uint256 riskDecrease = report.severity * 50;
            _updateRiskScore(report.accused, riskDecrease, false);
        }
    }
    
    function _applyPenalty(address student, string memory cheatingType, uint256 severity) private {
        StudentRiskProfile storage profile = studentRiskProfiles[student];
        profile.verifiedViolations++;
        profile.violationCounts[cheatingType]++;
        profile.lastViolationTime = block.timestamp;
        
        // Increase risk score significantly for verified violations
        uint256 penaltyScore = severity * 100; // 100-500 points
        _updateRiskScore(student, penaltyScore, true);
        
        // Apply additional penalties based on severity and type
        if (severity >= 4) {
            // Suspend for high severity violations
            profile.suspensionEndTime = block.timestamp + SUSPENSION_DURATION;
            emit StudentSuspended(student, SUSPENSION_DURATION);
        }
        
        // Blacklist for repeated violations
        if (profile.verifiedViolations >= 3 || profile.riskScore >= BLACKLIST_THRESHOLD) {
            profile.isBlacklisted = true;
        }
    }
    
    function _updateRiskScore(address student, uint256 scoreChange, bool increase) private {
        StudentRiskProfile storage profile = studentRiskProfiles[student];
        uint256 oldScore = profile.riskScore;
        
        if (increase) {
            profile.riskScore += scoreChange;
            if (profile.riskScore > 1000) profile.riskScore = 1000;
        } else {
            if (profile.riskScore > scoreChange) {
                profile.riskScore -= scoreChange;
            } else {
                profile.riskScore = 0;
            }
        }
        
        emit RiskScoreUpdated(student, oldScore, profile.riskScore);
    }
    
    function analyzeSubmission(
        uint256 submissionId,
        address student,
        string memory submissionHash,
        string memory submissionContent
    ) external onlyRole(VALIDATOR_ROLE) whenNotPaused returns (uint256) {
        _detectionIds++;
        uint256 detectionId = _detectionIds;
        
        // Perform AI-based analysis (simplified implementation)
        (uint256 plagiarismScore, uint256 aiScore, uint256 similarityScore, bool requiresReview) = 
            _performAIAnalysis(submissionHash, submissionContent);
        
        aiDetectionResults[detectionId] = AIDetectionResult({
            submissionId: submissionId,
            student: student,
            submissionHash: submissionHash,
            plagiarismScore: plagiarismScore,
            aiGeneratedScore: aiScore,
            similarityScore: similarityScore,
            similarSubmissions: new string[](0),
            requiresHumanReview: requiresReview,
            isApproved: !requiresReview && plagiarismScore < 50,
            analyzedAt: block.timestamp
        });
        
        // Update behavior tracking
        _updateBehaviorPattern(student);
        
        // Store submission hash for similarity checking
        submissionHashes[submissionHash].push(detectionId);
        
        // Flag potential cheating if scores are high
        if (plagiarismScore > 80 || aiScore > 80) {
            _flagAutomaticViolation(student, plagiarismScore > aiScore ? "plagiarism" : "ai_generation");
        }
        
        return detectionId;
    }
    
    function _performAIAnalysis(string memory submissionHash, string memory content) 
        private view returns (uint256 plagiarismScore, uint256 aiScore, uint256 similarityScore, bool requiresReview) {
        // Simplified AI analysis simulation
        // In production, this would integrate with AI services like GPTZero, Copyleaks, etc.
        
        // Mock plagiarism detection based on hash similarity
        uint256[] memory similarHashes = submissionHashes[submissionHash];
        if (similarHashes.length > 0) {
            plagiarismScore = 95; // High plagiarism if exact hash match
        } else {
            plagiarismScore = uint256(keccak256(abi.encodePacked(content, block.timestamp))) % 40; // 0-39 random
        }
        
        // Mock AI generation detection
        aiScore = uint256(keccak256(abi.encodePacked(content, "AI_CHECK"))) % 60; // 0-59 random
        
        // Mock similarity scoring
        similarityScore = (plagiarismScore + aiScore) / 2;
        
        // Requires human review if any score is concerning
        requiresReview = plagiarismScore > 50 || aiScore > 60 || similarityScore > 55;
    }
    
    function _updateBehaviorPattern(address student) private {
        BehaviorPattern storage pattern = behaviorPatterns[student];
        
        // Track submission timing
        pattern.recentSubmissionTimes.push(block.timestamp);
        
        // Keep only last 10 submissions
        if (pattern.recentSubmissionTimes.length > 10) {
            for (uint256 i = 0; i < 9; i++) {
                pattern.recentSubmissionTimes[i] = pattern.recentSubmissionTimes[i + 1];
            }
            pattern.recentSubmissionTimes.pop();
        }
        
        // Analyze for bot behavior
        if (pattern.recentSubmissionTimes.length >= 5) {
            uint256 botScore = _calculateBotLikelihood(student);
            if (botScore > BOT_DETECTION_THRESHOLD) {
                pattern.isPotentialBot = true;
                emit BotActivityDetected(student, botScore);
                
                // Increase risk score for bot activity
                _updateRiskScore(student, 300, true);
            }
        }
        
        pattern.lastAnalyzed = block.timestamp;
    }
    
    function _calculateBotLikelihood(address student) private view returns (uint256) {
        BehaviorPattern storage pattern = behaviorPatterns[student];
        uint256 botScore = 0;
        
        // Check submission timing patterns
        if (pattern.recentSubmissionTimes.length >= 3) {
            uint256[] memory intervals = new uint256[](pattern.recentSubmissionTimes.length - 1);
            
            for (uint256 i = 1; i < pattern.recentSubmissionTimes.length; i++) {
                intervals[i - 1] = pattern.recentSubmissionTimes[i] - pattern.recentSubmissionTimes[i - 1];
            }
            
            // Check for extremely regular intervals (bot-like)
            bool tooRegular = true;
            uint256 avgInterval = intervals[0];
            
            for (uint256 i = 1; i < intervals.length; i++) {
                if (intervals[i] > avgInterval * 12 / 10 || intervals[i] < avgInterval * 8 / 10) {
                    tooRegular = false;
                    break;
                }
            }
            
            if (tooRegular) {
                botScore += 50;
            }
            
            // Check for unrealistic completion times (too fast)
            if (avgInterval < 5 minutes) {
                botScore += 40;
            }
        }
        
        return botScore;
    }
    
    function _flagAutomaticViolation(address student, string memory violationType) private {
        // Create automatic report for high-confidence violations
        _reportIds++;
        uint256 reportId = _reportIds;
        
        cheatingReports[reportId] = CheatingReport({
            id: reportId,
            reporter: address(this), // System-generated report
            accused: student,
            cheatingType: violationType,
            evidenceHash: "AUTO_DETECTED",
            description: "Automatically detected by AI system",
            severity: 3,
            isVerified: true,
            isPenalized: false,
            verifiedBy: address(this),
            reportedAt: block.timestamp,
            verifiedAt: block.timestamp
        });
        
        _applyPenalty(student, violationType, 3);
    }
    
    // View functions
    function getStudentRiskProfile(address student) external view returns (
        uint256 riskScore,
        uint256 totalReports,
        uint256 verifiedViolations,
        bool isBlacklisted,
        bool isSuspended
    ) {
        StudentRiskProfile storage profile = studentRiskProfiles[student];
        bool suspended = block.timestamp < profile.suspensionEndTime;
        
        return (
            profile.riskScore,
            profile.totalReports,
            profile.verifiedViolations,
            profile.isBlacklisted,
            suspended
        );
    }
    
    function getCheatingReport(uint256 reportId) external view returns (CheatingReport memory) {
        return cheatingReports[reportId];
    }
    
    function getAIDetectionResult(uint256 detectionId) external view returns (AIDetectionResult memory) {
        return aiDetectionResults[detectionId];
    }
    
    function getBehaviorPattern(address student) external view returns (
        uint256 submissionFrequency,
        uint256 averageCompletionTime,
        bool isPotentialBot,
        uint256 lastAnalyzed
    ) {
        BehaviorPattern storage pattern = behaviorPatterns[student];
        return (
            pattern.submissionFrequency,
            pattern.averageCompletionTime,
            pattern.isPotentialBot,
            pattern.lastAnalyzed
        );
    }
    
    function canParticipate(address student) external view returns (bool, string memory reason) {
        StudentRiskProfile storage profile = studentRiskProfiles[student];
        
        if (profile.isBlacklisted) {
            return (false, "Student is blacklisted");
        }
        
        if (block.timestamp < profile.suspensionEndTime) {
            return (false, "Student is suspended");
        }
        
        if (profile.riskScore >= HIGH_RISK_THRESHOLD) {
            return (false, "High risk score - requires review");
        }
        
        return (true, "");
    }
    
    function getViolationCount(address student, string memory cheatingType) 
        external view returns (uint256) {
        return studentRiskProfiles[student].violationCounts[cheatingType];
    }
    
    function getStudentReports(address student) external view returns (uint256[] memory) {
        return studentRiskProfiles[student].reportIds;
    }
    
    // Admin functions
    function setRiskScore(address student, uint256 newScore) external onlyRole(ADMIN_ROLE) {
        require(newScore <= 1000, "Risk score too high");
        uint256 oldScore = studentRiskProfiles[student].riskScore;
        studentRiskProfiles[student].riskScore = newScore;
        
        emit RiskScoreUpdated(student, oldScore, newScore);
    }
    
    function removeFromBlacklist(address student) external onlyRole(ADMIN_ROLE) {
        studentRiskProfiles[student].isBlacklisted = false;
        studentRiskProfiles[student].riskScore = HIGH_RISK_THRESHOLD - 1;
    }
    
    function endSuspension(address student) external onlyRole(ADMIN_ROLE) {
        studentRiskProfiles[student].suspensionEndTime = 0;
    }
    
    function updateDetectionThresholds(
        uint256 _highRiskThreshold,
        uint256 _blacklistThreshold,
        uint256 _botThreshold
    ) external onlyRole(ADMIN_ROLE) {
        // These would be implemented as state variables that can be modified
        // Simplified for this implementation
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}