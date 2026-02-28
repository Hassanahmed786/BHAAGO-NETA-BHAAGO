const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network    = hre.network.name;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  POLITICIAN SURFERS — Deploying PrivateLobby to", network.toUpperCase());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Deployer :", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance  :", hre.ethers.formatEther(balance), "MON\n");

  if (parseFloat(hre.ethers.formatEther(balance)) < 0.02) {
    console.error("❌ Insufficient MON balance! Get testnet MON from https://faucet.monad.xyz");
    process.exit(1);
  }

  console.log("Deploying PrivateLobby...");
  const t0 = Date.now();
  const Factory  = await hre.ethers.getContractFactory("PrivateLobby");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(`✅ PrivateLobby: ${addr}  (${Date.now() - t0}ms)\n`);

  // ── Update addresses.ts ──────────────────────────────────────────────────
  const addressesPath = path.join(__dirname, "../src/contracts/addresses.ts");
  let content = fs.readFileSync(addressesPath, "utf8");

  // Replace the placeholder lobby address
  content = content.replace(
    /LOBBY_CONTRACT:\s+"0x[0-9a-fA-F]{40}".*$/m,
    `LOBBY_CONTRACT:       "${addr}",`
  );

  fs.writeFileSync(addressesPath, content);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PRIVATE LOBBY DEPLOYED ✅");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PrivateLobby :", addr);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("  📄 addresses.ts updated");
  console.log(`  🔍 Explorer: https://testnet.monadexplorer.com/address/${addr}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
