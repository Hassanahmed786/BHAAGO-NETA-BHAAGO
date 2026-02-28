// ─── Renderer — all canvas draw operations ────────────────────────────────────
import { Player, PLAYER_WIDTH, PLAYER_HEIGHT } from "./Player";
import { Obstacle, OBSTACLE_CONFIG } from "./Obstacle";
import { Coin, COIN_CONFIGS } from "./Coin";
import { drawCharacter } from "./characters/drawCharacters";
import { Background } from "./Background";

interface ParticleEffect {
  id:     number;
  x:      number;
  y:      number;
  type:   "coin_collect" | "obstacle_hit" | "power_activate";
  timer:  number;
  maxTime: number;
  particles: Array<{ vx: number; vy: number; color: string; size: number }>;
}

let _effectId = 0;

export class Renderer {
  ctx:       CanvasRenderingContext2D;
  canvasW:   number;
  canvasH:   number;
  groundY:   number;
  effects:   ParticleEffect[] = [];
  shakeTimer: number = 0;
  shakeAmt:   number = 0;

  // Scanline shader overlay
  private scanlineOffset: number = 0;

  constructor(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, groundY: number) {
    this.ctx     = ctx;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.groundY = groundY;
  }

  resize(canvasW: number, canvasH: number, groundY: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.groundY = groundY;
  }

  startScreenShake(amount: number = 10, duration: number = 300) {
    this.shakeTimer = duration;
    this.shakeAmt   = amount;
  }

  spawnCoinEffect(x: number, y: number) {
    const particles = Array.from({ length: 10 }, () => ({
      vx:    (Math.random() - 0.5) * 6,
      vy:    -(Math.random() * 4 + 2),
      color: Math.random() > 0.5 ? "#ffd700" : "#836EF9",
      size:  2 + Math.random() * 4,
    }));
    this.effects.push({ id: _effectId++, x, y, type: "coin_collect", timer: 0, maxTime: 500, particles });
  }

  spawnHitEffect(x: number, y: number) {
    const particles = Array.from({ length: 15 }, () => ({
      vx:    (Math.random() - 0.5) * 8,
      vy:    -(Math.random() * 5 + 1),
      color: Math.random() > 0.5 ? "#ff0080" : "#ff6600",
      size:  3 + Math.random() * 4,
    }));
    this.effects.push({ id: _effectId++, x, y, type: "obstacle_hit", timer: 0, maxTime: 600, particles });
    this.startScreenShake(10, 300);
  }

  spawnPowerEffect(x: number, y: number, color: string) {
    const particles = Array.from({ length: 20 }, () => ({
      vx:    (Math.random() - 0.5) * 10,
      vy:    -(Math.random() * 6 + 3),
      color,
      size:  3 + Math.random() * 5,
    }));
    this.effects.push({ id: _effectId++, x, y, type: "power_activate", timer: 0, maxTime: 800, particles });
  }

  update(dt: number) {
    if (this.shakeTimer > 0) this.shakeTimer -= dt;

    this.effects = this.effects.filter(e => e.timer < e.maxTime);
    for (const eff of this.effects) {
      eff.timer += dt;
      for (const p of eff.particles) {
        p.vy += 0.15; // gravity
        // vy/vx applied at draw time
      }
    }
    this.scanlineOffset = (this.scanlineOffset + 0.5) % this.canvasH;
  }

  beginFrame() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shakeTimer > 0) {
      const shake = Math.sin(this.shakeTimer * 0.05) * this.shakeAmt * (this.shakeTimer / 300);
      ctx.translate(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake
      );
    }
  }

  endFrame() {
    this.ctx.restore();
    this._drawScanlines();
  }

  drawBackground(bg: Background) {
    bg.draw(this.ctx);
  }

  drawPlayer(player: Player) {
    if (!player.visible) return;
    drawCharacter(this.ctx, player.characterId, {
      x:             player.x,
      y:             player.y,
      frame:         player.animFrame,
      isSliding:     player.state === "sliding",
      isJumping:     player.state === "jumping",
      isInvincible:  player.invincible,
      isPowerActive: player.power.active,
    });

    // Lane ring under feet
    const ringX = player.x + PLAYER_WIDTH / 2;
    const ringY = this.groundY;
    this.ctx.save();
    this.ctx.strokeStyle = player.invincible ? "#ffd700" : "rgba(131, 110, 249, 0.4)";
    this.ctx.lineWidth   = 2;
    this.ctx.shadowColor = "#836EF9";
    this.ctx.shadowBlur  = 6;
    this.ctx.beginPath();
    this.ctx.ellipse(ringX, ringY, PLAYER_WIDTH * 0.7, 6, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawObstacles(obstacles: Obstacle[]) {
    for (const obs of obstacles) {
      if (obs.removed) continue;
      this._drawObstacle(obs);
    }
  }

  private _drawObstacle(obs: Obstacle) {
    const ctx = this.ctx;
    const { x, y, width, height, type, animFrame } = obs;
    const cfg = OBSTACLE_CONFIG[type];

    // Glow
    ctx.save();
    ctx.shadowColor = "#ff0080";
    ctx.shadowBlur  = 10;

    switch (type) {
      case "reporter": {
        // Running journalist: dark body, camera
        ctx.fillStyle = "#4a1080";
        ctx.fillRect(x + 4, y + 20, 24, 36);
        // Head
        ctx.fillStyle = "#f5c5a3";
        ctx.beginPath();
        ctx.arc(x + 16, y + 14, 12, 0, Math.PI * 2);
        ctx.fill();
        // Camera (held out front)
        ctx.fillStyle = "#222222";
        ctx.fillRect(x + 22, y + 18, 14, 10);
        ctx.fillStyle = "#555555";
        ctx.beginPath();
        ctx.arc(x + 34, y + 23, 5, 0, Math.PI * 2);
        ctx.fill();
        // Legs running
        const ll = animFrame % 2 === 0 ? 5 : -5;
        ctx.fillStyle = "#222244";
        ctx.fillRect(x + 5,  y + 54 + ll, 9, 14);
        ctx.fillRect(x + 18, y + 54 - ll, 9, 14);
        break;
      }
      case "subpoena": {
        // Flying paper document with red stamp
        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate(Math.sin(animFrame * 0.5) * 0.2);
        ctx.fillStyle = "#fffde7";
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.fillStyle = "#cc0000";
        ctx.font      = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SUBPOENA", 0, -4);
        ctx.fillText("OFFICIAL", 0, 6);
        // Red stamp
        ctx.strokeStyle = "#cc0000";
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.rect(-10, 8, 20, 14);
        ctx.stroke();
        ctx.fillText("GUILTY", 0, 18);
        ctx.restore();
        break;
      }
      case "cbi_agent": {
        // Dark suit agent
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(x + 4, y + 20, 26, 36);
        ctx.fillStyle = "#f5c5a3";
        ctx.beginPath();
        ctx.arc(x + 17, y + 13, 11, 0, Math.PI * 2);
        ctx.fill();
        // Sunglasses
        ctx.fillStyle = "#000000";
        ctx.fillRect(x + 8, y + 10, 8, 5);
        ctx.fillRect(x + 18, y + 10, 8, 5);
        // Badge
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(x + 7, y + 30, 12, 8);
        // Legs
        const ll2 = animFrame % 2 === 0 ? 4 : -4;
        ctx.fillStyle = "#111;";
        ctx.fillStyle = "#111122";
        ctx.fillRect(x + 5,  y + 54 + ll2, 10, 14);
        ctx.fillRect(x + 19, y + 54 - ll2, 10, 14);
        break;
      }
      case "flying_mic": {
        // Tumbling microphone
        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate((animFrame * 45 * Math.PI) / 180);
        ctx.fillStyle = "#888888";
        ctx.fillRect(-3, -height / 3, 6, height * 0.5);
        ctx.fillStyle = "#444444";
        ctx.beginPath();
        ctx.arc(0, -height / 3, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case "chair": {
        // Parliament chair being thrown
        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate(Math.sin(animFrame * 0.8) * 0.4);
        ctx.fillStyle = "#6b3a0f";
        // Seat
        ctx.fillRect(-width / 2, -height / 4, width, height / 4);
        // Back
        ctx.fillRect(-width / 2, -height / 2, width / 5, height / 2);
        ctx.fillRect(width / 3, -height / 2, width / 5, height / 2);
        // Legs
        ctx.fillRect(-width / 2,    height / 8, width / 6, height / 4);
        ctx.fillRect(width / 3,     height / 8, width / 6, height / 4);
        ctx.restore();
        break;
      }
      case "news_van": {
        // TV news van
        ctx.fillStyle = "#334155";
        ctx.fillRect(x, y, width, height);
        // Windows
        ctx.fillStyle = "#93c5fd";
        ctx.fillRect(x + 8,  y + 8,  20, 14);
        ctx.fillRect(x + 32, y + 8,  16, 14);
        // White logo "NEWS"
        ctx.fillStyle = "#ffffff";
        ctx.font      = "bold 7px monospace";
        ctx.textAlign = "left";
        ctx.fillText("NEWS", x + 6, y + 36);
        // Antenna on top
        ctx.fillStyle = "#aaaaaa";
        ctx.fillRect(x + width - 10, y - 14, 2, 14);
        ctx.fillRect(x + width - 16, y - 14, 12, 2);
        // Wheels
        ctx.fillStyle = "#111111";
        ctx.beginPath();
        ctx.arc(x + 16, y + height, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + width - 16, y + height, 10, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "ballot_box": {
        // Heavy ballot box rolling
        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate((animFrame * 10 * Math.PI) / 180);
        ctx.fillStyle = "#064e3b";
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.fillStyle = "#fbbf24";
        ctx.font      = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("VOTE", 0, -4);
        ctx.fillText("BOX",  0,  6);
        // Slot on top
        ctx.fillStyle = "#000000";
        ctx.fillRect(-10, -height / 2 + 2, 20, 4);
        ctx.restore();
        break;
      }
      case "tax_notice": {
        // IT department notice flying
        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate(Math.sin(animFrame * 0.6) * 0.3);
        ctx.fillStyle = "#fef3c7";
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.fillStyle = "#dc2626";
        ctx.font      = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("INCOME", 0, -6);
        ctx.fillText("TAX",    0,  4);
        ctx.fillText("NOTICE", 0, 14);
        // Red border
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth   = 2;
        ctx.strokeRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2);
        ctx.restore();
        break;
      }
    }

    ctx.restore();
  }

  drawCoins(coins: Coin[], scanActive: boolean) {
    for (const coin of coins) {
      if (coin.collected) continue;
      this._drawCoin(coin, false);
    }
  }

  drawHiddenCoins(hiddenCoins: Coin[], scanActive: boolean) {
    if (!scanActive) return;
    for (const coin of hiddenCoins) {
      if (coin.collected) continue;
      this._drawCoin(coin, true);
    }
  }

  private _drawCoin(coin: Coin, hinted: boolean) {
    const ctx = this.ctx;
    ctx.save();

    const drawY = coin.y + coin.bobOffset;
    const alpha = hinted ? 0.5 + coin.glowAlpha * 0.4 : coin.glowAlpha;
    ctx.globalAlpha = alpha;

    switch (coin.type) {
      case "bribe_coin": {
        // Gold spinning coin
        const scaleX = Math.abs(Math.cos((coin.animAngle * Math.PI) / 180));
        ctx.translate(coin.x + coin.width / 2, drawY + coin.height / 2);
        ctx.scale(scaleX || 0.05, 1);
        ctx.fillStyle   = "#ffd700";
        ctx.strokeStyle = "#b8860b";
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(0, 0, coin.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#b8860b";
        ctx.font      = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("₹", 0, 0);
        // Glow
        ctx.strokeStyle = `rgba(255, 215, 0, ${coin.glowAlpha * 0.5})`;
        ctx.lineWidth   = 4;
        ctx.beginPath();
        ctx.arc(0, 0, coin.width / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "diamond_briefcase": {
        ctx.translate(coin.x, drawY);
        // Briefcase body
        ctx.fillStyle = "#0ea5e9";
        ctx.fillRect(0, 4, coin.width, coin.height - 4);
        // Handle
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(7, 0, 14, 6);
        // Diamond shine
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(4, 8, 6, 6);
        // Label
        ctx.fillStyle = "#ffd700";
        ctx.font      = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("x10", coin.width / 2, coin.height - 8);
        // Glow
        ctx.shadowColor = "#00cfff";
        ctx.shadowBlur  = 12;
        ctx.strokeStyle = "#00cfff";
        ctx.lineWidth   = 2;
        ctx.strokeRect(0, 4, coin.width, coin.height - 4);
        break;
      }
      case "immunity_star": {
        ctx.translate(coin.x + coin.width / 2, drawY + coin.height / 2);
        ctx.rotate((coin.animAngle * Math.PI) / 180);
        // 5-pointed star
        ctx.fillStyle   = "#ff4ece";
        ctx.shadowColor = "#ff4ece";
        ctx.shadowBlur  = 16;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle  = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const outerR = coin.width / 2;
          const innerR = outerR * 0.45;
          const ix      = Math.cos(angle) * outerR;
          const iy      = Math.sin(angle) * outerR;
          const angle2  = angle + (2 * Math.PI) / 10;
          const ix2     = Math.cos(angle2) * innerR;
          const iy2     = Math.sin(angle2) * innerR;
          if (i === 0) ctx.moveTo(ix, iy); else ctx.lineTo(ix, iy);
          ctx.lineTo(ix2, iy2);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  drawEffects(dt: number) {
    const ctx = this.ctx;
    for (const eff of this.effects) {
      const progress = eff.timer / eff.maxTime;
      for (let i = 0; i < eff.particles.length; i++) {
        const p = eff.particles[i];
        const px = eff.x + p.vx * eff.timer * 0.05;
        const py = eff.y + p.vy * eff.timer * 0.05;
        ctx.save();
        ctx.globalAlpha = (1 - progress) * 0.9;
        ctx.fillStyle   = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = 6;
        ctx.beginPath();
        ctx.arc(px, py, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawSpeedLines(gameSpeed: number) {
    if (gameSpeed < 8) return;
    const ctx      = this.ctx;
    const intensity = Math.min(1, (gameSpeed - 8) / 10);
    ctx.strokeStyle = `rgba(131, 110, 249, ${intensity * 0.15})`;
    ctx.lineWidth   = 1;
    for (let i = 0; i < 8; i++) {
      const lx  = Math.random() * this.canvasW;
      const ly1 = Math.random() * this.groundY;
      const len = 30 + Math.random() * 80;
      ctx.beginPath();
      ctx.moveTo(lx,       ly1);
      ctx.lineTo(lx - len, ly1);
      ctx.stroke();
    }
  }

  private _drawScanlines() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle   = "#000000";
    for (let sy = 0; sy < this.canvasH; sy += 4) {
      ctx.fillRect(0, sy, this.canvasW, 2);
    }
    ctx.restore();
  }

  drawDeathOverlay(progress: number) {
    // Red flash on death
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = progress * 0.5;
    ctx.fillStyle   = "#ff0000";
    ctx.fillRect(0, 0, this.canvasW, this.canvasH);
    ctx.restore();
  }

  drawPowerBar(player: Player, canvasH: number) {
    // drawn by HUD overlay in React but we keep an optional canvas fallback
    const ctx   = this.ctx;
    const barW  = 160;
    const barH  = 14;
    const bx    = 20;
    const by    = canvasH - 36;

    ctx.save();
    ctx.fillStyle   = "rgba(14, 11, 30, 0.7)";
    ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);

    let fillRatio = 0;
    if (player.power.active)   fillRatio = player.power.timeLeft / player.power.maxTime;
    if (player.power.cooldown) fillRatio = player.power.coolLeft / player.power.maxCool;

    const fillColor = player.power.active ? "#39ff14" : player.power.cooldown ? "#555" : "#836EF9";
    ctx.fillStyle   = fillColor;
    ctx.shadowColor = fillColor;
    ctx.shadowBlur  = player.power.active ? 10 : 0;
    ctx.fillRect(bx, by, barW * (player.power.active || player.power.cooldown ? fillRatio : 1), barH);

    ctx.fillStyle   = "#c4b5fd";
    ctx.font        = "8px 'Press Start 2P', monospace";
    ctx.textBaseline = "middle";
    ctx.fillText("POWER", bx + barW + 10, by + barH / 2);
    ctx.restore();
  }
}
