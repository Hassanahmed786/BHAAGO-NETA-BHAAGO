import React, { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { useContract } from "../hooks/useContract";
import { useWallet } from "../hooks/useWallet";
import { CHARACTERS, CharacterId, drawCharacter } from "../game/characters/drawCharacters";
import toast from "react-hot-toast";

// Mini canvas preview for each card
const CharacterPreview: React.FC<{ characterId: CharacterId; isSelected: boolean }> = ({
  characterId, isSelected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const frameRef  = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const loop = () => {
      ctx.clearRect(0, 0, 64, 80);
      frameRef.current = (frameRef.current + 1) % 4;
      drawCharacter(ctx, characterId, {
        x:             8,
        y:             8,
        frame:         isSelected ? frameRef.current : 0,
        isSliding:     false,
        isJumping:     false,
        isInvincible:  false,
        isPowerActive: isSelected,
      });
      rafRef.current = requestAnimationFrame(loop);
    };

    // Slow down — run at ~10fps
    let lastT = 0;
    const throttled = (ts: number) => {
      if (ts - lastT > 100) {
        lastT = ts;
        loop();
      } else {
        rafRef.current = requestAnimationFrame(throttled);
      }
    };
    rafRef.current = requestAnimationFrame(throttled);
    return () => cancelAnimationFrame(rafRef.current);
  }, [characterId, isSelected]);

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={80}
      className="mx-auto"
      style={{ imageRendering: "pixelated" }}
    />
  );
};

export const CharacterSelect: React.FC = () => {
  const { selectedCharacter, setCharacter, setScreen, characterOnChain, setCharacterOnChain, walletAddress, displayName, setDisplayName } = useGameStore();
  const { selectCharacter, fetchOwnedNFTs } = useContract();
  const { isConnected } = useWallet();
  const [confirming, setConfirming]   = useState(false);
  const [ownedNFTs, setOwnedNFTs]     = useState<CharacterId[]>([]);
  const [nameInput, setNameInput]     = useState(displayName);
  const [hoveredCard, setHoveredCard] = useState<CharacterId | null>(null);

  useEffect(() => {
    if (walletAddress) {
      fetchOwnedNFTs(walletAddress).then(setOwnedNFTs);
    }
  }, [walletAddress, fetchOwnedNFTs]);

  const handleConfirm = async () => {
    if (!nameInput.trim()) { toast.error("Enter a display name!"); return; }
    setDisplayName(nameInput.trim().slice(0, 20));

    if (!isConnected) {
      toast("Wallet not connected — playing offline mode", { icon: "⚠️" });
      setScreen("game");
      return;
    }

    setConfirming(true);
    try {
      // Only call selectCharacter if the character changed from what's already on-chain
      // This avoids a wallet popup every single time you hit Play.
      if (characterOnChain !== selectedCharacter) {
        const hash = await selectCharacter(selectedCharacter);
        if (hash) setCharacterOnChain(selectedCharacter);
        // NFT minting is opt-in — visit "MY NFT COLLECTION" from the menu to mint.
      }
    } finally {
      setConfirming(false);
      setScreen("game");
    }
  };

  const char = CHARACTERS[selectedCharacter];

  return (
    <div className="
      w-full h-full flex flex-col items-center overflow-y-auto
      bg-monad-dark
      font-pixel
    ">
      {/* Header */}
      <div className="w-full flex flex-col items-center pt-8 pb-4 px-4">
        <button
          onClick={() => setScreen("menu")}
          className="self-start text-monad-purple/60 hover:text-monad-purple font-pixel text-xs mb-4 cursor-pointer"
        >
          ← BACK
        </button>
        <h2 className="text-monad-purple text-lg tracking-widest"
          style={{ textShadow: "0 0 20px #836EF9" }}>
          CHOOSE YOUR POLITICIAN
        </h2>
        <p className="font-rajdhani text-gray-400 text-sm mt-1">
          Your choice is recorded on Monad Testnet
        </p>
      </div>

      {/* Display name input */}
      <div className="w-full max-w-md px-4 mb-4">
        <label className="font-pixel text-xs text-monad-purple/80 block mb-2">
          YOUR DISPLAY NAME
        </label>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value.slice(0, 20))}
          className="
            w-full px-3 py-2 rounded-lg
            bg-monad-dark border border-monad-purple/40
            text-white font-rajdhani text-sm
            focus:outline-none focus:border-monad-purple
            placeholder-gray-600
          "
          placeholder="ENTER NAME (max 20 chars)"
          maxLength={20}
        />
      </div>

      {/* Character grid */}
      <div className="
        grid gap-3 px-4 w-full max-w-2xl
        grid-cols-2 sm:grid-cols-3
      ">
        {CHARACTERS.map((character) => {
          const isSelected  = selectedCharacter === character.id;
          const ownsNFT     = ownedNFTs.includes(character.id);
          const isHovered   = hoveredCard === character.id;

          return (
            <button
              key={character.id}
              onClick={() => setCharacter(character.id)}
              onMouseEnter={() => setHoveredCard(character.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`
                relative flex flex-col items-center p-3 rounded-xl
                border-2 transition-all duration-200 cursor-pointer
                ${isSelected
                  ? "border-monad-purple bg-monad-purple/20 shadow-neon_purple"
                  : "border-monad-purple/30 bg-monad-dark/60 hover:border-monad-purple/60 hover:bg-monad-purple/10"
                }
              `}
            >
              {/* NFT badge */}
              {ownsNFT && (
                <div className="absolute top-2 right-2 text-xs bg-monad-neon/20 border border-monad-neon/60 rounded px-1 text-monad-neon">
                  NFT
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-monad-neon animate-pulse" />
              )}

              {/* Character canvas */}
              <div className="h-20 w-16 flex items-center justify-center">
                <CharacterPreview
                  characterId={character.id}
                  isSelected={isSelected || isHovered}
                />
              </div>

              {/* Name */}
              <div
                className="font-pixel text-xs mt-2 text-center leading-tight"
                style={{ color: isSelected ? character.accentColor : "#c4b5fd" }}
              >
                {character.name.replace(" RUNNER", "")}
              </div>

              {/* Power */}
              <div className="
                mt-2 px-2 py-1 rounded border text-center w-full
              "
                style={{
                  borderColor: character.accentColor + "40",
                  backgroundColor: character.accentColor + "15",
                }}
              >
                <div className="font-pixel text-xs" style={{ color: character.accentColor }}>
                  {character.power}
                </div>
              </div>

              {/* Power desc on hover/select */}
              {(isSelected || isHovered) && (
                <div className="mt-2 font-rajdhani text-xs text-gray-400 text-center leading-tight">
                  {character.powerDesc}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected character info */}
      <div className="
        mt-6 mx-4 p-4 max-w-md w-full
        rounded-xl border border-monad-purple/30
        bg-monad-purple/5
      ">
        <div className="font-pixel text-monad-purple text-xs text-center mb-2">
          SELECTED: {char.name}
        </div>
        <div className="flex justify-between font-rajdhani text-sm">
          <span className="text-gray-400">Special Power:</span>
          <span style={{ color: char.accentColor }}>{char.power}</span>
        </div>
        <div className="flex justify-between font-rajdhani text-sm mt-1">
          <span className="text-gray-400">Press:</span>
          <span className="text-monad-neon">SHIFT / Z</span>
        </div>
        <p className="font-rajdhani text-gray-400 text-xs mt-2 text-center">
          {char.powerDesc}
        </p>
      </div>

      {/* Confirm button */}
      <div className="py-6 w-full max-w-md px-4">
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="
            w-full py-4 rounded-xl font-pixel text-sm tracking-widest
            bg-monad-purple text-white
            hover:bg-monad-accent hover:shadow-neon_purple
            transition-all duration-200 cursor-pointer
            disabled:opacity-60 disabled:cursor-not-allowed
            border border-monad-purple
          "
          style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
        >
          {confirming ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⟳</span>
              CONFIRMING ON MONAD...
            </span>
          ) : (
            <span>
              {isConnected ? "⛓ SELECT ON-CHAIN & PLAY" : "▶ PLAY OFFLINE"}
            </span>
          )}
        </button>

        {!isConnected && (
          <p className="font-rajdhani text-gray-500 text-xs text-center mt-2">
            Connect wallet to save progress on-chain
          </p>
        )}
      </div>
    </div>
  );
};
