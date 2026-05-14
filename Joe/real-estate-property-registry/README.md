# 🏠 PropertyRegistry - Decentralized Real Estate Platform

A complete blockchain solution for real estate property registration, verification, and transfer using Ethereum smart contracts.

## 📋 Project Overview

**Domain:** Real Estate  
**Use Case:** Decentralized Property Registration & Transfer  
**Technology:** Solidity, Hardhat, Ethers.js, React  
**Network:** Ethereum (Local / Testnet / Mainnet)

## 🎯 Problem Solved

Traditional property registration suffers from:
- ❌ Centralized control and corruption risk
- ❌ Slow processing (weeks to months)
- ❌ High intermediary costs (2-5% of property value)
- ❌ Document fraud and double-selling
- ❌ Lack of transparent ownership history

**Our Solution:** Immutable, transparent, instant property records on blockchain.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Setup (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Compile smart contracts
npx hardhat compile

# 3. Run tests
npx hardhat test

# 4. Start local blockchain (keep this running)
npx hardhat node

# 5. Deploy contract (new terminal)
npx hardhat run scripts/deploy.js --network localhost

# 6. Run interaction demo
npx hardhat run scripts/interact.js --network localhost

# 7. Start frontend (new terminal)
cd frontend && npm install && npm run dev
```

## 📁 Project Structure

```
├── contracts/          # Solidity smart contracts
│   └── PropertyRegistry.sol
├── test/               # Unit tests (51 test cases)
│   └── PropertyRegistry.test.js
├── scripts/            # Deployment & interaction scripts
│   ├── deploy.js
│   └── interact.js
├── ignition/           # Hardhat Ignition modules
│   └── modules/
│       └── PropertyRegistry.js
├── frontend/           # React web application
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── RegisterProperty.jsx
│   │   │   ├── PropertyList.jsx
│   │   │   ├── MyProperties.jsx
│   │   │   └── AdminPanel.jsx
│   │   └── contracts/
│   │       └── PropertyRegistry.json
│   └── package.json
├── docs/               # Documentation
│   └── README.md
├── hardhat.config.js   # Hardhat configuration
└── package.json        # Project dependencies
```

## 🔧 Smart Contract Features

| Feature | Description |
|---------|-------------|
| **Register Property** | Submit property with unique document hash |
| **Verify Property** | Authorized verifiers approve registrations |
| **List for Sale** | Owners list verified properties with price |
| **Buy Property** | Purchase with ETH, instant ownership transfer |
| **Transfer Property** | Gift or transfer to any address |
| **Dispute Management** | Admin can flag and resolve disputes |
| **Ownership History** | Complete immutable audit trail |

## 🧪 Testing

```bash
# Run all tests
npx hardhat test

# Run with gas report
npx hardhat test --gas

# Run coverage
npx hardhat coverage
```

**Test Results:** 51 tests covering all functionality ✅

## 🌐 Frontend Features

- 🔗 **Wallet Connection** - MetaMask integration
- 📝 **Property Registration** - Easy form submission
- ✓ **Verification Panel** - For authorized verifiers
- 🏷️ **Marketplace** - List and buy properties
- 📊 **Dashboard** - View stats and ownership
- ⚙️ **Admin Controls** - Manage verifiers and disputes

## 📖 Documentation

Complete documentation available in [`docs/README.md`](docs/README.md) including:
- Detailed use case definition
- Smart contract architecture
- Testing methodology
- Deployment instructions
- Presentation guide

## 🎓 Academic Project

This project fulfills the following requirements:

| Requirement | Status | File |
|-------------|--------|------|
| Use Case Definition (4) | ✅ | docs/README.md Section 2 |
| Smart Contract (15) | ✅ | contracts/PropertyRegistry.sol |
| Testing (5) | ✅ | test/PropertyRegistry.test.js |
| Deployment (5) | ✅ | scripts/deploy.js |
| Documentation (3) | ✅ | docs/README.md |
| Presentation (5) | ✅ | docs/README.md Section 8 |
| Web App Integration (3) | ✅ | frontend/ |

## 🛡️ Security

- Access control modifiers (onlyAdmin, onlyOwner, onlyVerifier)
- Input validation on all functions
- Reentrancy protection (checks-effects-interactions)
- Document hash uniqueness enforcement
- Zero-address validation

## 📄 License

MIT License - Free for academic and commercial use.

---

**Built with ❤️ using Hardhat, Solidity, and React**
