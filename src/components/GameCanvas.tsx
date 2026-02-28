import React, { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { GameEngine } from "../game/GameEngine";
import { ObstacleType } from "../game/Obstacle";
import { CharacterId }  from "../game/characters/drawCharacters";
import { DeathQuip }    from "./DeathQuip";

interface KillerInfo { type: ObstacleType; charId: CharacterId; }

export const GameCanvas: React.FC = () => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const engineRef  = useRef<GameEngine | null>(null);
  const [killerInfo, setKillerInfo] = useState<KillerInfo | null>(null);

  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending skip timer on unmount
  useEffect(() => () => { if (skipTimerRef.current) clearTimeout(skipTimerRef.current); }, []);

  function goToGameOver() {
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    setScreen("game_over");
  }

  const {
    selectedCharacter,
    setScreen,
    setGameStats,
    setHighScore,
  } = useGameStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setKillerInfo(null); // clear on (re)mount

    // Make canvas fill its container
    const resize = () => {
      canvas.width  = canvas.parentElement?.clientWidth  ?? window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight ?? window.innerHeight;
      engineRef.current?.resize();
    };
    resize();
    window.addEventListener("resize", resize);

    // Create engine
    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    // Wire callbacks
    engine.onScoreUpdate = (stats) => {
      setGameStats(stats.score, stats.coins, stats.multiplier, stats.gameSpeed);
      if (stats.highScore > 0) setHighScore(stats.highScore);
    };

    // Coins are accumulated locally and submitted as totalCoins inside onGameOver.
    // Never fire per-coin transactions during active gameplay — it blocks the game
    // with wallet popups and would spam the chain. Monad settles on game-over only.
    engine.onCoinBatch = (_count) => { /* local state only — see setGameStats */ };

    // Called immediately on collision — show quip while death animation plays
    engine.onDeath = (killerType: ObstacleType, charId: CharacterId) => {
      setKillerInfo({ type: killerType, charId });
    };

    engine.onGameOver = (score, coins) => {
      // Lock final score into store so GameOver screen can read it.
      // Blockchain submission is user-initiated from the Game Over screen —
      // never auto-fire txns here to avoid mid-game wallet popups.
      setGameStats(score, coins, 1, 0);

      // Give player ~9s to read the death quip, then go to game-over screen
      skipTimerRef.current = setTimeout(() => setScreen("game_over"), 9000);
    };

    engine.onPowerUsed = (_name) => {
      // Could fire TX; kept opt-in to avoid spam
    };

    // Init with selected character then start
    engine.init(selectedCharacter);
    engine.start();

    return () => {
      window.removeEventListener("resize", resize);
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", background: "#0e0b1e", touchAction: "none" }}
      />
      {killerInfo && (
        <DeathQuip killerType={killerInfo.type} characterId={killerInfo.charId} onSkip={goToGameOver} />
      )}
    </>
  );
};
