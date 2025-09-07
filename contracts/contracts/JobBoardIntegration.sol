// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract JobBoardIntegration is AccessControl, Pausable {
    bytes32 public constant EMPLOYER_ROLE = keccak256("EMPLOYER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    struct JobListing {
        uint256 id;
        address employer;
        string title;
        string description;
        string[] requiredSkills;
        mapping(string => uint256) skillLevels; // skill => minimum level required
        uint256 salaryRange; // in wei for simplicity
        bool isActive;
        uint256 postedAt;
        uint256 applicationsCount;
    }
    
    struct JobApplication {
        uint256 id;
        uint256 jobId;
        address applicant;
        string coverLetter;
        bool isVerified; // Whether skills are verified onchain
        uint256 matchScore; // 0-100 based on skill matching
        uint256 appliedAt;
        bool isReviewed;
        address reviewedBy;
    }
    
    struct EmployerProfile {
        address employerAddress;
        string companyName;
        string description;
        bool isVerified;
        uint256 jobsPosted;
        uint256 hires;
        uint256 joinedAt;
    }
    
    mapping(uint256 => JobListing) private jobListings;
    mapping(uint256 => JobApplication) public jobApplications;
    mapping(address => EmployerProfile) public employers;
    mapping(address => uint256[]) public applicantApplications;
    mapping(uint256 => uint256[]) public jobApplicationsList;
    
    uint256 private _jobIds;
    uint256 private _applicationIds;
    uint256[] public activeJobs;
    
    address public skillGraphContract;
    address public badgeContract;
    
    event EmployerRegistered(address indexed employer, string companyName);
    event JobPosted(uint256 indexed jobId, address indexed employer, string title);
    event JobApplicationSubmitted(uint256 indexed applicationId, uint256 indexed jobId, address applicant);
    event SkillsVerified(address indexed applicant, uint256 matchScore);
    
    constructor(address _skillGraphContract, address _badgeContract) {
        require(_skillGraphContract != address(0), "Invalid skill graph address");
        require(_badgeContract != address(0), "Invalid badge contract address");
        
        skillGraphContract = _skillGraphContract;
        badgeContract = _badgeContract;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    function registerEmployer(string memory companyName, string memory description) 
        external whenNotPaused {
        require(bytes(companyName).length > 0, "Company name required");
        require(employers[msg.sender].employerAddress == address(0), "Already registered");
        
        employers[msg.sender] = EmployerProfile({
            employerAddress: msg.sender,
            companyName: companyName,
            description: description,
            isVerified: false,
            jobsPosted: 0,
            hires: 0,
            joinedAt: block.timestamp
        });
        
        _grantRole(EMPLOYER_ROLE, msg.sender);
        
        emit EmployerRegistered(msg.sender, companyName);
    }
    
    function postJob(
        string memory title,
        string memory description,
        string[] memory requiredSkills,
        uint256[] memory skillLevels,
        uint256 salaryRange
    ) external onlyRole(EMPLOYER_ROLE) whenNotPaused returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(requiredSkills.length == skillLevels.length, "Skills and levels length mismatch");
        
        _jobIds++;
        uint256 jobId = _jobIds;
        
        JobListing storage job = jobListings[jobId];
        job.id = jobId;
        job.employer = msg.sender;
        job.title = title;
        job.description = description;
        job.requiredSkills = requiredSkills;
        job.salaryRange = salaryRange;
        job.isActive = true;
        job.postedAt = block.timestamp;
        job.applicationsCount = 0;
        
        for (uint256 i = 0; i < requiredSkills.length; i++) {
            job.skillLevels[requiredSkills[i]] = skillLevels[i];
        }
        
        activeJobs.push(jobId);
        employers[msg.sender].jobsPosted++;
        
        emit JobPosted(jobId, msg.sender, title);
        return jobId;
    }
    
    function applyForJob(uint256 jobId, string memory coverLetter) 
        external whenNotPaused returns (uint256) {
        require(jobListings[jobId].isActive, "Job not active");
        require(jobListings[jobId].employer != msg.sender, "Cannot apply to own job");
        
        _applicationIds++;
        uint256 applicationId = _applicationIds;
        
        // Verify skills and calculate match score
        uint256 matchScore = _calculateMatchScore(msg.sender, jobId);
        
        jobApplications[applicationId] = JobApplication({
            id: applicationId,
            jobId: jobId,
            applicant: msg.sender,
            coverLetter: coverLetter,
            isVerified: true, // Always verified since we're checking onchain
            matchScore: matchScore,
            appliedAt: block.timestamp,
            isReviewed: false,
            reviewedBy: address(0)
        });
        
        applicantApplications[msg.sender].push(applicationId);
        jobApplicationsList[jobId].push(applicationId);
        jobListings[jobId].applicationsCount++;
        
        emit JobApplicationSubmitted(applicationId, jobId, msg.sender);
        emit SkillsVerified(msg.sender, matchScore);
        
        return applicationId;
    }
    
    function _calculateMatchScore(address applicant, uint256 jobId) private view returns (uint256) {
        JobListing storage job = jobListings[jobId];
        uint256 totalSkills = job.requiredSkills.length;
        uint256 matchedSkills = 0;
        uint256 totalScore = 0;
        
        // This would integrate with SkillGraph contract to get actual skill levels
        for (uint256 i = 0; i < totalSkills; i++) {
            string memory skill = job.requiredSkills[i];
            uint256 requiredLevel = job.skillLevels[skill];
            
            // Mock skill level - in real implementation, call SkillGraph contract
            uint256 applicantLevel = _getApplicantSkillLevel(applicant, skill);
            
            if (applicantLevel >= requiredLevel) {
                matchedSkills++;
                // Award full points for meeting requirement, bonus for exceeding
                uint256 skillScore = 100;
                if (applicantLevel > requiredLevel) {
                    skillScore += (applicantLevel - requiredLevel) * 25;
                }
                totalScore += skillScore;
            } else {
                // Partial credit for having some skill level
                totalScore += (applicantLevel * 50) / requiredLevel;
            }
        }
        
        // Calculate final score
        uint256 averageScore = totalSkills > 0 ? totalScore / totalSkills : 0;
        
        // Bonus for having all required skills
        if (matchedSkills == totalSkills) {
            averageScore = (averageScore * 110) / 100; // 10% bonus
        }
        
        return averageScore > 100 ? 100 : averageScore;
    }
    
    function _getApplicantSkillLevel(address applicant, string memory skill) 
        private pure returns (uint256) {
        // Mock implementation - in real scenario, would call SkillGraph contract
        // This is simplified for demonstration
        if (keccak256(bytes(skill)) == keccak256(bytes("Solidity Development"))) {
            return 3; // Advanced level
        } else if (keccak256(bytes(skill)) == keccak256(bytes("JavaScript"))) {
            return 2; // Intermediate level
        }
        return 1; // Basic level for other skills
    }
    
    function reviewApplication(uint256 applicationId, bool isAccepted) 
        external onlyRole(EMPLOYER_ROLE) whenNotPaused {
        JobApplication storage application = jobApplications[applicationId];
        require(!application.isReviewed, "Already reviewed");
        
        uint256 jobId = application.jobId;
        require(jobListings[jobId].employer == msg.sender, "Not job owner");
        
        application.isReviewed = true;
        application.reviewedBy = msg.sender;
        
        if (isAccepted) {
            employers[msg.sender].hires++;
        }
    }
    
    function getJobDetails(uint256 jobId) external view returns (
        address employer,
        string memory title,
        string memory description,
        string[] memory requiredSkills,
        uint256 salaryRange,
        bool isActive,
        uint256 postedAt,
        uint256 applicationsCount
    ) {
        JobListing storage job = jobListings[jobId];
        return (
            job.employer,
            job.title,
            job.description,
            job.requiredSkills,
            job.salaryRange,
            job.isActive,
            job.postedAt,
            job.applicationsCount
        );
    }
    
    function getJobRequiredSkillLevel(uint256 jobId, string memory skill) 
        external view returns (uint256) {
        return jobListings[jobId].skillLevels[skill];
    }
    
    function getJobApplications(uint256 jobId) external view returns (uint256[] memory) {
        return jobApplicationsList[jobId];
    }
    
    function getApplicantApplications(address applicant) external view returns (uint256[] memory) {
        return applicantApplications[applicant];
    }
    
    function getActiveJobs() external view returns (uint256[] memory) {
        return activeJobs;
    }
    
    function getMatchedJobs(address applicant, uint256 minMatchScore) 
        external view returns (uint256[] memory matchedJobs, uint256[] memory matchScores) {
        uint256 count = 0;
        uint256[] memory tempJobs = new uint256[](activeJobs.length);
        uint256[] memory tempScores = new uint256[](activeJobs.length);
        
        for (uint256 i = 0; i < activeJobs.length; i++) {
            uint256 jobId = activeJobs[i];
            if (jobListings[jobId].isActive) {
                uint256 matchScore = _calculateMatchScore(applicant, jobId);
                if (matchScore >= minMatchScore) {
                    tempJobs[count] = jobId;
                    tempScores[count] = matchScore;
                    count++;
                }
            }
        }
        
        matchedJobs = new uint256[](count);
        matchScores = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            matchedJobs[i] = tempJobs[i];
            matchScores[i] = tempScores[i];
        }
    }
    
    // Admin functions
    function verifyEmployer(address employer, bool isVerified) 
        external onlyRole(ADMIN_ROLE) {
        require(employers[employer].employerAddress != address(0), "Employer not registered");
        employers[employer].isVerified = isVerified;
    }
    
    function deactivateJob(uint256 jobId) external {
        require(
            jobListings[jobId].employer == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        jobListings[jobId].isActive = false;
    }
    
    function updateSkillGraphContract(address _skillGraphContract) 
        external onlyRole(ADMIN_ROLE) {
        require(_skillGraphContract != address(0), "Invalid address");
        skillGraphContract = _skillGraphContract;
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}