import React, { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { useContract } from "../hooks/useContract";
import { useLobby }    from "../hooks/useLobby";
import { CHARACTERS } from "../game/characters/drawCharacters";
import { NETWORK_CONFIG } from "../contracts/addresses";

// ─── Performance tier based on score ────────────────────────────────────────
const TIERS = [
  { min: 0,     label: "STREET GOON",       color: "#888",    emoji: "🪣" },
  { min: 500,   label: "LOCAL COUNCILOR",   color: "#a0a0ff", emoji: "📋" },
  { min: 2000,  label: "MLA HOPEFUL",       color: "#7ec8e3", emoji: "🗳️"  },
  { min: 5000,  label: "CABINET MINISTER",  color: "#ffd700", emoji: "💼" },
  { min: 15000, label: "SUPREME NETA",      color: "#ff4fff", emoji: "👑" },
];
function getTier(score: number) {
  return [...TIERS].reverse().find(t => score >= t.min) ?? TIERS[0];
}

// ─── Character-specific verdict lines ───────────────────────────────────────
const VERDICTS: Record<number, (score: number, coins: number) => string> = {
  0: (s, c) => s > 10000 ? `Vikas ho gaya! ${c} bribes collected for infrastructure 🏗️` :
               s > 3000  ? `56 inch chest, still couldn't dodge that obstacle 😤` :
                           `Ache din are coming… just not today 🙏`,
  1: (s, c) => s > 10000 ? `Tremendous run! The best run, maybe ever. ${c} coins, believe me 🇺🇸` :
               s > 3000  ? `Fake obstacles! Very unfair. I demand a recount 📢` :
                           `Nobody runs worse than me. Sad! 😢`,
  2: (s, c) => s > 10000 ? `Pappu proved everyone wrong with ${c} bribes! Bharat Jodo! ✊` :
               s > 3000  ? `Was doing well until… yatras can't dodge everything 🎒` :
                           `Dadi ne kaha tha, sunna chahiye tha 🤦`,
  3: (s, c) => s > 10000 ? `AAP ki sarkar, ${c} coins, free bijli for all! 💡` :
               s > 3000  ? `Muffler got caught in an obstacle. Classic. 🧣` :
                           `Dharma yuddh lost. Dharna time 📣`,
  4: (s, c) => s > 10000 ? `C'mon man! ${c} coins! Not a joke, not a joke! 🕶️` :
               s > 3000  ? `Look here's the deal — I almost made it 🤏` :
                           `I may have forgotten which lane I was in… 😅`,
  5: (s, c) => s > 10000 ? `KGB approved. ${c} bribes processed. Russia strong 🐻` :
               s > 3000  ? `In Russia, obstacle dodges YOU. But not today. 🥃` :
                           `This defeat will be… investigated 🕵️`,
};

// ─── Floating coin component ─────────────────────────────────────────────────
const COIN_STYLES_ID = "__go_coin_styles__";
function injectCoinStyles() {
  if (document.getElementById(COIN_STYLES_ID)) return;
  const s = document.createElement("style");
  s.id = COIN_STYLES_ID;
  s.textContent = `
    @keyframes go-coin-fall {
      0%   { transform: translateY(-60px) rotate(0deg);   opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 0.7; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
    }
    @keyframes go-fade-up {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes go-pop {
      0%   { transform: scale(0.7); opacity: 0; }
      60%  { transform: scale(1.08); }
      100% { transform: scale(1);   opacity: 1; }
    }
    @keyframes go-tier-glow {
      0%,100% { box-shadow: 0 0 8px currentColor; }
      50%      { box-shadow: 0 0 22px currentColor, 0 0 40px currentColor; }
    }
    .go-fade-up  { animation: go-fade-up 0.45s ease forwards; }
    .go-pop      { animation: go-pop     0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
  `;
  document.head.appendChild(s);
}

const COIN_EMOJIS = ["💰","💵","🪙","💸","💴","🤑"];
interface CoinParticle { id: number; left: number; delay: number; dur: number; emoji: string; size: number; }
function makeCoinParticles(n: number): CoinParticle[] {
  return Array.from({ length: n }, (_, i) => ({
    id:    i,
    left:  Math.random() * 100,
    delay: Math.random() * 3,
    dur:   2.5 + Math.random() * 2.5,
    emoji: COIN_EMOJIS[Math.floor(Math.random() * COIN_EMOJIS.length)],
    size:  0.9 + Math.random() * 0.8,
  }));
}

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
  const [coins_]                            = useState(() => makeCoinParticles(18));

  useEffect(() => { injectCoinStyles(); }, []);

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

  const char      = CHARACTERS[selectedCharacter];
  const tier      = getTier(Math.floor(score));
  const verdict   = VERDICTS[selectedCharacter]?.(Math.floor(score), coins) ?? "";
  const isHighScore = score >= highScore && score > 0;
  const bribesPerRun = coins > 0 && score > 0 ? (score / coins).toFixed(1) : "—";

  const recentTxs = txRecords.filter((r) => r.type === "score").slice(-4);

  useEffect(() => {
    if (walletAddress) {
      fetchPlayerRank(walletAddress).then((r) => { if (r !== null) setRank(r); });
    }
  }, [walletAddress, fetchPlayerRank]);

  return (
    <div
      className="w-full h-full flex flex-col items-center bg-monad-dark bg-opacity-95 px-4 overflow-y-auto"
      style={{ fontFamily: "'Press Start 2P', monospace", paddingBottom: "2rem", position: "relative" }}
    >
      {/* ── Coin rain background ── */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        {coins_.map(p => (
          <span
            key={p.id}
            style={{
              position:        "absolute",
              left:            `${p.left}%`,
              top:             0,
              fontSize:        `${p.size}rem`,
              animation:       `go-coin-fall ${p.dur}s ${p.delay}s linear infinite`,
              opacity:         0,
              userSelect:      "none",
            }}
          >{p.emoji}</span>
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "28rem", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "1.5rem" }}>

        {/* ── GAME OVER title ── */}
        <div className="go-pop" style={{ textAlign: "center", marginBottom: "0.25rem" }}>
          <div style={{ fontSize: "clamp(1.4rem,6vw,2rem)", color: "#ff0080", textShadow: "0 0 30px #ff0080, 0 0 60px #ff0080" }}>
            GAME OVER
          </div>
          {isHighScore && (
            <div className="animate-bounce" style={{ color: "#ffd700", fontSize: "0.6rem", marginTop: "0.3rem", textShadow: "0 0 10px #ffd700" }}>
              ★ NEW HIGH SCORE! ★
            </div>
          )}
        </div>

        {/* ── Performance tier badge ── */}
        <div
          className="go-pop"
          style={{
            marginTop: "0.75rem", marginBottom: "0.5rem",
            padding: "0.4rem 1.2rem",
            borderRadius: "999px",
            border: `2px solid ${tier.color}`,
            background: `${tier.color}22`,
            color: tier.color,
            fontSize: "0.55rem",
            letterSpacing: "0.15em",
            display: "flex", alignItems: "center", gap: "0.5rem",
            animationDelay: "0.1s",
          }}
        >
          <span style={{ fontSize: "1rem" }}>{tier.emoji}</span>
          {tier.label}
        </div>

        {/* ── Character verdict ── */}
        <div
          className="go-fade-up"
          style={{
            width: "100%",
            marginBottom: "0.75rem",
            padding: "0.6rem 0.9rem",
            borderRadius: "8px",
            background: `${char.accentColor}18`,
            border: `1px solid ${char.accentColor}55`,
            animationDelay: "0.15s",
          }}
        >
          <div style={{ fontSize: "0.38rem", color: char.accentColor, letterSpacing: "0.2em", marginBottom: "0.35rem" }}>
            {char.name} VERDICT
          </div>
          <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.95rem", color: "#e9d5ff", lineHeight: 1.5, fontWeight: 600 }}>
            {verdict}
          </div>
        </div>

        {/* ── Stats card ── */}
        <div
          className="go-fade-up"
          style={{
            width: "100%",
            borderRadius: "12px",
            border: "1px solid rgba(131,110,249,0.35)",
            background: "rgba(131,110,249,0.08)",
            padding: "1rem",
            display: "flex", flexDirection: "column", gap: "0.65rem",
            animationDelay: "0.2s",
          }}
        >
          <StatRow label="FINAL SCORE"      value={Math.floor(score).toLocaleString()}                                       color="#39ff14" />
          <StatRow label="BRIBE COINS"      value={`💰 ${coins}`}                                                            color="#ffd700" />
          <StatRow label="HIGH SCORE"       value={Math.floor(Math.max(score, highScore)).toLocaleString() || "—"}           color="#836EF9" />
          <StatRow label="SCORE / COIN"     value={bribesPerRun}                                                             color={char.accentColor} />
          {rank !== null && (
            <StatRow label="LEADERBOARD"    value={`# ${rank}`}                                                              color="#ff4fff" />
          )}

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(131,110,249,0.2)", paddingTop: "0.5rem" }}>
            <div style={{ fontSize: "0.4rem", color: "rgba(131,110,249,0.6)", letterSpacing: "0.2em", marginBottom: "0.5rem" }}>
              SPECIAL POWER
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{
                padding: "0.3rem 0.6rem", borderRadius: "6px",
                background: `${char.accentColor}22`, border: `1px solid ${char.accentColor}66`,
                fontSize: "0.45rem", color: char.accentColor, letterSpacing: "0.1em", flexShrink: 0,
              }}>
                {char.power}
              </div>
              <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: "rgba(196,181,253,0.75)", lineHeight: 1.4 }}>
                {char.powerDesc}
              </div>
            </div>
          </div>
        </div>

        {/* ── Record on-chain ── */}
        {walletAddress && (
          <div className="go-fade-up" style={{ width: "100%", marginTop: "0.75rem", animationDelay: "0.25s" }}>
            {!scoreRecorded ? (
              <button
                disabled={recording}
                onClick={handleRecordScore}
                style={{
                  width: "100%", padding: "0.85rem",
                  borderRadius: "10px",
                  border: "2px solid rgba(131,110,249,0.6)",
                  background: recording ? "rgba(131,110,249,0.1)" : "rgba(131,110,249,0.15)",
                  color: recording ? "rgba(131,110,249,0.4)" : "#836EF9",
                  fontFamily: "'Press Start 2P',monospace", fontSize: "0.6rem",
                  letterSpacing: "0.08em", cursor: recording ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {recording ? "⏳ RECORDING..." : "⚡ RECORD SCORE ON-CHAIN"}
              </button>
            ) : (
              <div style={{
                width: "100%", padding: "0.85rem", borderRadius: "10px", textAlign: "center",
                background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.4)",
                color: "#39ff14", fontSize: "0.55rem", letterSpacing: "0.07em",
              }}>
                ✅ SCORE RECORDED
                {rank !== null && <span style={{ color: "#836EF9", marginLeft: "0.5rem" }}>· RANK #{rank}</span>}
              </div>
            )}
            {loading && (
              <div style={{ textAlign: "center", color: "rgba(131,110,249,0.5)", fontSize: "0.4rem", marginTop: "0.3rem" }}
                className="animate-pulse">
                Fetching rank...
              </div>
            )}
          </div>
        )}

        {/* ── TX receipts ── */}
        {recentTxs.length > 0 && (
          <div className="go-fade-up" style={{ width: "100%", marginTop: "0.75rem", animationDelay: "0.3s" }}>
            <div style={{ fontSize: "0.38rem", color: "rgba(131,110,249,0.5)", letterSpacing: "0.2em", marginBottom: "0.4rem" }}>
              ON-CHAIN RECEIPTS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {recentTxs.map((tx) => (
                <div key={tx.hash} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderRadius: "8px", background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(131,110,249,0.2)", padding: "0.45rem 0.75rem",
                }}>
                  <a
                    href={`${NETWORK_CONFIG.explorer}/tx/${tx.hash}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: "rgba(57,255,20,0.6)", fontSize: "0.38rem", textDecoration: "none" }}
                  >
                    {tx.hash.slice(0, 12)}…{tx.hash.slice(-6)}
                  </a>
                  {tx.confirmMs !== undefined && (
                    <span style={{ color: "#39ff14", fontSize: "0.4rem" }}>{tx.confirmMs}ms ⚡</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Lobby Section ── */}
        {activeLobbyCode && (
          <div
            className="go-fade-up"
            style={{
              width: "100%", marginTop: "0.75rem", borderRadius: "12px", overflow: "hidden",
              border: lobbySettled
                ? (lobbyWinner && walletAddress && lobbyWinner.toLowerCase() === walletAddress.toLowerCase()
                    ? "1px solid rgba(57,255,20,0.5)" : "1px solid rgba(255,0,128,0.4)")
                : "1px solid rgba(255,215,0,0.5)",
              background: "rgba(0,0,0,0.4)",
              animationDelay: "0.3s",
            }}
          >
            <div style={{ background: "rgba(255,215,0,0.1)", borderBottom: "1px solid rgba(255,215,0,0.3)", padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.45rem", color: "#ffd700" }}>⚔ LOBBY GAME</span>
              <span style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: "rgba(255,215,0,0.7)", letterSpacing: "0.15em" }}>{activeLobbyCode}</span>
            </div>
            <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {!lobbySettled && !lobbySubmitted && (
                <>
                  <p style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.9rem", color: "rgba(196,181,253,0.8)", margin: 0, lineHeight: 1.5 }}>
                    Submit your score of <strong style={{ color: "#39ff14" }}>{Math.floor(score).toLocaleString()}</strong> to the lobby.
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
                      padding: "0.75rem", borderRadius: "8px",
                      border: "2px solid #ffd700", background: "rgba(255,215,0,0.15)",
                      color: "#ffd700", fontFamily: "'Press Start 2P',monospace", fontSize: "0.5rem",
                      cursor: lobbySubmitting ? "not-allowed" : "pointer", opacity: lobbySubmitting ? 0.6 : 1,
                    }}
                  >
                    {lobbySubmitting ? "SUBMITTING..." : "⚡ SUBMIT SCORE TO LOBBY"}
                  </button>
                </>
              )}
              {lobbySubmitted && !lobbySettled && (
                <p style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.9rem", color: "#39ff14", margin: 0 }}>
                  ✅ Score submitted! Waiting for opponent...
                </p>
              )}
              {lobbySettled && (() => {
                const isWinner = lobbyWinner && walletAddress && lobbyWinner.toLowerCase() === walletAddress.toLowerCase();
                const isTie    = !lobbyWinner || lobbyWinner === "0x0000000000000000000000000000000000000000";
                return (
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: "0.7rem",
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
                          padding: "0.6rem 1.2rem", borderRadius: "8px",
                          border: "1px solid #39ff14", background: "rgba(57,255,20,0.15)",
                          color: "#39ff14", fontFamily: "'Press Start 2P',monospace",
                          fontSize: "0.45rem", cursor: "pointer",
                        }}
                      >
                        💰 CLAIM {parseFloat(pendingClaim).toFixed(4)} MON
                      </button>
                    )}
                  </div>
                );
              })()}
              <button
                onClick={() => setScreen("lobby")}
                style={{
                  padding: "0.5rem", borderRadius: "6px",
                  border: "1px solid rgba(131,110,249,0.3)", background: "transparent",
                  color: "rgba(131,110,249,0.7)", fontFamily: "'Press Start 2P',monospace",
                  fontSize: "0.4rem", cursor: "pointer",
                }}
              >
                VIEW LOBBY STATUS →
              </button>
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="go-fade-up" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.65rem", marginTop: "1rem", animationDelay: "0.35s" }}>
          <button
            onClick={() => setScreen("game")}
            style={{
              padding: "1rem", borderRadius: "12px",
              border: "2px solid #836EF9", background: "#836EF9",
              color: "#fff", fontFamily: "'Press Start 2P',monospace",
              fontSize: "0.75rem", letterSpacing: "0.1em", cursor: "pointer",
              textShadow: "0 0 10px rgba(255,255,255,0.4)",
              transition: "all 0.2s",
            }}
          >
            ▶ PLAY AGAIN
          </button>
          <button
            onClick={() => setScreen("leaderboard")}
            style={{
              padding: "0.75rem", borderRadius: "12px",
              border: "1px solid rgba(131,110,249,0.45)", background: "transparent",
              color: "rgba(131,110,249,0.85)", fontFamily: "'Press Start 2P',monospace",
              fontSize: "0.65rem", letterSpacing: "0.1em", cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            ◈ LEADERBOARD
          </button>
          <button
            onClick={() => setScreen("menu")}
            style={{
              padding: "0.65rem", borderRadius: "12px",
              border: "1px solid rgba(100,100,100,0.3)", background: "transparent",
              color: "rgba(130,130,130,0.7)", fontFamily: "'Press Start 2P',monospace",
              fontSize: "0.55rem", cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            ← MAIN MENU
          </button>
        </div>

      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <span style={{ color: "rgba(156,163,175,1)", fontSize: "0.45rem", letterSpacing: "0.12em" }}>{label}</span>
    <span style={{ color, fontSize: "0.65rem", textShadow: `0 0 8px ${color}60` }}>{value}</span>
  </div>
);
