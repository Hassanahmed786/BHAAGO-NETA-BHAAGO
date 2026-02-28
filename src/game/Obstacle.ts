// ─── Obstacle System ──────────────────────────────────────────────────────────

export type ObstacleType =
  | "reporter"
  | "subpoena"
  | "cbi_agent"
  | "flying_mic"
  | "chair"
  | "news_van"
  | "ballot_box"
  | "tax_notice";

export interface Obstacle {
  id:     number;
  type:   ObstacleType;
  lane:   number;
  x:      number;
  y:      number;
  width:  number;
  height: number;
  speed:  number;
  animFrame: number;
  animTimer: number;
  removed:   boolean;   // destroyed by Trump's Wall
}

const OBSTACLE_TYPES: ObstacleType[] = [
  "reporter",
  "subpoena",
  "cbi_agent",
  "flying_mic",
  "chair",
  "news_van",
  "ballot_box",
  "tax_notice",
];

// Size & y-offset for each type
const OBSTACLE_CONFIG: Record<ObstacleType, { w: number; h: number; yOff: number; color: string }> = {
  reporter:    { w: 32, h: 64, yOff: 0,   color: "#8b5cf6" },
  subpoena:    { w: 28, h: 36, yOff: -40, color: "#f59e0b" }, // flies in air
  cbi_agent:   { w: 34, h: 64, yOff: 0,   color: "#1e293b" },
  flying_mic:  { w: 20, h: 30, yOff: -30, color: "#6b7280" },
  chair:       { w: 36, h: 40, yOff: 0,   color: "#92400e" },
  news_van:    { w: 72, h: 48, yOff: 0,   color: "#334155" },
  ballot_box:  { w: 40, h: 40, yOff: 0,   color: "#064e3b" },
  tax_notice:  { w: 30, h: 38, yOff: -35, color: "#dc2626" },
};

let _nextId = 1;

export class ObstacleSpawner {
  obstacles:     Obstacle[] = [];
  spawnTimer:    number     = 0;
  spawnInterval: number     = 2200;  // ms between spawns (decreases with speed)
  laneXPositions: number[]  = [];
  groundY:       number     = 400;
  lastLanes:     number[]   = [];    // track recent lanes to guarantee beatable patterns
  
  constructor(laneX: number[], groundY: number) {
    this.laneXPositions = laneX;
    this.groundY        = groundY;
  }

  update(dt: number, gameSpeed: number, canvasWidth: number) {
    // Advance spawn timer
    this.spawnTimer += dt;

    // Faster spawn at higher speeds, but never lower than 1100ms
    const interval = Math.max(1100, this.spawnInterval - gameSpeed * 60);

    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this._spawn(gameSpeed, canvasWidth);
    }

    // Move obstacles
    for (const obs of this.obstacles) {
      obs.x         -= gameSpeed;
      obs.animTimer += dt;
      if (obs.animTimer > 150) {
        obs.animTimer = 0;
        obs.animFrame = (obs.animFrame + 1) % 4;
      }
    }

    // Cull off-screen
    this.obstacles = this.obstacles.filter(o => o.x + o.width > -20 && !o.removed);
  }

  private _spawn(gameSpeed: number, canvasWidth: number) {
    // Guarantee beatable: never block all 3 lanes simultaneously
    // Pick 1 or 2 lanes to block, ensure at least 1 is free
    const pattern = this._pickPattern();

    for (const lane of pattern) {
      const type   = this._randomType();
      const cfg    = OBSTACLE_CONFIG[type];
      const laneX  = this.laneXPositions[lane];
      const obsX   = canvasWidth + 40;
      const obsY   = this.groundY - cfg.h + cfg.yOff;

      this.obstacles.push({
        id:        _nextId++,
        type,
        lane,
        x:         obsX,
        y:         obsY,
        width:     cfg.w,
        height:    cfg.h,
        speed:     gameSpeed,
        animFrame: 0,
        animTimer: 0,
        removed:   false,
      });
    }
  }

  private _pickPattern(): number[] {
    const r = Math.random();
    if (r < 0.55) {
      // Single obstacle — most common, easy
      const lane = Math.floor(Math.random() * 3);
      return [lane];
    } else if (r < 0.85) {
      // Two adjacent obstacles — need to jump the gap
      const startLane = Math.floor(Math.random() * 2); // 0 or 1
      return [startLane, startLane + 1]; // always leaves lane (startLane+2 % 3) free
    } else {
      // Staggered two obstacles in non-adjacent lanes (0 and 2) — center free
      return [0, 2];
    }
  }

  private _randomType(): ObstacleType {
    return OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
  }

  removeById(id: number) {
    const obs = this.obstacles.find(o => o.id === id);
    if (obs) obs.removed = true;
  }

  reset() {
    this.obstacles     = [];
    this.spawnTimer    = 0;
    this.lastLanes     = [];
  }
}

// ─── Draw helpers exported for Renderer ──────────────────────────────────────
export { OBSTACLE_CONFIG };
