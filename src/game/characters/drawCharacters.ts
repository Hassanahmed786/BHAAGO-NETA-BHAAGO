// ─── Politician Character Drawing Functions ──────────────────────────────────
// All characters drawn programmatically on HTML5 Canvas using pixel-art style
// rectangles, circles, and shapes. No external assets needed.

export type CharacterId = 0 | 1 | 2 | 3 | 4 | 5;

export interface DrawOptions {
  x: number;
  y: number;
  frame: number;       // animation frame index (0, 1, 2, 3)
  isSliding: boolean;
  isJumping: boolean;
  isInvincible: boolean;
  isPowerActive: boolean;
}

// Helper: draw a pixel-art rectangle
function pr(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

// Helper: draw a pixel-art circle
function pc(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  r: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(Math.floor(cx), Math.floor(cy), r, 0, Math.PI * 2);
  ctx.fill();
}

// Glow effect for invincibility / power active
function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.shadowColor   = color;
  ctx.shadowBlur    = 20;
  ctx.fillStyle     = color + "33";
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 32, 22, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Leg animation helper
function legOffset(frame: number, leg: "left" | "right"): number {
  const offsets = [0, 4, 0, -4];
  const base = offsets[frame % 4];
  return leg === "left" ? base : -base;
}

// ── 0: MODI RUNNER ──────────────────────────────────────────────────────────
// Orange kurta, white pajama, Gandhi topi, folded hands animation
export function drawModi(ctx: CanvasRenderingContext2D, opt: DrawOptions) {
  const { x, y, frame, isSliding, isInvincible, isPowerActive } = opt;
  const sy = isSliding ? y + 16 : y;
  const sh = isSliding ? 0.5 : 1;

  if (isInvincible || isPowerActive) drawGlow(ctx, x, sy, "#ff9900");

  ctx.save();
  ctx.translate(x, sy);
  ctx.scale(1, sh);

  // White pajama / legs
  const ll = legOffset(frame, "left");
  const rl = legOffset(frame, "right");
  pr(ctx, 8,  48 + ll, 10, 18, "#f0f0f0"); // left leg
  pr(ctx, 22, 48 + rl, 10, 18, "#f0f0f0"); // right leg
  // Shoes
  pr(ctx, 6,  64 + ll, 14, 5, "#333333");
  pr(ctx, 20, 64 + rl, 14, 5, "#333333");

  // Saffron kurta body
  pr(ctx, 4, 20, 32, 32, "#ff7722");
  // White kurta collar
  pr(ctx, 14, 20, 12, 6, "#ffffff");

  // Arms - folded (Modi signature pose)
  const armSwing = Math.sin(frame * 0.8) * 3;
  pr(ctx, -2, 24 + armSwing, 10, 8, "#ff7722"); // left arm
  pr(ctx, 32, 24 - armSwing, 10, 8, "#ff7722"); // right arm
  // Folded hands
  pr(ctx, -4, 30 + armSwing, 12, 8, "#f5c5a3");
  pr(ctx, 32, 30 - armSwing, 12, 8, "#f5c5a3");

  // Head
  pc(ctx, 20, 12, 12, "#f5c5a3");

  // Gandhi topi (white cap)
  pr(ctx, 8,  2, 24, 8, "#ffffff");
  pr(ctx, 6,  6, 28, 4, "#ffffff");

  // Eyes
  pr(ctx, 14, 10, 4, 4, "#4a2800");
  pr(ctx, 22, 10, 4, 4, "#4a2800");

  // White beard
  pr(ctx, 11, 18, 18, 6, "#e8e8e8");

  ctx.restore();
}

// ── 1: TRUMP RUNNER ──────────────────────────────────────────────────────────
// Orange tint, red MAGA cap, suit, runs with determination
export function drawTrump(ctx: CanvasRenderingContext2D, opt: DrawOptions) {
  const { x, y, frame, isSliding, isInvincible, isPowerActive } = opt;
  const sy = isSliding ? y + 16 : y;
  const sh = isSliding ? 0.5 : 1;

  if (isInvincible || isPowerActive) drawGlow(ctx, x, sy, "#ff4400");

  ctx.save();
  ctx.translate(x, sy);
  ctx.scale(1, sh);

  // Legs - dark trousers
  const ll = legOffset(frame, "left");
  const rl = legOffset(frame, "right");
  pr(ctx, 8,  48 + ll, 10, 18, "#1a1a2e");
  pr(ctx, 22, 48 + rl, 10, 18, "#1a1a2e");
  // Shoes
  pr(ctx, 6,  64 + ll, 14, 5, "#000000");
  pr(ctx, 20, 64 + rl, 14, 5, "#000000");

  // Dark blue suit body
  pr(ctx, 4, 20, 32, 32, "#1a3a6b");
  // White shirt / tie
  pr(ctx, 14, 20, 12, 30, "#ffffff");
  pr(ctx, 17, 22, 6, 28, "#cc0000"); // red tie

  // Arms swing
  const armSwing = Math.sin(frame * 0.8) * 4;
  pr(ctx, -2, 22 + armSwing, 10, 8, "#1a3a6b");
  pr(ctx, 32, 22 - armSwing, 10, 8, "#1a3a6b");
  // Hands (orange-tinted)
  pr(ctx, -4, 28 + armSwing, 10, 8, "#ff9966");
  pr(ctx, 32, 28 - armSwing, 10, 8, "#ff9966");

  // Head - orange tint
  pc(ctx, 20, 12, 13, "#ff9966");

  // Red MAGA cap
  pr(ctx, 6,  1, 28, 9, "#cc0000");
  pr(ctx, 4,  5, 32, 5, "#cc0000");
  pr(ctx, 4,  9, 10, 3, "#cc0000"); // brim

  // Weird hair
  pr(ctx, 6,  0, 28, 5, "#ffdd00");
  pr(ctx, 4,  2, 6,  4, "#ffdd00");
  pr(ctx, 30, 2, 6,  4, "#ffdd00");

  // Eyes
  pr(ctx, 13, 10, 5, 4, "#4a2800");
  pr(ctx, 22, 10, 5, 4, "#4a2800");

  // Mouth - pursed lips
  pr(ctx, 12, 18, 16, 3, "#cc6666");

  ctx.restore();
}

// ── 2: RAHUL RUNNER ──────────────────────────────────────────────────────────
// White t-shirt, holds mic, energetic run pose
export function drawRahul(ctx: CanvasRenderingContext2D, opt: DrawOptions) {
  const { x, y, frame, isSliding, isInvincible, isPowerActive } = opt;
  const sy = isSliding ? y + 16 : y;
  const sh = isSliding ? 0.5 : 1;

  if (isInvincible || isPowerActive) drawGlow(ctx, x, sy, "#ff8800");

  ctx.save();
  ctx.translate(x, sy);
  ctx.scale(1, sh);

  // Legs - blue jeans
  const ll = legOffset(frame, "left");
  const rl = legOffset(frame, "right");
  pr(ctx, 8,  48 + ll, 10, 18, "#1e3a8a");
  pr(ctx, 22, 48 + rl, 10, 18, "#1e3a8a");
  pr(ctx, 6,  64 + ll, 14, 5, "#ffffff");
  pr(ctx, 20, 64 + rl, 14, 5, "#ffffff");

  // White t-shirt
  pr(ctx, 4, 20, 32, 32, "#f0f0f0");
  // Congress logo hint
  pr(ctx, 12, 28, 16, 12, "#ffffff");

  // Arms
  const armSwing = Math.sin(frame * 0.8) * 4;
  pr(ctx, -2, 22 + armSwing, 10, 8, "#f0f0f0");
  pr(ctx, 32, 22 - armSwing, 10, 8, "#f0f0f0");
  // Hands
  pc(ctx, 2,  32 + armSwing, 5, "#d4956a");
  pc(ctx, 38, 32 - armSwing, 5, "#d4956a");

  // Mic in right hand (signature)
  const micY = 32 - armSwing;
  pr(ctx, 36, micY - 4, 6, 12, "#888888"); // mic handle
  pc(ctx, 39, micY - 6, 6, "#444444");     // mic head

  // Head
  pc(ctx, 20, 12, 13, "#d4956a");

  // Dark hair
  pr(ctx, 7,  1, 26, 10, "#1a0a00");
  pr(ctx, 5,  4, 30, 6,  "#1a0a00");

  // Eyes
  pr(ctx, 13, 10, 5, 4, "#2a1000");
  pr(ctx, 22, 10, 5, 4, "#2a1000");

  // Smile
  pr(ctx, 13, 18, 14, 3, "#cc7755");

  ctx.restore();
}

// ── 3: KEJRIWAL RUNNER ──────────────────────────────────────────────────────
// Grey muffler, simple clothes, runs with conviction
export function drawKejriwal(ctx: CanvasRenderingContext2D, opt: DrawOptions) {
  const { x, y, frame, isSliding, isInvincible, isPowerActive } = opt;
  const sy = isSliding ? y + 16 : y;
  const sh = isSliding ? 0.5 : 1;

  if (isInvincible || isPowerActive) drawGlow(ctx, x, sy, "#39ff14");

  ctx.save();
  ctx.translate(x, sy);
  ctx.scale(1, sh);

  // Legs
  const ll = legOffset(frame, "left");
  const rl = legOffset(frame, "right");
  pr(ctx, 8,  48 + ll, 10, 18, "#555555");
  pr(ctx, 22, 48 + rl, 10, 18, "#555555");
  pr(ctx, 6,  64 + ll, 14, 5, "#333333");
  pr(ctx, 20, 64 + rl, 14, 5, "#333333");

  // Simple grey sweater
  pr(ctx, 4, 20, 32, 32, "#888888");

  // Arms
  const armSwing = Math.sin(frame * 0.8) * 4;
  pr(ctx, -2, 22 + armSwing, 10, 8, "#888888");
  pr(ctx, 32, 22 - armSwing, 10, 8, "#888888");
  pc(ctx, 2,  32 + armSwing, 5, "#d4956a");
  pc(ctx, 38, 32 - armSwing, 5, "#d4956a");

  // Head
  pc(ctx, 20, 12, 12, "#d4956a");

  // Dark hair, slightly messy
  pr(ctx, 8,  1, 24, 9, "#111111");

  // ICONIC MUFFLER — wrapped around neck
  pr(ctx, 0,  20, 40, 8, "#cc3333"); // muffler across
  pr(ctx, -4, 16, 10, 14, "#cc3333"); // left hang
  pr(ctx, -6, 24, 8,  20, "#cc3333");

  // Eyes
  pr(ctx, 13, 10, 5, 4, "#1a0000");
  pr(ctx, 22, 10, 5, 4, "#1a0000");

  // AAP broom icon on sweater
  pr(ctx, 14, 30, 12, 2, "#39ff14");
  pr(ctx, 12, 32, 2,  8, "#39ff14");
  pr(ctx, 16, 32, 2,  8, "#39ff14");
  pr(ctx, 26, 32, 2,  8, "#39ff14");

  ctx.restore();
}

// ── 4: BIDEN RUNNER ──────────────────────────────────────────────────────────
// Aviator sunglasses, dark suit, dignified run
export function drawBiden(ctx: CanvasRenderingContext2D, opt: DrawOptions) {
  const { x, y, frame, isSliding, isInvincible, isPowerActive } = opt;
  const sy = isSliding ? y + 16 : y;
  const sh = isSliding ? 0.5 : 1;

  if (isInvincible || isPowerActive) drawGlow(ctx, x, sy, "#0044ff");

  ctx.save();
  ctx.translate(x, sy);
  ctx.scale(1, sh);

  // Legs - dark suit trousers
  const ll = legOffset(frame, "left");
  const rl = legOffset(frame, "right");
  pr(ctx, 8,  48 + ll, 10, 18, "#1a1a2e");
  pr(ctx, 22, 48 + rl, 10, 18, "#1a1a2e");
  pr(ctx, 6,  64 + ll, 14, 5, "#000000");
  pr(ctx, 20, 64 + rl, 14, 5, "#000000");

  // Dark navy suit
  pr(ctx, 4, 20, 32, 32, "#0d1b3e");
  // White shirt
  pr(ctx, 12, 20, 16, 20, "#ffffff");
  // Blue tie
  pr(ctx, 17, 22, 6, 28, "#0055aa");

  // Arms
  const armSwing = Math.sin(frame * 0.8) * 4;
  pr(ctx, -2, 22 + armSwing, 10, 8, "#0d1b3e");
  pr(ctx, 32, 22 - armSwing, 10, 8, "#0d1b3e");
  pc(ctx, 2,  32 + armSwing, 5, "#f0d5b0");
  pc(ctx, 38, 32 - armSwing, 5, "#f0d5b0");

  // Head - white hair
  pc(ctx, 20, 12, 13, "#f0d5b0");
  pr(ctx, 7,  1, 26, 8, "#d0d0d0");  // white hair

  // Aviator sunglasses (signature)
  pr(ctx, 10, 9, 10, 6, "#111111"); // left lens
  pr(ctx, 22, 9, 10, 6, "#111111"); // right lens
  pr(ctx, 20, 10, 4,  2, "#888888"); // bridge
  pr(ctx, 8,  10, 4,  2, "#888888"); // left arm
  pr(ctx, 30, 10, 4,  2, "#888888"); // right arm

  // Smile
  pr(ctx, 13, 18, 14, 3, "#cc7755");

  // US flag pin on lapel
  pr(ctx, 8, 28, 6, 4, "#cc0000");
  pr(ctx, 8, 30, 6, 2, "#ffffff");
  pr(ctx, 8, 32, 6, 2, "#0000cc");

  ctx.restore();
}

// ── 5: PUTIN RUNNER ──────────────────────────────────────────────────────────
// Black suit, stern face, composed power run
export function drawPutin(ctx: CanvasRenderingContext2D, opt: DrawOptions) {
  const { x, y, frame, isSliding, isInvincible, isPowerActive } = opt;
  const sy = isSliding ? y + 16 : y;
  const sh = isSliding ? 0.5 : 1;

  if (isInvincible || isPowerActive) drawGlow(ctx, x, sy, "#aa0000");

  ctx.save();
  ctx.translate(x, sy);
  ctx.scale(1, sh);

  // Legs - black trousers
  const ll = legOffset(frame, "left");
  const rl = legOffset(frame, "right");
  pr(ctx, 8,  48 + ll, 10, 18, "#050505");
  pr(ctx, 22, 48 + rl, 10, 18, "#050505");
  pr(ctx, 6,  64 + ll, 14, 5, "#111111");
  pr(ctx, 20, 64 + rl, 14, 5, "#111111");

  // Black suit
  pr(ctx, 4, 20, 32, 32, "#111111");
  // White shirt
  pr(ctx, 12, 20, 16, 20, "#eeeeee");
  // Grey tie
  pr(ctx, 17, 22, 6, 28, "#555555");

  // Arms — minimal swing (he runs composed)
  const armSwing = Math.sin(frame * 0.8) * 2;
  pr(ctx, -2, 22 + armSwing, 10, 8, "#111111");
  pr(ctx, 32, 22 - armSwing, 10, 8, "#111111");
  pc(ctx, 2,  32 + armSwing, 5, "#e8c9a0");
  pc(ctx, 38, 32 - armSwing, 5, "#e8c9a0");

  // Head - light pale
  pc(ctx, 20, 12, 12, "#e8c9a0");

  // Minimal hair / very short
  pr(ctx, 10, 2, 20, 5, "#c8a880");

  // Stern eyes
  pr(ctx, 12, 9,  6, 4, "#3a2000");
  pr(ctx, 22, 9,  6, 4, "#3a2000");
  // Brow furrows
  pr(ctx, 12, 7,  6, 2, "#5a3a10");
  pr(ctx, 22, 7,  6, 2, "#5a3a10");

  // Stern mouth / slight frown
  pr(ctx, 13, 18, 14, 2, "#9a6a5a");

  // Russian medal on lapel
  pr(ctx, 7, 28, 8, 8, "#cc0000");
  pr(ctx, 9, 30, 4, 4, "#ffd700");

  // KGB ghost effect indicator
  if (isPowerActive) {
    ctx.globalAlpha = 0.5;
    pr(ctx, 0, 0, 40, 68, "#440044");
    ctx.globalAlpha = 1.0;
  }

  ctx.restore();
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  characterId: CharacterId,
  opt: DrawOptions
) {
  switch (characterId) {
    case 0: drawModi(ctx, opt);     break;
    case 1: drawTrump(ctx, opt);    break;
    case 2: drawRahul(ctx, opt);    break;
    case 3: drawKejriwal(ctx, opt); break;
    case 4: drawBiden(ctx, opt);    break;
    case 5: drawPutin(ctx, opt);    break;
  }
}

// ─── Character metadata ───────────────────────────────────────────────────────
export interface CharacterInfo {
  id:          CharacterId;
  name:        string;
  power:       string;
  powerDesc:   string;
  color:       string;
  accentColor: string;
  runSpeed:    number;
}

export const CHARACTERS: CharacterInfo[] = [
  {
    id:          0,
    name:        "MODI RUNNER",
    power:       "Vikas Shield",
    powerDesc:   "Temporary invincibility — nothing touches Vikas!",
    color:       "#ff7722",
    accentColor: "#ff9944",
    runSpeed:    1.0,
  },
  {
    id:          1,
    name:        "TRUMP RUNNER",
    power:       "The Wall",
    powerDesc:   "Destroys the next obstacle completely.",
    color:       "#ff4400",
    accentColor: "#ff9966",
    runSpeed:    0.95,
  },
  {
    id:          2,
    name:        "RAHUL RUNNER",
    power:       "Bharat Jodo",
    powerDesc:   "Magnet — all nearby coins fly to you!",
    color:       "#ffffff",
    accentColor: "#ff8800",
    runSpeed:    1.05,
  },
  {
    id:          3,
    name:        "KEJRIWAL RUNNER",
    power:       "AAP Scan",
    powerDesc:   "Reveals hidden coins in all lanes.",
    color:       "#888888",
    accentColor: "#39ff14",
    runSpeed:    1.0,
  },
  {
    id:          4,
    name:        "BIDEN RUNNER",
    power:       "Aviator Boost",
    powerDesc:   "Speed burst — run faster than ever!",
    color:       "#0d1b3e",
    accentColor: "#0055aa",
    runSpeed:    1.1,
  },
  {
    id:          5,
    name:        "PUTIN RUNNER",
    power:       "KGB Ghost",
    powerDesc:   "Phase through one obstacle completely.",
    color:       "#111111",
    accentColor: "#aa0000",
    runSpeed:    0.98,
  },
];
