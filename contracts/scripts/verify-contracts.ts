#!/usr/bin/env ts-node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface ContractInfo {
  address: string;
  constructorArgs: any[];
}

async function main() {
  const network = process.argv[2];
  const deploymentPath = process.argv[3];
  
  if (!network) {
    console.error("Usage: ts-node verify-contracts.ts <network> [deployment-file]");
    console.error("Example: ts-node verify-contracts.ts arbitrumSepolia deployments/arbitrumSepolia-latest.json");
    process.exit(1);
  }
  
  if (!process.env.ARBISCAN_API_KEY && network.includes("arbitrum")) {
    console.error("❌ ARBISCAN_API_KEY environment variable is required for Arbitrum networks");
    process.exit(1);
  }
  
  console.log(`🔍 Starting contract verification on ${network}...\n`);
  
  let contracts: ContractInfo[] = [];
  
  if (deploymentPath && fs.existsSync(deploymentPath)) {
    // Load from deployment file
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    contracts = deploymentData.contracts.map((contract: any) => ({
      address: contract.address,
      constructorArgs: contract.constructorArgs
    }));
  } else {
    // Try to find latest deployment
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const latestFile = path.join(deploymentsDir, `${network}-latest.json`);
    
    if (fs.existsSync(latestFile)) {
      const deploymentData = JSON.parse(fs.readFileSync(latestFile, "utf8"));
      contracts = deploymentData.contracts.map((contract: any) => ({
        address: contract.address,
        constructorArgs: contract.constructorArgs
      }));
    } else {
      console.error(`❌ No deployment file found. Please provide deployment file path.`);
      process.exit(1);
    }
  }
  
  console.log(`Found ${contracts.length} contracts to verify\n`);
  
  let verified = 0;
  let failed = 0;
  
  for (const contract of contracts) {
    try {
      console.log(`🔄 Verifying ${contract.address}...`);
      
      // Prepare constructor arguments
      const argsString = contract.constructorArgs.length > 0 
        ? `--constructor-args scripts/verify-args/${contract.address}.js`
        : "";
      
      // Create args file if constructor args exist
      if (contract.constructorArgs.length > 0) {
        const argsDir = path.join(__dirname, "verify-args");
        if (!fs.existsSync(argsDir)) {
          fs.mkdirSync(argsDir, { recursive: true });
        }
        
        const argsFile = path.join(argsDir, `${contract.address}.js`);
        const argsContent = `module.exports = ${JSON.stringify(contract.constructorArgs)};`;
        fs.writeFileSync(argsFile, argsContent);
      }
      
      // Run verification
      const verifyCommand = `npx hardhat verify --network ${network} ${contract.address} ${argsString}`;
      execSync(verifyCommand, { stdio: "inherit", cwd: process.cwd() });
      
      console.log(`  ✅ Verified: ${contract.address}\n`);
      verified++;
      
    } catch (error) {
      console.error(`  ❌ Failed to verify ${contract.address}`);
      console.error(`     Error: ${error}\n`);
      failed++;
    }
    
    // Wait between verifications to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log("🎉 Verification complete!");
  console.log(`✅ Verified: ${verified}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log("\n💡 You can manually verify failed contracts using:");
    console.log(`npx hardhat verify --network ${network} <contract-address> [constructor-args...]`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}