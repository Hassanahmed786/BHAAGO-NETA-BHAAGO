// ─── GameEngine — Main 60 FPS Game Loop ──────────────────────────────────────
import { Player, LaneConfig, PLAYER_WIDTH, PLAYER_HEIGHT, LANE_COUNT } from "./Player";
import { ObstacleSpawner, Obstacle, ObstacleType } from "./Obstacle";
import { CoinSpawner, Coin } from "./Coin";
import { Background } from "./Background";
import { Renderer } from "./Renderer";
import { CharacterId, CHARACTERS } from "./characters/drawCharacters";
import { SoundEngine } from "./SoundEngine";

export type GameState = "idle" | "playing" | "dying" | "dead";

export interface GameStats {
  score:             number;
  coins:             number;
  distance:          number;
  combo:             number;
  multiplier:        number;
  gameSpeed:         number;
  state:             GameState;
  collectedCoinIds:  number[];
  sessionCoins:      number;    // coins since last batch TX
  totalSessionCoins: number;    // total in this session
  highScore:         number;
}

type OnCoinBatchCallback   = (count: number) => void;
type OnGameOverCallback    = (score: number, coins: number) => void;
type OnScoreUpdateCallback = (stats: GameStats) => void;
type OnPowerUsedCallback   = (powerName: string) => void;
type OnDeathCallback       = (killerType: ObstacleType, characterId: CharacterId) => void;

const INITIAL_SPEED     = 5;
const SPEED_INCREMENT   = 0.0015;
const SCORE_PER_PIXEL   = 0.1;
const COIN_BATCH_SIZE   = 5;    // send TX every N coins
const LANE_WIDTH_RATIO  = 0.22; // each lane is % of canvas width

export class GameEngine {
  // Canvas & context
  canvas:  HTMLCanvasElement;
  ctx:     CanvasRenderingContext2D;
  canvasW: number = 800;
  canvasH: number = 600;
  groundY: number = 480;

  // Game entities
  player!:   Player;
  obstacles!: ObstacleSpawner;
  coins!:     CoinSpawner;
  bg!:        Background;
  renderer!:  Renderer;
  sound!:     SoundEngine;

  // Lane config
  laneConfig!: LaneConfig;

  // Game state
  state:      GameState     = "idle";
  stats:      GameStats;
  characterId: CharacterId  = 0;
  highScore:  number        = 0;

  // Loop
  private _rafId:     number = 0;
  private _lastTime:  number = 0;
  private _deathTimer: number = 0;
  private _distanceFrac: number = 0;

  // Callbacks
  onCoinBatch:   OnCoinBatchCallback   | null = null;
  onGameOver:    OnGameOverCallback    | null = null;
  onScoreUpdate: OnScoreUpdateCallback | null = null;
  onPowerUsed:   OnPowerUsedCallback   | null = null;
  onDeath:       OnDeathCallback       | null = null;

  // Killer obstacle — for highlight during death animation
  killerObstacle: { type: ObstacleType; x: number; y: number; w: number; h: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext("2d")!;
    this.stats   = this._freshStats();
    this._resize();
    this.sound   = new SoundEngine();
  }

  // ─── Setup ───────────────────────────────────────────────────────────────────
  private _computeLaneConfig(): LaneConfig {
    const laneW = this.canvasW * LANE_WIDTH_RATIO;
    const totalW = laneW * LANE_COUNT;
    const startX = (this.canvasW - totalW) / 2 + laneW / 2;
    return {
      x: [startX, startX + laneW, startX + laneW * 2],
      y: this.groundY,
    };
  }

  private _resize() {
    this.canvasW = this.canvas.width  = this.canvas.offsetWidth  || window.innerWidth;
    this.canvasH = this.canvas.height = this.canvas.offsetHeight || window.innerHeight;
    this.groundY = this.canvasH * 0.78;
    this.laneConfig = this._computeLaneConfig();
    if (this.renderer) this.renderer.resize(this.canvasW, this.canvasH, this.groundY);
    if (this.bg)       this.bg.resize(this.canvasW, this.canvasH, this.groundY);
  }

  private _freshStats(): GameStats {
    return {
      score:             0,
      coins:             0,
      distance:          0,
      combo:             0,
      multiplier:        1,
      gameSpeed:         INITIAL_SPEED,
      state:             "idle",
      collectedCoinIds:  [],
      sessionCoins:      0,
      totalSessionCoins: 0,
      highScore:         this.highScore,
    };
  }

  // ─── Input ────────────────────────────────────────────────────────────────────
  private _keys: Set<string> = new Set();
  private _slideKeyHeld: boolean = false;

  attachInputHandlers() {
    const onKeyDown = (e: KeyboardEvent) => {
      if (this._keys.has(e.code)) return;
      this._keys.add(e.code);
      this._handleKey(e.code, true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this._keys.delete(e.code);
      if ((e.code === "ArrowDown" || e.code === "KeyS") && this.player) {
        this._slideKeyHeld = false;
        this.player.endSlide();
      }
    };

    // Touch support for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < -30) this._handleKey("ArrowLeft",  true);
        if (dx >  30) this._handleKey("ArrowRight", true);
      } else {
        if (dy < -30) this._handleKey("ArrowUp",   true);
        if (dy >  30) this._handleKey("ArrowDown",  true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    this.canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    this.canvas.addEventListener("touchend",   onTouchEnd,   { passive: true });

    // Store for cleanup
    (this as any)._keyDown  = onKeyDown;
    (this as any)._keyUp    = onKeyUp;
    (this as any)._touchStart = onTouchStart;
    (this as any)._touchEnd   = onTouchEnd;
  }

  private _handleKey(code: string, pressed: boolean) {
    if (!pressed) return;
    if (this.state !== "playing") return;

    switch (code) {
      case "ArrowLeft":
      case "KeyA":
        this.player.moveLeft();
        this.sound.playWhoosh(0.3);
        break;
      case "ArrowRight":
      case "KeyD":
        this.player.moveRight();
        this.sound.playWhoosh(0.3);
        break;
      case "ArrowUp":
      case "KeyW":
      case "Space":
        this.player.jump();
        this.sound.playJump();
        break;
      case "ArrowDown":
      case "KeyS":
        this._slideKeyHeld = true;
        this.player.startSlide();
        break;
      case "ShiftLeft":
      case "ShiftRight":
      case "KeyZ":
        this._activatePower();
        break;
    }
  }

  detachInputHandlers() {
    window.removeEventListener("keydown", (this as any)._keyDown);
    window.removeEventListener("keyup",   (this as any)._keyUp);
    this.canvas.removeEventListener("touchstart", (this as any)._touchStart);
    this.canvas.removeEventListener("touchend",   (this as any)._touchEnd);
  }

  // ─── Power ────────────────────────────────────────────────────────────────────
  private _activatePower() {
    if (!this.player || this.player.power.active || this.player.power.cooldown) return;
    this.player.activatePower();

    const charInfo = CHARACTERS[this.characterId];
    this.sound.playPowerActivate();
    this.renderer.spawnPowerEffect(
      this.player.x + PLAYER_WIDTH / 2,
      this.player.y + PLAYER_HEIGHT / 2,
      charInfo.accentColor
    );

    // Character-specific effects
    if (this.characterId === 3) {
      // Kejriwal AAP Scan — reveal hidden coins
      this.coins.revealHiddenCoins();
    }

    if (this.onPowerUsed) {
      this.onPowerUsed(charInfo.power);
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────
  init(characterId: CharacterId = 0) {
    this.characterId = characterId;
    this._resize();

    this.laneConfig = this._computeLaneConfig();
    this.player     = new Player(this.laneConfig, characterId);
    this.obstacles  = new ObstacleSpawner(this.laneConfig.x, this.groundY);
    this.coins      = new CoinSpawner(this.laneConfig.x, this.groundY, this.canvasW);
    this.bg         = new Background(this.canvasW, this.canvasH, this.groundY);
    this.renderer   = new Renderer(this.ctx, this.canvasW, this.canvasH, this.groundY);

    this.stats      = this._freshStats();
    this.state      = "idle";

    this.attachInputHandlers();
  }

  start() {
    this.state        = "playing";
    this.stats.state  = "playing";
    this._lastTime    = performance.now();
    this._loop(this._lastTime);
  }

  pause() {
    cancelAnimationFrame(this._rafId);
  }

  resume() {
    this._lastTime = performance.now();
    this._loop(this._lastTime);
  }

  restart(characterId: CharacterId) {
    cancelAnimationFrame(this._rafId);
    this.init(characterId);
    this.start();
  }

  destroy() {
    cancelAnimationFrame(this._rafId);
    this.detachInputHandlers();
  }

  resize() {
    this._resize();
  }

  // ─── Main Loop ───────────────────────────────────────────────────────────────
  private _loop = (timestamp: number) => {
    const dt   = Math.min(timestamp - this._lastTime, 50); // cap at 50ms
    this._lastTime = timestamp;

    this._update(dt);
    this._draw();

    this._rafId = requestAnimationFrame(this._loop);
  };

  private _update(dt: number) {
    if (this.state === "dying") {
      this._deathTimer += dt;
      this.renderer.update(dt);
      if (this._deathTimer > 1200) {
        this.state = "dead";
        this.stats.state = "dead";
        if (this.stats.score > this.highScore) this.highScore = this.stats.score;
        if (this.onGameOver) this.onGameOver(this.stats.score, this.stats.totalSessionCoins);
      }
      return;
    }

    if (this.state !== "playing") return;

    const speed = this.stats.gameSpeed;

    // Speed ramp
    this.stats.gameSpeed = Math.min(
      INITIAL_SPEED + this.stats.score * SPEED_INCREMENT,
      22
    );

    // Distance / score
    this._distanceFrac += speed;
    if (this._distanceFrac >= 10) {
      this.stats.distance += Math.floor(this._distanceFrac / 10);
      const points = Math.floor(this._distanceFrac / 10) * this.stats.multiplier;
      this.stats.score    += points;
      this._distanceFrac  = this._distanceFrac % 10;
    }

    // Update subsystems
    this.player.update(dt);
    this.bg.update(dt, speed);
    this.obstacles.update(dt, speed, this.canvasW);
    this.coins.update(
      dt,
      speed,
      this.player.magnetActive,
      this.player.x + PLAYER_WIDTH / 2,
      this.player.y + PLAYER_HEIGHT / 2
    );
    this.renderer.update(dt);

    // Collision detection — obstacles
    if (!this.player.invincible && !this.player.ghostActive) {
      for (const obs of this.obstacles.obstacles) {
        if (obs.removed) continue;
        if (this.player.collidesWith(obs.x, obs.y, obs.width, obs.height)) {
          if (this.player.wallActive) {
            // Trump Wall — destroy obstacle
            obs.removed           = true;
            this.player.wallActive = false;
            this.renderer.spawnPowerEffect(obs.x + obs.width / 2, obs.y + obs.height / 2, "#ff4400");
            this.sound.playPowerActivate();
          } else {
            this._triggerDeath(obs);
            return;
          }
        }
      }
    }

    // Collision detection — coins
    for (const coin of [...this.coins.coins, ...this.coins.hiddenCoins]) {
      if (coin.collected) continue;
      if (
        this.player.x < coin.x + coin.width &&
        this.player.x + PLAYER_WIDTH > coin.x &&
        this.player.y < coin.y + coin.height &&
        this.player.y + PLAYER_HEIGHT > coin.y
      ) {
        this._collectCoin(coin);
      }
    }

    // Biden speed boost
    if (this.characterId === 4 && this.player.power.active) {
      this.stats.gameSpeed = Math.min(this.stats.gameSpeed + 4, 26);
    }

    // Emit score updates
    if (this.onScoreUpdate) {
      this.onScoreUpdate({ ...this.stats });
    }
  }

  private _collectCoin(coin: Coin) {
    this.coins.collectById(coin.id);

    this.stats.coins++;
    this.stats.totalSessionCoins++;
    this.stats.sessionCoins++;
    this.stats.collectedCoinIds.push(coin.id);
    this.stats.combo++;
    this.stats.multiplier = Math.min(1 + Math.floor(this.stats.combo / 5) * 0.5, 5);
    this.stats.score += coin.value * this.stats.multiplier;

    // Immunity star
    if (coin.type === "immunity_star") {
      this.player.grantInvincibility(3000);
      this.renderer.spawnPowerEffect(
        this.player.x + PLAYER_WIDTH / 2,
        this.player.y,
        "#ff4ece"
      );
    }

    this.sound.playCoinCollect();
    this.renderer.spawnCoinEffect(coin.x + coin.width / 2, coin.y + coin.height / 2);

    // Batch TX
    if (this.stats.sessionCoins >= COIN_BATCH_SIZE && coin.coinCount > 0) {
      const batchCount = this.stats.sessionCoins;
      this.stats.sessionCoins = 0;
      if (this.onCoinBatch) this.onCoinBatch(batchCount);
    }
  }

  private _triggerDeath(obs: Obstacle) {
    this.state           = "dying";
    this.stats.state     = "dying";
    this._deathTimer     = 0;
    this.player.die();
    this.sound.playDeath();
    this.renderer.spawnHitEffect(obs.x, obs.y);
    this.renderer.startScreenShake(15, 500);

    // Record which obstacle killed the player for highlight + quip
    this.killerObstacle = { type: obs.type, x: obs.x, y: obs.y, w: obs.width, h: obs.height };
    if (this.onDeath) this.onDeath(obs.type, this.characterId);

    // Send remaining coins
    if (this.stats.sessionCoins > 0 && this.onCoinBatch) {
      this.onCoinBatch(this.stats.sessionCoins);
      this.stats.sessionCoins = 0;
    }
  }

  // ─── Draw ─────────────────────────────────────────────────────────────────────
  private _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    this.renderer.beginFrame();
    this.renderer.drawBackground(this.bg);

    if (this.state === "playing" || this.state === "dying") {
      this.renderer.drawCoins(this.coins.coins, false);
      this.renderer.drawHiddenCoins(this.coins.hiddenCoins, this.characterId === 3 && this.player.power.active);
      this.renderer.drawObstacles(this.obstacles.obstacles);
      this.renderer.drawPlayer(this.player);
      this.renderer.drawEffects(0);
      this.renderer.drawSpeedLines(this.stats.gameSpeed);
      this.renderer.drawPowerBar(this.player, this.canvasH);
    }

    if (this.state === "dying") {
      const progress = Math.min(this._deathTimer / 800, 1);
      this.renderer.drawDeathOverlay(progress);

      // Pulsing highlight around the killer obstacle
      if (this.killerObstacle) {
        const pulse = 0.55 + 0.45 * Math.sin(this._deathTimer * 0.012);
        const { x, y, w, h } = this.killerObstacle;
        const pad = 6;
        const ctx = this.ctx;
        ctx.save();
        ctx.shadowColor = "#ff0040";
        ctx.shadowBlur  = 24 * pulse;
        ctx.strokeStyle = `rgba(255,0,64,${pulse})`;
        ctx.lineWidth   = 3;
        ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
        // Diagonal warning stripes top-bar
        ctx.fillStyle = `rgba(255,200,0,${pulse * 0.7})`;
        ctx.fillRect(x - pad, y - pad - 10, w + pad * 2, 10);
        ctx.restore();
      }
    }

    this.renderer.endFrame();
  }

  // ─── Getters ──────────────────────────────────────────────────────────────────
  getStats(): GameStats {
    return { ...this.stats };
  }

  isPlaying(): boolean {
    return this.state === "playing";
  }
}
