// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title StudentBadges
 * @dev ERC721 NFT contract for SkillPays achievement badges with tiered levels
 * @notice Represents verifiable skill achievements with onchain metadata
 * @author SkillPays Team
 */
contract StudentBadges is 
    ERC721, 
    ERC721Enumerable, 
    ERC721URIStorage, 
    AccessControl, 
    Pausable, 
    ReentrancyGuard 
{
    using Strings for uint256;

    /// @dev Role identifiers
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");

    /// @dev Badge level enumeration
    enum BadgeLevel { 
        BRONZE,    // 0
        SILVER,    // 1  
        GOLD,      // 2
        PLATINUM   // 3
    }

    /// @dev Badge metadata structure
    struct Badge {
        uint256 bootcampId;
        uint256 milestoneId;
        BadgeLevel level;
        uint256 earnedAt;
        string skillsProven;
        uint256 peerScore;
        bool isVerified;
        string metadataURI; // IPFS hash for additional metadata
    }

    /// @dev Skill proof structure for onchain resume
    struct SkillProof {
        string skillName;
        BadgeLevel proofLevel;
        uint256 verificationCount;
        uint256 lastUpdated;
        bool isActive;
    }

    /// @dev State variables
    mapping(uint256 => Badge) private _badges;
    mapping(address => mapping(string => SkillProof)) private _skillProofs;
    mapping(address => uint256[]) private _studentBadges;
    mapping(address => mapping(BadgeLevel => uint256)) private _levelCounts;
    mapping(address => string[]) private _studentSkills;
    
    /// @dev Token counter for unique IDs
    uint256 private _tokenIdCounter;
    
    /// @dev Base URI for metadata
    string private _baseTokenURI;

    /// @dev Events
    event BadgeMinted(
        address indexed student,
        uint256 indexed tokenId,
        uint256 indexed bootcampId,
        uint256 milestoneId,
        BadgeLevel level,
        uint256 peerScore
    );
    
    event BadgeLevelUpgraded(
        uint256 indexed tokenId,
        BadgeLevel oldLevel,
        BadgeLevel newLevel,
        address indexed upgrader
    );
    
    event SkillProofUpdated(
        address indexed student,
        string skillName,
        BadgeLevel level,
        uint256 verificationCount
    );

    event BaseURIUpdated(string oldURI, string newURI);

    /// @dev Custom errors
    error BadgeNotFound();
    error CannotDowngradeBadge();
    error InvalidSkillName();
    error InvalidBadgeLevel();
    error UnauthorizedAccess();

    /// @dev Constructor
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) {
        _baseTokenURI = baseURI;
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(URI_SETTER_ROLE, msg.sender);

        emit BaseURIUpdated("", baseURI);
    }

    /**
     * @notice Mint a new badge for a student
     * @param student Address of the student
     * @param bootcampId ID of the bootcamp
     * @param milestoneId ID of the milestone
     * @param level Badge level (0-3)
     * @param skillsProven Comma-separated skills proven
     * @param peerScore Peer review score (0-100)
     * @param metadataURI IPFS hash for additional metadata
     * @return tokenId The minted token ID
     */
    function mintBadge(
        address student,
        uint256 bootcampId,
        uint256 milestoneId,
        uint256 level,
        string calldata skillsProven,
        uint256 peerScore,
        string calldata metadataURI
    ) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
        nonReentrant 
        returns (uint256 tokenId) 
    {
        if (student == address(0)) revert ERC721InvalidReceiver(student);
        if (level > uint256(BadgeLevel.PLATINUM)) revert InvalidBadgeLevel();
        if (peerScore > 100) revert InvalidBadgeLevel();

        tokenId = ++_tokenIdCounter;
        BadgeLevel badgeLevel = BadgeLevel(level);

        // Create badge record
        _badges[tokenId] = Badge({
            bootcampId: bootcampId,
            milestoneId: milestoneId,
            level: badgeLevel,
            earnedAt: block.timestamp,
            skillsProven: skillsProven,
            peerScore: peerScore,
            isVerified: peerScore >= 80,
            metadataURI: metadataURI
        });

        // Update student tracking
        _studentBadges[student].push(tokenId);
        _levelCounts[student][badgeLevel]++;

        // Update skill proofs
        _updateSkillProofs(student, skillsProven, badgeLevel);

        // Mint the NFT
        _safeMint(student, tokenId);

        // Set token URI if provided
        if (bytes(metadataURI).length > 0) {
            _setTokenURI(tokenId, metadataURI);
        }

        emit BadgeMinted(student, tokenId, bootcampId, milestoneId, badgeLevel, peerScore);
    }

    /**
     * @notice Upgrade a badge to a higher level
     * @param tokenId Token ID to upgrade
     * @param newLevel New badge level
     */
    function upgradeBadgeLevel(uint256 tokenId, uint256 newLevel) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        if (_ownerOf(tokenId) == address(0)) revert BadgeNotFound();
        if (newLevel > uint256(BadgeLevel.PLATINUM)) revert InvalidBadgeLevel();
        
        Badge storage badge = _badges[tokenId];
        BadgeLevel newBadgeLevel = BadgeLevel(newLevel);
        
        if (newBadgeLevel <= badge.level) revert CannotDowngradeBadge();

        address owner = ownerOf(tokenId);
        BadgeLevel oldLevel = badge.level;

        // Update level counts
        _levelCounts[owner][oldLevel]--;
        _levelCounts[owner][newBadgeLevel]++;

        // Update badge level
        badge.level = newBadgeLevel;

        // Update skill proofs
        _updateSkillProofs(owner, badge.skillsProven, newBadgeLevel);

        emit BadgeLevelUpgraded(tokenId, oldLevel, newBadgeLevel, msg.sender);
    }

    /**
     * @dev Update skill proofs when badge is minted or upgraded
     * @param student Student address
     * @param skillsProven Comma-separated skills
     * @param level Badge level achieved
     */
    function _updateSkillProofs(
        address student,
        string memory skillsProven,
        BadgeLevel level
    ) private {
        string[] memory skills = _parseSkills(skillsProven);
        
        for (uint256 i = 0; i < skills.length; i++) {
            string memory skillName = skills[i];
            if (bytes(skillName).length == 0) continue;
            
            SkillProof storage proof = _skillProofs[student][skillName];
            
            // Add to student skills if new
            if (!proof.isActive) {
                _studentSkills[student].push(skillName);
                proof.skillName = skillName;
                proof.isActive = true;
            }
            
            // Update proof level if higher
            if (level > proof.proofLevel || proof.verificationCount == 0) {
                proof.proofLevel = level;
                proof.lastUpdated = block.timestamp;
            }
            
            proof.verificationCount++;
            
            emit SkillProofUpdated(student, skillName, proof.proofLevel, proof.verificationCount);
        }
    }

    /**
     * @dev Parse comma-separated skills string into array
     * @param skillsString Comma-separated skills
     * @return skills Array of individual skill names
     */
    function _parseSkills(string memory skillsString) private pure returns (string[] memory skills) {
        if (bytes(skillsString).length == 0) {
            return new string[](0);
        }

        bytes memory skillsBytes = bytes(skillsString);
        uint256 skillCount = 1;
        
        // Count commas to determine array size
        for (uint256 i = 0; i < skillsBytes.length; i++) {
            if (skillsBytes[i] == ',') {
                skillCount++;
            }
        }
        
        skills = new string[](skillCount);
        uint256 skillIndex = 0;
        uint256 start = 0;
        
        for (uint256 i = 0; i <= skillsBytes.length; i++) {
            if (i == skillsBytes.length || skillsBytes[i] == ',') {
                // Extract skill name
                bytes memory skillBytes = new bytes(i - start);
                for (uint256 j = start; j < i; j++) {
                    skillBytes[j - start] = skillsBytes[j];
                }
                
                // Trim whitespace and store
                skills[skillIndex] = _trim(string(skillBytes));
                skillIndex++;
                start = i + 1;
            }
        }
    }

    /**
     * @dev Trim whitespace from string
     * @param str String to trim
     * @return trimmed Trimmed string
     */
    function _trim(string memory str) private pure returns (string memory trimmed) {
        bytes memory strBytes = bytes(str);
        if (strBytes.length == 0) return str;
        
        uint256 start = 0;
        uint256 end = strBytes.length;
        
        // Find first non-space character
        while (start < end && strBytes[start] == ' ') {
            start++;
        }
        
        // Find last non-space character
        while (end > start && strBytes[end - 1] == ' ') {
            end--;
        }
        
        if (start >= end) return "";
        
        bytes memory trimmedBytes = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            trimmedBytes[i - start] = strBytes[i];
        }
        
        return string(trimmedBytes);
    }

    /**
     * @notice Generate comprehensive onchain resume for a student
     * @param student Student address
     * @return badgeIds Array of badge token IDs
     * @return skills Array of skill names  
     * @return skillLevels Array of skill levels
     * @return skillVerificationCounts Array of verification counts
     * @return totalBadges Total number of badges
     * @return reputationScore Overall reputation score
     */
    function generateOnchainResume(address student) 
        external 
        view 
        returns (
            uint256[] memory badgeIds,
            string[] memory skills,
            BadgeLevel[] memory skillLevels,
            uint256[] memory skillVerificationCounts,
            uint256 totalBadges,
            uint256 reputationScore,
            uint256 bronzeBadges,
            uint256 silverBadges,
            uint256 goldBadges,
            uint256 platinumBadges
        ) 
    {
        badgeIds = _studentBadges[student];
        
        // Get student skills
        string[] memory studentSkills = _studentSkills[student];
        skills = new string[](studentSkills.length);
        skillLevels = new BadgeLevel[](studentSkills.length);
        skillVerificationCounts = new uint256[](studentSkills.length);
        
        for (uint256 i = 0; i < studentSkills.length; i++) {
            skills[i] = studentSkills[i];
            SkillProof memory proof = _skillProofs[student][studentSkills[i]];
            skillLevels[i] = proof.proofLevel;
            skillVerificationCounts[i] = proof.verificationCount;
        }
        
        totalBadges = badgeIds.length;
        reputationScore = _calculateReputationScore(student);
        
        // Badge level counts
        bronzeBadges = _levelCounts[student][BadgeLevel.BRONZE];
        silverBadges = _levelCounts[student][BadgeLevel.SILVER];
        goldBadges = _levelCounts[student][BadgeLevel.GOLD];
        platinumBadges = _levelCounts[student][BadgeLevel.PLATINUM];
    }

    /**
     * @dev Calculate reputation score based on badges earned
     * @param student Student address
     * @return score Total reputation score
     */
    function _calculateReputationScore(address student) private view returns (uint256 score) {
        score += _levelCounts[student][BadgeLevel.BRONZE] * 10;
        score += _levelCounts[student][BadgeLevel.SILVER] * 25;
        score += _levelCounts[student][BadgeLevel.GOLD] * 50;
        score += _levelCounts[student][BadgeLevel.PLATINUM] * 100;
    }

    /**
     * @notice Generate SVG-based onchain metadata for a badge
     * @param tokenId Token ID
     * @return metadata Base64-encoded JSON metadata
     */
    function generateOnchainMetadata(uint256 tokenId) 
        public 
        view 
        returns (string memory metadata) 
    {
        if (_ownerOf(tokenId) == address(0)) revert BadgeNotFound();
        
        Badge memory badge = _badges[tokenId];
        string memory levelName = _getLevelName(badge.level);
        string memory svg = _generateBadgeSVG(badge);
        
        // Create JSON metadata
        string memory json = string(abi.encodePacked(
            '{"name":"SkillPays Badge #', tokenId.toString(), 
            '","description":"Verified skill achievement badge',
            '","level":"', levelName,
            '","skills":"', badge.skillsProven,
            '","bootcamp_id":', badge.bootcampId.toString(),
            '","milestone_id":', badge.milestoneId.toString(),
            '","peer_score":', badge.peerScore.toString(),
            '","earned_at":', badge.earnedAt.toString(),
            '","verified":', badge.isVerified ? 'true' : 'false',
            '","image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)),
            '"}'
        ));
        
        return string(abi.encodePacked(
            'data:application/json;base64,',
            Base64.encode(bytes(json))
        ));
    }

    /**
     * @dev Generate SVG for badge visualization
     * @param badge Badge data
     * @return svg SVG string
     */
    function _generateBadgeSVG(Badge memory badge) private pure returns (string memory svg) {
        string memory color = _getLevelColor(badge.level);
        string memory levelName = _getLevelName(badge.level);
        
        svg = string(abi.encodePacked(
            '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">',
            '<defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:', color, ';stop-opacity:1" />',
            '<stop offset="100%" style="stop-color:#ffffff;stop-opacity:0.3" />',
            '</linearGradient></defs>',
            '<circle cx="100" cy="100" r="90" fill="url(#grad)" stroke="#333" stroke-width="4"/>',
            '<text x="100" y="80" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#333">',
            'SkillPays</text>',
            '<text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#333">',
            levelName, '</text>',
            '<text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">',
            'Score: ', badge.peerScore.toString(), '</text>',
            '<text x="100" y="140" text-anchor="middle" font-family="Arial" font-size="8" fill="#999">',
            badge.isVerified ? 'VERIFIED' : 'PENDING', '</text>',
            '</svg>'
        ));
    }

    /**
     * @dev Get level name string
     * @param level Badge level
     * @return name Level name
     */
    function _getLevelName(BadgeLevel level) private pure returns (string memory name) {
        if (level == BadgeLevel.PLATINUM) return "PLATINUM";
        if (level == BadgeLevel.GOLD) return "GOLD";
        if (level == BadgeLevel.SILVER) return "SILVER";
        return "BRONZE";
    }

    /**
     * @dev Get level color for SVG
     * @param level Badge level
     * @return color Hex color code
     */
    function _getLevelColor(BadgeLevel level) private pure returns (string memory color) {
        if (level == BadgeLevel.PLATINUM) return "#E5E4E2";
        if (level == BadgeLevel.GOLD) return "#FFD700";
        if (level == BadgeLevel.SILVER) return "#C0C0C0";
        return "#CD7F32";
    }

    // ============ VIEW FUNCTIONS ============

    function getBadgeDetails(uint256 tokenId) external view returns (Badge memory) {
        if (_ownerOf(tokenId) == address(0)) revert BadgeNotFound();
        return _badges[tokenId];
    }

    function getStudentBadges(address student) external view returns (uint256[] memory) {
        return _studentBadges[student];
    }

    function getStudentLevelCounts(address student) external view returns (
        uint256 bronze, uint256 silver, uint256 gold, uint256 platinum
    ) {
        return (
            _levelCounts[student][BadgeLevel.BRONZE],
            _levelCounts[student][BadgeLevel.SILVER],
            _levelCounts[student][BadgeLevel.GOLD],
            _levelCounts[student][BadgeLevel.PLATINUM]
        );
    }

    function getSkillProof(address student, string memory skillName) 
        external view returns (SkillProof memory) {
        return _skillProofs[student][skillName];
    }

    function getStudentSkills(address student) external view returns (string[] memory) {
        return _studentSkills[student];
    }

    // ============ ADMIN FUNCTIONS ============

    function setBaseURI(string calldata newBaseURI) 
        external 
        onlyRole(URI_SETTER_ROLE) 
    {
        string memory oldURI = _baseTokenURI;
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(oldURI, newBaseURI);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ============ OVERRIDES ============

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        if (_ownerOf(tokenId) == address(0)) revert BadgeNotFound();
        
        // Return custom URI if set, otherwise generate onchain metadata
        string memory uri = super.tokenURI(tokenId);
        if (bytes(uri).length > 0) {
            return uri;
        }
        
        return generateOnchainMetadata(tokenId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        whenNotPaused
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}