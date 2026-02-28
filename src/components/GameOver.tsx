import React, { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { useContract } from "../hooks/useContract";
import { useLobby }    from "../hooks/useLobby";
import { CHARACTERS } from "../game/characters/drawCharacters";
import { NETWORK_CONFIG } from "../contracts/addresses";

export const GameOver: React.FC = () => {
  const {
    currentScore:  score,
    currentCoins:  coins,
    highScore,
    selectedCharacter,
    walletAddress,
    txRecords,
    setScreen,
    setPlayerStats,
    activeLobbyCode,
    lobbySettled,
    lobbyWinner,
    pendingClaim,
  } = useGameStore();

  const { fetchPlayerRank, fetchLeaderboard, submitScore, updateLeaderboard, fetchPlayerStats } = useContract();
  const { submitLobbyScore, claimWinnings }   = useLobby();
  const [rank, setRank]               = useState<number | null>(null);
  const [loading, setLoading]         = useState(false);
  const [recording,      setRecording]      = useState(false);
  const [scoreRecorded,  setScoreRecorded]  = useState(false);
  const [lobbySubmitting, setLobbySubmitting] = useState(false);
  const [lobbySubmitted,  setLobbySubmitted ] = useState(false);

  // Handler: user explicitly submits score on-chain (no auto-fire during gameplay)
  const handleRecordScore = async () => {
    if (!walletAddress) return;
    setRecording(true);
    try {
      await submitScore(score, coins);
      await updateLeaderboard(score);
      const stats = await fetchPlayerStats(walletAddress);
      if (stats) setPlayerStats(stats.totalCoins, stats.gamesPlayed);
      setLoading(true);
      const r = await fetchPlayerRank(walletAddress);
      if (r !== null) setRank(r);
      await fetchLeaderboard();
      setScoreRecorded(true);
    } finally {
      setRecording(false);
      setLoading(false);
    }
  };

  const char = CHARACTERS[selectedCharacter];

  // Recent TXs for this session (score submissions)
  const recentTxs = txRecords
    .filter((r) => r.type === "score")
    .slice(-4);

  useEffect(() => {
    // Read-only: fetch rank if already recorded in a previous session
    if (walletAddress) {
      fetchPlayerRank(walletAddress).then((r) => { if (r !== null) setRank(r); });
    }
  }, [walletAddress, fetchPlayerRank]);

  const isHighScore = score >= highScore && score > 0;

  return (
    <div
      className="
        w-full h-full flex flex-col items-center justify-center
        bg-monad-dark bg-opacity-95 px-6 overflow-y-auto
      "
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      {/* ---- Title ---- */}
      <div
        className="text-2xl text-monad-danger mb-1"
        style={{ textShadow: "0 0 30px #ff0080, 0 0 60px #ff0080" }}
      >
        GAME OVER
      </div>
      {isHighScore && (
        <div
          className="text-monad-gold text-xs animate-bounce mb-2"
          style={{ textShadow: "0 0 10px #ffd700" }}
        >
          ★ NEW HIGH SCORE! ★
        </div>
      )}

      {/* ---- Stats card ---- */}
      <div className="
        mt-4 w-full max-w-sm rounded-xl border border-monad-purple/40
        bg-monad-purple/10 p-5 flex flex-col gap-3
      ">
        <StatRow
          label="FINAL SCORE"
          value={Math.floor(score).toLocaleString()}
          color="#39ff14"
        />
        <StatRow
          label="COINS"
          value={coins.toString()}
          color="#ffd700"
        />
        <StatRow
          label="HIGH SCORE"
          value={Math.max(score, highScore) ? Math.floor(Math.max(score, highScore)).toLocaleString() : "—"}
          color="#836EF9"
        />
        {rank !== null && (
          <StatRow
            label="LEADERBOARD RANK"
            value={`#${rank}`}
            color={char.accentColor}
          />
        )}
        {loading && (
          <div className="text-center text-monad-purple/50 text-xs animate-pulse">
            Fetching on-chain rank...
          </div>
        )}
      </div>

      {/* ---- Record on-chain (explicit, user-initiated) ---- */}
      {walletAddress && (
        <div className="mt-4 w-full max-w-sm">
          {!scoreRecorded ? (
            <button
              disabled={recording}
              onClick={handleRecordScore}
              className="w-full py-3 rounded-xl font-pixel text-xs tracking-widest transition-all duration-200 cursor-pointer"
              style={{
                background: recording ? "rgba(131,110,249,0.2)" : "rgba(131,110,249,0.15)",
                border: "2px solid rgba(131,110,249,0.6)",
                color: recording ? "rgba(131,110,249,0.5)" : "#836EF9",
                cursor: recording ? "not-allowed" : "pointer",
              }}
            >
              {recording ? "⏳ RECORDING..." : "⚡ RECORD SCORE ON-CHAIN"}
            </button>
          ) : (
            <div
              className="w-full py-3 rounded-xl text-center font-pixel text-xs tracking-widest"
              style={{ background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.4)", color: "#39ff14" }}
            >
              ✅ SCORE RECORDED ON-CHAIN
              {rank !== null && <span className="ml-2 text-monad-purple">· RANK #{rank}</span>}
            </div>
          )}
          {loading && (
            <div className="text-center text-monad-purple/50 text-xs animate-pulse mt-1">
              Fetching rank...
            </div>
          )}
        </div>
      )}

      {/* ---- TX receipts ---- */}
      {recentTxs.length > 0 && (
        <div className="mt-4 w-full max-w-sm">
          <div className="text-monad-purple/60 text-xs mb-2 tracking-wider">
            ON-CHAIN RECEIPTS
          </div>
          <div className="flex flex-col gap-2">
            {recentTxs.map((tx) => (
              <div
                key={tx.hash}
                className="flex items-center justify-between rounded-lg bg-black/40 border border-monad-purple/20 px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-monad-purple/80 text-xs uppercase tracking-wide">
                    {tx.type}
                  </span>
                  <a
                    href={`${NETWORK_CONFIG.explorer}/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-monad-neon/60 text-xs break-all hover:text-monad-neon pointer-events-auto"
                  >
                    {tx.hash.slice(0, 12)}…{tx.hash.slice(-6)}
                  </a>
                </div>
                {tx.confirmMs !== undefined && (
                  <div className="flex flex-col items-end">
                    <span className="text-monad-neon text-xs">{tx.confirmMs}ms</span>
                    <span className="text-gray-500 text-xs">Monad ⚡</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Lobby Section ---- */}
      {activeLobbyCode && (
        <div
          className="mt-4 w-full max-w-sm rounded-xl overflow-hidden"
          style={{
            border: lobbySettled
              ? (lobbyWinner && walletAddress && lobbyWinner.toLowerCase() === walletAddress.toLowerCase()
                  ? "1px solid rgba(57,255,20,0.5)"
                  : "1px solid rgba(255,0,128,0.4)")
              : "1px solid rgba(255,215,0,0.5)",
            background: "rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="px-4 py-2 flex items-center gap-2"
            style={{
              background: "rgba(255,215,0,0.1)",
              borderBottom: "1px solid rgba(255,215,0,0.3)",
            }}
          >
            <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "0.45rem", color: "#ffd700" }}>
              ⚔ LOBBY GAME
            </span>
            <span style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: "rgba(255,215,0,0.7)", letterSpacing: "0.15em" }}>
              {activeLobbyCode}
            </span>
          </div>

          <div className="p-4 flex flex-col gap-3">
            {!lobbySettled && !lobbySubmitted && (
              <>
                <p style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.85rem", color: "rgba(196,181,253,0.8)", margin: 0, lineHeight: 1.5 }}>
                  Submit your score of <strong style={{ color: "#39ff14" }}>{Math.floor(score).toLocaleString()}</strong> to the lobby.
                  If your opponent already submitted, results will be revealed immediately.
                </p>
                <button
                  disabled={lobbySubmitting}
                  onClick={async () => {
                    setLobbySubmitting(true);
                    try {
                      const ok = await submitLobbyScore(activeLobbyCode, Math.floor(score));
                      if (ok) setLobbySubmitted(true);
                    } finally { setLobbySubmitting(false); }
                  }}
                  style={{
                    padding: "0.75rem", borderRadius: "0.5rem",
                    border: "2px solid #ffd700", background: "rgba(255,215,0,0.15)",
                    color: "#ffd700",
                    fontFamily: "'Press Start 2P',monospace", fontSize: "0.5rem",
                    cursor: lobbySubmitting ? "not-allowed" : "pointer",
                    letterSpacing: "0.06em",
                    opacity: lobbySubmitting ? 0.6 : 1,
                  }}
                >
                  {lobbySubmitting ? "SUBMITTING..." : "⚡ SUBMIT SCORE TO LOBBY"}
                </button>
              </>
            )}

            {lobbySubmitted && !lobbySettled && (
              <p style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.85rem", color: "#39ff14", margin: 0 }}>
                ✅ Score submitted! Waiting for opponent...
              </p>
            )}

            {lobbySettled && (
              <div style={{ textAlign: "center" }}>
                {(() => {
                  const isWinner = lobbyWinner && walletAddress &&
                    lobbyWinner.toLowerCase() === walletAddress.toLowerCase();
                  const isTie = !lobbyWinner || lobbyWinner === "0x0000000000000000000000000000000000000000";
                  return (
                    <>
                      <div style={{
                        fontFamily: "'Press Start 2P',monospace", fontSize: "0.7rem",
                        color: isTie ? "#ffa500" : isWinner ? "#39ff14" : "#ff0080",
                        textShadow: `0 0 10px ${isTie ? "#ffa500" : isWinner ? "#39ff14" : "#ff0080"}`,
                        marginBottom: "0.5rem",
                      }}>
                        {isTie ? "🤝 TIE GAME!" : isWinner ? "🏆 YOU WIN!" : "💀 YOU LOST"}
                      </div>
                      {parseFloat(pendingClaim) > 0 && (
                        <button
                          onClick={async () => { await claimWinnings(); }}
                          style={{
                            padding: "0.6rem 1rem", borderRadius: "0.5rem",
                            border: "1px solid #39ff14", background: "rgba(57,255,20,0.15)",
                            color: "#39ff14", fontFamily: "'Press Start 2P',monospace",
                            fontSize: "0.45rem", cursor: "pointer",
                          }}
                        >
                          💰 CLAIM {parseFloat(pendingClaim).toFixed(4)} MON
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <button
              onClick={() => setScreen("lobby")}
              style={{
                padding: "0.5rem", borderRadius: "0.5rem",
                border: "1px solid rgba(131,110,249,0.3)",
                background: "transparent", color: "rgba(131,110,249,0.7)",
                fontFamily: "'Press Start 2P',monospace", fontSize: "0.4rem",
                cursor: "pointer",
              }}
            >
              VIEW LOBBY STATUS →
            </button>
          </div>
        </div>
      )}

      {/* ---- Action buttons ---- */}
      <div className="mt-6 w-full max-w-sm flex flex-col gap-3">
        <button
          onClick={() => setScreen("game")}
          className="
            py-4 rounded-xl font-pixel text-sm tracking-widest text-white
            bg-monad-purple border border-monad-purple
            hover:bg-monad-accent hover:shadow-neon_purple
            transition-all duration-200 cursor-pointer
          "
          style={{ textShadow: "0 0 10px rgba(255,255,255,0.4)" }}
        >
          ▶ PLAY AGAIN
        </button>

        <button
          onClick={() => setScreen("leaderboard")}
          className="
            py-3 rounded-xl font-pixel text-sm tracking-widest
            border border-monad-purple/40
            text-monad-purple/80 hover:text-monad-purple
            hover:border-monad-purple/80 bg-transparent
            transition-all duration-200 cursor-pointer
          "
        >
          ◈ LEADERBOARD
        </button>

        <button
          onClick={() => setScreen("menu")}
          className="
            py-3 rounded-xl font-pixel text-xs tracking-widest
            border border-gray-700/40
            text-gray-500 hover:text-gray-400
            transition-all duration-200 cursor-pointer
          "
        >
          ← MAIN MENU
        </button>
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string; color: string }> = ({
  label, value, color,
}) => (
  <div className="flex items-center justify-between">
    <span className="font-pixel text-gray-400 text-xs">{label}</span>
    <span
      className="font-pixel text-sm"
      style={{ color, textShadow: `0 0 8px ${color}60` }}
    >
      {value}
    </span>
  </div>
);
