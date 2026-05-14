// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RealEstate {
    // 1. Define what a Certificate looks like
    struct Certificate {
        uint256 id;
        string propertyAddress;
        address owner;
        uint256 issueDate;
    }

    // 2. State variables (This is like your DB storage)
    uint256 public certificateCount = 0;
    mapping(uint256 => Certificate) public certificates;

    // Event to notify the frontend when a certificate is created
    event CertificateIssued(uint256 id, string propertyAddress, address owner);

    // 3. Function to create a new certificate
    // Only the person who deploys the contract (you) can call this in a real app, 
    // but we'll keep it open for your project testing.
    function issueCertificate(string memory _propertyAddress, address _owner) public {
        certificateCount++;
        
        certificates[certificateCount] = Certificate(
            certificateCount,
            _propertyAddress,
            _owner,
            block.timestamp
        );

        emit CertificateIssued(certificateCount, _propertyAddress, _owner);
    }

    // 4. Function to verify ownership by ID
    function getCertificate(uint256 _id) public view returns (uint256, string memory, address, uint256) {
        Certificate memory cert = certificates[_id];
        return (cert.id, cert.propertyAddress, cert.owner, cert.issueDate);
    }
}