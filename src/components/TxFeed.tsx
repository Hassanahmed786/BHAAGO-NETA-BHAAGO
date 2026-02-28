import React from "react";
import { useGameStore } from "../store/gameStore";
import { NETWORK_CONFIG } from "../contracts/addresses";

function truncateHash(hash: string): string {
  if (hash.startsWith("pending_")) return "Pending...";
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

const STATUS_ICONS: Record<string, string> = {
  pending:   "⏳",
  confirmed: "✅",
  failed:    "❌",
};
const TYPE_LABELS: Record<string, string> = {
  coin:      "💰 Coins",
  score:     "🏆 Score",
  character: "🧑 Char",
  nft:       "🎨 NFT",
};

export const TxFeed: React.FC = () => {
  const { txRecords, avgConfirmMs } = useGameStore();
  const recent = txRecords.slice(0, 3);

  return (
    <div className="
      fixed bottom-4 right-4 z-50
      flex flex-col gap-2
      max-w-xs w-72
    ">
      {/* Monad speed badge */}
      {avgConfirmMs > 0 && (
        <div className="
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          bg-monad-dark/90 border border-monad-neon/40
          backdrop-blur-sm
        ">
          <span className="text-monad-neon text-xs">⚡</span>
          <span className="font-rajdhani text-xs text-monad-neon font-bold">
            MONAD AVG: {avgConfirmMs}ms
          </span>
        </div>
      )}

      {/* TX records */}
      {recent.map((tx) => (
        <div
          key={tx.hash + tx.timestamp}
          className="
            px-3 py-2 rounded-lg
            bg-monad-dark/95 border border-monad-purple/30
            backdrop-blur-sm
            transition-all duration-300 animate-slide-in
          "
        >
          <div className="flex items-center justify-between">
            <span className="font-rajdhani text-xs text-gray-400">
              {TYPE_LABELS[tx.type] || tx.type}
            </span>
            <span className="text-xs">{STATUS_ICONS[tx.status]}</span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            {tx.hash.startsWith("pending_") ? (
              <span className="font-rajdhani text-xs text-monad-purple animate-pulse">
                Pending...
              </span>
            ) : (
              <a
                href={`${NETWORK_CONFIG.explorer}/tx/${tx.hash}`}
                target="_blank"
                rel="noreferrer"
                className="font-rajdhani text-xs text-monad-purple hover:text-monad-accent underline truncate"
              >
                {truncateHash(tx.hash)}
              </a>
            )}
            {tx.confirmMs !== null && (
              <span className="font-rajdhani text-xs text-monad-neon font-bold ml-2">
                ⚡{tx.confirmMs}ms
              </span>
            )}
          </div>
          <div className="mt-0.5">
            <span className="font-rajdhani text-xs text-gray-500 truncate block">
              {tx.description}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
