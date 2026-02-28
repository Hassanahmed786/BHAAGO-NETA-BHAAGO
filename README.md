# 🏃 POLITICIAN SURFERS

> An endless runner blockchain game on Monad Testnet. Play as world politicians — Modi, Trump, Rahul, Biden, Kejriwal, Putin — dodge obstacles, collect bribe coins, and submit scores on-chain at lightning speed.

---

## 🎮 Demo Gameplay

- **3 lanes** — left / centre / right
- **Jump** with `↑ / W / Space` — **Slide** with `↓ / S`
- **Switch lanes** with `← → / A D`
- **Activate special power** with `Shift / Z`
- Swipe gestures supported on mobile

| Character | Special Power |
|-----------|--------------|
| Narendra Modi | Vikas Shield — invincibility burst |
| Donald Trump | The Wall — destroys next obstacle |
| Rahul Gandhi | Bharat Jodo — coin magnet |
| Arvind Kejriwal | AAP Scan — reveals hidden coins |
| Joe Biden | Aviator Boost — speed burst + multiplier |
| Vladimir Putin | KGB Ghost — phase through obstacles |

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd politician-surfers
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
PRIVATE_KEY=<your_wallet_private_key>
MONAD_RPC=https://testnet-rpc.monad.xyz
```

> ⚠️ Your wallet needs MON tokens from the [Monad Testnet Faucet](https://faucet.monad.xyz).

### 3. Compile contracts

```bash
npx hardhat compile
```

### 4. Deploy to Monad Testnet

```bash
npx hardhat run scripts/deploy.js --network monad-testnet
```

This automatically writes contract addresses to `src/contracts/addresses.ts`.

### 5. Start the game

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 Network Details

| Parameter | Value |
|-----------|-------|
| Network Name | Monad Testnet |
| Chain ID | 10143 |
| RPC URL | https://testnet-rpc.monad.xyz |
| Explorer | https://testnet.monadexplorer.com |
| Currency | MON |

MetaMask will automatically prompt to add/switch to Monad Testnet when you connect.

---

## ⛓️ Smart Contracts

### `PoliticianSurfers.sol`
Main game contract. Records character selection, coin collection (batched every 5), and final scores.

```solidity
selectCharacter(address player, uint8 characterId)
recordCoinCollected(address player, uint256 batchCount)
submitScore(address player, uint256 score, uint256 coins)
getPlayerStats(address player) → PlayerStats
```

### `Leaderboard.sol`
On-chain global leaderboard, top-100 sorted by score.

```solidity
updateScore(address player, string name, uint256 score)
getTopPlayers(uint8 count) → (addresses, names, scores, timestamps)
getPlayerRank(address player) → uint256
```

### `PoliticianNFT.sol`
ERC-721 character NFTs with on-chain SVG metadata. One NFT per wallet per character.

```solidity
mintCharacter(uint8 characterId)
ownsCharacter(address player, uint8 characterId) → bool
getOwnedCharacters(address player) → uint8[]
tokenURI(uint256 tokenId) → string  // base64 JSON + inline SVG
```

---

## 📁 Project Structure

```
politician-surfers/
├── contracts/
│   ├── PoliticianSurfers.sol
│   ├── Leaderboard.sol
│   └── PoliticianNFT.sol
├── scripts/
│   └── deploy.js
├── src/
│   ├── game/
│   │   ├── characters/drawCharacters.ts   # Canvas pixel-art draw functions
│   │   ├── GameEngine.ts                  # Main 60fps game loop
│   │   ├── Player.ts                      # Player physics + power system
│   │   ├── Obstacle.ts                    # Obstacle spawner
│   │   ├── Coin.ts                        # Coin spawner + magnet
│   │   ├── Background.ts                  # 3-layer parallax
│   │   ├── Renderer.ts                    # Canvas drawing + particles
│   │   └── SoundEngine.ts                 # Web Audio API sounds
│   ├── components/
│   │   ├── MenuScreen.tsx
│   │   ├── CharacterSelect.tsx
│   │   ├── GameCanvas.tsx
│   │   ├── GameHUD.tsx
│   │   ├── GameOver.tsx
│   │   ├── Leaderboard.tsx
│   │   ├── WalletButton.tsx
│   │   └── TxFeed.tsx
│   ├── contracts/
│   │   ├── addresses.ts                   # Auto-written by deploy.js
│   │   └── abis/
│   ├── hooks/
│   │   ├── useWallet.ts
│   │   └── useContract.ts
│   ├── store/
│   │   └── gameStore.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── styles/index.css
├── hardhat.config.ts
├── vite.config.ts
└── .env.example
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 + TypeScript |
| Game Engine | HTML5 Canvas 2D + requestAnimationFrame |
| Styling | Tailwind CSS 3 |
| Blockchain | ethers.js v6 + Solidity 0.8.20 |
| Deployment | Hardhat → Monad Testnet |
| State | Zustand |
| Notifications | react-hot-toast |
| Sounds | Web Audio API (no audio files) |

---

## ⚡ Monad Speed Demo

Every 5 coins triggers an on-chain TX. The in-game TX feed shows real confirmation times — typically **<500ms** on Monad Testnet — compared to 12-15 seconds on Ethereum.

---

## 📝 License

MIT — built for the Monad Hackathon.
