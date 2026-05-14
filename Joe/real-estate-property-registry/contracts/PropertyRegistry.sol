// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PropertyRegistry
 * @dev A decentralized real estate property registration system
 * 
 * PROBLEM SOLVED:
 * Traditional property registration suffers from:
 * - Centralized authority control and corruption
 * - Slow, paper-based processes taking weeks/months
 * - Lack of transparency in ownership history
 * - High intermediary costs (lawyers, notaries, brokers)
 * - Risk of forged documents and duplicate sales
 * 
 * SMART CONTRACT SOLUTION:
 * - Immutable, transparent ownership records on blockchain
 * - Instant verification of property ownership
 * - Automated transfer with built-in validation
 * - Reduced costs by eliminating intermediaries
 * - Complete audit trail of all transactions
 */

contract PropertyRegistry {

    // ============ STATE VARIABLES ============

    address public admin;
    uint256 public propertyCounter;

    // Property status enum
    enum PropertyStatus { 
        Pending,      // Awaiting admin verification
        Verified,     // Approved and active
        ForSale,      // Listed for sale
        Sold,         // Ownership transferred
        Disputed      // Under legal dispute
    }

    // Property structure
    struct Property {
        uint256 id;
        address owner;
        string propertyAddress;      // Physical address
        string description;          // Property details
        uint256 area;                // Area in sq ft
        uint256 registrationDate;
        uint256 price;               // Current listed price (0 if not for sale)
        PropertyStatus status;
        bool exists;
        bytes32 documentHash;        // Hash of legal documents
    }

    // Ownership history record
    struct OwnershipRecord {
        address previousOwner;
        address newOwner;
        uint256 timestamp;
        uint256 price;
        string transactionType;
    }

    // ============ MAPPINGS ============

    mapping(uint256 => Property) public properties;
    mapping(uint256 => OwnershipRecord[]) public ownershipHistory;
    mapping(address => uint256[]) public ownerProperties;
    mapping(bytes32 => bool) public registeredDocumentHashes; // Prevent duplicate docs
    mapping(address => bool) public verifiers; // Authorized verifiers

    // ============ EVENTS ============

    event PropertyRegistered(
        uint256 indexed propertyId,
        address indexed owner,
        string propertyAddress,
        uint256 timestamp
    );

    event PropertyVerified(
        uint256 indexed propertyId,
        address indexed verifier,
        uint256 timestamp
    );

    event PropertyListedForSale(
        uint256 indexed propertyId,
        uint256 price,
        uint256 timestamp
    );

    event PropertySold(
        uint256 indexed propertyId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 price,
        uint256 timestamp
    );

    event OwnershipTransferred(
        uint256 indexed propertyId,
        address indexed from,
        address indexed to
    );

    event StatusChanged(
        uint256 indexed propertyId,
        PropertyStatus oldStatus,
        PropertyStatus newStatus
    );

    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);

    // ============ MODIFIERS ============

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyOwner(uint256 _propertyId) {
        require(properties[_propertyId].exists, "Property does not exist");
        require(properties[_propertyId].owner == msg.sender, "Not the property owner");
        _;
    }

    modifier onlyVerifier() {
        require(verifiers[msg.sender] || msg.sender == admin, "Not an authorized verifier");
        _;
    }

    modifier propertyExists(uint256 _propertyId) {
        require(properties[_propertyId].exists, "Property does not exist");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor() {
        admin = msg.sender;
        propertyCounter = 0;
        verifiers[msg.sender] = true;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Add a new authorized verifier
     */
    function addVerifier(address _verifier) external onlyAdmin {
        require(_verifier != address(0), "Invalid address");
        require(!verifiers[_verifier], "Already a verifier");
        verifiers[_verifier] = true;
        emit VerifierAdded(_verifier);
    }

    /**
     * @dev Remove an authorized verifier
     */
    function removeVerifier(address _verifier) external onlyAdmin {
        require(verifiers[_verifier], "Not a verifier");
        require(_verifier != admin, "Cannot remove admin");
        verifiers[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }

    // ============ CORE FUNCTIONS ============

    /**
     * @dev Register a new property
     * @param _propertyAddress Physical address of the property
     * @param _description Property description/details
     * @param _area Property area in square feet
     * @param _documentHash Hash of legal documents (IPFS or SHA-256)
     */
    function registerProperty(
        string memory _propertyAddress,
        string memory _description,
        uint256 _area,
        bytes32 _documentHash
    ) external returns (uint256) {

        require(bytes(_propertyAddress).length > 0, "Property address required");
        require(bytes(_description).length > 0, "Description required");
        require(_area > 0, "Area must be greater than 0");
        require(_documentHash != bytes32(0), "Document hash required");
        require(!registeredDocumentHashes[_documentHash], "Document already registered");

        propertyCounter++;
        uint256 newPropertyId = propertyCounter;

        properties[newPropertyId] = Property({
            id: newPropertyId,
            owner: msg.sender,
            propertyAddress: _propertyAddress,
            description: _description,
            area: _area,
            registrationDate: block.timestamp,
            price: 0,
            status: PropertyStatus.Pending,
            exists: true,
            documentHash: _documentHash
        });

        registeredDocumentHashes[_documentHash] = true;
        ownerProperties[msg.sender].push(newPropertyId);

        // Record initial ownership
        ownershipHistory[newPropertyId].push(OwnershipRecord({
            previousOwner: address(0),
            newOwner: msg.sender,
            timestamp: block.timestamp,
            price: 0,
            transactionType: "Initial Registration"
        }));

        emit PropertyRegistered(newPropertyId, msg.sender, _propertyAddress, block.timestamp);

        return newPropertyId;
    }

    /**
     * @dev Verify a property (admin/verifier only)
     */
    function verifyProperty(uint256 _propertyId) 
        external 
        onlyVerifier 
        propertyExists(_propertyId) 
    {
        Property storage property = properties[_propertyId];
        require(property.status == PropertyStatus.Pending, "Property not in pending status");

        PropertyStatus oldStatus = property.status;
        property.status = PropertyStatus.Verified;

        emit PropertyVerified(_propertyId, msg.sender, block.timestamp);
        emit StatusChanged(_propertyId, oldStatus, PropertyStatus.Verified);
    }

    /**
     * @dev List property for sale
     */
    function listForSale(uint256 _propertyId, uint256 _price) 
        external 
        onlyOwner(_propertyId) 
    {
        Property storage property = properties[_propertyId];
        require(
            property.status == PropertyStatus.Verified || 
            property.status == PropertyStatus.Sold,
            "Property must be verified first"
        );
        require(_price > 0, "Price must be greater than 0");

        PropertyStatus oldStatus = property.status;
        property.status = PropertyStatus.ForSale;
        property.price = _price;

        emit PropertyListedForSale(_propertyId, _price, block.timestamp);
        emit StatusChanged(_propertyId, oldStatus, PropertyStatus.ForSale);
    }

    /**
     * @dev Buy a property that is listed for sale
     */
    function buyProperty(uint256 _propertyId) 
        external 
        payable 
        propertyExists(_propertyId) 
    {
        Property storage property = properties[_propertyId];

        require(property.status == PropertyStatus.ForSale, "Property not for sale");
        require(msg.sender != property.owner, "Cannot buy your own property");
        require(msg.value >= property.price, "Insufficient payment");

        address previousOwner = property.owner;
        uint256 salePrice = property.price;

        // Update ownership
        property.owner = msg.sender;
        property.status = PropertyStatus.Sold;
        property.price = 0;

        // Update owner properties mapping
        _removeFromOwnerProperties(previousOwner, _propertyId);
        ownerProperties[msg.sender].push(_propertyId);

        // Record ownership history
        ownershipHistory[_propertyId].push(OwnershipRecord({
            previousOwner: previousOwner,
            newOwner: msg.sender,
            timestamp: block.timestamp,
            price: salePrice,
            transactionType: "Sale"
        }));

        // Transfer funds to previous owner
        (bool sent, ) = payable(previousOwner).call{value: salePrice}("");
        require(sent, "Failed to send Ether");

        // Refund excess payment
        if (msg.value > salePrice) {
            (bool refundSent, ) = payable(msg.sender).call{value: msg.value - salePrice}("");
            require(refundSent, "Failed to refund excess");
        }

        emit PropertySold(_propertyId, previousOwner, msg.sender, salePrice, block.timestamp);
        emit OwnershipTransferred(_propertyId, previousOwner, msg.sender);
    }

    /**
     * @dev Transfer property to another address (gift/inheritance)
     */
    function transferProperty(uint256 _propertyId, address _newOwner) 
        external 
        onlyOwner(_propertyId) 
    {
        require(_newOwner != address(0), "Invalid new owner address");
        require(_newOwner != msg.sender, "Cannot transfer to yourself");

        Property storage property = properties[_propertyId];
        address previousOwner = property.owner;

        property.owner = _newOwner;
        property.status = PropertyStatus.Verified;
        property.price = 0;

        _removeFromOwnerProperties(previousOwner, _propertyId);
        ownerProperties[_newOwner].push(_propertyId);

        ownershipHistory[_propertyId].push(OwnershipRecord({
            previousOwner: previousOwner,
            newOwner: _newOwner,
            timestamp: block.timestamp,
            price: 0,
            transactionType: "Transfer"
        }));

        emit OwnershipTransferred(_propertyId, previousOwner, _newOwner);
    }

    /**
     * @dev Mark property as disputed (admin only)
     */
    function markDisputed(uint256 _propertyId, bool _disputed) 
        external 
        onlyAdmin 
        propertyExists(_propertyId) 
    {
        Property storage property = properties[_propertyId];
        PropertyStatus oldStatus = property.status;

        if (_disputed) {
            property.status = PropertyStatus.Disputed;
        } else {
            property.status = PropertyStatus.Verified;
        }

        emit StatusChanged(_propertyId, oldStatus, property.status);
    }

    /**
     * @dev Update property details (owner only)
     */
    function updatePropertyDetails(
        uint256 _propertyId,
        string memory _description,
        uint256 _area
    ) external onlyOwner(_propertyId) {
        require(bytes(_description).length > 0, "Description required");
        require(_area > 0, "Area must be greater than 0");

        Property storage property = properties[_propertyId];
        property.description = _description;
        property.area = _area;
    }

    // ============ HELPER FUNCTIONS ============

    function _removeFromOwnerProperties(address _owner, uint256 _propertyId) internal {
        uint256[] storage props = ownerProperties[_owner];
        for (uint256 i = 0; i < props.length; i++) {
            if (props[i] == _propertyId) {
                props[i] = props[props.length - 1];
                props.pop();
                break;
            }
        }
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get property details
     */
    function getProperty(uint256 _propertyId) 
        external 
        view 
        propertyExists(_propertyId) 
        returns (Property memory) 
    {
        return properties[_propertyId];
    }

    /**
     * @dev Get ownership history
     */
    function getOwnershipHistory(uint256 _propertyId) 
        external 
        view 
        propertyExists(_propertyId) 
        returns (OwnershipRecord[] memory) 
    {
        return ownershipHistory[_propertyId];
    }

    /**
     * @dev Get all properties owned by an address
     */
    function getOwnerProperties(address _owner) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return ownerProperties[_owner];
    }

    /**
     * @dev Get total number of registered properties
     */
    function getTotalProperties() external view returns (uint256) {
        return propertyCounter;
    }

    /**
     * @dev Check if address is verifier
     */
    function isVerifier(address _addr) external view returns (bool) {
        return verifiers[_addr];
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Withdraw contract funds (admin only, for any stuck funds)
     */
    function withdraw() external onlyAdmin {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool sent, ) = payable(admin).call{value: balance}("");
        require(sent, "Withdrawal failed");
    }
}
