import React, { useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";

export const MenuScreen: React.FC = () => {
  const { setScreen } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Self-contained star + money-rain animation — no external Background class
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.2,
      t: Math.random() * Math.PI * 2,
    }));

    const bills = Array.from({ length: 18 }, () => ({
      x:    Math.random() * window.innerWidth,
      y:    Math.random() * window.innerHeight,
      vy:   Math.random() * 1.2 + 0.4,
      rot:  Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.03,
      sym:  ["$", "€", "₹", "£"][Math.floor(Math.random() * 4)],
    }));

    let frame = 0;
    let rafId = 0;

    const loop = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, "#04020e");
      g.addColorStop(1, "#0e0b1e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars (twinkling)
      stars.forEach((s) => {
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(s.t + frame * 0.015));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#836EF9";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Ground line
      ctx.strokeStyle = "rgba(131,110,249,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.78);
      ctx.lineTo(canvas.width, canvas.height * 0.78);
      ctx.stroke();

      // Lane dividers
      ctx.strokeStyle = "rgba(57,255,20,0.2)";
      ctx.lineWidth = 2;
      ctx.setLineDash([30, 20]);
      [0.33, 0.66].forEach((f) => {
        ctx.beginPath();
        ctx.moveTo(canvas.width * f, canvas.height * 0.78);
        ctx.lineTo(canvas.width * f, canvas.height);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Falling money bills
      bills.forEach((b) => {
        b.y   += b.vy;
        b.rot += b.rotV;
        if (b.y > canvas.height + 20) { b.y = -20; b.x = Math.random() * canvas.width; }
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "#836EF9";
        ctx.fillRect(-10, -6, 20, 12);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.sym, 0, 0);
        ctx.globalAlpha = 1;
        ctx.restore();
      });

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden", background: "#0e0b1e",
    }}>
      {/* Animated canvas bg */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* UI on top */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "1.75rem", padding: "0 1rem", maxWidth: "460px", width: "100%",
      }}>

        {/* Live badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.6rem",
          padding: "0.4rem 1rem", borderRadius: "9999px",
          border: "1px solid rgba(131,110,249,0.5)",
          background: "rgba(14,11,30,0.8)",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#39ff14", boxShadow: "0 0 6px #39ff14" }} />
          <span style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.8rem", color: "#39ff14", fontWeight: 700, letterSpacing: "0.15em" }}>
            LIVE ON MONAD TESTNET
          </span>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#39ff14", boxShadow: "0 0 6px #39ff14" }} />
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", lineHeight: 1.5 }}>
          <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(1.5rem,5vw,3rem)", color: "#836EF9", textShadow: "0 0 20px #836EF9,0 0 40px #836EF9" }}>
            POLITICIAN
          </div>
          <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "clamp(1.5rem,5vw,3rem)", color: "#fff", textShadow: "0 0 20px #fff,0 0 40px #836EF9" }}>
            SURFERS
          </div>
          <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "1rem", color: "#a855f7", fontWeight: 600, letterSpacing: "0.2em", marginTop: "0.5rem" }}>
            RUN · BRIBE · SURVIVE
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", width: "100%" }}>
          <button
            onClick={() => setScreen("character_select")}
            style={{
              padding: "1rem", borderRadius: "0.75rem",
              border: "2px solid #836EF9", background: "#836EF9", color: "#fff",
              fontFamily: "'Press Start 2P',monospace", fontSize: "0.8rem", letterSpacing: "0.1em",
              cursor: "pointer", boxShadow: "0 0 20px rgba(131,110,249,0.5)",
              textShadow: "0 0 10px rgba(255,255,255,0.5)",
            }}
            onMouseEnter={(e) => { (e.currentTarget.style.background = "#a855f7"); (e.currentTarget.style.boxShadow = "0 0 30px rgba(131,110,249,0.8)"); }}
            onMouseLeave={(e) => { (e.currentTarget.style.background = "#836EF9"); (e.currentTarget.style.boxShadow = "0 0 20px rgba(131,110,249,0.5)"); }}
          >
            ▶ PLAY NOW
          </button>

          <button
            onClick={() => setScreen("lobby")}
            style={{
              padding: "0.85rem", borderRadius: "0.75rem",
              border: "2px solid #ffd700", background: "rgba(255,215,0,0.08)", color: "#ffd700",
              fontFamily: "'Press Start 2P',monospace", fontSize: "0.65rem", letterSpacing: "0.08em", cursor: "pointer",
              boxShadow: "0 0 12px rgba(255,215,0,0.25)",
            }}
            onMouseEnter={(e) => { (e.currentTarget.style.background = "rgba(255,215,0,0.18)"); }}
            onMouseLeave={(e) => { (e.currentTarget.style.background = "rgba(255,215,0,0.08)"); }}
          >
            ⚔ PRIVATE LOBBIES (STAKE)
          </button>

          <button
            onClick={() => setScreen("leaderboard")}
            style={{
              padding: "0.75rem", borderRadius: "0.75rem",
              border: "1px solid rgba(131,110,249,0.45)", background: "transparent", color: "#836EF9",
              fontFamily: "'Press Start 2P',monospace", fontSize: "0.65rem", letterSpacing: "0.1em", cursor: "pointer",
            }}
          >
            🏆 LEADERBOARD
          </button>

          <button
            onClick={() => setScreen("nft_gallery")}
            style={{
              padding: "0.65rem", borderRadius: "0.75rem",
              border: "1px solid rgba(168,85,247,0.4)", background: "transparent", color: "#a855f7",
              fontFamily: "'Press Start 2P',monospace", fontSize: "0.55rem", letterSpacing: "0.08em", cursor: "pointer",
            }}
          >
            🎨 MY NFT COLLECTION
          </button>
        </div>

        {/* Controls */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", width: "100%",
          background: "rgba(14,11,30,0.7)", border: "1px solid rgba(131,110,249,0.2)",
          borderRadius: "0.75rem", padding: "0.9rem",
        }}>
          {([
            { icon: "↑",  label: "JUMP",  key: "SPACE / W" },
            { icon: "↓",  label: "SLIDE", key: "S / ↓" },
            { icon: "←→", label: "LANES", key: "A D / ← →" },
            { icon: "⚡",  label: "POWER", key: "SHIFT / Z" },
          ] as const).map((c) => (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                width: 30, height: 30, flexShrink: 0, borderRadius: "0.35rem",
                border: "1px solid rgba(131,110,249,0.4)", background: "rgba(131,110,249,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Press Start 2P',monospace", fontSize: "0.5rem", color: "#836EF9",
              }}>{c.icon}</div>
              <div>
                <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "0.45rem", color: "#fff" }}>{c.label}</div>
                <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.7rem", color: "#6b7280" }}>{c.key}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "0.85rem", left: 0, right: 0, textAlign: "center", zIndex: 10 }}>
        <span style={{ fontFamily: "Rajdhani,sans-serif", fontSize: "0.7rem", color: "rgba(131,110,249,0.5)", letterSpacing: "0.08em" }}>
          Built on Monad · 10,000 TPS · Sub-second Finality
        </span>
      </div>
    </div>
  );
};
