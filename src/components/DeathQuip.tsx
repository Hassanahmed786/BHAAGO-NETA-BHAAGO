// ─── DeathQuip — retro chat bubble shown when player hits an obstacle ─────────
import React, { useEffect, useState } from "react";
import { ObstacleType }   from "../game/Obstacle";
import { CharacterId }    from "../game/characters/drawCharacters";
import { getDeathQuip, OBSTACLE_LABEL, OBSTACLE_EMOJI } from "../game/deathQuips";

// Map characterId → image in public/politicians/
// Drop your images there named exactly as below.
const POLITICIAN_IMAGES: Record<CharacterId, string> = {
  0: "/politicians/0.png",  // Modi
  1: "/politicians/1.png",  // Trump
  2: "/politicians/2.jpg",  // Rahul
  3: "/politicians/3.jpg",  // Kejriwal
  4: "/politicians/4.jpg",  // Biden
  5: "/politicians/5.jpg",  // Putin
};

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
    /* Politician photo: fade in → hold → fade out over 9s total */
    @keyframes dq-photo {
      0%   { opacity: 0;    transform: scale(1.08); }
      10%  { opacity: 1;    transform: scale(1); }
      80%  { opacity: 1;    transform: scale(1); }
      100% { opacity: 0;    transform: scale(0.94); }
    }
    @keyframes dq-photo-bg {
      0%   { opacity: 0; }
      10%  { opacity: 1; }
      80%  { opacity: 1; }
      100% { opacity: 0; }
    }
    /* Quip text glow pulse */
    @keyframes dq-glow {
      0%,100% { text-shadow: 0 0 8px #c4b5fd88; }
      50%      { text-shadow: 0 0 18px #c4b5fdcc, 0 0 32px #836EF966; }
    }
    .dq-blink      { animation: dq-blink 0.8s step-end infinite; }
    .dq-shake      { animation: dq-shake 0.4s ease; }
    .dq-quip-text  { animation: dq-glow  2.4s ease-in-out infinite; }
    .dq-photo-wrap {
      animation: dq-photo-bg 9s ease forwards;
      position: fixed;
      bottom: 1.5rem;
      left: 1.5rem;
      pointer-events: none;
      z-index: 38;
    }
    .dq-photo-img  {
      animation: dq-photo 9s ease forwards;
      object-fit: cover;
      object-position: top center;
      border: 3px solid rgba(255,0,64,0.7);
      border-radius: 10px;
      box-shadow: 0 0 24px rgba(255,0,64,0.5), 0 0 48px rgba(131,110,249,0.3), 0 8px 32px rgba(0,0,0,0.9);
      display: block;
      width: clamp(120px, 22vw, 200px);
      height: auto;
    }
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
        position:       "fixed",
        inset:           0,
        zIndex:          40,
        pointerEvents:   onSkip ? "auto" : "none",
        cursor:          onSkip ? "pointer" : "default",
      }}
    >
      {/* ── Big politician photo — full screen centered overlay ── */}
      <div className="dq-photo-wrap">
        <img
          key={characterId}
          src={POLITICIAN_IMAGES[characterId]}
          alt=""
          className="dq-photo-img"
          onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }}
        />
      </div>

      {/* ── Roast card — slides in from top ── */}
      <div
        style={{
          position:   "absolute",
          top:         0,
          left:        0,
          right:       0,
          padding:     "0.75rem",
          animation:   "dq-slide-in 0.35s cubic-bezier(0.22,1,0.36,1) forwards",
          zIndex:      2,
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
          padding:  "0.75rem",
          minHeight: "4rem",
          position: "relative",
          zIndex:   2,
        }}>
          <div style={{
            fontSize:      "0.4rem",
            color:         "#ff4466",
            letterSpacing: "0.25em",
            marginBottom:  "0.5rem",
          }}>
            🔥 THE ROAST 🔥
          </div>
          <div
            className="dq-quip-text"
            style={{
              fontSize:      "0.72rem",
              color:         "#e9d5ff",
              lineHeight:    "1.85",
              letterSpacing: "0.04em",
              fontFamily:    "'Press Start 2P', monospace",
            }}
          >
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
            <span>BHAAGO NETA BHAAGO © 2026</span>
            <span style={{ color: "#c4b5fd" }}>CLICK / TAP TO SKIP ▶</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
