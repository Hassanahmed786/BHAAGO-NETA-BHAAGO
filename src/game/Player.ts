import { CharacterId, CHARACTERS } from "./characters/drawCharacters";

// ─── Configuration ────────────────────────────────────────────────────────────
export const LANE_COUNT    = 3;
export const GRAVITY       = 0.6;
export const JUMP_FORCE    = -15;
export const PLAYER_WIDTH  = 40;
export const PLAYER_HEIGHT = 68;
export const SLIDE_HEIGHT  = 34;

// Lane x-positions are set by the GameEngine based on canvas width
export interface LaneConfig {
  x: number[];
  y: number;  // ground Y position
}

export type PlayerState = "running" | "jumping" | "sliding" | "dead";

export interface PowerState {
  active:    boolean;
  cooldown:  boolean;
  timeLeft:  number;  // ms
  maxTime:   number;  // ms
  coolLeft:  number;  // ms
  maxCool:   number;  // ms
}

export class Player {
  // Position
  x:    number = 0;
  y:    number = 0;
  velY: number = 0;

  // Lane
  lane:       number = 1;  // 0 = left, 1 = center, 2 = right
  targetLane: number = 1;
  laneConfig: LaneConfig;

  // State
  state:        PlayerState = "running";
  characterId:  CharacterId = 0;
  animFrame:    number      = 0;
  animTimer:    number      = 0;
  frameInterval: number     = 100; // ms per frame

  // Invincibility
  invincible:      boolean = false;
  invincibleTimer: number  = 0;
  flashTimer:      number  = 0;
  visible:         boolean = true;

  // Power
  power: PowerState = {
    active:   false,
    cooldown: false,
    timeLeft: 0,
    maxTime:  5000,
    coolLeft: 0,
    maxCool:  15000,
  };

  // Wall power (Trump) — destroys next obstacle
  wallActive: boolean = false;

  // Bharat Jodo power (Rahul) — magnet
  magnetActive: boolean = false;

  // KGB Ghost power (Putin) — pass through one obstacle
  ghostActive: boolean = false;

  // Hitbox (derived from position + state)
  get hitboxX()      { return this.x + 4; }
  get hitboxY()      { return this.y + 4; }
  get hitboxWidth()  { return PLAYER_WIDTH - 8; }
  get hitboxHeight() {
    return this.state === "sliding"
      ? SLIDE_HEIGHT - 4
      : PLAYER_HEIGHT - 8;
  }

  constructor(laneConfig: LaneConfig, characterId: CharacterId = 0) {
    this.laneConfig  = laneConfig;
    this.characterId = characterId;
    this.x           = laneConfig.x[1] - PLAYER_WIDTH / 2;
    this.y           = laneConfig.y - PLAYER_HEIGHT;
    this.lane        = 1;
    this.targetLane  = 1;
    this.power.maxTime = 5000;
    this.power.maxCool = 15000;
  }

  update(dt: number) {
    this._updateLane(dt);
    this._updateVertical(dt);
    this._updateAnimation(dt);
    this._updateInvincibility(dt);
    this._updatePower(dt);
  }

  // ─── Lane movement ──────────────────────────────────────────────────────────
  private _updateLane(dt: number) {
    const targetX = this.laneConfig.x[this.targetLane] - PLAYER_WIDTH / 2;
    const diff    = targetX - this.x;
    const speed   = 12;   // pixels per frame at 60fps

    if (Math.abs(diff) < speed) {
      this.x    = targetX;
      this.lane = this.targetLane;
    } else {
      this.x += Math.sign(diff) * speed;
    }
  }

  moveLeft()  { if (this.targetLane > 0)            this.targetLane--; }
  moveRight() { if (this.targetLane < LANE_COUNT - 1) this.targetLane++; }

  // ─── Vertical movement ──────────────────────────────────────────────────────
  private _updateVertical(_dt: number) {
    const groundY = this.laneConfig.y - PLAYER_HEIGHT;

    if (this.state === "jumping") {
      this.velY += GRAVITY;
      this.y    += this.velY;

      if (this.y >= groundY) {
        this.y    = groundY;
        this.velY = 0;
        this.state = "running";
      }
    }
  }

  jump() {
    if (this.state === "running" || this.state === "sliding") {
      this.state = "jumping";
      this.velY  = JUMP_FORCE;
    }
  }

  startSlide() {
    if (this.state === "running") {
      this.state = "sliding";
    }
  }

  endSlide() {
    if (this.state === "sliding") {
      this.state = "running";
    }
  }

  // ─── Animation ──────────────────────────────────────────────────────────────
  private _updateAnimation(dt: number) {
    if (this.state === "running") {
      this.animTimer += dt;
      if (this.animTimer >= this.frameInterval) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }
    } else {
      this.animFrame = 0;
    }
  }

  // ─── Invincibility post-collision ────────────────────────────────────────────
  private _updateInvincibility(dt: number) {
    if (this.invincible) {
      this.invincibleTimer -= dt;
      this.flashTimer      += dt;
      if (this.flashTimer > 100) {
        this.flashTimer = 0;
        this.visible    = !this.visible;
      }
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.visible    = true;
      }
    }
  }

  grantInvincibility(duration: number = 2000) {
    this.invincible      = true;
    this.invincibleTimer = duration;
    this.flashTimer      = 0;
    this.visible         = true;
  }

  // ─── Power ability ───────────────────────────────────────────────────────────
  activatePower() {
    if (this.power.active || this.power.cooldown) return;
    this.power.active   = true;
    this.power.timeLeft = this.power.maxTime;

    const cid = this.characterId;
    if (cid === 0) {
      // Modi — Vikas Shield
      this.invincible      = true;
      this.invincibleTimer = this.power.maxTime;
    } else if (cid === 1) {
      // Trump — Wall
      this.wallActive = true;
    } else if (cid === 2) {
      // Rahul — Bharat Jodo Magnet
      this.magnetActive = true;
    } else if (cid === 3) {
      // Kejriwal — AAP Scan (handled in GameEngine)
    } else if (cid === 4) {
      // Biden — Aviator Boost (handled in GameEngine)
    } else if (cid === 5) {
      // Putin — KGB Ghost
      this.ghostActive = true;
    }
  }

  private _updatePower(dt: number) {
    if (this.power.active) {
      this.power.timeLeft -= dt;
      if (this.power.timeLeft <= 0) {
        this.power.active   = false;
        this.power.cooldown = true;
        this.power.coolLeft = this.power.maxCool;
        this.wallActive     = false;
        this.magnetActive   = false;
        this.ghostActive    = false;
      }
    }

    if (this.power.cooldown) {
      this.power.coolLeft -= dt;
      if (this.power.coolLeft <= 0) {
        this.power.cooldown = false;
      }
    }
  }

  // ─── Collision test ──────────────────────────────────────────────────────────
  collidesWith(ox: number, oy: number, ow: number, oh: number): boolean {
    if (this.invincible || this.ghostActive) return false;
    return (
      this.hitboxX < ox + ow &&
      this.hitboxX + this.hitboxWidth > ox &&
      this.hitboxY < oy + oh &&
      this.hitboxY + this.hitboxHeight > oy
    );
  }

  die() {
    this.state = "dead";
  }

  reset(laneConfig: LaneConfig, characterId: CharacterId) {
    this.laneConfig   = laneConfig;
    this.characterId  = characterId;
    this.lane         = 1;
    this.targetLane   = 1;
    this.x            = laneConfig.x[1] - PLAYER_WIDTH / 2;
    this.y            = laneConfig.y - PLAYER_HEIGHT;
    this.velY         = 0;
    this.state        = "running";
    this.animFrame    = 0;
    this.animTimer    = 0;
    this.invincible   = false;
    this.visible      = true;
    this.wallActive   = false;
    this.magnetActive = false;
    this.ghostActive  = false;
    this.power = {
      active:   false,
      cooldown: false,
      timeLeft: 0,
      maxTime:  CHARACTERS[characterId] ? 5000 : 5000,
      coolLeft: 0,
      maxCool:  15000,
    };
  }
}
