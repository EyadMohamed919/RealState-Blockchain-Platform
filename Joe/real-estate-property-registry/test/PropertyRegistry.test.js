const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PropertyRegistry", function () {
  let PropertyRegistry;
  let propertyRegistry;
  let admin, verifier, owner1, owner2, buyer, stranger;

  // Sample property data
  const propertyAddress = "123 Blockchain Avenue, Crypto City, CC 10101";
  const description = "Modern 3-bedroom apartment with smart home features";
  const area = 1500; // sq ft
  const documentHash = ethers.keccak256(ethers.toUtf8Bytes("legal-docs-hash-123"));

  beforeEach(async function () {
    // Get signers
    [admin, verifier, owner1, owner2, buyer, stranger] = await ethers.getSigners();

    // Deploy contract
    PropertyRegistry = await ethers.getContractFactory("PropertyRegistry");
    propertyRegistry = await PropertyRegistry.deploy();
    await propertyRegistry.waitForDeployment();

    // Add verifier
    await propertyRegistry.connect(admin).addVerifier(verifier.address);
  });

  // ============================================
  // DEPLOYMENT TESTS
  // ============================================

  describe("Deployment", function () {
    it("Should set the right admin", async function () {
      expect(await propertyRegistry.admin()).to.equal(admin.address);
    });

    it("Should initialize property counter to 0", async function () {
      expect(await propertyRegistry.getTotalProperties()).to.equal(0);
    });

    it("Should set admin as verifier", async function () {
      expect(await propertyRegistry.isVerifier(admin.address)).to.be.true;
    });

    it("Should have zero balance initially", async function () {
      expect(await propertyRegistry.getContractBalance()).to.equal(0);
    });
  });

  // ============================================
  // PROPERTY REGISTRATION TESTS
  // ============================================

  describe("Property Registration", function () {
    it("Should register a new property successfully", async function () {
      const tx = await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress,
        description,
        area,
        documentHash
      );

      await expect(tx)
        .to.emit(propertyRegistry, "PropertyRegistered");

      const property = await propertyRegistry.getProperty(1);
      expect(property.id).to.equal(1);
      expect(property.owner).to.equal(owner1.address);
      expect(property.propertyAddress).to.equal(propertyAddress);
      expect(property.description).to.equal(description);
      expect(property.area).to.equal(area);
      expect(property.status).to.equal(0); // Pending
      expect(property.exists).to.be.true;
    });

    it("Should increment property counter", async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );
      expect(await propertyRegistry.getTotalProperties()).to.equal(1);
    });

    it("Should store property in owner's list", async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );
      const ownerProps = await propertyRegistry.getOwnerProperties(owner1.address);
      expect(ownerProps).to.include(1n);
    });

    it("Should record initial ownership history", async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );
      const history = await propertyRegistry.getOwnershipHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0].newOwner).to.equal(owner1.address);
      expect(history[0].transactionType).to.equal("Initial Registration");
    });

    it("Should reject empty property address", async function () {
      await expect(
        propertyRegistry.connect(owner1).registerProperty("", description, area, documentHash)
      ).to.be.revertedWith("Property address required");
    });

    it("Should reject empty description", async function () {
      await expect(
        propertyRegistry.connect(owner1).registerProperty(propertyAddress, "", area, documentHash)
      ).to.be.revertedWith("Description required");
    });

    it("Should reject zero area", async function () {
      await expect(
        propertyRegistry.connect(owner1).registerProperty(propertyAddress, description, 0, documentHash)
      ).to.be.revertedWith("Area must be greater than 0");
    });

    it("Should reject empty document hash", async function () {
      await expect(
        propertyRegistry.connect(owner1).registerProperty(propertyAddress, description, area, ethers.ZeroHash)
      ).to.be.revertedWith("Document hash required");
    });

    it("Should reject duplicate document hash", async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );

      await expect(
        propertyRegistry.connect(owner2).registerProperty(
          "456 Another St", "Another property", 2000, documentHash
        )
      ).to.be.revertedWith("Document already registered");
    });

    it("Should allow multiple properties per owner", async function () {
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("doc-1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("doc-2"));

      await propertyRegistry.connect(owner1).registerProperty("Addr 1", "Desc 1", 1000, hash1);
      await propertyRegistry.connect(owner1).registerProperty("Addr 2", "Desc 2", 2000, hash2);

      const ownerProps = await propertyRegistry.getOwnerProperties(owner1.address);
      expect(ownerProps.length).to.equal(2);
    });
  });

  // ============================================
  // VERIFICATION TESTS
  // ============================================

  describe("Property Verification", function () {
    beforeEach(async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );
    });

    it("Should allow verifier to verify property", async function () {
      await expect(propertyRegistry.connect(verifier).verifyProperty(1))
        .to.emit(propertyRegistry, "PropertyVerified");

      const property = await propertyRegistry.getProperty(1);
      expect(property.status).to.equal(1); // Verified
    });

    it("Should allow admin to verify property", async function () {
      await propertyRegistry.connect(admin).verifyProperty(1);
      const property = await propertyRegistry.getProperty(1);
      expect(property.status).to.equal(1);
    });

    it("Should reject non-verifier verification", async function () {
      await expect(
        propertyRegistry.connect(stranger).verifyProperty(1)
      ).to.be.revertedWith("Not an authorized verifier");
    });

    it("Should reject verification of non-existent property", async function () {
      await expect(
        propertyRegistry.connect(verifier).verifyProperty(999)
      ).to.be.revertedWith("Property does not exist");
    });

    it("Should reject double verification", async function () {
      await propertyRegistry.connect(verifier).verifyProperty(1);
      await expect(
        propertyRegistry.connect(verifier).verifyProperty(1)
      ).to.be.revertedWith("Property not in pending status");
    });

    it("Should emit StatusChanged event on verification", async function () {
      await expect(propertyRegistry.connect(verifier).verifyProperty(1))
        .to.emit(propertyRegistry, "StatusChanged")
        .withArgs(1, 0, 1);
    });
  });

  // ============================================
  // LISTING FOR SALE TESTS
  // ============================================

  describe("Listing for Sale", function () {
    beforeEach(async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );
      await propertyRegistry.connect(verifier).verifyProperty(1);
    });

    it("Should allow owner to list property for sale", async function () {
      const price = ethers.parseEther("10");

      await expect(propertyRegistry.connect(owner1).listForSale(1, price))
        .to.emit(propertyRegistry, "PropertyListedForSale");

      const property = await propertyRegistry.getProperty(1);
      expect(property.status).to.equal(2); // ForSale
      expect(property.price).to.equal(price);
    });

    it("Should reject non-owner listing", async function () {
      await expect(
        propertyRegistry.connect(stranger).listForSale(1, ethers.parseEther("10"))
      ).to.be.revertedWith("Not the property owner");
    });

    it("Should reject listing with zero price", async function () {
      await expect(
        propertyRegistry.connect(owner1).listForSale(1, 0)
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("Should reject listing unverified property", async function () {
      // Register new property but don't verify
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("doc-2"));
      await propertyRegistry.connect(owner1).registerProperty("New Addr", "New Desc", 1000, hash2);

      await expect(
        propertyRegistry.connect(owner1).listForSale(2, ethers.parseEther("10"))
      ).to.be.revertedWith("Property must be verified first");
    });
  });

  // ============================================
  // BUYING PROPERTY TESTS
  // ============================================

  describe("Buying Property", function () {
    const salePrice = ethers.parseEther("5");

    beforeEach(async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );
      await propertyRegistry.connect(verifier).verifyProperty(1);
      await propertyRegistry.connect(owner1).listForSale(1, salePrice);
    });

    it("Should allow buyer to purchase property", async function () {
      const initialBalance = await ethers.provider.getBalance(owner1.address);

      await expect(
        propertyRegistry.connect(buyer).buyProperty(1, { value: salePrice })
      )
        .to.emit(propertyRegistry, "PropertySold");

      const property = await propertyRegistry.getProperty(1);
      expect(property.owner).to.equal(buyer.address);
      expect(property.status).to.equal(3); // Sold
      expect(property.price).to.equal(0);

      // Check owner properties updated
      const owner1Props = await propertyRegistry.getOwnerProperties(owner1.address);
      expect(owner1Props).to.not.include(1n);

      const buyerProps = await propertyRegistry.getOwnerProperties(buyer.address);
      expect(buyerProps).to.include(1n);
    });

    it("Should transfer correct amount to seller", async function () {
      const initialBalance = await ethers.provider.getBalance(owner1.address);

      await propertyRegistry.connect(buyer).buyProperty(1, { value: salePrice });

      const finalBalance = await ethers.provider.getBalance(owner1.address);
      expect(finalBalance - initialBalance).to.equal(salePrice);
    });

    it("Should refund excess payment", async function () {
      const excessAmount = ethers.parseEther("7");
      const initialBalance = await ethers.provider.getBalance(buyer.address);

      const tx = await propertyRegistry.connect(buyer).buyProperty(1, { value: excessAmount });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(buyer.address);
      const expectedBalance = initialBalance - salePrice - gasUsed;

      // Allow small margin for gas estimation
      expect(finalBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.01"));
    });

    it("Should reject purchase with insufficient payment", async function () {
      const lowPrice = ethers.parseEther("3");
      await expect(
        propertyRegistry.connect(buyer).buyProperty(1, { value: lowPrice })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should reject owner buying own property", async function () {
      await expect(
        propertyRegistry.connect(owner1).buyProperty(1, { value: salePrice })
      ).to.be.revertedWith("Cannot buy your own property");
    });

    it("Should reject buying non-listed property", async function () {
      // Register and verify but don't list
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("doc-2"));
      await propertyRegistry.connect(owner1).registerProperty("New Addr", "New Desc", 1000, hash2);
      await propertyRegistry.connect(verifier).verifyProperty(2);

      await expect(
        propertyRegistry.connect(buyer).buyProperty(2, { value: salePrice })
      ).to.be.revertedWith("Property not for sale");
    });

    it("Should record sale in ownership history", async function () {
      await propertyRegistry.connect(buyer).buyProperty(1, { value: salePrice });

      const history = await propertyRegistry.getOwnershipHistory(1);
      expect(history.length).to.equal(2);
      expect(history[1].previousOwner).to.equal(owner1.address);
      expect(history[1].newOwner).to.equal(buyer.address);
      expect(history[1].price).to.equal(salePrice);
      expect(history[1].transactionType).to.equal("Sale");
    });
  });

  // ============================================
  // TRANSFER PROPERTY TESTS
  // ============================================

  describe("Transfer Property", function () {
    beforeEach(async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );
      await propertyRegistry.connect(verifier).verifyProperty(1);
    });

    it("Should allow owner to transfer property", async function () {
      await expect(propertyRegistry.connect(owner1).transferProperty(1, buyer.address))
        .to.emit(propertyRegistry, "OwnershipTransferred")
        .withArgs(1, owner1.address, buyer.address);

      const property = await propertyRegistry.getProperty(1);
      expect(property.owner).to.equal(buyer.address);
      expect(property.status).to.equal(1); // Verified
    });

    it("Should reject transfer to zero address", async function () {
      await expect(
        propertyRegistry.connect(owner1).transferProperty(1, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner address");
    });

    it("Should reject transfer to self", async function () {
      await expect(
        propertyRegistry.connect(owner1).transferProperty(1, owner1.address)
      ).to.be.revertedWith("Cannot transfer to yourself");
    });

    it("Should reject non-owner transfer", async function () {
      await expect(
        propertyRegistry.connect(stranger).transferProperty(1, buyer.address)
      ).to.be.revertedWith("Not the property owner");
    });

    it("Should update owner properties after transfer", async function () {
      await propertyRegistry.connect(owner1).transferProperty(1, buyer.address);

      const owner1Props = await propertyRegistry.getOwnerProperties(owner1.address);
      expect(owner1Props).to.not.include(1n);

      const buyerProps = await propertyRegistry.getOwnerProperties(buyer.address);
      expect(buyerProps).to.include(1n);
    });

    it("Should record transfer in ownership history", async function () {
      await propertyRegistry.connect(owner1).transferProperty(1, buyer.address);

      const history = await propertyRegistry.getOwnershipHistory(1);
      expect(history.length).to.equal(2);
      expect(history[1].transactionType).to.equal("Transfer");
    });
  });

  // ============================================
  // ADMIN FUNCTIONS TESTS
  // ============================================

  describe("Admin Functions", function () {
    beforeEach(async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );
    });

    it("Should allow admin to add verifier", async function () {
      await propertyRegistry.connect(admin).addVerifier(stranger.address);
      expect(await propertyRegistry.isVerifier(stranger.address)).to.be.true;
    });

    it("Should reject non-admin adding verifier", async function () {
      await expect(
        propertyRegistry.connect(stranger).addVerifier(stranger.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should allow admin to remove verifier", async function () {
      await propertyRegistry.connect(admin).removeVerifier(verifier.address);
      expect(await propertyRegistry.isVerifier(verifier.address)).to.be.false;
    });

    it("Should reject removing admin as verifier", async function () {
      await expect(
        propertyRegistry.connect(admin).removeVerifier(admin.address)
      ).to.be.revertedWith("Cannot remove admin");
    });

    it("Should allow admin to mark property as disputed", async function () {
      await propertyRegistry.connect(verifier).verifyProperty(1);

      await propertyRegistry.connect(admin).markDisputed(1, true);
      const property = await propertyRegistry.getProperty(1);
      expect(property.status).to.equal(4); // Disputed
    });

    it("Should allow admin to resolve dispute", async function () {
      await propertyRegistry.connect(verifier).verifyProperty(1);
      await propertyRegistry.connect(admin).markDisputed(1, true);

      await propertyRegistry.connect(admin).markDisputed(1, false);
      const property = await propertyRegistry.getProperty(1);
      expect(property.status).to.equal(1); // Verified
    });

    it("Should reject non-admin marking disputed", async function () {
      await expect(
        propertyRegistry.connect(stranger).markDisputed(1, true)
      ).to.be.revertedWith("Only admin can perform this action");
    });
  });

  // ============================================
  // UPDATE PROPERTY TESTS
  // ============================================

  describe("Update Property Details", function () {
    beforeEach(async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );
    });

    it("Should allow owner to update details", async function () {
      const newDesc = "Renovated 4-bedroom luxury apartment";
      const newArea = 2000;

      await propertyRegistry.connect(owner1).updatePropertyDetails(1, newDesc, newArea);

      const property = await propertyRegistry.getProperty(1);
      expect(property.description).to.equal(newDesc);
      expect(property.area).to.equal(newArea);
    });

    it("Should reject non-owner update", async function () {
      await expect(
        propertyRegistry.connect(stranger).updatePropertyDetails(1, "New desc", 2000)
      ).to.be.revertedWith("Not the property owner");
    });

    it("Should reject empty description", async function () {
      await expect(
        propertyRegistry.connect(owner1).updatePropertyDetails(1, "", 2000)
      ).to.be.revertedWith("Description required");
    });

    it("Should reject zero area", async function () {
      await expect(
        propertyRegistry.connect(owner1).updatePropertyDetails(1, "New desc", 0)
      ).to.be.revertedWith("Area must be greater than 0");
    });
  });

  // ============================================
  // VIEW FUNCTIONS TESTS
  // ============================================

  describe("View Functions", function () {
    beforeEach(async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );
    });

    it("Should return correct property details", async function () {
      const property = await propertyRegistry.getProperty(1);
      expect(property.id).to.equal(1);
      expect(property.owner).to.equal(owner1.address);
      expect(property.propertyAddress).to.equal(propertyAddress);
    });

    it("Should return correct ownership history", async function () {
      const history = await propertyRegistry.getOwnershipHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0].newOwner).to.equal(owner1.address);
    });

    it("Should return correct owner properties", async function () {
      const props = await propertyRegistry.getOwnerProperties(owner1.address);
      expect(props.length).to.equal(1);
      expect(props[0]).to.equal(1);
    });

    it("Should return empty array for owner with no properties", async function () {
      const props = await propertyRegistry.getOwnerProperties(stranger.address);
      expect(props.length).to.equal(0);
    });
  });

  // ============================================
  // EDGE CASES & SECURITY TESTS
  // ============================================

  describe("Edge Cases & Security", function () {
    it("Should handle multiple properties and owners", async function () {
      const hashes = [
        ethers.keccak256(ethers.toUtf8Bytes("doc-1")),
        ethers.keccak256(ethers.toUtf8Bytes("doc-2")),
        ethers.keccak256(ethers.toUtf8Bytes("doc-3"))
      ];

      // Owner1 registers 2 properties
      await propertyRegistry.connect(owner1).registerProperty("Addr 1", "Desc 1", 1000, hashes[0]);
      await propertyRegistry.connect(owner1).registerProperty("Addr 2", "Desc 2", 2000, hashes[1]);

      // Owner2 registers 1 property
      await propertyRegistry.connect(owner2).registerProperty("Addr 3", "Desc 3", 3000, hashes[2]);

      expect(await propertyRegistry.getTotalProperties()).to.equal(3);

      const owner1Props = await propertyRegistry.getOwnerProperties(owner1.address);
      expect(owner1Props.length).to.equal(2);

      const owner2Props = await propertyRegistry.getOwnerProperties(owner2.address);
      expect(owner2Props.length).to.equal(1);
    });

    it("Should prevent reentrancy in buyProperty", async function () {
      // This is handled by Solidity's built-in protections and checks-effects-interactions pattern
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );
      await propertyRegistry.connect(verifier).verifyProperty(1);
      await propertyRegistry.connect(owner1).listForSale(1, ethers.parseEther("1"));

      // Normal purchase should work
      await expect(
        propertyRegistry.connect(buyer).buyProperty(1, { value: ethers.parseEther("1") })
      ).to.not.be.reverted;
    });

    it("Should maintain document hash uniqueness across all operations", async function () {
      await propertyRegistry.connect(owner1).registerProperty(
        propertyAddress, description, area, documentHash
      );

      // Even after transfer, original hash should remain registered
      await propertyRegistry.connect(verifier).verifyProperty(1);
      await propertyRegistry.connect(owner1).transferProperty(1, buyer.address);

      // New registration with same hash should fail
      await expect(
        propertyRegistry.connect(owner2).registerProperty(
          "New Addr", "New Desc", 1000, documentHash
        )
      ).to.be.revertedWith("Document already registered");
    });
  });
});

// Helper function for time
