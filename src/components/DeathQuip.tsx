// ─── DeathQuip — retro chat bubble shown when player hits an obstacle ─────────
import React, { useEffect, useState } from "react";
import { ObstacleType }   from "../game/Obstacle";
import { CharacterId }    from "../game/characters/drawCharacters";
import { getDeathQuip, OBSTACLE_LABEL, OBSTACLE_EMOJI } from "../game/deathQuips";

interface Props {
  killerType:  ObstacleType;
  characterId: CharacterId;
  onSkip?:     () => void;
}

// Typewriter hook
function useTypewriter(text: string, speed = 28): string {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return displayed;
}

// Scanline overlay via CSS injected once
const SCANLINE_ID = "__death_quip_styles__";
function injectStyles() {
  if (document.getElementById(SCANLINE_ID)) return;
  const s = document.createElement("style");
  s.id = SCANLINE_ID;
  s.textContent = `
    @keyframes dq-slide-in {
      from { transform: translateY(-110%); opacity: 0; }
      to   { transform: translateY(0);     opacity: 1; }
    }
    @keyframes dq-blink {
      0%,100% { opacity: 1; }
      50%      { opacity: 0; }
    }
    @keyframes dq-shake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-4px); }
      40%      { transform: translateX(4px); }
      60%      { transform: translateX(-3px); }
      80%      { transform: translateX(3px); }
    }
    @keyframes dq-countdown {
      from { width: 100%; }
      to   { width: 0%; }
    }
    .dq-blink  { animation: dq-blink  0.8s step-end infinite; }
    .dq-shake  { animation: dq-shake  0.4s ease; }
  `;
  document.head.appendChild(s);
}

export const DeathQuip: React.FC<Props> = ({ killerType, characterId, onSkip }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    injectStyles();
    // Slight delay so the hit-effect plays first
    const t = setTimeout(() => setVisible(true), 320);
    return () => clearTimeout(t);
  }, []);

  const quip  = getDeathQuip(killerType, characterId);
  const label = OBSTACLE_LABEL[killerType];
  const emoji = OBSTACLE_EMOJI[killerType];
  const typed = useTypewriter(visible ? quip : "", 22);
  const done  = typed.length >= quip.length;

  if (!visible) return null;

  return (
    <div
      onClick={onSkip}
      style={{
        position:       "absolute",
        top:             0,
        left:            0,
        right:           0,
        zIndex:          40,
        pointerEvents:   onSkip ? "auto" : "none",
        padding:         "0.75rem",
        cursor:          onSkip ? "pointer" : "default",
        animation:       "dq-slide-in 0.35s cubic-bezier(0.22,1,0.36,1) forwards",
      }}
    >
      {/* ── Main card ── */}
      <div
        style={{
          margin:           "0 auto",
          maxWidth:         "640px",
          background:       "rgba(8,4,24,0.96)",
          border:           "2px solid #ff0040",
          borderRadius:     "4px",
          boxShadow:        "0 0 32px #ff004066, inset 0 0 20px #0e0b1e",
          overflow:         "hidden",
          fontFamily:       "'Press Start 2P', monospace",
          position:         "relative",
        }}
      >
        {/* Scanlines */}
        <div style={{
          position:   "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)",
        }} />

        {/* ── Header bar ── */}
        <div style={{
          background:     "linear-gradient(90deg, #ff0040, #8b0020)",
          padding:        "0.4rem 0.75rem",
          display:        "flex",
          alignItems:     "center",
          gap:            "0.5rem",
          position:       "relative",
          zIndex:         2,
        }}>
          {/* Warning stripes left */}
          <div style={{
            width: "12px", height: "100%",
            background: "repeating-linear-gradient(45deg, #ff0040, #ff0040 4px, #ffcc00 4px, #ffcc00 8px)",
            position: "absolute", left: 0, top: 0, bottom: 0,
          }} />
          <span style={{ marginLeft: "16px", fontSize: "0.55rem", color: "#fff", letterSpacing: "0.15em" }}>
            ⚠ BREAKING NEWS
          </span>
          {/* Blinking live dot */}
          <span style={{
            marginLeft:  "auto",
            marginRight: "16px",
            fontSize:    "0.5rem",
            color:       "#ff3333",
          }}>
            <span className="dq-blink">●</span> LIVE
          </span>
          {/* Warning stripes right */}
          <div style={{
            width: "12px", height: "100%",
            background: "repeating-linear-gradient(45deg, #ff0040, #ff0040 4px, #ffcc00 4px, #ffcc00 8px)",
            position: "absolute", right: 0, top: 0, bottom: 0,
          }} />
        </div>

        {/* ── Obstacle name badge ── */}
        <div style={{
          padding:     "0.5rem 0.75rem 0.3rem",
          display:     "flex",
          alignItems:  "center",
          gap:         "0.5rem",
          borderBottom: "1px solid #ff004044",
          position:    "relative",
          zIndex:      2,
        }}>
          <span style={{ fontSize: "1.4rem" }}>{emoji}</span>
          <div>
            <div style={{ fontSize: "0.45rem", color: "#ff4466", letterSpacing: "0.2em", marginBottom: "0.2rem" }}>
              ELIMINATED BY
            </div>
            <div style={{ fontSize: "0.65rem", color: "#ffcc00", letterSpacing: "0.1em" }}>
              {label}
            </div>
          </div>
          {/* Pixel corner accent */}
          <div style={{
            marginLeft:  "auto",
            fontSize:    "0.45rem",
            color:       "#836EF9",
            letterSpacing: "0.1em",
          }}>
            MONAD TESTNET
          </div>
        </div>

        {/* ── Quip typewriter body ── */}
        <div style={{
          padding:     "0.6rem 0.75rem 0.65rem",
          minHeight:   "3.5rem",
          position:    "relative",
          zIndex:      2,
        }}>
          <div style={{ fontSize: "0.5rem", color: "#c4b5fd", lineHeight: "1.7", letterSpacing: "0.05em" }}>
            {typed}
            {!done && <span className="dq-blink" style={{ color: "#836EF9" }}>█</span>}
          </div>
        </div>

        {/* ── Footer + countdown ── */}
        <div style={{
          position:       "relative",
          overflow:       "hidden",
          borderTop:      "1px solid #836EF944",
        }}>
          {/* Countdown bar — 9 s matches the setTimeout in GameCanvas */}
          <div
            style={{
              position:           "absolute",
              top:                0, left: 0, bottom: 0,
              width:              "100%",
              background:         "rgba(131,110,249,0.20)",
              animation:          visible ? "dq-countdown 9s linear forwards" : "none",
              transformOrigin:    "left center",
              pointerEvents:      "none",
            }}
          />
          <div style={{
            padding:        "0.3rem 0.75rem",
            background:     "rgba(131,110,249,0.06)",
            fontSize:       "0.38rem",
            color:          "#836EF9",
            letterSpacing:  "0.12em",
            display:        "flex",
            justifyContent: "space-between",
            position:       "relative",
            zIndex:         2,
          }}>
            <span>POLITICIAN SURFERS © 2026</span>
            <span style={{ color: "#c4b5fd" }}>CLICK / TAP TO SKIP ▶</span>
          </div>
        </div>
      </div>
    </div>
  );
};
