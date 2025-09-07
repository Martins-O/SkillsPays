#!/usr/bin/env ts-node

import { execSync } from "child_process";

async function main() {
  console.log("🚀 Starting local deployment...\n");
  
  try {
    // Start local node if not running
    console.log("🔄 Checking local node...");
    
    // Deploy using hardhat ignition
    console.log("🔄 Deploying with Hardhat Ignition...");
    execSync("npx hardhat ignition deploy ignition/modules/SkillPaysEcosystem.ts --network localhost", {
      stdio: "inherit",
      cwd: process.cwd()
    });
    
    console.log("✅ Local deployment completed!");
    console.log("\n📋 Next steps:");
    console.log("1. Check deployment results in ignition/deployments/");
    console.log("2. Update frontend addresses from deployment artifacts");
    console.log("3. Start your frontend application");
    
  } catch (error) {
    console.error("❌ Local deployment failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}