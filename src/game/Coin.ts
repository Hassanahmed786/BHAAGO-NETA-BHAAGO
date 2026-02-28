// ─── Coin / Collectible System ────────────────────────────────────────────────

export type CoinType = "bribe_coin" | "diamond_briefcase" | "immunity_star";

export interface Coin {
  id:        number;
  type:      CoinType;
  lane:      number;
  x:         number;
  y:         number;
  width:     number;
  height:    number;
  value:     number;   // point value
  coinCount: number;   // how many "coins" for blockchain
  collected: boolean;
  animAngle: number;   // for spin animation
  bobOffset: number;   // vertical bob
  bobTimer:  number;
  glowAlpha: number;
  glowDir:   number;
}

const COIN_CONFIGS: Record<CoinType, { w: number; h: number; value: number; coinCount: number; color: string; rarity: number }> = {
  bribe_coin:        { w: 20, h: 20, value: 10,  coinCount: 1,  color: "#ffd700", rarity: 0.75 },
  diamond_briefcase: { w: 28, h: 24, value: 100, coinCount: 10, color: "#00cfff", rarity: 0.10 },
  immunity_star:     { w: 24, h: 24, value: 50,  coinCount: 0,  color: "#ff4ece", rarity: 0.15 },
};

let _nextCoinId = 1;

export class CoinSpawner {
  coins:         Coin[]    = [];
  spawnTimer:    number    = 0;
  spawnInterval: number    = 900;
  laneXPositions: number[] = [];
  groundY:       number    = 400;
  canvasWidth:   number    = 900;

  // Hidden coin positions revealed by Kejriwal's AAP Scan
  hiddenCoins:   Coin[]    = [];
  scanActive:    boolean   = false;

  constructor(laneX: number[], groundY: number, canvasWidth: number) {
    this.laneXPositions = laneX;
    this.groundY        = groundY;
    this.canvasWidth    = canvasWidth;
  }

  update(dt: number, gameSpeed: number, magnetActive: boolean, playerX: number, playerY: number) {
    this.spawnTimer += dt;
    const interval = Math.max(600, this.spawnInterval - gameSpeed * 40);

    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this._spawn(gameSpeed);
    }

    for (const coin of this.coins) {
      coin.x         -= gameSpeed;
      coin.animAngle  = (coin.animAngle + 4) % 360;
      coin.bobTimer  += dt;
      coin.bobOffset  = Math.sin(coin.bobTimer * 0.003) * 5;
      coin.glowAlpha += coin.glowDir * dt * 0.001;
      if (coin.glowAlpha >= 1)   { coin.glowAlpha = 1;   coin.glowDir = -1; }
      if (coin.glowAlpha <= 0.3) { coin.glowAlpha = 0.3; coin.glowDir =  1; }

      // Magnet attraction
      if (magnetActive && !coin.collected) {
        const dx   = playerX - coin.x;
        const dy   = playerY - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 250) {
          const speed = (250 - dist) / 15 + 2;
          coin.x += (dx / dist) * speed;
          coin.y += (dy / dist) * speed;
        }
      }
    }

    // Hidden coins
    for (const coin of this.hiddenCoins) {
      coin.x -= gameSpeed;
    }

    // Cull
    this.coins       = this.coins.filter(c => c.x + c.width > -10 && !c.collected);
    this.hiddenCoins = this.hiddenCoins.filter(c => c.x + c.width > -10 && !c.collected);
  }

  private _spawn(gameSpeed: number) {
    // Spawn a row or arc of coins
    const r = Math.random();
    if (r < 0.5) {
      // Single coin
      this._spawnOne(this._randomLane(), this.canvasWidth + 30, gameSpeed);
    } else if (r < 0.75) {
      // Row across all lanes
      for (let lane = 0; lane < 3; lane++) {
        this._spawnOne(lane, this.canvasWidth + 30, gameSpeed);
      }
    } else if (r < 0.90) {
      // Arc (5 coins in same lane, staggered)
      const lane = this._randomLane();
      for (let i = 0; i < 5; i++) {
        this._spawnOne(lane, this.canvasWidth + 30 + i * 50, gameSpeed);
      }
    } else {
      // Diamond briefcase or immunity star
      this._spawnSpecial(gameSpeed);
    }

    // Also potentially spawn hidden coins
    if (Math.random() < 0.3) {
      this._spawnHidden(gameSpeed);
    }
  }

  private _pickType(): CoinType {
    const r = Math.random();
    if (r < COIN_CONFIGS.bribe_coin.rarity)        return "bribe_coin";
    if (r < COIN_CONFIGS.bribe_coin.rarity + COIN_CONFIGS.diamond_briefcase.rarity) return "diamond_briefcase";
    return "immunity_star";
  }

  private _spawnOne(lane: number, spawnX: number, _gameSpeed: number) {
    const type    = "bribe_coin";
    const cfg     = COIN_CONFIGS[type];
    const laneX   = this.laneXPositions[lane];
    const coinY   = this.groundY - 90 - Math.random() * 30;

    this.coins.push({
      id:        _nextCoinId++,
      type,
      lane,
      x:         spawnX - cfg.w / 2 + (laneX - this.laneXPositions[1]),
      y:         coinY,
      width:     cfg.w,
      height:    cfg.h,
      value:     cfg.value,
      coinCount: cfg.coinCount,
      collected: false,
      animAngle: Math.random() * 360,
      bobOffset: 0,
      bobTimer:  Math.random() * 1000,
      glowAlpha: 0.5,
      glowDir:   1,
    });
  }

  private _spawnSpecial(_gameSpeed: number) {
    const type   = Math.random() < 0.6 ? "diamond_briefcase" : "immunity_star";
    const cfg    = COIN_CONFIGS[type];
    const lane   = this._randomLane();
    const laneX  = this.laneXPositions[lane];
    const spawnX = this.canvasWidth + 30;

    this.coins.push({
      id:        _nextCoinId++,
      type,
      lane,
      x:         spawnX - cfg.w / 2 + (laneX - this.laneXPositions[1]),
      y:         this.groundY - 110,
      width:     cfg.w,
      height:    cfg.h,
      value:     cfg.value,
      coinCount: cfg.coinCount,
      collected: false,
      animAngle: 0,
      bobOffset: 0,
      bobTimer:  0,
      glowAlpha: 0.8,
      glowDir:   1,
    });
  }

  private _spawnHidden(_gameSpeed: number) {
    const lane  = this._randomLane();
    const laneX = this.laneXPositions[lane];
    const cfg   = COIN_CONFIGS["bribe_coin"];

    this.hiddenCoins.push({
      id:        _nextCoinId++,
      type:      "bribe_coin",
      lane,
      x:         this.canvasWidth + 50 - cfg.w / 2 + (laneX - this.laneXPositions[1]),
      y:         this.groundY - 80,
      width:     cfg.w,
      height:    cfg.h,
      value:     cfg.value,
      coinCount: cfg.coinCount,
      collected: false,
      animAngle: 0,
      bobOffset: 0,
      bobTimer:  0,
      glowAlpha: 0.3,
      glowDir:   1,
    });
  }

  revealHiddenCoins() {
    // Move all hidden coins into visible coins list (AAP Scan effect)
    this.coins.push(...this.hiddenCoins);
    this.hiddenCoins = [];
  }

  collectById(id: number) {
    const c = this.coins.find(c => c.id === id);
    if (c) c.collected = true;
    const h = this.hiddenCoins.find(c => c.id === id);
    if (h) h.collected = true;
  }

  reset() {
    this.coins       = [];
    this.hiddenCoins = [];
    this.spawnTimer  = 0;
  }

  private _randomLane(): number {
    return Math.floor(Math.random() * 3);
  }
}

export { COIN_CONFIGS };
