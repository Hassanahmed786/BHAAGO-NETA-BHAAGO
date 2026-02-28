import React, { useEffect, useState } from "react";
import { useWallet, WalletType } from "../hooks/useWallet";
import { NETWORK_CONFIG } from "../contracts/addresses";

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── inline style tokens ────────────────────────────────────────────────────────
const CLR = {
  bg:       "#0e0b1e",
  purple:   "#836EF9",
  neon:     "#39ff14",
  danger:   "#ff0080",
  border:   "rgba(131,110,249,0.5)",
  overlay:  "rgba(14,11,30,0.80)",
  text:     "#e2d9ff",
};

const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_RAJ   = "'Rajdhani', sans-serif";

interface PickerProps {
  onPick: (t: WalletType) => void;
  onClose: () => void;
  isConnecting: boolean;
  hasMetaMask: boolean;
  hasPhantom: boolean;
}

function WalletPicker({ onPick, onClose, isConnecting, hasMetaMask, hasPhantom }: PickerProps) {
  const wallets: { type: WalletType; icon: string; label: string; installed: boolean }[] = [
    { type: "metamask", icon: "🦊", label: "MetaMask",  installed: hasMetaMask },
    { type: "phantom",  icon: "👻", label: "Phantom",   installed: hasPhantom  },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
        paddingTop: "4rem", paddingRight: "1rem",
        background: CLR.overlay,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: CLR.bg, border: `1px solid ${CLR.purple}`,
          borderRadius: "0.75rem", padding: "1rem", minWidth: "220px",
          boxShadow: `0 0 24px ${CLR.purple}55`,
        }}
      >
        <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.55rem", color: CLR.purple, marginBottom: "0.75rem", letterSpacing: "0.08em" }}>
          CHOOSE WALLET
        </p>

        {wallets.map(({ type, icon, label, installed }) => (
          <button
            key={type}
            onClick={() => onPick(type)}
            disabled={isConnecting}
            style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              width: "100%", padding: "0.6rem 0.8rem", marginBottom: "0.5rem",
              background: "rgba(131,110,249,0.08)",
              border: `1px solid ${CLR.border}`,
              borderRadius: "0.5rem", cursor: isConnecting ? "not-allowed" : "pointer",
              color: CLR.text, fontFamily: FONT_RAJ, fontSize: "1rem", fontWeight: 600,
              letterSpacing: "0.05em", transition: "background 0.15s",
              opacity: isConnecting ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>{icon}</span>
            <span>{label}</span>
            {!installed && (
              <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: CLR.danger, fontFamily: FONT_PIXEL }}>INSTALL</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export const WalletButton: React.FC = () => {
  const { address, balance, isConnecting, walletType, connect, disconnect, switchToMonad, hasMetaMask, hasPhantom } = useWallet();
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [showPicker,   setShowPicker]   = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      if (!address) { setWrongNetwork(false); return; }
      const raw = walletType === "phantom" ? window.phantom?.ethereum : window.ethereum;
      if (!raw) return;
      try {
        const chainId = await raw.request({ method: "eth_chainId" });
        setWrongNetwork(parseInt(chainId, 16) !== NETWORK_CONFIG.chainId);
      } catch { /* ignore */ }
    };
    checkNetwork();
    const iv = setInterval(checkNetwork, 4000);
    return () => clearInterval(iv);
  }, [address, walletType]);

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!address) {
    return (
      <>
        <button
          onClick={() => setShowPicker(p => !p)}
          disabled={isConnecting}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 0.9rem", borderRadius: "0.5rem",
            border: `1px solid ${CLR.purple}`, background: CLR.bg,
            color: "#fff", fontFamily: FONT_PIXEL, fontSize: "0.6rem",
            letterSpacing: "0.08em", cursor: isConnecting ? "not-allowed" : "pointer",
            opacity: isConnecting ? 0.5 : 1, transition: "box-shadow 0.2s",
          }}
        >
          {isConnecting ? (
            <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span><span>CONNECTING...</span></>
          ) : (
            <><span>🔗</span><span>CONNECT</span></>
          )}
        </button>

        {showPicker && (
          <WalletPicker
            onPick={(t) => { setShowPicker(false); connect(t); }}
            onClose={() => setShowPicker(false)}
            isConnecting={isConnecting}
            hasMetaMask={hasMetaMask}
            hasPhantom={hasPhantom}
          />
        )}
      </>
    );
  }

  // ── Wrong network ──────────────────────────────────────────────────────────
  if (wrongNetwork) {
    return (
      <button
        onClick={switchToMonad}
        style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.5rem 0.9rem", borderRadius: "0.5rem",
          border: `1px solid ${CLR.danger}`,
          background: "rgba(255,0,128,0.1)", color: CLR.danger,
          fontFamily: FONT_PIXEL, fontSize: "0.55rem", cursor: "pointer",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      >
        <span>⚠️</span>
        <span>WRONG NETWORK — SWITCH TO MONAD</span>
      </button>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  const icon = walletType === "phantom" ? "👻" : "🦊";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {/* Balance pill */}
      <div style={{
        padding: "0.3rem 0.6rem", borderRadius: "0.4rem",
        background: "rgba(57,255,20,0.08)", border: `1px solid rgba(57,255,20,0.3)`,
        fontFamily: FONT_RAJ, fontSize: "0.85rem", fontWeight: 700, color: CLR.neon,
      }}>
        {balance} MON
      </div>

      {/* Address pill — click to disconnect */}
      <button
        title="Click to disconnect"
        onClick={disconnect}
        style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.35rem 0.7rem", borderRadius: "0.4rem",
          border: `1px solid ${CLR.border}`,
          background: "rgba(131,110,249,0.10)",
          color: CLR.text, fontFamily: FONT_RAJ, fontSize: "0.9rem",
          cursor: "pointer",
        }}
      >
        <span style={{ width: "0.55rem", height: "0.55rem", borderRadius: "50%", background: CLR.neon, display: "inline-block", boxShadow: `0 0 6px ${CLR.neon}` }} />
        <span>{icon} {truncateAddress(address)}</span>
      </button>
    </div>
  );

};
