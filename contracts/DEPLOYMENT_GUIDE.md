# SkillPays Contract Deployment Guide

## Overview

This guide covers deploying the complete SkillPays ecosystem smart contracts to various networks. The ecosystem consists of 11 interconnected contracts that work together to provide a comprehensive learning and rewards platform.

## 📋 Prerequisites

### Required Software
- Node.js (v18 or higher)
- npm or yarn
- Git

### Required Accounts & Keys
1. **Deployer Wallet**: Account with sufficient ETH for deployment
2. **Arbitrum Explorer API Key**: For contract verification (get from [Arbiscan](https://arbiscan.io/))
3. **Treasury Wallet**: Account to receive platform fees

### Estimated Costs
- **Local**: Free (using Hardhat local node)
- **Arbitrum Sepolia**: ~$10-20 USD in ETH
- **Arbitrum Goerli**: ~$10-20 USD in ETH
- **Arbitrum Mainnet**: ~$100-200 USD in ETH

## 🛠️ Setup

### 1. Environment Configuration

Create a `.env` file from the example:
```bash
cp .env.example .env
```

Configure your `.env` file:
```env
# Required
PRIVATE_KEY=your_deployer_private_key
ARBISCAN_API_KEY=your_arbiscan_api_key

# Optional (will use defaults if not set)
TREASURY_ADDRESS=your_treasury_address
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Compile Contracts

```bash
npm run compile
```

## 🚀 Deployment Options

### Option 1: Quick Deployment (Recommended)

Use Hardhat Ignition for production-ready deployments:

#### Local Development
```bash
# Start local node in terminal 1
npm run node

# Deploy in terminal 2
npm run deploy:local
```

#### Arbitrum Sepolia (Testnet)
```bash
npm run deploy:arbitrum-sepolia
```

#### Arbitrum Goerli (Testnet)
```bash
npm run deploy:arbitrum-goerli
```

### Option 2: Custom Deployment Script

For more control and detailed logging:

```bash
# Deploy with custom script
npm run deploy:script

# Deploy to specific network
npx hardhat run scripts/deploy.ts --network arbitrumSepolia
```

### Option 3: Manual Module-Based Deployment

Deploy specific modules:

#### Core Contracts Only
```bash
npx hardhat ignition deploy ignition/modules/CoreSkillPays.ts --network localhost
```

#### Full Ecosystem
```bash
npx hardhat ignition deploy ignition/modules/SkillPaysEcosystem.ts --network arbitrumSepolia
```

## 📊 Contract Architecture

The contracts are deployed in dependency order:

### 1. Utility Contracts (Independent)
- **StudentBadges**: NFT badges for achievements
- **SkillGraph**: Skill tracking and prerequisites
- **PeerReviewSystem**: Peer review and validation
- **LeaderboardSocial**: Rankings and social features

### 2. Core System
- **SkillPaysCore**: Main platform logic and coordination

### 3. Reward Systems
- **MicroRewardsSystem**: Daily rewards and streaks
- **MentorBoostSystem**: Mentorship rewards (depends on MicroRewards)

### 4. Advanced Systems
- **AntiCheatingSystem**: AI-powered fraud detection
- **DecentralizedVerification**: Peer-based skill validation

### 5. Ecosystem Contracts
- **GraduateDAO**: Governance for graduates
- **CrossBootcampRegistry**: Multi-platform integration
- **JobBoardIntegration**: Job matching and recommendations

## ✅ Contract Verification

### Automatic Verification
Verification happens automatically during deployment if `ARBISCAN_API_KEY` is set.

### Manual Verification
```bash
# Verify all contracts from latest deployment
npm run verify arbitrumSepolia

# Verify specific contract
npx hardhat verify --network arbitrumSepolia <CONTRACT_ADDRESS> [constructor-args...]
```

## 📁 Deployment Artifacts

After deployment, you'll find:

### Ignition Artifacts
```
ignition/deployments/chain-<chainId>/
├── deployed_addresses.json    # Contract addresses
├── journal.jsonl             # Deployment log
└── artifacts/                # Deployment details
```

### Custom Script Artifacts
```
deployments/
├── <network>-latest.json     # Latest deployment
├── <network>-<timestamp>.json # Historical deployments
└── generated/
    └── addresses-<network>.ts # TypeScript addresses file
```

## 🔧 Post-Deployment Setup

### 1. Verify Contract Addresses
Check that all contracts are deployed and verified:
```bash
# Check latest deployment
cat ignition/deployments/chain-421614/deployed_addresses.json
```

### 2. Update Frontend Configuration
Copy contract addresses to frontend:
```bash
# From ignition deployment
cp ignition/deployments/chain-421614/deployed_addresses.json ../frontend/src/contracts/addresses-arbitrumSepolia.json

# Or use generated TypeScript file
cp deployments/generated/addresses-arbitrumSepolia.ts ../frontend/src/contracts/
```

### 3. Configure Initial System Parameters

Run initialization scripts (create these based on your needs):
```bash
# Example: Set up initial skills and bootcamps
npx hardhat run scripts/initialize-system.ts --network arbitrumSepolia
```

### 4. Test Core Functionality
```bash
# Run integration tests against deployed contracts
DEPLOYED_NETWORK=arbitrumSepolia npm run test:integration
```

## 🧪 Testing Deployments

### Local Testing
```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy
npm run deploy:local

# Terminal 3: Run tests
npm test
```

### Testnet Testing
```bash
# Deploy to testnet
npm run deploy:arbitrum-sepolia

# Test specific functionality
npx hardhat run scripts/test-deployment.ts --network arbitrumSepolia
```

## 🛡️ Security Considerations

### Pre-Deployment
- [ ] Audit smart contracts
- [ ] Test with comprehensive test suite
- [ ] Verify constructor parameters
- [ ] Check gas limits and costs

### During Deployment  
- [ ] Use hardware wallet for mainnet
- [ ] Monitor gas prices
- [ ] Verify each transaction
- [ ] Keep deployment logs

### Post-Deployment
- [ ] Verify contract source code
- [ ] Test all critical functions
- [ ] Set up monitoring
- [ ] Configure access controls

## 🔍 Troubleshooting

### Common Issues

#### "Insufficient funds for gas"
- Check deployer account balance
- Reduce gas price or wait for lower gas fees

#### "Contract verification failed"  
- Ensure API key is correct
- Wait and retry (rate limiting)
- Verify manually with exact constructor args

#### "Transaction underpriced"
- Increase gas price in hardhat.config.ts
- Use latest nonce for account

#### "Contract size too large"
- Enable optimizer in hardhat.config.ts
- Consider contract splitting

### Getting Help

1. Check deployment logs
2. Verify network configuration
3. Ensure sufficient gas and funds
4. Check for rate limiting on APIs

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Hardhat Ignition](https://hardhat.org/ignition/docs/getting-started)
- [Arbitrum Documentation](https://docs.arbitrum.io/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 🎯 Quick Start Commands

```bash
# Complete local development setup
npm install
npm run compile
npm run node          # Terminal 1
npm run deploy:local  # Terminal 2

# Testnet deployment
npm run deploy:arbitrum-sepolia

# Production deployment
npm run deploy:arbitrum-mainnet  # (when ready)
```

---

For questions or issues, please refer to the project documentation or create an issue in the repository.