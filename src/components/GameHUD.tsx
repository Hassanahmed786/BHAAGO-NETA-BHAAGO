import React from "react";
import { useGameStore } from "../store/gameStore";
import { CHARACTERS } from "../game/characters/drawCharacters";
import { WalletButton } from "./WalletButton";

const formatScore = (n: number) => Math.floor(n).toString().padStart(8, "0");
const formatCoins = (n: number) => n.toString().padStart(4, "0");

export const GameHUD: React.FC = () => {
  const {
    currentScore:  score,
    currentCoins:  coins,
    currentMultiplier: multiplier,
    currentSpeed:  speed,
    highScore,
    selectedCharacter,
    avgConfirmMs,
  } = useGameStore();

  const char = CHARACTERS[selectedCharacter];

  // Average TX confirm time from recent records
  const avgMs = avgConfirmMs > 0 ? avgConfirmMs : null;

  // Power bar progress (placeholder — real value comes from GameEngine via store)
  // We'll pulse based on score for visual effect
  const powerPct = Math.min(100, ((score % 5000) / 5000) * 100);

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      {/* ===== TOP BAR ===== */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-4 pt-3 pb-2"
        style={{ background: "linear-gradient(to bottom, rgba(14,11,30,0.85) 0%, transparent 100%)" }}>

        {/* --- LEFT: Score + Multiplier --- */}
        <div className="flex flex-col gap-1">
          <div
            className="text-monad-neon text-sm tracking-widest"
            style={{ textShadow: "0 0 12px #39ff14" }}
          >
            {formatScore(score)}
          </div>
          {highScore > 0 && (
            <div className="text-yellow-400/60 text-xs">
              HI {formatScore(Math.max(score, highScore))}
            </div>
          )}
          {multiplier > 1 && (
            <div
              className="text-monad-danger text-xs animate-pulse"
              style={{ textShadow: "0 0 8px #ff0080" }}
            >
              ×{multiplier.toFixed(1)}
            </div>
          )}
        </div>

        {/* --- CENTER: Monad live badge --- */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-monad-neon animate-ping" />
            <span className="text-monad-purple text-xs tracking-wider">MONAD TESTNET</span>
            <div className="w-2 h-2 rounded-full bg-monad-neon animate-ping" />
          </div>
          {avgMs !== null && (
            <div className="text-monad-neon/70 text-xs font-rajdhani">
              avg {avgMs}ms confirm
            </div>
          )}
        </div>

        {/* --- RIGHT: Coins + wallet (pointer-events back on) --- */}
        <div className="flex flex-col items-end gap-1 pointer-events-auto">
          <div
            className="text-yellow-400 text-sm"
            style={{ textShadow: "0 0 10px #ffd700" }}
          >
            ¢ {formatCoins(coins)}
          </div>
          <WalletButton />
        </div>
      </div>

      {/* ===== SPEED INDICATOR (right edge) ===== */}
      <div className="absolute right-3 top-20 flex flex-col items-center gap-1">
        <div className="text-monad-purple/50 text-xs"
          style={{ writingMode: "vertical-rl", letterSpacing: "0.2em" }}>
          SPD
        </div>
        <div
          className="w-2 rounded-full bg-gradient-to-t from-monad-purple to-monad-neon"
          style={{ height: `${Math.min(120, speed * 6)}px`, transition: "height 0.2s ease" }}
        />
        <div className="text-monad-neon/60 text-xs">
          {Math.round(speed)}
        </div>
      </div>

      {/* ===== POWER BAR (bottom centre) ===== */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 w-56">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs tracking-widest" style={{ color: char.accentColor }}>
            {char.power.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">SHIFT</span>
        </div>
        <div className="w-full h-3 rounded-full bg-black/60 border border-monad-purple/30 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width:      `${powerPct}%`,
              background: `linear-gradient(90deg, ${char.accentColor}80, ${char.accentColor})`,
              boxShadow:  `0 0 8px ${char.accentColor}`,
            }}
          />
        </div>
      </div>

      {/* ===== CHARACTER NAME (bottom left) ===== */}
      <div className="absolute bottom-8 left-4">
        <div className="text-xs tracking-widest" style={{ color: char.accentColor + "aa" }}>
          {char.name}
        </div>
      </div>
    </div>
  );
};
