// ─── Parallax Background System ──────────────────────────────────────────────
// 3-layer parallax: sky/mountains → buildings+parliament → ground/road

interface ParallaxLayer {
  offset:  number;
  speed:   number;  // multiplier of gameSpeed
}

interface Cloud {
  x:      number;
  y:      number;
  width:  number;
  height: number;
  speed:  number;
}

interface Building {
  x:      number;
  y:      number;
  width:  number;
  height: number;
  color:  string;
  hasLight: boolean;
  lightX: number;
  lightY: number;
}

interface MoneyParticle {
  x:     number;
  y:     number;
  velX:  number;
  velY:  number;
  rot:   number;
  rotV:  number;
  alpha: number;
  size:  number;
}

export class Background {
  canvasW: number;
  canvasH: number;
  groundY: number;

  // Layer offsets for parallax
  layers: ParallaxLayer[] = [
    { offset: 0, speed: 0.2 },   // sky / far buildings
    { offset: 0, speed: 0.5 },   // mid buildings
    { offset: 0, speed: 1.0 },   // ground decor
  ];

  clouds:   Cloud[]         = [];
  buildings: Building[]     = [];
  groundParticles: Array<{ x: number; size: number; color: string }> = [];
  
  // Money rain particles for menu
  moneyParticles: MoneyParticle[] = [];

  constructor(canvasW: number, canvasH: number, groundY: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.groundY = groundY;
    this._initClouds();
    this._initBuildings();
    this._initGroundDecor();
  }

  private _initClouds() {
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x:      Math.random() * this.canvasW,
        y:      20 + Math.random() * 100,
        width:  60 + Math.random() * 80,
        height: 20 + Math.random() * 20,
        speed:  0.3 + Math.random() * 0.3,
      });
    }
  }

  private _initBuildings() {
    for (let i = 0; i < 15; i++) {
      const h = 80 + Math.random() * 150;
      this.buildings.push({
        x:        i * 90 + Math.random() * 30,
        y:        this.groundY - h,
        width:    40 + Math.random() * 40,
        height:   h,
        color:    this._buildingColor(),
        hasLight: Math.random() > 0.5,
        lightX:   10 + Math.random() * 20,
        lightY:   15 + Math.random() * 30,
      });
    }
  }

  private _buildingColor(): string {
    const colors = ["#1a1033", "#0d0825", "#160d30", "#1e0d42", "#0a0618"];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private _initGroundDecor() {
    for (let i = 0; i < 40; i++) {
      this.groundParticles.push({
        x:     Math.random() * this.canvasW,
        size:  1 + Math.random() * 2,
        color: Math.random() > 0.5 ? "#836EF9" : "#39ff14",
      });
    }
  }

  initMoneyRain() {
    for (let i = 0; i < 30; i++) {
      this._spawnMoneyParticle(Math.random() * this.canvasW, Math.random() * this.canvasH);
    }
  }

  private _spawnMoneyParticle(x: number, y: number) {
    this.moneyParticles.push({
      x,
      y,
      velX:  (Math.random() - 0.5) * 1.5,
      velY:  1.5 + Math.random() * 2.5,
      rot:   Math.random() * 360,
      rotV:  (Math.random() - 0.5) * 5,
      alpha: 0.6 + Math.random() * 0.4,
      size:  10 + Math.random() * 12,
    });
  }

  update(dt: number, gameSpeed: number) {
    // Update layer offsets
    for (const layer of this.layers) {
      layer.offset = (layer.offset + gameSpeed * layer.speed) % this.canvasW;
    }

    // Move clouds
    for (const cloud of this.clouds) {
      cloud.x -= gameSpeed * 0.15 + cloud.speed;
      if (cloud.x + cloud.width < 0) {
        cloud.x = this.canvasW + cloud.width;
        cloud.y = 20 + Math.random() * 100;
      }
    }

    // Move buildings (mid layer)
    for (const bld of this.buildings) {
      bld.x -= gameSpeed * 0.4;
      if (bld.x + bld.width < 0) {
        bld.x     = this.canvasW + Math.random() * 60;
        bld.height = 80 + Math.random() * 150;
        bld.y     = this.groundY - bld.height;
      }
    }

    // Move ground decor
    for (const gp of this.groundParticles) {
      gp.x -= gameSpeed;
      if (gp.x < 0) gp.x = this.canvasW;
    }

    // Money rain
    for (const mp of this.moneyParticles) {
      mp.x   += mp.velX;
      mp.y   += mp.velY;
      mp.rot += mp.rotV;
      if (mp.y > this.canvasH + 20) {
        mp.y = -20;
        mp.x = Math.random() * this.canvasW;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this._drawSky(ctx);
    this._drawFarBuildings(ctx);
    this._drawParliamentDome(ctx);
    this._drawMidBuildings(ctx);
    this._drawGround(ctx);
    this._drawRoadMarkings(ctx);
    this._drawGroundDecor(ctx);
  }

  drawMenuMoneyRain(ctx: CanvasRenderingContext2D) {
    for (const mp of this.moneyParticles) {
      ctx.save();
      ctx.globalAlpha = mp.alpha;
      ctx.translate(mp.x + mp.size / 2, mp.y + mp.size / 2);
      ctx.rotate((mp.rot * Math.PI) / 180);
      ctx.fillStyle   = "#ffd700";
      ctx.strokeStyle = "#aa8800";
      ctx.lineWidth   = 1;
      ctx.fillRect(-mp.size / 2, -mp.size / 3, mp.size, mp.size * 0.6);
      ctx.strokeRect(-mp.size / 2, -mp.size / 3, mp.size, mp.size * 0.6);
      // Dollar sign
      ctx.fillStyle   = "#aa8800";
      ctx.font        = `bold ${mp.size * 0.6}px monospace`;
      ctx.textAlign   = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 0);
      ctx.restore();
    }
  }

  private _drawSky(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    grad.addColorStop(0,   "#0e0b1e");
    grad.addColorStop(0.6, "#1a0d3d");
    grad.addColorStop(1,   "#2d1060");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvasW, this.groundY);

    // Stars
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 50; i++) {
      const sx = (i * 137.5 + this.layers[0].offset * 0.1) % this.canvasW;
      const sy = (i * 71.3) % (this.groundY * 0.7);
      const ss = i % 3 === 0 ? 2 : 1;
      ctx.fillRect(sx, sy, ss, ss);
    }

    // Clouds
    ctx.fillStyle = "rgba(131, 110, 249, 0.15)";
    for (const cloud of this.clouds) {
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.width * 0.25, cloud.y - cloud.height * 0.2, cloud.width * 0.3, cloud.height * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private _drawFarBuildings(ctx: CanvasRenderingContext2D) {
    // Silhouettes of far-away buildings
    ctx.fillStyle = "#0a0520";
    for (let i = 0; i < 12; i++) {
      const bx     = ((i * 120 - this.layers[0].offset * 0.3) % (this.canvasW + 100)) - 50;
      const bh     = 50 + (i * 37) % 80;
      const bw     = 35 + (i * 23) % 30;
      ctx.fillRect(bx, this.groundY - bh, bw, bh);
    }
  }

  private _drawParliamentDome(ctx: CanvasRenderingContext2D) {
    // Parliament dome silhouette in background
    const domeX = (this.canvasW * 0.5 - this.layers[0].offset * 0.15 + this.canvasW) % (this.canvasW * 1.5);
    const domeY = this.groundY - 120;

    ctx.fillStyle = "#130a2e";
    // Main building
    ctx.fillRect(domeX - 80, domeY + 50, 160, 70);
    // Dome
    ctx.beginPath();
    ctx.ellipse(domeX, domeY + 50, 50, 60, 0, Math.PI, 0);
    ctx.fill();
    // Minarets
    ctx.fillRect(domeX - 90, domeY + 20, 12, 80);
    ctx.fillRect(domeX + 78, domeY + 20, 12, 80);
    // Flags
    ctx.fillStyle = "#836EF9";
    ctx.fillRect(domeX - 2, domeY - 15, 2, 20);
    ctx.fillRect(domeX - 2, domeY - 15, 10, 7);
  }

  private _drawMidBuildings(ctx: CanvasRenderingContext2D) {
    for (const bld of this.buildings) {
      ctx.fillStyle = bld.color;
      ctx.fillRect(bld.x, bld.y, bld.width, bld.height);

      // Windows
      ctx.fillStyle = "rgba(255, 230, 100, 0.6)";
      for (let wy = bld.y + 8; wy < bld.y + bld.height - 10; wy += 14) {
        for (let wx = bld.x + 6; wx < bld.x + bld.width - 8; wx += 12) {
          if ((wx + wy) % 29 !== 0) { // pseudo-random light pattern
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }

      // Neon billboard graffiti effect
      if (bld.hasLight) {
        ctx.fillStyle = "rgba(131, 110, 249, 0.4)";
        ctx.fillRect(bld.x + bld.lightX, bld.y + bld.lightY, 16, 6);
        ctx.fillStyle = "rgba(57, 255, 20, 0.3)";
        ctx.fillRect(bld.x + bld.lightX, bld.y + bld.lightY + 8, 10, 4);
      }
    }
  }

  private _drawGround(ctx: CanvasRenderingContext2D) {
    // Road
    const grad = ctx.createLinearGradient(0, this.groundY, 0, this.canvasH);
    grad.addColorStop(0, "#1a1033");
    grad.addColorStop(1, "#0e0b1e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, this.groundY, this.canvasW, this.canvasH - this.groundY);

    // Ground line glow
    ctx.strokeStyle = "#836EF9";
    ctx.lineWidth   = 2;
    ctx.shadowColor = "#836EF9";
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.canvasW, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private _drawRoadMarkings(ctx: CanvasRenderingContext2D) {
    // Dashed lane dividers
    ctx.strokeStyle = "rgba(131, 110, 249, 0.3)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([20, 15]);
    const dashOffset = this.layers[2].offset % 35;
    ctx.lineDashOffset = -dashOffset;

    // Lane lines (approximate at groundY + 10)
    ctx.beginPath();
    ctx.moveTo(0, this.groundY + 8);
    ctx.lineTo(this.canvasW, this.groundY + 8);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  private _drawGroundDecor(ctx: CanvasRenderingContext2D) {
    for (const gp of this.groundParticles) {
      ctx.fillStyle = gp.color;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(gp.x, this.groundY + 2, gp.size, gp.size);
    }
    ctx.globalAlpha = 1.0;
  }

  resize(canvasW: number, canvasH: number, groundY: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.groundY = groundY;
  }
}
