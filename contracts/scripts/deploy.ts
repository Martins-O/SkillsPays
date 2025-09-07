#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { formatEther, parseEther } from "ethers";
import fs from "fs";
import path from "path";

interface DeploymentConfig {
  treasuryAddress: string;
  initialPlatformFee: number;
  ethUsdPriceFeed: string;
  initialRewardPoolFunding: string;
  verificationStakeAmount: string;
}

interface NetworkConfigs {
  [key: string]: DeploymentConfig;
}

interface DeployedContract {
  name: string;
  address: string;
  constructorArgs: any[];
  txHash: string;
  blockNumber: number;
  gasUsed: string;
}

interface DeploymentResult {
  network: string;
  chainId: number;
  deployer: string;
  deployedAt: string;
  contracts: DeployedContract[];
  totalGasUsed: string;
  totalDeploymentCost: string;
}

// Network-specific configuration
const NETWORK_CONFIGS: NetworkConfigs = {
  localhost: {
    treasuryAddress: "0x742d35Cc6671C0532925a3b8D2E6f7C7d4B7f9B6",
    initialPlatformFee: 250, // 2.5%
    ethUsdPriceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // Mock address for local
    initialRewardPoolFunding: "5.0", // ETH
    verificationStakeAmount: "1.0" // ETH
  },
  arbitrumSepolia: {
    treasuryAddress: "0x742d35Cc6671C0532925a3b8D2E6f7C7d4B7f9B6",
    initialPlatformFee: 250, // 2.5%
    ethUsdPriceFeed: "0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08", // ETH/USD on Arbitrum Sepolia
    initialRewardPoolFunding: "0.5", // ETH
    verificationStakeAmount: "0.1" // ETH
  },
  arbitrumGoerli: {
    treasuryAddress: "0x742d35Cc6671C0532925a3b8D2E6f7C7d4B7f9B6",
    initialPlatformFee: 250, // 2.5%
    ethUsdPriceFeed: "0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08", // ETH/USD on Arbitrum Goerli
    initialRewardPoolFunding: "0.5", // ETH
    verificationStakeAmount: "0.1" // ETH
  },
  mainnet: {
    treasuryAddress: process.env.TREASURY_ADDRESS || "0x742d35Cc6671C0532925a3b8D2E6f7C7d4B7f9B6",
    initialPlatformFee: 250, // 2.5%
    ethUsdPriceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // ETH/USD on mainnet
    initialRewardPoolFunding: "2.0", // ETH
    verificationStakeAmount: "0.5" // ETH
  }
};

async function main() {
  console.log("🚀 Starting SkillPays Ecosystem Deployment...\n");
  
  // Get network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  
  console.log("📋 Deployment Info:");
  console.log(`  Network: ${networkName} (Chain ID: ${network.chainId})`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Balance: ${formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);
  
  // Get network configuration
  const config = NETWORK_CONFIGS[networkName] || NETWORK_CONFIGS.localhost;
  console.log("⚙️ Configuration:");
  console.log(`  Treasury: ${config.treasuryAddress}`);
  console.log(`  Platform Fee: ${config.initialPlatformFee / 100}%`);
  console.log(`  Price Feed: ${config.ethUsdPriceFeed}`);
  console.log(`  Initial Funding: ${config.initialRewardPoolFunding} ETH\n`);
  
  const deployedContracts: DeployedContract[] = [];
  let totalGasUsed = 0n;
  
  // Deploy contracts in dependency order
  console.log("📦 Deploying Core Infrastructure...\n");
  
  // 1. Deploy utility contracts first
  const studentBadges = await deployContract(
    "StudentBadges",
    ["SkillPays Badges", "SPB", "https://api.skillpays.com/badges/"],
    deployedContracts
  );
  totalGasUsed += BigInt(studentBadges.gasUsed);
  
  const skillGraph = await deployContract(
    "SkillGraph",
    [],
    deployedContracts
  );
  totalGasUsed += BigInt(skillGraph.gasUsed);
  
  const peerReviewSystem = await deployContract(
    "PeerReviewSystem",
    [],
    deployedContracts
  );
  totalGasUsed += BigInt(peerReviewSystem.gasUsed);
  
  const leaderboardSocial = await deployContract(
    "LeaderboardSocial",
    [],
    deployedContracts
  );
  totalGasUsed += BigInt(leaderboardSocial.gasUsed);
  
  console.log("📦 Deploying Core System...\n");
  
  // 2. Deploy core contract
  const skillPaysCore = await deployContract(
    "SkillPaysCore",
    [config.treasuryAddress, config.initialPlatformFee, config.ethUsdPriceFeed],
    deployedContracts
  );
  totalGasUsed += BigInt(skillPaysCore.gasUsed);
  
  console.log("📦 Deploying Reward Systems...\n");
  
  // 3. Deploy reward systems
  const microRewardsSystem = await deployContract(
    "MicroRewardsSystem",
    [],
    deployedContracts
  );
  totalGasUsed += BigInt(microRewardsSystem.gasUsed);
  
  const mentorBoostSystem = await deployContract(
    "MentorBoostSystem",
    [microRewardsSystem.address],
    deployedContracts
  );
  totalGasUsed += BigInt(mentorBoostSystem.gasUsed);
  
  console.log("📦 Deploying Advanced Systems...\n");
  
  // 4. Deploy advanced systems
  const antiCheatingSystem = await deployContract(
    "AntiCheatingSystem",
    [],
    deployedContracts
  );
  totalGasUsed += BigInt(antiCheatingSystem.gasUsed);
  
  const decentralizedVerification = await deployContract(
    "DecentralizedVerification",
    [],
    deployedContracts
  );
  totalGasUsed += BigInt(decentralizedVerification.gasUsed);
  
  console.log("📦 Deploying Ecosystem Contracts...\n");
  
  // 5. Deploy ecosystem contracts
  const graduateDAO = await deployContract(
    "GraduateDAO",
    [skillPaysCore.address, studentBadges.address],
    deployedContracts
  );
  totalGasUsed += BigInt(graduateDAO.gasUsed);
  
  const crossBootcampRegistry = await deployContract(
    "CrossBootcampRegistry",
    [],
    deployedContracts
  );
  totalGasUsed += BigInt(crossBootcampRegistry.gasUsed);
  
  const jobBoardIntegration = await deployContract(
    "JobBoardIntegration",
    [skillGraph.address, studentBadges.address],
    deployedContracts
  );
  totalGasUsed += BigInt(jobBoardIntegration.gasUsed);
  
  console.log("🔗 Setting up contract connections...\n");
  
  // 6. Set up contract connections and permissions
  await setupContractConnections(
    skillPaysCore,
    studentBadges,
    skillGraph,
    peerReviewSystem,
    leaderboardSocial,
    mentorBoostSystem,
    microRewardsSystem
  );
  
  console.log("💰 Funding reward pools...\n");
  
  // 7. Fund reward pools
  await fundRewardPools(
    microRewardsSystem,
    decentralizedVerification,
    config.initialRewardPoolFunding,
    config.verificationStakeAmount
  );
  
  // Calculate deployment cost
  const gasPrice = (await ethers.provider.getFeeData()).gasPrice || 0n;
  const totalCost = totalGasUsed * gasPrice;
  
  // Prepare deployment result
  const deploymentResult: DeploymentResult = {
    network: networkName,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: deployedContracts,
    totalGasUsed: totalGasUsed.toString(),
    totalDeploymentCost: formatEther(totalCost)
  };
  
  // Save deployment results
  await saveDeploymentResults(deploymentResult);
  await generateAddressesFile(deployedContracts, networkName);
  
  console.log("✅ Deployment Complete!\n");
  console.log("📊 Summary:");
  console.log(`  Contracts Deployed: ${deployedContracts.length}`);
  console.log(`  Total Gas Used: ${totalGasUsed.toLocaleString()}`);
  console.log(`  Total Cost: ${formatEther(totalCost)} ETH`);
  console.log(`  Deployment saved to: deployments/${networkName}-${Date.now()}.json\n`);
  
  // Print contract addresses
  console.log("📋 Contract Addresses:");
  deployedContracts.forEach(contract => {
    console.log(`  ${contract.name}: ${contract.address}`);
  });
  
  console.log("\n🎉 SkillPays Ecosystem successfully deployed!");
  
  if (networkName !== "localhost") {
    console.log("\n⚠️  Next steps:");
    console.log("1. Verify contracts on block explorer");
    console.log("2. Update frontend contract addresses");
    console.log("3. Configure initial bootcamps and skills");
    console.log("4. Set up monitoring and alerts");
  }
}

async function deployContract(
  contractName: string,
  constructorArgs: any[],
  deployedContracts: DeployedContract[]
): Promise<DeployedContract> {
  console.log(`🔄 Deploying ${contractName}...`);
  
  const Contract = await ethers.getContractFactory(contractName);
  const contract = await Contract.deploy(...constructorArgs);
  await contract.waitForDeployment();
  
  const deploymentTx = contract.deploymentTransaction();
  const receipt = await deploymentTx?.wait();
  
  const deployedContract: DeployedContract = {
    name: contractName,
    address: await contract.getAddress(),
    constructorArgs,
    txHash: deploymentTx?.hash || "",
    blockNumber: receipt?.blockNumber || 0,
    gasUsed: receipt?.gasUsed.toString() || "0"
  };
  
  deployedContracts.push(deployedContract);
  
  console.log(`  ✅ ${contractName}: ${deployedContract.address}`);
  console.log(`     Gas used: ${Number(deployedContract.gasUsed).toLocaleString()}\n`);
  
  return deployedContract;
}

async function setupContractConnections(
  skillPaysCore: any,
  studentBadges: any,
  skillGraph: any,
  peerReviewSystem: any,
  leaderboardSocial: any,
  mentorBoostSystem: any,
  microRewardsSystem: any
) {
  console.log("  Setting contract connections...");
  
  // Set up SkillPaysCore connections (if these methods exist)
  try {
    await skillPaysCore.setContract("badge", studentBadges.address);
    console.log("    ✅ Badge contract connected");
  } catch (e) {
    console.log("    ⚠️ Badge contract connection skipped (method may not exist)");
  }
  
  try {
    await skillPaysCore.setContract("peerReview", peerReviewSystem.address);
    console.log("    ✅ Peer review contract connected");
  } catch (e) {
    console.log("    ⚠️ Peer review contract connection skipped (method may not exist)");
  }
  
  // Grant roles
  console.log("  Setting up permissions...");
  
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  await studentBadges.grantRole(MINTER_ROLE, skillPaysCore.address);
  console.log("    ✅ Minter role granted to SkillPaysCore");
  
  // Wait a bit between transactions
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function fundRewardPools(
  microRewardsSystem: any,
  decentralizedVerification: any,
  rewardFunding: string,
  verificationFunding: string
) {
  console.log(`  Funding micro rewards pool with ${rewardFunding} ETH...`);
  try {
    const tx1 = await microRewardsSystem.addToRewardPool({ 
      value: parseEther(rewardFunding) 
    });
    await tx1.wait();
    console.log("    ✅ Micro rewards pool funded");
  } catch (e) {
    console.log("    ⚠️ Micro rewards funding failed (method may not exist)");
  }
  
  console.log(`  Funding verification pool with ${verificationFunding} ETH...`);
  try {
    // Send ETH directly to verification contract
    const [deployer] = await ethers.getSigners();
    const tx2 = await deployer.sendTransaction({
      to: await decentralizedVerification.getAddress(),
      value: parseEther(verificationFunding)
    });
    await tx2.wait();
    console.log("    ✅ Verification pool funded");
  } catch (e) {
    console.log("    ⚠️ Verification funding failed");
  }
}

async function saveDeploymentResults(result: DeploymentResult) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `${result.network}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
  
  // Also save as latest
  const latestPath = path.join(deploymentsDir, `${result.network}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(result, null, 2));
}

async function generateAddressesFile(contracts: DeployedContract[], network: string) {
  const addresses: { [key: string]: string } = {};
  
  contracts.forEach(contract => {
    // Convert contract names to the format used in frontend
    const key = contract.name.toUpperCase().replace(/([A-Z])/g, '_$1').substring(1);
    addresses[key] = contract.address;
  });
  
  const addressesContent = `// Auto-generated contract addresses for ${network}
// Generated at: ${new Date().toISOString()}

export const CONTRACT_ADDRESSES = {
${Object.entries(addresses).map(([key, address]) => `  ${key}: "${address}"`).join(',\n')}
} as const;

export function getContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES): string {
  const address = CONTRACT_ADDRESSES[contractName];
  if (!address) {
    throw new Error(\`Contract address not found for: \${contractName}\`);
  }
  return address;
}
`;
  
  const outputPath = path.join(__dirname, "..", "generated", `addresses-${network}.ts`);
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, addressesContent);
  console.log(`📄 Addresses file generated: ${outputPath}`);
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

export default main;