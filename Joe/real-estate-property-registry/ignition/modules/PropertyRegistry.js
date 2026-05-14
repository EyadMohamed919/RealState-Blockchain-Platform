const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/**
 * PropertyRegistry Deployment Module
 * 
 * This module deploys the PropertyRegistry contract to the blockchain.
 * Hardhat Ignition provides declarative deployment with:
 * - Automatic transaction management
 * - Deployment recovery from failures
 * - Parallel execution of independent operations
 * - Deployment state tracking
 */

module.exports = buildModule("PropertyRegistryModule", (m) => {
  // Deploy the PropertyRegistry contract
  // No constructor arguments needed - admin is set to deployer automatically
  const propertyRegistry = m.contract("PropertyRegistry", []);

  // The contract is returned so it can be used in other modules or scripts
  return { propertyRegistry };
});
