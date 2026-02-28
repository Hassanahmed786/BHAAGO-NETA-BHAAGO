import React, { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import toast      from "react-hot-toast";
import { useGameStore }   from "../store/gameStore";
import { useContract }    from "../hooks/useContract";
import { useWallet }      from "../hooks/useWallet";
import { CHARACTERS, CharacterId } from "../game/characters/drawCharacters";
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from "../contracts/addresses";
import NFT_ABI from "../contracts/abis/PoliticianNFT.json";

// ─── One card per character ───────────────────────────────────────────────────
const NFTCard: React.FC<{
  charId:    CharacterId;
  owned:     boolean;
  imageUri:  string | null;
  loading:   boolean;
  onMint:    () => void;
  minting:   boolean;
}> = ({ charId, owned, imageUri, loading, onMint, minting }) => {
  const char = CHARACTERS[charId];
  const accent = char.accentColor;

  return (
    <div style={{
      borderRadius: "1rem",
      border: `2px solid ${owned ? accent : "rgba(131,110,249,0.2)"}`,
      background: owned ? `${accent}11` : "rgba(14,11,30,0.8)",
      padding: "1rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.6rem",
      opacity: owned ? 1 : 0.55,
      transition: "all 0.3s",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow behind card if owned */}
      {owned && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at 50% 30%, ${accent}22 0%, transparent 70%)`,
        }}/>
      )}

      {/* NFT image or locked placeholder */}
      <div style={{
        width: 120, height: 120,
        borderRadius: "0.75rem",
        border: `1px solid ${owned ? accent + "60" : "rgba(131,110,249,0.15)"}`,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}>
        {loading ? (
          <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "0.4rem", color: "#836EF9", textAlign: "center" }}>
            LOADING...
          </div>
        ) : owned && imageUri ? (
          <img
            src={imageUri}
            alt={char.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "0.5rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.3rem" }}>🔒</div>
            <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "0.35rem", color: "rgba(131,110,249,0.5)" }}>
              NOT MINTED
            </div>
          </div>
        )}

        {/* Owned badge */}
        {owned && (
          <div style={{
            position: "absolute", top: 4, right: 4,
            background: accent,
            borderRadius: "0.25rem",
            padding: "0.15rem 0.3rem",
            fontFamily: "'Press Start 2P',monospace",
            fontSize: "0.3rem",
            color: "#fff",
          }}>NFT</div>
        )}
      </div>

      {/* Name */}
      <div style={{
        fontFamily: "'Press Start 2P',monospace",
        fontSize: "0.5rem",
        color: owned ? accent : "rgba(131,110,249,0.5)",
        textAlign: "center",
        letterSpacing: "0.05em",
        lineHeight: 1.6,
      }}>
        {char.name}
      </div>

      {/* Power */}
      <div style={{
        fontFamily: "Rajdhani,sans-serif",
        fontSize: "0.75rem",
        color: owned ? "#39ff14" : "rgba(131,110,249,0.3)",
        textAlign: "center",
        fontWeight: 700,
      }}>
        ⚡ {char.power}
      </div>

      {/* Token ID or Mint button */}
      {!owned && (
        <button
          onClick={onMint}
          disabled={minting}
          style={{
            padding: "0.4rem 0.75rem",
            borderRadius: "0.5rem",
            border: `1px solid rgba(131,110,249,0.4)`,
            background: minting ? "rgba(131,110,249,0.3)" : "transparent",
            color: "#836EF9",
            fontFamily: "'Press Start 2P',monospace",
            fontSize: "0.4rem",
            cursor: minting ? "not-allowed" : "pointer",
            letterSpacing: "0.05em",
          }}
        >
          {minting ? "MINTING..." : "MINT NFT"}
        </button>
      )}

      {owned && (
        <div style={{
          fontFamily: "Rajdhani,sans-serif",
          fontSize: "0.7rem",
          color: "rgba(131,110,249,0.6)",
        }}>
          ✅ Owned
        </div>
      )}
    </div>
  );
};

// ─── Main Gallery ─────────────────────────────────────────────────────────────
export const NFTGallery: React.FC = () => {
  const { walletAddress, setScreen, ownedCharacterNFTs, setOwnedNFTs } = useGameStore();
  const { fetchOwnedNFTs, mintCharacterNFT } = useContract();
  const { isConnected } = useWallet();

  // imageUri per charId
  const [images,   setImages  ] = useState<Record<number, string | null>>({});
  const [loading,  setLoading ] = useState(true);
  const [minting,  setMinting ] = useState<CharacterId | null>(null);

  // ─── Load owned NFTs and their images ─────────────────────────────────────
  const loadGallery = useCallback(async () => {
    if (!walletAddress || !isConnected) { setLoading(false); return; }
    setLoading(true);
    try {
      const owned = await fetchOwnedNFTs(walletAddress);
      setOwnedNFTs(owned);

      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const nftContract = new ethers.Contract(
        CONTRACT_ADDRESSES.NFT_CONTRACT, NFT_ABI, provider
      );

      const imgMap: Record<number, string | null> = {};
      for (const charId of owned) {
        try {
          const tokenId = await nftContract.playerCharacterToken(walletAddress, charId);
          if (tokenId === 0n) { imgMap[charId] = null; continue; }
          const uri       = await nftContract.tokenURI(tokenId);
          const base64Json = uri.replace("data:application/json;base64,", "");
          const json       = JSON.parse(atob(base64Json));
          imgMap[charId]   = json.image as string;
        } catch { imgMap[charId] = null; }
      }
      setImages(imgMap);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, isConnected, fetchOwnedNFTs, setOwnedNFTs]);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  // ─── Mint ──────────────────────────────────────────────────────────────────
  const handleMint = async (charId: CharacterId) => {
    if (!isConnected) { toast.error("Connect wallet to mint!"); return; }
    setMinting(charId);
    try {
      const hash = await mintCharacterNFT(charId);
      if (hash) {
        toast.success("NFT minted! Refreshing gallery...", { duration: 3000 });
        await loadGallery();
      }
    } finally {
      setMinting(null);
    }
  };

  const allCharIds: CharacterId[] = [0, 1, 2, 3, 4, 5];

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0e0b1e",
      display: "flex", flexDirection: "column",
      fontFamily: "'Press Start 2P', monospace",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.5rem 1.5rem 0.5rem",
        borderBottom: "1px solid rgba(131,110,249,0.2)",
      }}>
        <button
          onClick={() => setScreen("menu")}
          style={{
            background: "none", border: "none",
            color: "rgba(131,110,249,0.6)",
            fontFamily: "'Press Start 2P',monospace",
            fontSize: "0.55rem", cursor: "pointer",
          }}
        >← BACK</button>

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: "clamp(0.7rem,2vw,1rem)", color: "#836EF9",
            textShadow: "0 0 20px #836EF9",
          }}>
            MY NFT COLLECTION
          </div>
          <div style={{
            fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem",
            color: "#a855f7", fontWeight: 700, letterSpacing: "0.1em", marginTop: "0.15rem",
          }}>
            POLITICIAN SURFERS · ON-CHAIN SVG
          </div>
        </div>

        <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: "#39ff14" }}>
          {ownedCharacterNFTs.length}/6 Owned
        </div>
      </div>

      {/* Wallet not connected warning */}
      {!isConnected && (
        <div style={{
          margin: "2rem auto",
          padding: "1.5rem", borderRadius: "1rem",
          border: "1px solid rgba(255,0,128,0.4)",
          background: "rgba(255,0,128,0.08)",
          color: "#ff0080", fontFamily: "'Press Start 2P',monospace",
          fontSize: "0.55rem", textAlign: "center",
        }}>
          CONNECT WALLET TO VIEW NFTs
        </div>
      )}

      {/* Info banner */}
      {isConnected && (
        <div style={{
          margin: "1rem 1.5rem 0",
          padding: "0.75rem 1rem",
          borderRadius: "0.75rem",
          border: "1px solid rgba(57,255,20,0.3)",
          background: "rgba(57,255,20,0.05)",
          fontFamily: "Rajdhani,sans-serif",
          fontSize: "0.85rem",
          color: "rgba(57,255,20,0.8)",
        }}>
          🎨 NFTs are fully on-chain SVG images stored on Monad Testnet. Mint a character NFT to own it forever.
          View them on the{" "}
          <a
            href={`${NETWORK_CONFIG.explorer}/address/${CONTRACT_ADDRESSES.NFT_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#836EF9", textDecoration: "underline" }}
          >
            Monad Explorer
          </a>.
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: "1rem",
        padding: "1.5rem",
      }}>
        {allCharIds.map((charId) => (
          <NFTCard
            key={charId}
            charId={charId}
            owned={ownedCharacterNFTs.includes(charId)}
            imageUri={images[charId] ?? null}
            loading={loading}
            onMint={() => handleMint(charId)}
            minting={minting === charId}
          />
        ))}
      </div>

      {/* Footer note */}
      <div style={{
        textAlign: "center", padding: "1rem",
        fontFamily: "Rajdhani,sans-serif",
        fontSize: "0.7rem",
        color: "rgba(131,110,249,0.4)",
      }}>
        NFTs auto-mint when you select a character and play. You can also mint them manually above.
        <br/>
        Contract: <a
          href={`${NETWORK_CONFIG.explorer}/address/${CONTRACT_ADDRESSES.NFT_CONTRACT}`}
          target="_blank" rel="noopener noreferrer"
          style={{ color: "#836EF9" }}
        >
          {CONTRACT_ADDRESSES.NFT_CONTRACT.slice(0, 10)}...
        </a>
      </div>
    </div>
  );
};
