import { useCallback } from "react";
import { ethers }      from "ethers";
import toast           from "react-hot-toast";
import { useWallet }   from "./useWallet";
import { useGameStore }from "../store/gameStore";
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from "../contracts/addresses";
import LOBBY_ABI from "../contracts/abis/PrivateLobby.json";
import NFT_ABI   from "../contracts/abis/PoliticianNFT.json";
import { CharacterId } from "../game/characters/drawCharacters";

// ─── Bytes6 helpers ────────────────────────────────────────────────────────────
/** Convert ethers bytes6 hex ("0x414243...") → human-readable code ("ABCDE") */
export function bytes6ToCode(hex: string): string {
  const h = hex.replace("0x", "").padEnd(12, "0");
  let s = "";
  for (let i = 0; i < 12; i += 2) {
    const charCode = parseInt(h.slice(i, i + 2), 16);
    if (charCode > 0) s += String.fromCharCode(charCode);
  }
  return s;
}

/** Convert human-readable code ("ABCDEF") → bytes6 hex ("0x414243444546") */
export function codeToBytes6(code: string): string {
  const padded = code.toUpperCase().slice(0, 6).padEnd(6, "\0");
  let hex = "0x";
  for (const c of padded) {
    hex += c.charCodeAt(0).toString(16).padStart(2, "0");
  }
  return hex;
}

export interface LobbyState {
  creator:             string;
  challenger:          string;
  stake:               bigint;
  creatorScore:        bigint;
  challengerScore:     bigint;
  creatorSubmitted:    boolean;
  challengerSubmitted: boolean;
  settled:             boolean;
  winner:              string;
  active:              boolean;
}

export function useLobby() {
  const { getSigner, isConnected }                    = useWallet();
  const { walletAddress, setActiveLobby, clearLobby,
          setLobbyOpponent, setLobbySettled,
          setScreen, setPendingClaim }                = useGameStore();

  // ─── Get contract ──────────────────────────────────────────────────────────
  const getLobbyContract = useCallback(async () => {
    const signer = await getSigner();
    if (!signer) return null;
    return new ethers.Contract(CONTRACT_ADDRESSES.LOBBY_CONTRACT, LOBBY_ABI, signer);
  }, [getSigner]);

  const getLobbyContractReadOnly = useCallback(async () => {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    return new ethers.Contract(CONTRACT_ADDRESSES.LOBBY_CONTRACT, LOBBY_ABI, provider);
  }, []);

  // ─── Create lobby ──────────────────────────────────────────────────────────
  const createLobby = useCallback(async (stakeMonStr: string): Promise<string | null> => {
    if (!isConnected || !walletAddress) {
      toast.error("Connect wallet first!");
      return null;
    }
    const contract = await getLobbyContract();
    if (!contract) return null;

    const stakeWei = ethers.parseEther(stakeMonStr);
    const salt     = BigInt(Date.now());

    const toastId = toast.loading("⏳ Creating lobby on Monad...");
    try {
      const tx       = await contract.createLobby(salt, { value: stakeWei });
      const receipt  = await tx.wait(1);
      // Parse the LobbyCreated event to get the code
      const iface   = new ethers.Interface(LOBBY_ABI);
      let code = "";
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "LobbyCreated") {
            code = bytes6ToCode(parsed.args.code);
            break;
          }
        } catch {}
      }
      if (!code) throw new Error("Could not parse lobby code from receipt");

      toast.success(`✅ Lobby created! Code: ${code}`, { id: toastId, duration: 6000 });
      setActiveLobby(code, stakeWei.toString(), stakeMonStr, true);
      return code;
    } catch (err: any) {
      toast.error(`❌ ${(err?.reason || err?.message || "Failed").slice(0, 80)}`, { id: toastId });
      return null;
    }
  }, [isConnected, walletAddress, getLobbyContract, setActiveLobby]);

  // ─── Fetch lobby state ─────────────────────────────────────────────────────
  const fetchLobbyState = useCallback(async (code: string): Promise<LobbyState> => {
    const contract = await getLobbyContractReadOnly();
    const bytes6   = codeToBytes6(code);
    const [
      creator, challenger, stake,
      creatorScore, challengerScore,
      creatorSubmitted, challengerSubmitted,
      settled, winner, active,
    ] = await contract.getLobby(bytes6);
    return {
      creator, challenger, stake: BigInt(stake),
      creatorScore: BigInt(creatorScore), challengerScore: BigInt(challengerScore),
      creatorSubmitted, challengerSubmitted,
      settled, winner, active,
    };
  }, [getLobbyContractReadOnly]);

  // ─── Join lobby ────────────────────────────────────────────────────────────
  const joinLobby = useCallback(async (code: string): Promise<boolean> => {
    if (!isConnected || !walletAddress) {
      toast.error("Connect wallet first!");
      return false;
    }
    const contract = await getLobbyContract();
    if (!contract) return false;

    // First, fetch lobby info to get stake
    let lobbyData: LobbyState;
    try {
      // Look up directly via read-only contract to avoid circular dependency
      const readContract = await getLobbyContractReadOnly();
      const bytes6code   = codeToBytes6(code);
      const [
        creator, challenger, stake, , ,
        , , settled, , active,
      ] = await readContract.getLobby(bytes6code);
      lobbyData = { creator, challenger, stake: BigInt(stake), creatorScore: 0n, challengerScore: 0n, creatorSubmitted: false, challengerSubmitted: false, settled, winner: creator, active };
    } catch {
      toast.error("Lobby not found!");
      return false;
    }

    if (!lobbyData.active) { toast.error("This lobby is no longer active"); return false; }
    if (lobbyData.challenger !== ethers.ZeroAddress) { toast.error("Lobby is full!"); return false; }

    const toastId = toast.loading(`⏳ Joining lobby ${code}...`);
    try {
      const bytes6 = codeToBytes6(code);
      const tx     = await contract.joinLobby(bytes6, { value: lobbyData.stake });
      await tx.wait(1);

      toast.success(`✅ Joined lobby! Stake: ${ethers.formatEther(lobbyData.stake)} MON`, { id: toastId, duration: 5000 });
      setActiveLobby(code, lobbyData.stake.toString(), ethers.formatEther(lobbyData.stake), false);
      setLobbyOpponent(lobbyData.creator);
      return true;
    } catch (err: any) {
      toast.error(`❌ ${(err?.reason || err?.message || "Failed").slice(0, 80)}`, { id: toastId });
      return false;
    }
  }, [isConnected, walletAddress, getLobbyContract, getLobbyContractReadOnly, setActiveLobby, setLobbyOpponent]);

  // ─── Submit score ──────────────────────────────────────────────────────────
  const submitLobbyScore = useCallback(async (code: string, score: number): Promise<boolean> => {
    if (!isConnected || !walletAddress) {
      toast.error("Connect wallet to submit!");
      return false;
    }
    const contract = await getLobbyContract();
    if (!contract) return false;

    const toastId = toast.loading("⏳ Submitting score to lobby...");
    try {
      const bytes6 = codeToBytes6(code);
      const tx     = await contract.submitScore(bytes6, score);
      await tx.wait(1);
      toast.success("✅ Score submitted to lobby!", { id: toastId, duration: 4000 });

      // Refresh lobby state to check if settled
      const updated = await fetchLobbyState(code);
      if (updated.settled) {
        const winnerAddr = updated.winner === ethers.ZeroAddress ? null : updated.winner;
        setLobbySettled(winnerAddr);
        const isWinner = winnerAddr?.toLowerCase() === walletAddress.toLowerCase();
        const isTie    = winnerAddr === ethers.ZeroAddress || winnerAddr === null;
        if (isTie) {
          toast("🤝 It's a TIE! Your stake returned.", { icon: "⚖️" });
        } else if (isWinner) {
          const prize = ethers.formatEther(updated.stake * 2n * 97n / 100n);
          toast.success(`🏆 YOU WIN! Claim ${prize} MON`, { duration: 8000 });
        } else {
          toast.error("❌ You lost this round. Better luck next time!");
        }
        // Check claimable amount
        await refreshPendingClaim();
      }
      return true;
    } catch (err: any) {
      toast.error(`❌ ${(err?.reason || err?.message || "Failed").slice(0, 80)}`, { id: toastId });
      return false;
    }
  }, [isConnected, walletAddress, getLobbyContract, fetchLobbyState, setLobbySettled]);

  // ─── Claim winnings ────────────────────────────────────────────────────────
  const claimWinnings = useCallback(async (): Promise<boolean> => {
    if (!isConnected || !walletAddress) { toast.error("Connect wallet!"); return false; }
    const contract = await getLobbyContract();
    if (!contract) return false;

    const toastId = toast.loading("⏳ Claiming winnings...");
    try {
      const tx = await contract.claimWinnings();
      await tx.wait(1);
      toast.success("✅ Winnings claimed!", { id: toastId, duration: 5000 });
      setPendingClaim("0");
      return true;
    } catch (err: any) {
      toast.error(`❌ ${(err?.reason || err?.message || "Failed").slice(0, 80)}`, { id: toastId });
      return false;
    }
  }, [isConnected, walletAddress, getLobbyContract, setPendingClaim]);

  // ─── Refresh pending claim ─────────────────────────────────────────────────
  const refreshPendingClaim = useCallback(async () => {
    if (!walletAddress) return "0";
    try {
      const contract = await getLobbyContractReadOnly();
      const amount   = await contract.pendingFor(walletAddress);
      const formatted = ethers.formatEther(amount);
      setPendingClaim(formatted);
      return formatted;
    } catch { return "0"; }
  }, [walletAddress, getLobbyContractReadOnly, setPendingClaim]);

  // ─── Fetch NFT token URI ───────────────────────────────────────────────────
  const fetchNFTDataUri = useCallback(async (charId: CharacterId): Promise<string | null> => {
    if (!walletAddress) return null;
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.NFT_CONTRACT, NFT_ABI, provider);
      const tokenId  = await contract.playerCharacterToken(walletAddress, charId);
      if (tokenId === 0n) return null;
      const uri  = await contract.tokenURI(tokenId);
      // uri = "data:application/json;base64,XXX"
      const base64Json = uri.replace("data:application/json;base64,", "");
      const json       = JSON.parse(atob(base64Json));
      return json.image as string; // "data:image/svg+xml;base64,..."
    } catch {
      return null;
    }
  }, [walletAddress]);

  return {
    createLobby,
    joinLobby,
    fetchLobbyState,
    submitLobbyScore,
    claimWinnings,
    refreshPendingClaim,
    fetchNFTDataUri,
    bytes6ToCode,
    codeToBytes6,
  };
}
