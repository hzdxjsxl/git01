import { ParticleType, ParticleConfig } from './ParticleType.js';
import { Grid } from './Grid.js';

export class Simulation {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = new Grid(width, height);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 0, g: 0, b: 0 };
  }

  rgbToHex(r, g, b) {
    return (1 << 24) | (r << 16) | (g << 8) | b;
  }

  getVariedColor(type) {
    const config = ParticleConfig[type];
    const base = this.hexToRgb(config.color);
    const variance = config.colorVariance || 0;
    
    if (variance === 0) {
      return this.rgbToHex(base.r, base.g, base.b);
    }
    
    const r = Math.max(0, Math.min(255, base.r + (Math.random() * 2 - 1) * variance));
    const g = Math.max(0, Math.min(255, base.g + (Math.random() * 2 - 1) * variance));
    const b = Math.max(0, Math.min(255, base.b + (Math.random() * 2 - 1) * variance));
    
    return this.rgbToHex(Math.floor(r), Math.floor(g), Math.floor(b));
  }

  setParticle(x, y, type) {
    if (!this.grid.inBounds(x, y)) return;
    
    if (type === ParticleType.EMPTY) {
      this.grid.setType(x, y, ParticleType.EMPTY);
      this.grid.setColor(x, y, 0);
      return;
    }
    
    const config = ParticleConfig[type];
    if (!config) return;
    
    this.grid.setType(x, y, type);
    this.grid.setColor(x, y, this.getVariedColor(type));
  }

  isEmpty(x, y) {
    return this.grid.getType(x, y) === ParticleType.EMPTY;
  }

  isDenserThan(typeA, typeB) {
    const configA = ParticleConfig[typeA];
    const configB = ParticleConfig[typeB];
    if (!configA || !configB) return false;
    return configA.density > configB.density;
  }

  isImmovable(type) {
    const config = ParticleConfig[type];
    return config && config.immovable;
  }

  updateSand(x, y) {
    if (this.isEmpty(x, y + 1)) {
      this.grid.swap(x, y, x, y + 1);
      return true;
    }
    
    const belowType = this.grid.getType(x, y + 1);
    if (belowType === ParticleType.WATER) {
      this.grid.swap(x, y, x, y + 1);
      return true;
    }
    
    const dir = Math.random() < 0.5 ? -1 : 1;
    
    if (this.isEmpty(x + dir, y + 1)) {
      this.grid.swap(x, y, x + dir, y + 1);
      return true;
    }
    
    if (this.grid.getType(x + dir, y + 1) === ParticleType.WATER) {
      this.grid.swap(x, y, x + dir, y + 1);
      return true;
    }
    
    if (this.isEmpty(x - dir, y + 1)) {
      this.grid.swap(x, y, x - dir, y + 1);
      return true;
    }
    
    if (this.grid.getType(x - dir, y + 1) === ParticleType.WATER) {
      this.grid.swap(x, y, x - dir, y + 1);
      return true;
    }
    
    return false;
  }

  updateWater(x, y) {
    if (this.isEmpty(x, y + 1)) {
      this.grid.swap(x, y, x, y + 1);
      return true;
    }
    
    const belowType = this.grid.getType(x, y + 1);
    if (belowType !== -1 && !this.isImmovable(belowType) && 
        belowType !== ParticleType.WATER && this.isDenserThan(belowType, ParticleType.WATER) === false) {
    }
    
    const dir = Math.random() < 0.5 ? -1 : 1;
    
    if (this.isEmpty(x + dir, y + 1)) {
      this.grid.swap(x, y, x + dir, y + 1);
      return true;
    }
    
    if (this.isEmpty(x - dir, y + 1)) {
      this.grid.swap(x, y, x - dir, y + 1);
      return true;
    }
    
    if (this.isEmpty(x + dir, y)) {
      this.grid.swap(x, y, x + dir, y);
      return true;
    }
    
    if (this.isEmpty(x - dir, y)) {
      this.grid.swap(x, y, x - dir, y);
      return true;
    }
    
    return false;
  }

  updateParticle(x, y) {
    if (this.grid.isUpdated(x, y)) return;
    
    const type = this.grid.getType(x, y);
    
    if (type === ParticleType.SAND) {
      this.updateSand(x, y);
    } else if (type === ParticleType.WATER) {
      this.updateWater(x, y);
    }
  }

  step() {
    this.grid.clearUpdated();
    
    const leftToRight = Math.random() < 0.5;
    
    for (let y = this.height - 1; y >= 0; y--) {
      if (leftToRight) {
        for (let x = 0; x < this.width; x++) {
          this.updateParticle(x, y);
        }
      } else {
        for (let x = this.width - 1; x >= 0; x--) {
          this.updateParticle(x, y);
        }
      }
    }
  }

  clear() {
    this.grid.types.fill(0);
    this.grid.colors.fill(0);
  }
}
