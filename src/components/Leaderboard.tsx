import React, { useEffect, useState, useCallback } from "react";
import { useGameStore } from "../store/gameStore";
import { useContract } from "../hooks/useContract";
import { NETWORK_CONFIG } from "../contracts/addresses";

const truncateAddr = (addr: string) =>
  addr.length >= 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

export const Leaderboard: React.FC = () => {
  const { leaderboard, walletAddress, setScreen, setLeaderboard } = useGameStore();
  const { fetchLeaderboard, fetchPlayerRank }      = useContract();
  const [loading, setLoading]  = useState(true);
  const [rank, setRank] = useState<number | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await fetchLeaderboard();
      if (entries.length > 0) {
        let myRank = 0;
        if (walletAddress) {
          const r = await fetchPlayerRank(walletAddress);
          myRank = r;
          setRank(r > 0 ? r : null);
        }
        setLeaderboard(entries, myRank);
      }
    } finally {
      setLoading(false);
      setLastFetch(Date.now());
    }
  }, [fetchLeaderboard, fetchPlayerRank, walletAddress, setLeaderboard]);

  useEffect(() => { load(); }, [load]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div
      className="
        w-full h-full flex flex-col items-center
        bg-monad-dark overflow-y-auto px-4
      "
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between pt-8 pb-4 max-w-lg">
        <button
          onClick={() => setScreen("menu")}
          className="text-monad-purple/60 hover:text-monad-purple text-xs cursor-pointer pointer-events-auto"
        >
          ← BACK
        </button>
        <h2
          className="text-monad-purple text-base tracking-widest"
          style={{ textShadow: "0 0 20px #836EF9" }}
        >
          LEADERBOARD
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="text-monad-neon/60 hover:text-monad-neon text-xs cursor-pointer pointer-events-auto disabled:opacity-40"
        >
          {loading ? "..." : "↺"}
        </button>
      </div>

      {/* Sub-heading */}
      <p className="font-rajdhani text-gray-500 text-sm mb-4 text-center">
        On-chain scores from Monad Testnet
      </p>

      {/* Player rank banner */}
      {!loading && walletAddress && rank !== null && (
        <div className="
          w-full max-w-lg mb-4 px-4 py-3 rounded-xl
          border border-monad-neon/30 bg-monad-neon/5
          flex items-center justify-between
        ">
          <span className="text-monad-neon/80 text-xs">YOUR RANK</span>
          <span
            className="text-monad-neon text-lg"
            style={{ textShadow: "0 0 12px #39ff14" }}
          >
            #{rank}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="w-full max-w-lg flex flex-col gap-2">
        {loading && (
          <div className="text-center text-monad-purple/50 text-xs animate-pulse py-10">
            Fetching chain data...
          </div>
        )}

        {!loading && leaderboard.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-10">
            No scores yet. Be the first!
          </div>
        )}

        {!loading && leaderboard.map((entry, idx) => {
          const isMe = walletAddress &&
            entry.address.toLowerCase() === walletAddress.toLowerCase();

          return (
            <div
              key={entry.address + idx}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl border
                transition-all duration-200
                ${isMe
                  ? "border-monad-neon/50 bg-monad-neon/5"
                  : "border-monad-purple/20 bg-monad-dark/60"
                }
              `}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                {idx < 3
                  ? <span className="text-lg">{medals[idx]}</span>
                  : <span className="font-pixel text-xs text-gray-500">#{idx + 1}</span>
                }
              </div>

              {/* Name / address */}
              <div className="flex-1 min-w-0">
                <div className={`font-pixel text-xs truncate ${isMe ? "text-monad-neon" : "text-white"}`}>
                  {entry.displayName || truncateAddr(entry.address)}
                </div>
                <a
                  href={`${NETWORK_CONFIG.explorer}/address/${entry.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-rajdhani text-xs text-gray-600 hover:text-monad-purple pointer-events-auto"
                >
                  {truncateAddr(entry.address)}
                </a>
              </div>

              {/* Score */}
              <div className="flex flex-col items-end">
                <span
                  className="font-pixel text-sm"
                  style={{
                    color:      idx === 0 ? "#ffd700" : idx === 1 ? "#c0c0c0" : idx === 2 ? "#cd7f32" : "#39ff14",
                    textShadow: idx < 3 ? "0 0 8px currentColor" : undefined,
                  }}
                >
                  {Number(entry.score).toLocaleString()}
                </span>
                {entry.timestamp && entry.timestamp > 0 && (
                  <span className="font-rajdhani text-xs text-gray-600">
                    {new Date(entry.timestamp * 1000).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Last fetch notice */}
      {lastFetch && (
        <div className="py-4 font-rajdhani text-xs text-gray-700">
          Last updated: {new Date(lastFetch).toLocaleTimeString()} — live on-chain ⛓
        </div>
      )}

      {/* CTA */}
      <div className="py-6 w-full max-w-lg">
        <button
          onClick={() => setScreen("character_select")}
          className="
            w-full py-4 rounded-xl font-pixel text-sm tracking-widest text-white
            bg-monad-purple border border-monad-purple
            hover:bg-monad-accent hover:shadow-neon_purple
            transition-all duration-200 cursor-pointer pointer-events-auto
          "
        >
          ▶ PLAY NOW
        </button>
      </div>
    </div>
  );
};
