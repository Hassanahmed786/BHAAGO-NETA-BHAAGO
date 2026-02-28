import React, { useCallback, useEffect, useState } from "react";
import { ethers }            from "ethers";
import toast                 from "react-hot-toast";
import { useGameStore }      from "../store/gameStore";
import { useWallet }         from "../hooks/useWallet";
import { useLobby, LobbyState } from "../hooks/useLobby";

type Tab = "create" | "join" | "status";

// Helper: shorten address
const short = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

export const LobbyScreen: React.FC = () => {
  const {
    walletAddress, setScreen,
    activeLobbyCode, activeLobbyStake, activeLobbyStakeWei,
    isLobbyCreator, lobbyOpponent, lobbySettled, lobbyWinner,
    pendingClaim, clearLobby, setLobbyOpponent,
  } = useGameStore();

  const { isConnected } = useWallet();
  const {
    createLobby, joinLobby, fetchLobbyState,
    claimWinnings, refreshPendingClaim, bytes6ToCode,
  } = useLobby();

  const [tab,         setTab        ] = useState<Tab>(() => activeLobbyCode ? "status" : "create");
  const [stakeInput,  setStakeInput ] = useState("0.1");
  const [codeInput,   setCodeInput  ] = useState("");
  const [busy,        setBusy       ] = useState(false);

  // Looked-up lobby info for join tab
  const [lookupData,  setLookupData ] = useState<LobbyState | null>(null);
  const [looking,     setLooking    ] = useState(false);

  // Live lobby state when in status tab
  const [liveState,   setLiveState  ] = useState<LobbyState | null>(null);
  const [pollTimer,   setPollTimer  ] = useState<ReturnType<typeof setInterval> | null>(null);

  // ─── Poll lobby state when in active lobby ─────────────────────────────────
  const pollLobby = useCallback(async (code: string) => {
    try {
      const state = await fetchLobbyState(code);
      setLiveState(state);
      if (state.challenger !== ethers.ZeroAddress && !lobbyOpponent) {
        setLobbyOpponent(state.challenger);
      }
    } catch {}
  }, [fetchLobbyState, lobbyOpponent, setLobbyOpponent]);

  useEffect(() => {
    if (activeLobbyCode && tab === "status") {
      pollLobby(activeLobbyCode);
      const iv = setInterval(() => pollLobby(activeLobbyCode), 8000);
      setPollTimer(iv);
      return () => clearInterval(iv);
    }
    return () => { if (pollTimer) clearInterval(pollTimer); };
  }, [activeLobbyCode, tab]);

  useEffect(() => {
    refreshPendingClaim();
  }, [refreshPendingClaim]);

  // ─── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!isConnected) { toast.error("Connect wallet first!"); return; }
    const stake = parseFloat(stakeInput);
    if (isNaN(stake) || stake <= 0) { toast.error("Enter a valid stake amount"); return; }
    setBusy(true);
    try {
      const code = await createLobby(stakeInput);
      if (code) setTab("status");
    } finally { setBusy(false); }
  };

  // ─── Look up lobby ─────────────────────────────────────────────────────────
  const handleLookup = async () => {
    const code = codeInput.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);
    if (code.length < 6) { toast.error("Enter a 6-character lobby code"); return; }
    setLooking(true);
    try {
      const data = await fetchLobbyState(code);
      if (!data.active) { toast.error("Lobby not found or expired"); setLookupData(null); return; }
      if (data.challenger !== ethers.ZeroAddress) { toast.error("Lobby is already full"); setLookupData(null); return; }
      setLookupData(data);
    } catch { toast.error("Lobby not found"); setLookupData(null); }
    finally { setLooking(false); }
  };

  // ─── Join ──────────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    const code = codeInput.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);
    setBusy(true);
    try {
      const ok = await joinLobby(code);
      if (ok) { setTab("status"); }
    } finally { setBusy(false); }
  };

  // ─── Copy code ─────────────────────────────────────────────────────────────
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success("Lobby code copied!"));
  };

  // ─── Clear and leave ───────────────────────────────────────────────────────
  const handleLeave = () => {
    clearLobby();
    setLiveState(null);
    setLookupData(null);
    setTab("create");
  };

  // ─── Claim ─────────────────────────────────────────────────────────────────
  const handleClaim = async () => {
    setBusy(true);
    try { await claimWinnings(); }
    finally { setBusy(false); }
  };

  // ─── Determine result display ──────────────────────────────────────────────
  const isWinner  = lobbyWinner && walletAddress &&
    lobbyWinner.toLowerCase() === walletAddress.toLowerCase();
  const isTie     = lobbySettled && (!lobbyWinner || lobbyWinner === ethers.ZeroAddress);
  const pendingClaimFloat = parseFloat(pendingClaim);

  /* ─────────────────────────── RENDER ───────────────────────────────────── */
  const tabStyle = (active: boolean) => ({
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem 0.5rem 0 0",
    border: `1px solid ${active ? "rgba(131,110,249,0.6)" : "rgba(131,110,249,0.2)"}`,
    borderBottom: active ? "1px solid #0e0b1e" : "1px solid rgba(131,110,249,0.2)",
    background: active ? "rgba(131,110,249,0.15)" : "transparent",
    color: active ? "#836EF9" : "rgba(131,110,249,0.5)",
    fontFamily: "'Press Start 2P',monospace",
    fontSize: "0.5rem",
    cursor: "pointer",
    letterSpacing: "0.05em",
    marginBottom: -1,
  });

  const inputStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid rgba(131,110,249,0.4)",
    background: "rgba(0,0,0,0.4)",
    color: "#fff",
    fontFamily: "Rajdhani,sans-serif",
    fontSize: "1rem",
    fontWeight: 600,
    letterSpacing: "0.05em",
    boxSizing: "border-box" as const,
    outline: "none",
  };

  const btnPrimary = {
    padding: "0.85rem 1.5rem",
    borderRadius: "0.75rem",
    border: "2px solid #836EF9",
    background: busy ? "rgba(131,110,249,0.4)" : "#836EF9",
    color: "#fff",
    fontFamily: "'Press Start 2P',monospace",
    fontSize: "0.6rem",
    cursor: busy ? "not-allowed" : "pointer",
    width: "100%",
    letterSpacing: "0.08em",
    textShadow: "0 0 10px rgba(255,255,255,0.4)",
    boxShadow: "0 0 20px rgba(131,110,249,0.5)",
  };

  const btnSecondary = {
    padding: "0.65rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid rgba(131,110,249,0.4)",
    background: "transparent",
    color: "#836EF9",
    fontFamily: "'Press Start 2P',monospace",
    fontSize: "0.5rem",
    cursor: "pointer",
    width: "100%",
    letterSpacing: "0.05em",
  };

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0e0b1e",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'Press Start 2P',monospace",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        width: "100%", maxWidth: 520,
        padding: "1.5rem 1.5rem 0",
        display: "flex", flexDirection: "column", gap: "0.5rem",
      }}>
        <button
          onClick={() => setScreen("menu")}
          style={{ background: "none", border: "none", color: "rgba(131,110,249,0.6)", fontFamily: "'Press Start 2P',monospace", fontSize: "0.5rem", cursor: "pointer", alignSelf: "flex-start" }}
        >← BACK</button>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "clamp(0.9rem,3vw,1.4rem)", color: "#836EF9", textShadow: "0 0 20px #836EF9" }}>
            PRIVATE LOBBIES
          </div>
          <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.9rem", color: "#a855f7", fontWeight: 700, letterSpacing: "0.15em", marginTop: "0.25rem" }}>
            STAKE · PLAY · WIN
          </div>
        </div>

        {/* How it works */}
        <div style={{
          background: "rgba(131,110,249,0.06)",
          border: "1px solid rgba(131,110,249,0.2)",
          borderRadius: "0.75rem",
          padding: "0.75rem 1rem",
          fontFamily: "Rajdhani,sans-serif",
          fontSize: "0.85rem",
          color: "rgba(196,181,253,0.8)",
          lineHeight: 1.6,
          marginTop: "0.5rem",
        }}>
          <span style={{ color: "#ffd700" }}>HOW IT WORKS:</span>
          {"  "}Create a lobby & share the 6-letter code with a friend.
          Both stake the same amount of MON. Both play the game.
          The <span style={{ color: "#39ff14" }}>higher score wins 97%</span> of the pot.
          Ties split evenly.
        </div>
      </div>

      {/* Pending claim banner */}
      {pendingClaimFloat > 0 && (
        <div style={{
          width: "100%", maxWidth: 520,
          padding: "0 1.5rem", marginTop: "1rem",
        }}>
          <div style={{
            background: "rgba(57,255,20,0.08)",
            border: "1px solid rgba(57,255,20,0.5)",
            borderRadius: "0.75rem",
            padding: "0.85rem 1rem",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: "0.75rem",
          }}>
            <div>
              <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "0.5rem", color: "#39ff14" }}>WINNINGS PENDING!</div>
              <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "1rem", color: "#39ff14", fontWeight: 700, marginTop: "0.2rem" }}>
                {parseFloat(pendingClaim).toFixed(4)} MON
              </div>
            </div>
            <button
              onClick={handleClaim}
              disabled={busy}
              style={{
                padding: "0.5rem 1rem", borderRadius: "0.5rem",
                border: "1px solid #39ff14", background: "rgba(57,255,20,0.2)",
                color: "#39ff14", fontFamily: "'Press Start 2P',monospace",
                fontSize: "0.45rem", cursor: busy ? "not-allowed" : "pointer",
              }}
            >{busy ? "..." : "CLAIM"}</button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{
        width: "100%", maxWidth: 520,
        padding: "1.25rem 1.5rem 0",
        display: "flex", gap: "0.25rem",
      }}>
        <button style={tabStyle(tab === "create")} onClick={() => setTab("create")}>CREATE</button>
        <button style={tabStyle(tab === "join")}   onClick={() => setTab("join")}>JOIN</button>
        {activeLobbyCode && (
          <button style={tabStyle(tab === "status")} onClick={() => setTab("status")}>STATUS</button>
        )}
      </div>

      {/* Tab content */}
      <div style={{
        width: "100%", maxWidth: 520,
        padding: "1.5rem",
        border: "1px solid rgba(131,110,249,0.3)",
        borderTop: "none",
        borderRadius: "0 0.75rem 0.75rem 0.75rem",
        background: "rgba(131,110,249,0.05)",
        margin: "0 1.5rem 1.5rem",
        display: "flex", flexDirection: "column", gap: "1rem",
      }}>

        {/* ── CREATE TAB ────────────────────────────────────── */}
        {tab === "create" && (
          <>
            {activeLobbyCode ? (
              <div style={{
                padding: "1rem", borderRadius: "0.75rem",
                background: "rgba(57,255,20,0.05)",
                border: "1px solid rgba(57,255,20,0.3)",
                textAlign: "center",
              }}>
                <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.85rem", color: "rgba(57,255,20,0.7)", marginBottom: "0.5rem" }}>
                  ACTIVE LOBBY
                </div>
                <div style={{ fontSize: "1.2rem", color: "#39ff14", letterSpacing: "0.3em", marginBottom: "0.5rem" }}>
                  {activeLobbyCode}
                </div>
                <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.85rem", color: "rgba(196,181,253,0.7)" }}>
                  You already have an active lobby. Go to{" "}
                  <span style={{ color: "#836EF9", cursor: "pointer", textDecoration: "underline" }} onClick={() => setTab("status")}>
                    STATUS
                  </span>{" "}to manage it.
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.85rem", color: "rgba(196,181,253,0.8)", display: "block", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>
                    STAKE AMOUNT (MON)
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.01"
                    value={stakeInput}
                    onChange={(e) => setStakeInput(e.target.value)}
                    placeholder="0.1"
                    style={inputStyle}
                  />
                  <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.75rem", color: "rgba(131,110,249,0.5)", marginTop: "0.3rem" }}>
                    Your opponent must match this stake. Winner gets 97% of total pot.
                  </div>
                </div>

                {/* Pot calculation */}
                {parseFloat(stakeInput) > 0 && (
                  <div style={{
                    background: "rgba(131,110,249,0.08)",
                    border: "1px solid rgba(131,110,249,0.2)",
                    borderRadius: "0.5rem",
                    padding: "0.75rem 1rem",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.5rem",
                  }}>
                    {[
                      { label: "YOUR STAKE", val: `${stakeInput} MON` },
                      { label: "TOTAL POT",  val: `${(parseFloat(stakeInput) * 2).toFixed(4)} MON` },
                      { label: "WIN PRIZE",  val: `${(parseFloat(stakeInput) * 2 * 0.97).toFixed(4)} MON`, green: true },
                      { label: "PLATFORM FEE", val: "3%" },
                    ].map(({ label, val, green }) => (
                      <div key={label}>
                        <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.7rem", color: "rgba(131,110,249,0.6)" }}>{label}</div>
                        <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "1rem", color: green ? "#39ff14" : "#c4b5fd", fontWeight: 700 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={handleCreate} disabled={busy} style={btnPrimary}>
                  {busy ? "CREATING..." : "⚔ CREATE LOBBY"}
                </button>

                {!isConnected && (
                  <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: "#ff0080", textAlign: "center" }}>
                    ⚠ Connect your wallet first
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── JOIN TAB ──────────────────────────────────────── */}
        {tab === "join" && (
          <>
            <div>
              <label style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.85rem", color: "rgba(196,181,253,0.8)", display: "block", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>
                LOBBY CODE (6 CHARACTERS)
              </label>
              <input
                type="text"
                maxLength={6}
                value={codeInput}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);
                  setCodeInput(v);
                  if (v.length < 6) setLookupData(null);
                }}
                placeholder="e.g. AB3KMP"
                style={{ ...inputStyle, textAlign: "center", fontSize: "1.4rem", letterSpacing: "0.4em" }}
              />
            </div>

            <button
              onClick={handleLookup}
              disabled={looking || codeInput.length < 6}
              style={{
                ...btnSecondary,
                opacity: codeInput.length < 6 ? 0.4 : 1,
              }}
            >
              {looking ? "LOOKING UP..." : "🔍 LOOK UP LOBBY"}
            </button>

            {/* Lookup result */}
            {lookupData && (
              <div style={{
                background: "rgba(131,110,249,0.08)",
                border: "1px solid rgba(131,110,249,0.3)",
                borderRadius: "0.75rem",
                padding: "1rem",
                display: "flex", flexDirection: "column", gap: "0.6rem",
              }}>
                <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: "rgba(131,110,249,0.6)", letterSpacing: "0.1em" }}>LOBBY FOUND ✅</div>
                {[
                  { label: "CREATOR",    val: short(lookupData.creator) },
                  { label: "STAKE REQ.", val: `${parseFloat(ethers.formatEther(lookupData.stake)).toFixed(4)} MON` },
                  { label: "WIN PRIZE",  val: `${(parseFloat(ethers.formatEther(lookupData.stake)) * 2 * 0.97).toFixed(4)} MON` },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: "rgba(196,181,253,0.6)" }}>{label}</span>
                    <span style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.9rem", color: "#c4b5fd", fontWeight: 700 }}>{val}</span>
                  </div>
                ))}

                <button
                  onClick={handleJoin}
                  disabled={busy}
                  style={{ ...btnPrimary, marginTop: "0.25rem" }}
                >
                  {busy ? "JOINING..." : `⚔ JOIN — STAKE ${parseFloat(ethers.formatEther(lookupData.stake)).toFixed(4)} MON`}
                </button>
              </div>
            )}

            {!isConnected && (
              <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: "#ff0080", textAlign: "center" }}>
                ⚠ Connect your wallet first
              </div>
            )}
          </>
        )}

        {/* ── STATUS TAB ────────────────────────────────────── */}
        {tab === "status" && activeLobbyCode && (
          <>
            {/* Lobby code display */}
            <div style={{
              background: "rgba(131,110,249,0.1)",
              border: "1px solid rgba(131,110,249,0.4)",
              borderRadius: "0.75rem",
              padding: "1rem",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
            }}>
              <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: "rgba(131,110,249,0.6)" }}>
                {isLobbyCreator ? "YOU CREATED THIS LOBBY" : "YOU JOINED THIS LOBBY"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "1.4rem", color: "#836EF9", letterSpacing: "0.4em", textShadow: "0 0 20px #836EF9" }}>
                  {activeLobbyCode}
                </div>
                <button
                  onClick={() => copyCode(activeLobbyCode)}
                  style={{
                    padding: "0.3rem 0.6rem", borderRadius: "0.35rem",
                    border: "1px solid rgba(131,110,249,0.4)",
                    background: "rgba(131,110,249,0.1)", color: "#836EF9",
                    fontFamily: "Rajdhani,sans-serif", fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >📋 COPY</button>
              </div>
              <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: "rgba(196,181,253,0.6)" }}>
                Share this code with your opponent
              </div>
            </div>

            {/* Stake */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 0.25rem" }}>
              <span style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.9rem", color: "rgba(196,181,253,0.6)" }}>Stake per player</span>
              <span style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.9rem", color: "#ffd700", fontWeight: 700 }}>
                {parseFloat(activeLobbyStake).toFixed(4)} MON
              </span>
            </div>

            {/* Players grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {/* Creator */}
              {[
                { label: "CREATOR", addr: liveState?.creator ?? "" },
                { label: "CHALLENGER", addr: liveState?.challenger ?? "" },
              ].map(({ label, addr }) => {
                const isMe = addr.toLowerCase() === (walletAddress ?? "").toLowerCase();
                const waiting = !addr || addr === ethers.ZeroAddress;
                return (
                  <div key={label} style={{
                    padding: "0.75rem",
                    borderRadius: "0.75rem",
                    border: `1px solid ${isMe ? "rgba(131,110,249,0.6)" : waiting ? "rgba(131,110,249,0.15)" : "rgba(131,110,249,0.3)"}`,
                    background: isMe ? "rgba(131,110,249,0.1)" : "rgba(0,0,0,0.3)",
                    display: "flex", flexDirection: "column", gap: "0.35rem",
                  }}>
                    <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "0.4rem", color: isMe ? "#836EF9" : "rgba(131,110,249,0.5)" }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: waiting ? "rgba(131,110,249,0.35)" : "#c4b5fd" }}>
                      {waiting ? "Waiting..." : isMe ? "YOU" : short(addr)}
                    </div>
                    {liveState && !waiting && (
                      <div style={{
                        fontFamily: "Rajdhani,sans-serif", fontSize: "0.75rem",
                        color: (label === "CREATOR" ? liveState.creatorSubmitted : liveState.challengerSubmitted) ? "#39ff14" : "rgba(255,165,0,0.7)",
                      }}>
                        {(label === "CREATOR" ? liveState.creatorSubmitted : liveState.challengerSubmitted)
                          ? `Score: ${label === "CREATOR" ? liveState.creatorScore.toString() : liveState.challengerScore.toString()}`
                          : "⏳ Playing..."}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Settlement result */}
            {lobbySettled && (
              <div style={{
                padding: "1rem", borderRadius: "0.75rem",
                border: `1px solid ${isTie ? "rgba(255,165,0,0.5)" : isWinner ? "rgba(57,255,20,0.5)" : "rgba(255,0,128,0.5)"}`,
                background: isTie
                  ? "rgba(255,165,0,0.07)"
                  : isWinner ? "rgba(57,255,20,0.07)" : "rgba(255,0,128,0.07)",
                textAlign: "center",
              }}>
                <div style={{
                  fontFamily: "'Press Start 2P',monospace",
                  fontSize: "0.65rem",
                  color: isTie ? "#ffa500" : isWinner ? "#39ff14" : "#ff0080",
                  textShadow: `0 0 20px ${isTie ? "#ffa500" : isWinner ? "#39ff14" : "#ff0080"}`,
                }}>
                  {isTie ? "🤝 TIE GAME!" : isWinner ? "🏆 YOU WIN!" : "💀 YOU LOST"}
                </div>
                {pendingClaimFloat > 0 && (
                  <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.9rem", color: "#39ff14", fontWeight: 700, marginTop: "0.4rem" }}>
                    Claimable: {parseFloat(pendingClaim).toFixed(4)} MON
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {/* Start game — only if challenger joined */}
              {!lobbySettled && liveState && liveState.challenger !== ethers.ZeroAddress && (
                <button
                  onClick={() => setScreen("character_select")}
                  style={btnPrimary}
                >▶ START GAME</button>
              )}
              {!lobbySettled && liveState && liveState.challenger === ethers.ZeroAddress && (
                <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.85rem", color: "rgba(255,165,0,0.8)", textAlign: "center", padding: "0.5rem" }}>
                  ⏳ Waiting for opponent to join...
                  <br/>
                  <span style={{ fontSize: "0.75rem", color: "rgba(131,110,249,0.5)" }}>
                    Share code <strong style={{ color: "#836EF9" }}>{activeLobbyCode}</strong> with your opponent
                  </span>
                </div>
              )}

              {/* Claim button if settled and has prize */}
              {lobbySettled && pendingClaimFloat > 0 && (
                <button
                  onClick={handleClaim}
                  disabled={busy}
                  style={{ ...btnPrimary, background: "#39ff14", borderColor: "#39ff14", color: "#0e0b1e" }}
                >
                  {busy ? "CLAIMING..." : `💰 CLAIM ${parseFloat(pendingClaim).toFixed(4)} MON`}
                </button>
              )}

              <button
                onClick={handleLeave}
                style={{ ...btnSecondary, fontSize: "0.45rem" }}
              >
                {lobbySettled ? "← NEW LOBBY" : "← LEAVE LOBBY"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
