// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract GraduateDAO is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant GRADUATE_ROLE = keccak256("GRADUATE_ROLE");
    bytes32 public constant PROPOSAL_CREATOR_ROLE = keccak256("PROPOSAL_CREATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    enum ProposalType { PROGRAM_IMPROVEMENT, FEATURE_REQUEST, TREASURY_ALLOCATION, GOVERNANCE_CHANGE, PARTNERSHIP }
    enum ProposalStatus { PENDING, ACTIVE, EXECUTED, REJECTED, EXPIRED }
    enum VoteType { AGAINST, FOR, ABSTAIN }
    
    struct Proposal {
        uint256 id;
        address proposer;
        ProposalType proposalType;
        string title;
        string description;
        string proposalHash; // IPFS hash with detailed proposal
        uint256 votingStartTime;
        uint256 votingEndTime;
        uint256 executionDelay;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 totalVotes;
        ProposalStatus status;
        bool executed;
        uint256 requiredQuorum;
        uint256 createdAt;
    }
    
    struct Vote {
        address voter;
        uint256 proposalId;
        VoteType voteType;
        uint256 votingPower;
        string reason;
        uint256 timestamp;
    }
    
    struct GraduateMember {
        address memberAddress;
        string name;
        uint256 votingPower;
        uint256 totalBadges;
        uint256 reputationScore;
        uint256[] completedBootcamps;
        uint256 joinedDAOAt;
        bool isActive;
        uint256 proposalsCreated;
        uint256 votesParticipated;
    }
    
    struct TreasuryAllocation {
        uint256 proposalId;
        address recipient;
        uint256 amount;
        string purpose;
        bool isExecuted;
        uint256 executedAt;
    }
    
    struct GovernanceParameters {
        uint256 minVotingPeriod;     // Minimum voting duration
        uint256 maxVotingPeriod;     // Maximum voting duration
        uint256 executionDelay;      // Time delay before execution
        uint256 proposalThreshold;   // Min tokens to create proposal
        uint256 quorumThreshold;     // Min votes needed for quorum
        uint256 majorityThreshold;   // % needed to pass (in basis points)
        uint256 minBadgesForMembership; // Min badges required to join
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => GraduateMember) public members;
    mapping(uint256 => TreasuryAllocation) public treasuryAllocations;
    mapping(address => uint256[]) public memberProposals;
    mapping(address => uint256[]) public memberVotes;
    
    uint256 private _proposalIds;
    uint256 private _treasuryAllocationIds;
    uint256 public totalMembers;
    uint256 public treasuryBalance;
    
    GovernanceParameters public governance;
    
    address public skillPaysCore;
    address public badgeContract;
    
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, ProposalType proposalType, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, VoteType voteType, uint256 votingPower);
    event ProposalExecuted(uint256 indexed proposalId, ProposalStatus status);
    event MemberJoined(address indexed member, uint256 votingPower);
    event TreasuryAllocationExecuted(uint256 indexed allocationId, address recipient, uint256 amount);
    event GovernanceParametersUpdated();
    event MemberVotingPowerUpdated(address indexed member, uint256 oldPower, uint256 newPower);
    
    modifier onlyGraduate() {
        require(hasRole(GRADUATE_ROLE, msg.sender), "Only graduates can call this function");
        require(members[msg.sender].isActive, "Member not active");
        _;
    }
    
    modifier onlyActiveMember() {
        require(members[msg.sender].isActive, "Member not active");
        _;
    }
    
    constructor(address _skillPaysCore, address _badgeContract) {
        require(_skillPaysCore != address(0), "Invalid SkillPays core address");
        require(_badgeContract != address(0), "Invalid badge contract address");
        
        skillPaysCore = _skillPaysCore;
        badgeContract = _badgeContract;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Initialize governance parameters
        governance = GovernanceParameters({
            minVotingPeriod: 3 days,
            maxVotingPeriod: 7 days,
            executionDelay: 1 days,
            proposalThreshold: 100, // Need 100 voting power to create proposal
            quorumThreshold: 1000,  // Need 1000 total votes for quorum
            majorityThreshold: 5000, // Need 50% majority (in basis points)
            minBadgesForMembership: 10 // Need 10 badges to join
        });
    }
    
    function joinDAO(string memory name) external whenNotPaused {
        require(!members[msg.sender].isActive, "Already a DAO member");
        
        // Get member data from SkillPays contracts
        (uint256 totalBadges, uint256 reputationScore, uint256[] memory bootcamps) = 
            _getMemberDataFromContracts(msg.sender);
        
        require(totalBadges >= governance.minBadgesForMembership, "Not enough badges to join");
        
        // Calculate voting power based on badges and reputation
        uint256 votingPower = _calculateVotingPower(totalBadges, reputationScore);
        
        members[msg.sender] = GraduateMember({
            memberAddress: msg.sender,
            name: name,
            votingPower: votingPower,
            totalBadges: totalBadges,
            reputationScore: reputationScore,
            completedBootcamps: bootcamps,
            joinedDAOAt: block.timestamp,
            isActive: true,
            proposalsCreated: 0,
            votesParticipated: 0
        });
        
        _grantRole(GRADUATE_ROLE, msg.sender);
        
        // Grant proposal creator role if they have enough voting power
        if (votingPower >= governance.proposalThreshold) {
            _grantRole(PROPOSAL_CREATOR_ROLE, msg.sender);
        }
        
        totalMembers++;
        
        emit MemberJoined(msg.sender, votingPower);
    }
    
    function createProposal(
        ProposalType proposalType,
        string memory title,
        string memory description,
        string memory proposalHash,
        uint256 votingDuration,
        uint256 executionDelay
    ) external onlyRole(PROPOSAL_CREATOR_ROLE) onlyActiveMember whenNotPaused returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(votingDuration >= governance.minVotingPeriod, "Voting period too short");
        require(votingDuration <= governance.maxVotingPeriod, "Voting period too long");
        require(executionDelay >= governance.executionDelay, "Execution delay too short");
        
        _proposalIds++;
        uint256 proposalId = _proposalIds;
        
        // Calculate required quorum based on proposal type
        uint256 requiredQuorum = _calculateRequiredQuorum(proposalType);
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            proposalType: proposalType,
            title: title,
            description: description,
            proposalHash: proposalHash,
            votingStartTime: block.timestamp,
            votingEndTime: block.timestamp + votingDuration,
            executionDelay: executionDelay,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            totalVotes: 0,
            status: ProposalStatus.ACTIVE,
            executed: false,
            requiredQuorum: requiredQuorum,
            createdAt: block.timestamp
        });
        
        members[msg.sender].proposalsCreated++;
        memberProposals[msg.sender].push(proposalId);
        
        emit ProposalCreated(proposalId, msg.sender, proposalType, title);
        return proposalId;
    }
    
    function vote(uint256 proposalId, VoteType voteType, string memory reason) 
        external onlyGraduate whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(proposal.status == ProposalStatus.ACTIVE, "Proposal not active");
        require(block.timestamp <= proposal.votingEndTime, "Voting period ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted on this proposal");
        
        uint256 votingPower = members[msg.sender].votingPower;
        require(votingPower > 0, "No voting power");
        
        // Record vote
        votes[proposalId][msg.sender] = Vote({
            voter: msg.sender,
            proposalId: proposalId,
            voteType: voteType,
            votingPower: votingPower,
            reason: reason,
            timestamp: block.timestamp
        });
        
        hasVoted[proposalId][msg.sender] = true;
        
        // Update proposal vote counts
        if (voteType == VoteType.FOR) {
            proposal.forVotes += votingPower;
        } else if (voteType == VoteType.AGAINST) {
            proposal.againstVotes += votingPower;
        } else {
            proposal.abstainVotes += votingPower;
        }
        
        proposal.totalVotes += votingPower;
        
        // Update member stats
        members[msg.sender].votesParticipated++;
        memberVotes[msg.sender].push(proposalId);
        
        emit VoteCast(proposalId, msg.sender, voteType, votingPower);
        
        // Check if proposal can be executed early (if overwhelming support)
        _checkEarlyExecution(proposalId);
    }
    
    function executeProposal(uint256 proposalId) external whenNotPaused nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(proposal.status == ProposalStatus.ACTIVE, "Proposal not active");
        require(block.timestamp > proposal.votingEndTime, "Voting still active");
        require(!proposal.executed, "Already executed");
        
        // Check if proposal passed
        bool passed = _hasProposalPassed(proposalId);
        
        if (passed) {
            proposal.status = ProposalStatus.EXECUTED;
            proposal.executed = true;
            
            // Execute proposal based on type
            _executeProposalAction(proposalId);
        } else {
            proposal.status = ProposalStatus.REJECTED;
        }
        
        emit ProposalExecuted(proposalId, proposal.status);
    }
    
    function _executeProposalAction(uint256 proposalId) private {
        Proposal memory proposal = proposals[proposalId];
        
        if (proposal.proposalType == ProposalType.TREASURY_ALLOCATION) {
            // Handle treasury allocation
            _executeTreasuryAllocation(proposalId);
        } else if (proposal.proposalType == ProposalType.GOVERNANCE_CHANGE) {
            // Handle governance parameter changes
            _executeGovernanceChange(proposalId);
        } else if (proposal.proposalType == ProposalType.PROGRAM_IMPROVEMENT) {
            // These would be handled off-chain or through integration
            // Mark as executed for tracking purposes
        }
        // Other proposal types would be implemented similarly
    }
    
    function _executeTreasuryAllocation(uint256 proposalId) private {
        // This would parse the proposal details to extract allocation info
        // Simplified implementation
        _treasuryAllocationIds++;
        uint256 allocationId = _treasuryAllocationIds;
        
        // In a real implementation, you'd parse the proposal data to get these values
        address recipient = proposals[proposalId].proposer; // Simplified
        uint256 amount = 0.1 ether; // This would come from proposal data
        
        require(treasuryBalance >= amount, "Insufficient treasury balance");
        
        treasuryAllocations[allocationId] = TreasuryAllocation({
            proposalId: proposalId,
            recipient: recipient,
            amount: amount,
            purpose: proposals[proposalId].description,
            isExecuted: true,
            executedAt: block.timestamp
        });
        
        treasuryBalance -= amount;
        payable(recipient).transfer(amount);
        
        emit TreasuryAllocationExecuted(allocationId, recipient, amount);
    }
    
    function _executeGovernanceChange(uint256 proposalId) private {
        // This would parse proposal data to update governance parameters
        // Simplified implementation - in reality, you'd have structured proposal data
        
        emit GovernanceParametersUpdated();
    }
    
    function _hasProposalPassed(uint256 proposalId) private view returns (bool) {
        Proposal memory proposal = proposals[proposalId];
        
        // Check quorum
        if (proposal.totalVotes < proposal.requiredQuorum) {
            return false;
        }
        
        // Check majority
        uint256 totalDecisionVotes = proposal.forVotes + proposal.againstVotes;
        if (totalDecisionVotes == 0) {
            return false;
        }
        
        uint256 majorityRequired = (totalDecisionVotes * governance.majorityThreshold) / 10000;
        return proposal.forVotes > majorityRequired;
    }
    
    function _checkEarlyExecution(uint256 proposalId) private {
        Proposal storage proposal = proposals[proposalId];
        
        // Check if we have overwhelming support (75%+ of total possible votes)
        uint256 totalPossibleVotes = _getTotalVotingPower();
        uint256 overwhelmingSupport = (totalPossibleVotes * 7500) / 10000; // 75%
        
        if (proposal.forVotes >= overwhelmingSupport) {
            proposal.votingEndTime = block.timestamp; // End voting immediately
        }
    }
    
    function _calculateVotingPower(uint256 totalBadges, uint256 reputationScore) 
        private pure returns (uint256) {
        // Base power from badges
        uint256 badgePower = totalBadges * 10;
        
        // Reputation multiplier (1.0x to 2.0x)
        uint256 reputationMultiplier = 100 + (reputationScore / 10); // Max 200% if reputation is 1000
        if (reputationMultiplier > 200) reputationMultiplier = 200;
        
        uint256 votingPower = (badgePower * reputationMultiplier) / 100;
        
        // Cap voting power to prevent excessive concentration
        if (votingPower > 1000) votingPower = 1000;
        
        return votingPower;
    }
    
    function _calculateRequiredQuorum(ProposalType proposalType) private view returns (uint256) {
        uint256 baseQuorum = governance.quorumThreshold;
        
        // Higher quorum for critical changes
        if (proposalType == ProposalType.GOVERNANCE_CHANGE) {
            return (baseQuorum * 150) / 100; // 50% higher quorum
        } else if (proposalType == ProposalType.TREASURY_ALLOCATION) {
            return (baseQuorum * 125) / 100; // 25% higher quorum
        }
        
        return baseQuorum;
    }
    
    function _getMemberDataFromContracts(address member) 
        private view returns (uint256 totalBadges, uint256 reputationScore, uint256[] memory bootcamps) {
        // In a real implementation, this would call the SkillPays and Badge contracts
        // Simplified implementation
        totalBadges = 15; // Mock data
        reputationScore = 500; // Mock data
        bootcamps = new uint256[](2);
        bootcamps[0] = 1;
        bootcamps[1] = 2;
    }
    
    function _getTotalVotingPower() private view returns (uint256) {
        // In a real implementation, you'd maintain this as a state variable
        // This is simplified for demonstration
        return totalMembers * 500; // Average voting power estimate
    }
    
    function updateMemberVotingPower(address member) external onlyRole(ADMIN_ROLE) {
        require(members[member].isActive, "Member not active");
        
        (uint256 totalBadges, uint256 reputationScore,) = _getMemberDataFromContracts(member);
        uint256 oldPower = members[member].votingPower;
        uint256 newPower = _calculateVotingPower(totalBadges, reputationScore);
        
        members[member].votingPower = newPower;
        members[member].totalBadges = totalBadges;
        members[member].reputationScore = reputationScore;
        
        // Update roles based on new voting power
        if (newPower >= governance.proposalThreshold) {
            _grantRole(PROPOSAL_CREATOR_ROLE, member);
        } else {
            _revokeRole(PROPOSAL_CREATOR_ROLE, member);
        }
        
        emit MemberVotingPowerUpdated(member, oldPower, newPower);
    }
    
    // View functions
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
    
    function getVote(uint256 proposalId, address voter) external view returns (Vote memory) {
        return votes[proposalId][voter];
    }
    
    function getMember(address member) external view returns (GraduateMember memory) {
        return members[member];
    }
    
    function getMemberProposals(address member) external view returns (uint256[] memory) {
        return memberProposals[member];
    }
    
    function getMemberVotes(address member) external view returns (uint256[] memory) {
        return memberVotes[member];
    }
    
    function getGovernanceParameters() external view returns (GovernanceParameters memory) {
        return governance;
    }
    
    function canCreateProposal(address member) external view returns (bool) {
        return members[member].isActive && 
               hasRole(PROPOSAL_CREATOR_ROLE, member) && 
               members[member].votingPower >= governance.proposalThreshold;
    }
    
    function getProposalStatus(uint256 proposalId) external view returns (
        ProposalStatus status,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        uint256 totalVotes,
        bool hasQuorum,
        bool hasMajority
    ) {
        Proposal memory proposal = proposals[proposalId];
        
        bool quorum = proposal.totalVotes >= proposal.requiredQuorum;
        bool majority = _hasProposalPassed(proposalId);
        
        return (
            proposal.status,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.totalVotes,
            quorum,
            majority
        );
    }
    
    // Admin functions
    function updateGovernanceParameters(
        uint256 minVotingPeriod,
        uint256 maxVotingPeriod,
        uint256 executionDelay,
        uint256 proposalThreshold,
        uint256 quorumThreshold,
        uint256 majorityThreshold,
        uint256 minBadgesForMembership
    ) external onlyRole(ADMIN_ROLE) {
        governance.minVotingPeriod = minVotingPeriod;
        governance.maxVotingPeriod = maxVotingPeriod;
        governance.executionDelay = executionDelay;
        governance.proposalThreshold = proposalThreshold;
        governance.quorumThreshold = quorumThreshold;
        governance.majorityThreshold = majorityThreshold;
        governance.minBadgesForMembership = minBadgesForMembership;
        
        emit GovernanceParametersUpdated();
    }
    
    function addToTreasury() external payable onlyRole(ADMIN_ROLE) {
        treasuryBalance += msg.value;
    }
    
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function emergencyUnpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    receive() external payable {
        treasuryBalance += msg.value;
    }
}