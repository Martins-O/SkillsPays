// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IOrganizationRegistry
 * @dev Interface for the OrganizationRegistry contract
 */
interface IOrganizationRegistry {
    enum VerificationLevel {
        UNVERIFIED,
        VERIFIED,
        PREMIUM,
        ENTERPRISE
    }

    enum OrganizationStatus {
        PENDING,
        ACTIVE,
        SUSPENDED,
        BLACKLISTED
    }

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

    function isOrganization(address addr) external view returns (bool);
    function canCreateBootcamps(address addr) external view returns (bool);
    function canIssueCertificates(address addr) external view returns (bool);
    function getOrganizationByAddress(address orgAddress) external view returns (Organization memory);
    function incrementBootcampCount(address organizationAddress) external;
    function incrementStudentCount(address organizationAddress) external;
    function updateReputation(uint256 organizationId, int256 scoreChange) external;
}