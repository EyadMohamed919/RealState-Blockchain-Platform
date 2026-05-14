# PropertyRegistry Frontend

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MetaMask browser extension (optional for local testing)
- Backend contract deployed (see main project README)

### Installation

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update contract address in `src/App.jsx`:
   - After deploying the contract, copy the address
   - Replace `CONTRACT_ADDRESS` in App.jsx with your deployed address
   - The ABI file is auto-copied during deployment

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open browser to `http://localhost:3000`

### Features
- 🔗 **Wallet Connection**: Connect MetaMask or use local Hardhat accounts
- 📝 **Register Property**: Submit property details with document hash
- ✓ **Verify Properties**: Verifiers can approve pending registrations
- 🏷️ **List for Sale**: Owners can list verified properties
- 💰 **Buy Property**: Purchase properties with ETH
- 📤 **Transfer**: Gift or transfer ownership
- ⚙️ **Admin Panel**: Manage verifiers and disputes

### Local Testing Without MetaMask
The app automatically falls back to Hardhat's local provider if MetaMask is not detected.
