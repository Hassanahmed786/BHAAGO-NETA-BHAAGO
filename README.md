# 🏃 BHAAGO NETA BHAAGO

> **Scandals se Bhago · Monad pe Daago**
>
> An endless runner blockchain game on Monad Testnet. Play as world politicians — Modi, Trump, Rahul, Biden, Kejriwal, Putin — dodge scandals, collect bribe coins, and etch your score on-chain at lightning speed.

---

## 🎮 Live Demo

**[▶ Play Now → bhaago-neta-bhaago.vercel.app](https://bhaago-neta-bhaago.vercel.app)**

---

## 🕹️ Gameplay

- **3 lanes** — left / centre / right
- **Jump** with `↑ / W / Space` — **Slide** with `↓ / S`
- **Switch lanes** with `← → / A D`
- **Activate special power** with `Shift / Z`
- Swipe gestures supported on mobile

| Character | Special Power | Description |
|-----------|--------------|-------------|
| 🇮🇳 Narendra Modi | Vikas Shield | Invincibility burst |
| 🇺🇸 Donald Trump | The Wall | Destroys next obstacle |
| 🤚 Rahul Gandhi | Bharat Jodo | Coin magnet |
| 🧣 Arvind Kejriwal | AAP Scan | Reveals hidden coins |
| 🕶️ Joe Biden | Aviator Boost | Speed burst + score multiplier |
| 🐻 Vladimir Putin | KGB Ghost | Phase through obstacles |

---

## ⛓️ On-Chain Features

- **Select your character** on-chain before each game
- **Submit score** on-chain after game ends (user-initiated — zero interruptions during play)
- **Global leaderboard** — top 100 players ranked by score
- **Character NFTs** — ERC-721 with on-chain SVG metadata, mintable from the NFT Gallery
- **Private lobbies** — invite-only rooms with MON staking; winner takes the pot
- **TX speed feed** — live Monad confirmation times displayed in-game (typically < 500 ms)

---

## 📦 Smart Contracts (Monad Testnet)

| Contract | Address |
|----------|---------|
| PoliticianSurfers (main game) | `0x1084c097e211E488041BC38CF926C82584890DA5` |
| Leaderboard | `0x75B6D31d2c48bBCf42037c79708640916DE73bFc` |
| PoliticianNFT (ERC-721) | `0xA6EF03b53Bb8ae3914AAED537c6e6C1c3F8c0117` |
| PrivateLobby (staking) | `0x6f0fB75296Ba117A83023648e1b57ef653560Fe7` |

> All contracts live on **Monad Testnet** (Chain ID `10143`).

---

## 🌐 Network Details

| Parameter | Value |
|-----------|-------|
| Network Name | Monad Testnet |
| Chain ID | 10143 |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| Explorer | `https://testnet.monadexplorer.com` |
| Currency | MON |

MetaMask automatically prompts to add/switch to Monad Testnet on connect.

---

## 🚀 Local Setup

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

> ⚠️ Your wallet needs MON tokens — get them at [faucet.monad.xyz](https://faucet.monad.xyz).

### 3. Compile contracts

```bash
npx hardhat compile
```

### 4. (Optional) Deploy your own contracts

```bash
npx hardhat run scripts/deploy.js --network monad-testnet
```

### 5. Start the game

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
politician-surfers/
├── contracts/
│   ├── PoliticianSurfers.sol     # Main game + score logic
│   ├── Leaderboard.sol           # On-chain top-100 leaderboard
│   ├── PoliticianNFT.sol         # ERC-721 with inline SVG metadata
│   └── PrivateLobby.sol          # Staked invite-only lobbies
├── scripts/
│   └── deploy.js
├── public/
│   └── politicians/              # Politician photos (death screen overlay)
├── src/
│   ├── game/
│   │   ├── GameEngine.ts         # 60fps game loop
│   │   ├── Player.ts             # Physics + power system
│   │   ├── Obstacle.ts           # Obstacle spawner
│   │   ├── Coin.ts               # Coin spawner + magnet
│   │   ├── Background.ts         # 3-layer parallax
│   │   ├── Renderer.ts           # Canvas draw + particles
│   │   └── SoundEngine.ts        # Web Audio API sounds
│   ├── components/
│   │   ├── MenuScreen.tsx
│   │   ├── CharacterSelect.tsx
│   │   ├── GameCanvas.tsx
│   │   ├── GameHUD.tsx
│   │   ├── GameOver.tsx          # Coin rain, tier badge, character verdicts
│   │   ├── DeathQuip.tsx         # Death roast overlay + politician photo
│   │   ├── Leaderboard.tsx
│   │   ├── NFTGallery.tsx
│   │   ├── PrivateLobby.tsx
│   │   ├── WalletButton.tsx
│   │   └── TxFeed.tsx
│   ├── contracts/
│   │   ├── addresses.ts
│   │   └── abis/
│   ├── hooks/
│   │   ├── useWallet.ts
│   │   └── useContract.ts
│   ├── store/
│   │   └── gameStore.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── styles/index.css
├── hardhat.config.cjs
├── vite.config.ts
└── .env.example
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 + TypeScript |
| Game Engine | HTML5 Canvas 2D + `requestAnimationFrame` |
| Styling | Tailwind CSS 3 |
| Blockchain | ethers.js v6 + Solidity 0.8.20 |
| Dev / Deploy | Hardhat → Monad Testnet |
| State | Zustand |
| Notifications | react-hot-toast |
| Sounds | Web Audio API (zero audio files) |
| Hosting | Vercel (auto-deploy on push) |

---

## ⚡ Why Monad?

Monad's parallel EVM and fast block times make the on-chain game loop feel native. Score submissions and leaderboard updates confirm in **< 500 ms** — something impossible on Ethereum mainnet. Private lobbies settle instantly, making staking feel like a real-time bet, not a waiting game.

---

## 📝 License

MIT — Built for **Monad Blitz Hyderabad Hackathon 2025**.
