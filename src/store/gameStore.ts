import { create } from "zustand";
import { CharacterId } from "../game/characters/drawCharacters";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Screen = "menu" | "character_select" | "game" | "game_over" | "leaderboard" | "lobby" | "nft_gallery";

export interface TxRecord {
  hash:        string;
  type:        "coin" | "score" | "character" | "nft";
  status:      "pending" | "confirmed" | "failed";
  timestamp:   number;
  confirmMs:   number | null;
  description: string;
}

export interface LeaderboardEntry {
  rank:        number;
  address:     string;
  displayName: string;
  score:       number;
  timestamp:   number;
}

interface GameStore {
  // Screen
  currentScreen:      Screen;
  setScreen:          (s: Screen) => void;

  // Wallet
  walletAddress:      string | null;
  monBalance:         string;
  isConnecting:       boolean;
  walletType:         string | null;
  setWallet:          (addr: string | null, balance: string) => void;
  setConnecting:      (v: boolean) => void;
  setWalletType:      (t: string | null) => void;

  // Character
  selectedCharacter:  CharacterId;
  setCharacter:       (id: CharacterId) => void;
  characterOnChain:   CharacterId | null;
  setCharacterOnChain:(id: CharacterId) => void;

  // Game stats
  currentScore:       number;
  currentCoins:       number;
  currentMultiplier:  number;
  currentSpeed:       number;
  highScore:          number;
  lastGameScore:      number;
  lastGameCoins:      number;
  setGameStats:       (score: number, coins: number, mult: number, speed: number) => void;
  setHighScore:       (s: number) => void;
  setLastGame:        (score: number, coins: number) => void;

  // Blockchain / TX
  txRecords:          TxRecord[];
  addTx:              (tx: Omit<TxRecord, "timestamp">) => void;
  updateTx:           (hash: string, update: Partial<TxRecord>) => void;
  avgConfirmMs:       number;
  _updateAvgConfirm:  (ms: number) => void;

  // Leaderboard
  leaderboard:        LeaderboardEntry[];
  playerRank:         number;
  setLeaderboard:     (entries: LeaderboardEntry[], rank: number) => void;

  // Player on-chain stats
  playerTotalCoins:   number;
  playerGamesPlayed:  number;
  setPlayerStats:     (coins: number, games: number) => void;

  // NFT
  ownedCharacterNFTs: CharacterId[];
  setOwnedNFTs:       (ids: CharacterId[]) => void;

  // Lobby
  activeLobbyCode:    string | null;    // 6-char human-readable code
  activeLobbyStake:   string;           // in MON (formatted)
  activeLobbyStakeWei:string;           // raw wei string
  isLobbyCreator:     boolean;
  lobbyOpponent:      string | null;    // opponent wallet address
  lobbySettled:       boolean;
  lobbyWinner:        string | null;
  pendingClaim:       string;           // pending MON to claim
  setActiveLobby:     (code: string, stakeWei: string, stakeMon: string, isCreator: boolean) => void;
  clearLobby:         () => void;
  setLobbyOpponent:   (addr: string) => void;
  setLobbySettled:    (winner: string | null) => void;
  setPendingClaim:    (amount: string) => void;

  // Game state
  isGameRunning:      boolean;
  setGameRunning:     (v: boolean) => void;

  // Player display name
  displayName:        string;
  setDisplayName:     (n: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Screen
  currentScreen: "menu",
  setScreen: (s) => set({ currentScreen: s }),

  // Wallet
  walletAddress:  null,
  monBalance:     "0",
  isConnecting:   false,
  walletType:     null,
  setWallet: (addr, balance) => set({ walletAddress: addr, monBalance: balance }),
  setConnecting: (v) => set({ isConnecting: v }),
  setWalletType: (t) => set({ walletType: t }),

  // Character
  selectedCharacter:  1,
  setCharacter:       (id) => set({ selectedCharacter: id }),
  characterOnChain:   null,
  setCharacterOnChain:(id) => set({ characterOnChain: id }),

  // Game stats
  currentScore:      0,
  currentCoins:      0,
  currentMultiplier: 1,
  currentSpeed:      5,
  highScore:         0,
  lastGameScore:     0,
  lastGameCoins:     0,
  setGameStats: (score, coins, mult, speed) =>
    set({ currentScore: score, currentCoins: coins, currentMultiplier: mult, currentSpeed: speed }),
  setHighScore: (s) => set({ highScore: s }),
  setLastGame:  (score, coins) => set({ lastGameScore: score, lastGameCoins: coins }),

  // TX
  txRecords: [],
  addTx: (tx) =>
    set((state) => ({
      txRecords: [{ ...tx, timestamp: Date.now() }, ...state.txRecords].slice(0, 10),
    })),
  updateTx: (hash, update) =>
    set((state) => ({
      txRecords: state.txRecords.map((r) =>
        r.hash === hash ? { ...r, ...update } : r
      ),
    })),
  avgConfirmMs: 0,
  _updateAvgConfirm: (ms) =>
    set((state) => ({
      avgConfirmMs:
        state.avgConfirmMs === 0
          ? ms
          : Math.round((state.avgConfirmMs * 0.7 + ms * 0.3)),
    })),

  // Leaderboard
  leaderboard: [],
  playerRank:  0,
  setLeaderboard: (entries, rank) => set({ leaderboard: entries, playerRank: rank }),

  // Player on-chain stats
  playerTotalCoins:  0,
  playerGamesPlayed: 0,
  setPlayerStats: (coins, games) =>
    set({ playerTotalCoins: coins, playerGamesPlayed: games }),

  // NFT
  ownedCharacterNFTs: [],
  setOwnedNFTs: (ids) => set({ ownedCharacterNFTs: ids }),

  // Lobby
  activeLobbyCode:     null,
  activeLobbyStake:    "0",
  activeLobbyStakeWei: "0",
  isLobbyCreator:      false,
  lobbyOpponent:       null,
  lobbySettled:        false,
  lobbyWinner:         null,
  pendingClaim:        "0",
  setActiveLobby: (code, stakeWei, stakeMon, isCreator) => {
    set({
      activeLobbyCode:     code,
      activeLobbyStakeWei: stakeWei,
      activeLobbyStake:    stakeMon,
      isLobbyCreator:      isCreator,
      lobbyOpponent:       null,
      lobbySettled:        false,
      lobbyWinner:         null,
    });
  },
  clearLobby: () => set({
    activeLobbyCode:     null,
    activeLobbyStake:    "0",
    activeLobbyStakeWei: "0",
    isLobbyCreator:      false,
    lobbyOpponent:       null,
    lobbySettled:        false,
    lobbyWinner:         null,
  }),
  setLobbyOpponent: (addr) => set({ lobbyOpponent: addr }),
  setLobbySettled:  (winner) => set({ lobbySettled: true, lobbyWinner: winner }),
  setPendingClaim:  (amount) => set({ pendingClaim: amount }),

  // Game state
  isGameRunning: false,
  setGameRunning: (v) => set({ isGameRunning: v }),

  // Display name
  displayName: "ANON PLAYER",
  setDisplayName: (n) => set({ displayName: n }),
}));
