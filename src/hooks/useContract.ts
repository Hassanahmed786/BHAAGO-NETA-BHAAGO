import { useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useWallet } from "./useWallet";
import { useGameStore } from "../store/gameStore";
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from "../contracts/addresses";
import GAME_ABI       from "../contracts/abis/PoliticianSurfers.json";
import LEADERBOARD_ABI from "../contracts/abis/Leaderboard.json";
import NFT_ABI        from "../contracts/abis/PoliticianNFT.json";
import { CharacterId } from "../game/characters/drawCharacters";

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function explorerTxUrl(hash: string): string {
  return `${NETWORK_CONFIG.explorer}/tx/${hash}`;
}

export function useContract() {
  const { getSigner, isConnected } = useWallet();
  const { addTx, updateTx, _updateAvgConfirm, walletAddress, displayName } = useGameStore();

  // ─── Get contract instances ────────────────────────────────────────────────
  const getGameContract = useCallback(async () => {
    const signer = await getSigner();
    if (!signer) return null;
    return new ethers.Contract(CONTRACT_ADDRESSES.GAME_CONTRACT, GAME_ABI, signer);
  }, [getSigner]);

  const getLeaderboardContract = useCallback(async () => {
    const signer = await getSigner();
    if (!signer) return null;
    return new ethers.Contract(CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT, LEADERBOARD_ABI, signer);
  }, [getSigner]);

  const getNFTContract = useCallback(async () => {
    const signer = await getSigner();
    if (!signer) return null;
    return new ethers.Contract(CONTRACT_ADDRESSES.NFT_CONTRACT, NFT_ABI, signer);
  }, [getSigner]);

  // ─── Helper: send TX with toast feedback ─────────────────────────────────
  const sendTx = useCallback(async (
    txPromise: () => Promise<ethers.ContractTransactionResponse>,
    type: "coin" | "score" | "character" | "nft",
    description: string
  ): Promise<string | null> => {
    const toastId = toast.loading(`⏳ ${description} — Sending to Monad...`);

    const tempHash = "pending_" + Date.now();
    addTx({ hash: tempHash, type, status: "pending", confirmMs: null, description });

    try {
      const t0   = Date.now();
      const tx   = await txPromise();
      const hash = tx.hash;

      toast.loading(`⏳ ${truncateHash(hash)} — Confirming...`, { id: toastId });
      updateTx(tempHash, { hash, status: "pending" });

      await tx.wait(1);
      const confirmMs = Date.now() - t0;
      _updateAvgConfirm(confirmMs);

      updateTx(hash, { status: "confirmed", confirmMs });
      toast.success(`✅ ${description} — ⚡ ${confirmMs}ms on Monad!`, {
        id: toastId,
        duration: 4000,
      });

      return hash;
    } catch (err: any) {
      const msg = (err?.reason || err?.message || "Transaction failed").slice(0, 80);
      toast.error(`❌ ${description}: ${msg}`, { id: toastId });
      updateTx(tempHash, { status: "failed" });
      console.error("TX error:", err);
      return null;
    }
  }, [addTx, updateTx, _updateAvgConfirm]);

  // ─── selectCharacter ──────────────────────────────────────────────────────
  const selectCharacter = useCallback(async (characterId: CharacterId): Promise<string | null> => {
    if (!isConnected || !walletAddress) {
      toast.error("Connect wallet to select character on-chain!");
      return null;
    }
    const contract = await getGameContract();
    if (!contract) return null;

    return sendTx(
      () => contract.selectCharacter(walletAddress, characterId),
      "character",
      `Selected character #${characterId}`
    );
  }, [isConnected, walletAddress, getGameContract, sendTx]);

  // ─── recordCoinCollected ──────────────────────────────────────────────────
  const recordCoinCollected = useCallback(async (amount: number): Promise<string | null> => {
    if (!isConnected || !walletAddress) return null;
    const contract = await getGameContract();
    if (!contract) return null;

    return sendTx(
      () => contract.recordCoinCollected(walletAddress, amount),
      "coin",
      `Collected ${amount} bribe coins 💰`
    );
  }, [isConnected, walletAddress, getGameContract, sendTx]);

  // ─── submitScore ──────────────────────────────────────────────────────────
  const submitScore = useCallback(async (score: number, totalCoins: number): Promise<string | null> => {
    if (!isConnected || !walletAddress) {
      toast.error("Connect wallet to submit score on-chain!");
      return null;
    }
    const contract = await getGameContract();
    if (!contract) return null;

    return sendTx(
      () => contract.submitScore(walletAddress, score, totalCoins),
      "score",
      `Score ${score.toLocaleString()} submitted`
    );
  }, [isConnected, walletAddress, getGameContract, sendTx]);

  // ─── updateLeaderboard ────────────────────────────────────────────────────
  const updateLeaderboard = useCallback(async (score: number): Promise<string | null> => {
    if (!isConnected || !walletAddress) return null;
    const contract = await getLeaderboardContract();
    if (!contract) return null;

    const name = (useGameStore.getState().displayName || "ANON").slice(0, 20);
    return sendTx(
      () => contract.updateScore(walletAddress, name, score),
      "score",
      `Leaderboard updated: ${score.toLocaleString()}`
    );
  }, [isConnected, walletAddress, getLeaderboardContract, sendTx]);

  // ─── fetchLeaderboard ─────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    try {
      const signer   = await getSigner();
      if (!signer) return [];
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT, LEADERBOARD_ABI, signer
      );
      const [addrs, names, scores, timestamps] = await contract.getTopPlayers(10);
      return addrs.map((addr: string, i: number) => ({
        rank:        i + 1,
        address:     addr,
        displayName: names[i] || "ANON",
        score:       Number(scores[i]),
        timestamp:   Number(timestamps[i]),
      }));
    } catch (err) {
      console.error("Fetch leaderboard error:", err);
      return [];
    }
  }, [getSigner]);

  // ─── fetchPlayerRank ──────────────────────────────────────────────────────
  const fetchPlayerRank = useCallback(async (address: string): Promise<number> => {
    try {
      const signer   = await getSigner();
      if (!signer) return 0;
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT, LEADERBOARD_ABI, signer
      );
      const rank = await contract.getPlayerRank(address);
      return Number(rank);
    } catch {
      return 0;
    }
  }, [getSigner]);

  // ─── fetchPlayerStats ─────────────────────────────────────────────────────
  const fetchPlayerStats = useCallback(async (address: string) => {
    try {
      const signer   = await getSigner();
      if (!signer) return null;
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.GAME_CONTRACT, GAME_ABI, signer
      );
      const [totalCoins, highScore, characterId, gamesPlayed] =
        await contract.getPlayerStats(address);
      return {
        totalCoins:  Number(totalCoins),
        highScore:   Number(highScore),
        characterId: Number(characterId) as CharacterId,
        gamesPlayed: Number(gamesPlayed),
      };
    } catch {
      return null;
    }
  }, [getSigner]);

  // ─── mintCharacterNFT ─────────────────────────────────────────────────────
  const mintCharacterNFT = useCallback(async (characterId: CharacterId): Promise<string | null> => {
    if (!isConnected || !walletAddress) {
      toast.error("Connect wallet to mint NFT!");
      return null;
    }
    const contract = await getNFTContract();
    if (!contract) return null;

    return sendTx(
      () => contract.mintCharacter(characterId),
      "nft",
      `Minted Character #${characterId} NFT 🎨`
    );
  }, [isConnected, walletAddress, getNFTContract, sendTx]);

  // ─── fetchOwnedNFTs ───────────────────────────────────────────────────────
  const fetchOwnedNFTs = useCallback(async (address: string): Promise<CharacterId[]> => {
    try {
      const signer   = await getSigner();
      if (!signer) return [];
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.NFT_CONTRACT, NFT_ABI, signer
      );
      const owned = await contract.getOwnedCharacters(address);
      return owned.map(Number) as CharacterId[];
    } catch {
      return [];
    }
  }, [getSigner]);

  return {
    selectCharacter,
    recordCoinCollected,
    submitScore,
    updateLeaderboard,
    fetchLeaderboard,
    fetchPlayerRank,
    fetchPlayerStats,
    mintCharacterNFT,
    fetchOwnedNFTs,
  };
}
