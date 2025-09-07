// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title OrganizationRegistry
 * @dev Registry contract for managing educational organizations on the SkillPays platform
 * @notice This contract handles organization registration, verification, and management
 * @author SkillPays Team
 */
contract OrganizationRegistry is AccessControl, ReentrancyGuard, Pausable {
    using Address for address payable;

    /// @dev Role identifiers
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ORGANIZATION_ROLE = keccak256("ORGANIZATION_ROLE");

    /// @dev Organization verification levels
    enum VerificationLevel {
        UNVERIFIED,     // Default state - can create basic bootcamps
        VERIFIED,       // KYC verified - can create premium bootcamps
        PREMIUM,        // Premium verified - can issue certificates
        ENTERPRISE      // Enterprise level - full platform access
    }

    /// @dev Organization status
    enum OrganizationStatus {
        PENDING,        // Application submitted
        ACTIVE,         // Approved and active
        SUSPENDED,      // Temporarily suspended
        BLACKLISTED     // Permanently banned
    }

    /// @dev Organization profile structure
    struct Organization {
        uint256 id;
        string name;
        string description;
        string website;
        string logoUrl;
        string contactEmail;
        address payable walletAddress;
        VerificationLevel verificationLevel;
        OrganizationStatus status;
        uint256 registrationDate;
        uint256 lastUpdated;
        uint256 totalBootcamps;
        uint256 totalStudents;
        uint256 reputationScore;
        string[] specializations;
        bool canCreateBootcamps;
        bool canIssueCertificates;
        uint256 stakingAmount;
    }

    /// @dev Events
    event OrganizationRegistered(
        uint256 indexed organizationId,
        address indexed walletAddress,
        string name
    );
    
    event OrganizationVerified(
        uint256 indexed organizationId,
        VerificationLevel verificationLevel,
        address indexed verifier
    );
    
    event OrganizationUpdated(
        uint256 indexed organizationId,
        address indexed walletAddress
    );
    
    event OrganizationStatusChanged(
        uint256 indexed organizationId,
        OrganizationStatus oldStatus,
        OrganizationStatus newStatus,
        string reason
    );
    
    event StakeDeposited(
        uint256 indexed organizationId,
        address indexed organization,
        uint256 amount
    );
    
    event StakeWithdrawn(
        uint256 indexed organizationId,
        address indexed organization,
        uint256 amount
    );

    /// @dev State variables
    mapping(uint256 => Organization) private _organizations;
    mapping(address => uint256) private _addressToOrgId;
    mapping(string => uint256) private _nameToOrgId; // For name uniqueness
    mapping(uint256 => string[]) private _orgSpecializations;
    
    uint256 private _organizationIdCounter;
    uint256 private _minStakingAmount = 0.1 ether;
    uint256 private _registrationFee = 0.01 ether;
    
    address payable private _treasury;
    address private _skillPaysCore;

    /// @dev Modifiers
    modifier onlyRegisteredOrganization() {
        require(_addressToOrgId[msg.sender] != 0, "Not a registered organization");
        require(_organizations[_addressToOrgId[msg.sender]].status == OrganizationStatus.ACTIVE, "Organization not active");
        _;
    }

    modifier onlyVerifiedOrganization() {
        require(_addressToOrgId[msg.sender] != 0, "Not a registered organization");
        Organization memory org = _organizations[_addressToOrgId[msg.sender]];
        require(org.status == OrganizationStatus.ACTIVE, "Organization not active");
        require(org.verificationLevel != VerificationLevel.UNVERIFIED, "Organization not verified");
        _;
    }

    modifier organizationExists(uint256 organizationId) {
        require(organizationId > 0 && organizationId <= _organizationIdCounter, "Organization does not exist");
        _;
    }

    constructor(address payable treasury) {
        require(treasury != address(0), "Invalid treasury address");
        
        _treasury = treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    /**
     * @notice Register a new organization
     * @param name Organization name (must be unique)
     * @param description Organization description
     * @param website Organization website
     * @param logoUrl Logo URL
     * @param contactEmail Contact email
     * @param specializations Array of specialization areas
     */
    function registerOrganization(
        string calldata name,
        string calldata description,
        string calldata website,
        string calldata logoUrl,
        string calldata contactEmail,
        string[] calldata specializations
    ) external payable nonReentrant whenNotPaused {
        require(msg.value >= _registrationFee, "Insufficient registration fee");
        require(bytes(name).length > 0 && bytes(name).length <= 100, "Invalid name length");
        require(bytes(description).length > 0 && bytes(description).length <= 500, "Invalid description length");
        require(_nameToOrgId[name] == 0, "Organization name already exists");
        require(_addressToOrgId[msg.sender] == 0, "Address already registered");

        _organizationIdCounter++;
        uint256 orgId = _organizationIdCounter;

        Organization storage org = _organizations[orgId];
        org.id = orgId;
        org.name = name;
        org.description = description;
        org.website = website;
        org.logoUrl = logoUrl;
        org.contactEmail = contactEmail;
        org.walletAddress = payable(msg.sender);
        org.verificationLevel = VerificationLevel.UNVERIFIED;
        org.status = OrganizationStatus.PENDING;
        org.registrationDate = block.timestamp;
        org.lastUpdated = block.timestamp;
        org.reputationScore = 100; // Starting reputation
        org.specializations = specializations;
        org.canCreateBootcamps = false; // Pending approval
        org.canIssueCertificates = false;

        _addressToOrgId[msg.sender] = orgId;
        _nameToOrgId[name] = orgId;
        _orgSpecializations[orgId] = specializations;

        // Transfer registration fee to treasury
        _treasury.sendValue(msg.value);

        emit OrganizationRegistered(orgId, msg.sender, name);
    }

    /**
     * @notice Approve an organization registration (Admin only)
     * @param organizationId Organization ID to approve
     */
    function approveOrganization(uint256 organizationId) 
        external 
        onlyRole(ADMIN_ROLE) 
        organizationExists(organizationId) 
    {
        Organization storage org = _organizations[organizationId];
        require(org.status == OrganizationStatus.PENDING, "Organization not pending approval");

        org.status = OrganizationStatus.ACTIVE;
        org.canCreateBootcamps = true;
        org.lastUpdated = block.timestamp;

        // Grant organization role
        _grantRole(ORGANIZATION_ROLE, org.walletAddress);

        emit OrganizationStatusChanged(
            organizationId, 
            OrganizationStatus.PENDING, 
            OrganizationStatus.ACTIVE,
            "Approved by admin"
        );
    }

    /**
     * @notice Verify an organization to a specific level
     * @param organizationId Organization ID
     * @param verificationLevel New verification level
     */
    function verifyOrganization(
        uint256 organizationId, 
        VerificationLevel verificationLevel
    ) 
        external 
        onlyRole(VERIFIER_ROLE) 
        organizationExists(organizationId) 
    {
        Organization storage org = _organizations[organizationId];
        require(org.status == OrganizationStatus.ACTIVE, "Organization not active");
        
        org.verificationLevel = verificationLevel;
        org.lastUpdated = block.timestamp;

        // Update capabilities based on verification level
        if (verificationLevel >= VerificationLevel.PREMIUM) {
            org.canIssueCertificates = true;
        }

        emit OrganizationVerified(organizationId, verificationLevel, msg.sender);
    }

    /**
     * @notice Update organization profile
     * @param description New description
     * @param website New website
     * @param logoUrl New logo URL
     * @param contactEmail New contact email
     * @param specializations New specializations
     */
    function updateOrganization(
        string calldata description,
        string calldata website,
        string calldata logoUrl,
        string calldata contactEmail,
        string[] calldata specializations
    ) external onlyRegisteredOrganization {
        uint256 orgId = _addressToOrgId[msg.sender];
        Organization storage org = _organizations[orgId];

        if (bytes(description).length > 0) {
            require(bytes(description).length <= 500, "Description too long");
            org.description = description;
        }
        
        org.website = website;
        org.logoUrl = logoUrl;
        org.contactEmail = contactEmail;
        org.lastUpdated = block.timestamp;

        if (specializations.length > 0) {
            org.specializations = specializations;
            _orgSpecializations[orgId] = specializations;
        }

        emit OrganizationUpdated(orgId, msg.sender);
    }

    /**
     * @notice Deposit staking amount to increase trust score
     */
    function depositStake() external payable onlyRegisteredOrganization {
        require(msg.value > 0, "Must send ETH to stake");
        
        uint256 orgId = _addressToOrgId[msg.sender];
        Organization storage org = _organizations[orgId];
        
        org.stakingAmount += msg.value;
        
        emit StakeDeposited(orgId, msg.sender, msg.value);
    }

    /**
     * @notice Withdraw staking amount (with admin approval for large amounts)
     * @param amount Amount to withdraw
     */
    function withdrawStake(uint256 amount) external onlyRegisteredOrganization nonReentrant {
        uint256 orgId = _addressToOrgId[msg.sender];
        Organization storage org = _organizations[orgId];
        
        require(amount > 0, "Amount must be greater than 0");
        require(org.stakingAmount >= amount, "Insufficient stake");
        
        // Keep minimum stake if verified
        if (org.verificationLevel != VerificationLevel.UNVERIFIED) {
            require(org.stakingAmount - amount >= _minStakingAmount, "Cannot withdraw below minimum stake");
        }
        
        org.stakingAmount -= amount;
        payable(msg.sender).sendValue(amount);
        
        emit StakeWithdrawn(orgId, msg.sender, amount);
    }

    /**
     * @notice Update organization reputation (called by SkillPaysCore)
     * @param organizationId Organization ID
     * @param scoreChange Change in reputation score (can be negative)
     */
    function updateReputation(uint256 organizationId, int256 scoreChange) 
        external 
        organizationExists(organizationId) 
    {
        require(msg.sender == _skillPaysCore, "Only SkillPaysCore can update reputation");
        
        Organization storage org = _organizations[organizationId];
        
        if (scoreChange > 0) {
            org.reputationScore += uint256(scoreChange);
        } else if (scoreChange < 0) {
            uint256 decrease = uint256(-scoreChange);
            if (org.reputationScore > decrease) {
                org.reputationScore -= decrease;
            } else {
                org.reputationScore = 0;
            }
        }
        
        org.lastUpdated = block.timestamp;
    }

    /**
     * @notice Increment bootcamp count for organization
     * @param organizationAddress Organization address
     */
    function incrementBootcampCount(address organizationAddress) external {
        require(msg.sender == _skillPaysCore, "Only SkillPaysCore can update counts");
        uint256 orgId = _addressToOrgId[organizationAddress];
        if (orgId != 0) {
            _organizations[orgId].totalBootcamps++;
        }
    }

    /**
     * @notice Increment student count for organization
     * @param organizationAddress Organization address
     */
    function incrementStudentCount(address organizationAddress) external {
        require(msg.sender == _skillPaysCore, "Only SkillPaysCore can update counts");
        uint256 orgId = _addressToOrgId[organizationAddress];
        if (orgId != 0) {
            _organizations[orgId].totalStudents++;
        }
    }

    // View functions
    function getOrganization(uint256 organizationId) 
        external 
        view 
        organizationExists(organizationId) 
        returns (Organization memory) 
    {
        return _organizations[organizationId];
    }

    function getOrganizationByAddress(address orgAddress) 
        external 
        view 
        returns (Organization memory) 
    {
        uint256 orgId = _addressToOrgId[orgAddress];
        require(orgId != 0, "Organization not found");
        return _organizations[orgId];
    }

    function isOrganization(address addr) external view returns (bool) {
        uint256 orgId = _addressToOrgId[addr];
        if (orgId == 0) return false;
        
        Organization memory org = _organizations[orgId];
        return org.status == OrganizationStatus.ACTIVE;
    }

    function canCreateBootcamps(address addr) external view returns (bool) {
        uint256 orgId = _addressToOrgId[addr];
        if (orgId == 0) return false;
        
        Organization memory org = _organizations[orgId];
        return org.status == OrganizationStatus.ACTIVE && org.canCreateBootcamps;
    }

    function canIssueCertificates(address addr) external view returns (bool) {
        uint256 orgId = _addressToOrgId[addr];
        if (orgId == 0) return false;
        
        Organization memory org = _organizations[orgId];
        return org.status == OrganizationStatus.ACTIVE && org.canIssueCertificates;
    }

    function getOrganizationSpecializations(uint256 organizationId) 
        external 
        view 
        organizationExists(organizationId) 
        returns (string[] memory) 
    {
        return _orgSpecializations[organizationId];
    }

    function getTotalOrganizations() external view returns (uint256) {
        return _organizationIdCounter;
    }

    // Admin functions
    function setMinStakingAmount(uint256 amount) external onlyRole(ADMIN_ROLE) {
        _minStakingAmount = amount;
    }

    function setRegistrationFee(uint256 fee) external onlyRole(ADMIN_ROLE) {
        _registrationFee = fee;
    }

    function setSkillPaysCoreAddress(address skillPaysCoreAddress) external onlyRole(ADMIN_ROLE) {
        require(skillPaysCoreAddress != address(0), "Invalid address");
        _skillPaysCore = skillPaysCoreAddress;
    }

    function suspendOrganization(uint256 organizationId, string calldata reason) 
        external 
        onlyRole(ADMIN_ROLE) 
        organizationExists(organizationId) 
    {
        Organization storage org = _organizations[organizationId];
        OrganizationStatus oldStatus = org.status;
        org.status = OrganizationStatus.SUSPENDED;
        org.canCreateBootcamps = false;
        org.lastUpdated = block.timestamp;

        emit OrganizationStatusChanged(organizationId, oldStatus, OrganizationStatus.SUSPENDED, reason);
    }

    function reactivateOrganization(uint256 organizationId) 
        external 
        onlyRole(ADMIN_ROLE) 
        organizationExists(organizationId) 
    {
        Organization storage org = _organizations[organizationId];
        require(org.status == OrganizationStatus.SUSPENDED, "Organization not suspended");
        
        org.status = OrganizationStatus.ACTIVE;
        org.canCreateBootcamps = true;
        org.lastUpdated = block.timestamp;

        emit OrganizationStatusChanged(
            organizationId, 
            OrganizationStatus.SUSPENDED, 
            OrganizationStatus.ACTIVE,
            "Reactivated by admin"
        );
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function updateTreasury(address payable newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid treasury address");
        _treasury = newTreasury;
    }

    // Emergency functions
    function emergencyWithdraw() external onlyRole(ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        _treasury.sendValue(balance);
    }

    receive() external payable {
        // Allow contract to receive ETH for staking
    }
}