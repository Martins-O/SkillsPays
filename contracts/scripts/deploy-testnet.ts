#!/usr/bin/env ts-node

import { execSync } from "child_process";
require("dotenv").config();

async function main() {
  const network = process.argv[2] || "arbitrumSepolia";

  console.log(`🚀 Starting testnet deployment on ${network}...\n`);

  if (!process.env.PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY environment variable is required");
    process.exit(1);
  }

  if (!process.env.ARBISCAN_API_KEY) {
    console.warn("⚠️  ARBISCAN_API_KEY not set - contract verification will be skipped");
  }

  try {
    console.log(`🔄 Deploying to ${network}...`);
    execSync(`npx hardhat ignition deploy ignition/modules/OrganizationEcosystem.ts --network ${network}`, {
      stdio: "inherit",
      cwd: process.cwd()
    });

    console.log(`✅ Testnet deployment to ${network} completed!`);

    if (process.env.ARBISCAN_API_KEY) {
      console.log("🔍 Verifying contracts...");
      try {
        execSync(`npx hardhat ignition verify chain-${getChainId(network)}`, {
          stdio: "inherit",
          cwd: process.cwd()
        });
        console.log("✅ Contract verification completed!");
      } catch (verifyError) {
        console.warn("⚠️  Contract verification failed - you can verify manually later");
      }
    }

    console.log("\n📋 Next steps:");
    console.log("1. Check deployment results in ignition/deployments/");
    console.log("2. Update frontend addresses from deployment artifacts");
    console.log("3. Configure initial system parameters");
    console.log("4. Test key functionality");

  } catch (error) {
    console.error(`❌ Testnet deployment to ${network} failed:`, error);
    process.exit(1);
  }
}

function getChainId(network: string): number {
  const chainIds: { [key: string]: number } = {
    arbitrumSepolia: 421614,
    arbitrumGoerli: 421613,
    arbitrum: 42161
  };
  return chainIds[network] || 421614;
}

if (require.main === module) {
  main();
}