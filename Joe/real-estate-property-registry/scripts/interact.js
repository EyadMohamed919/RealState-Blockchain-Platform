const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Interaction Script for PropertyRegistry
 * 
 * This script demonstrates how to interact with the deployed contract.
 * It performs a complete workflow: register → verify → list → buy.
 * 
 * Usage:
 *   npx hardhat run scripts/interact.js --network localhost
 */

async function main() {
  console.log("========================================");
  console.log("  PropertyRegistry Interaction Demo");
  console.log("========================================\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "../deployment-info.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment info not found. Run deploy.js first.");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log(`Using contract at: ${deploymentInfo.address}\n`);

  // Get signers
  const [admin, verifier, owner1, buyer] = await ethers.getSigners();

  // Connect to deployed contract
  const PropertyRegistry = await ethers.getContractFactory("PropertyRegistry");
  const propertyRegistry = PropertyRegistry.attach(deploymentInfo.address);

  console.log("Accounts:");
  console.log(`  Admin: ${admin.address}`);
  console.log(`  Verifier: ${verifier.address}`);
  console.log(`  Owner1: ${owner1.address}`);
  console.log(`  Buyer: ${buyer.address}\n`);

  // Step 1: Add verifier
  console.log("Step 1: Adding verifier...");
  await propertyRegistry.connect(admin).addVerifier(verifier.address);
  console.log("✅ Verifier added\n");

  // Step 2: Register property
  console.log("Step 2: Registering property...");
  const documentHash = ethers.keccak256(ethers.toUtf8Bytes("property-docs-001"));
  const tx = await propertyRegistry.connect(owner1).registerProperty(
    "456 Ethereum Blvd, Web3 City, WC 20240",
    "Luxury penthouse with panoramic views",
    2500,
    documentHash
  );
  const receipt = await tx.wait();

  // Parse event to get property ID
  const event = receipt.logs.find(
    log => propertyRegistry.interface.parseLog(log)?.name === "PropertyRegistered"
  );
  const propertyId = event ? propertyRegistry.interface.parseLog(event).args[0] : 1;
  console.log(`✅ Property registered with ID: ${propertyId}\n`);

  // Step 3: Verify property
  console.log("Step 3: Verifying property...");
  await propertyRegistry.connect(verifier).verifyProperty(propertyId);
  console.log("✅ Property verified\n");

  // Step 4: List for sale
  console.log("Step 4: Listing property for sale...");
  const salePrice = ethers.parseEther("2");
  await propertyRegistry.connect(owner1).listForSale(propertyId, salePrice);
  console.log(`✅ Property listed for ${ethers.formatEther(salePrice)} ETH\n`);

  // Step 5: Buy property
  console.log("Step 5: Buying property...");
  const owner1BalanceBefore = await ethers.provider.getBalance(owner1.address);

  await propertyRegistry.connect(buyer).buyProperty(propertyId, { value: salePrice });

  const owner1BalanceAfter = await ethers.provider.getBalance(owner1.address);
  console.log("✅ Property purchased!");
  console.log(`   Owner1 received: ${ethers.formatEther(owner1BalanceAfter - owner1BalanceBefore)} ETH\n`);

  // Step 6: Check ownership
  console.log("Step 6: Verifying ownership...");
  const property = await propertyRegistry.getProperty(propertyId);
  console.log(`   New owner: ${property.owner}`);
  console.log(`   Expected: ${buyer.address}`);
  console.log(`   Match: ${property.owner === buyer.address ? "✅ YES" : "❌ NO"}\n`);

  // Step 7: Check ownership history
  console.log("Step 7: Ownership history...");
  const history = await propertyRegistry.getOwnershipHistory(propertyId);
  history.forEach((record, index) => {
    console.log(`   Record ${index + 1}:`);
    console.log(`     Type: ${record.transactionType}`);
    console.log(`     From: ${record.previousOwner === ethers.ZeroAddress ? "N/A (Initial)" : record.previousOwner}`);
    console.log(`     To: ${record.newOwner}`);
    console.log(`     Price: ${record.price > 0 ? ethers.formatEther(record.price) + " ETH" : "N/A"}`);
    console.log(`     Time: ${new Date(Number(record.timestamp) * 1000).toLocaleString()}`);
  });

  console.log("\n========================================");
  console.log("  Interaction Demo Complete!");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction failed:", error);
    process.exit(1);
  });
