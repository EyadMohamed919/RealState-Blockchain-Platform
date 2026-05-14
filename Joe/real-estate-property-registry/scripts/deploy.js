const { ethers } = require("hardhat");

/**
 * Deployment Script for PropertyRegistry
 * 
 * This script deploys the PropertyRegistry contract to the specified network.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost
 *   npx hardhat run scripts/deploy.js --network hardhat
 * 
 * The deployed contract address will be saved to a JSON file for frontend use.
 */

async function main() {
  console.log("========================================");
  console.log("  PropertyRegistry Deployment");
  console.log("========================================\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH\n`);

  // Deploy the contract
  console.log("Deploying PropertyRegistry contract...");
  const PropertyRegistry = await ethers.getContractFactory("PropertyRegistry");
  const propertyRegistry = await PropertyRegistry.deploy();

  // Wait for deployment to complete
  await propertyRegistry.waitForDeployment();

  // Get the deployed contract address
  const contractAddress = await propertyRegistry.getAddress();

  console.log("\n✅ Deployment successful!");
  console.log(`Contract address: ${contractAddress}`);
  console.log(`Transaction hash: ${propertyRegistry.deploymentTransaction().hash}`);

  // Save deployment info
  const deploymentInfo = {
    contractName: "PropertyRegistry",
    address: contractAddress,
    deployer: deployer.address,
    network: network.name,
    timestamp: new Date().toISOString(),
    chainId: (await ethers.provider.getNetwork()).chainId.toString()
  };

  // Write to file for frontend use
  const fs = require("fs");
  const path = require("path");

  // Save to project root
  fs.writeFileSync(
    path.join(__dirname, "../deployment-info.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also save to frontend src
  const frontendPath = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(frontendPath)) {
    fs.mkdirSync(frontendPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(frontendPath, "deployment-info.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Copy ABI to frontend
  const artifactPath = path.join(__dirname, "../artifacts/contracts/PropertyRegistry.sol/PropertyRegistry.json");
  if (fs.existsSync(artifactPath)) {
    fs.copyFileSync(
      artifactPath,
      path.join(frontendPath, "PropertyRegistry.json")
    );
    console.log("\n📁 ABI and deployment info copied to frontend/src/contracts/");
  }

  console.log("\n========================================");
  console.log("  Deployment Complete!");
  console.log("========================================");
  console.log("\nNext steps:");
  console.log("1. Start local node: npx hardhat node");
  console.log("2. Run tests: npx hardhat test");
  console.log("3. Interact with contract using frontend or scripts");

  return deploymentInfo;
}

// Execute deployment
main()
  .then((info) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
