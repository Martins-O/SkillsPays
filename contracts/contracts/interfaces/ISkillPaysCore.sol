// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISkillPaysCore {
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
        uint256 duration;
        uint256 fee;
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
    }
    
    event StudentRegistered(address indexed student, string name);
    event BootcampCreated(uint256 indexed bootcampId, string name, address creator);
    event MilestoneCompleted(address indexed student, uint256 indexed bootcampId, uint256 milestoneId);
    event BadgeMinted(address indexed student, uint256 indexed tokenId, uint256 level);
    
    function registerStudent(string memory name) external;
    function createBootcamp(string memory name, string memory description, uint256 duration, uint256 fee) external returns (uint256);
    function enrollInBootcamp(uint256 bootcampId) external payable;
    function completeMilestone(uint256 bootcampId, uint256 milestoneId, bytes memory proof) external;
    function getStudent(address studentAddress) external view returns (Student memory);
    function getBootcamp(uint256 bootcampId) external view returns (Bootcamp memory);
    function getBootcampMilestones(uint256 bootcampId) external view returns (Milestone[] memory);
    function getStudentBootcamps(address student) external view returns (uint256[] memory);
}