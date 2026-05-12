import { Simulation } from './engine/Simulation.js';
import { Renderer } from './renderer/Renderer.js';
import { InputHandler } from './input/InputHandler.js';
import { ParticleType, ParticleConfig } from './engine/ParticleType.js';

const GRID_WIDTH = 200;
const GRID_HEIGHT = 150;
const PIXEL_SIZE = 4;

class App {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.simulation = new Simulation(GRID_WIDTH, GRID_HEIGHT);
    this.renderer = new Renderer(this.canvas, PIXEL_SIZE);
    this.input = new InputHandler(this.canvas, PIXEL_SIZE);
    this.running = true;
    this.lastTime = 0;
    this.fps = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    
    this.setupUI();
    this.setupCallbacks();
  }

  setupUI() {
    this.updateBrushSizeUI();
    this.updateTypeUI();
    
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.simulation.clear();
    });

    document.getElementById('sandBtn').addEventListener('click', () => {
      this.input.setCurrentType(ParticleType.SAND);
    });

    document.getElementById('waterBtn').addEventListener('click', () => {
      this.input.setCurrentType(ParticleType.WATER);
    });

    document.getElementById('stoneBtn').addEventListener('click', () => {
      this.input.setCurrentType(ParticleType.STONE);
    });

    document.getElementById('sizePlus').addEventListener('click', () => {
      this.input.setBrushSize(this.input.getBrushSize() + 1);
      this.updateBrushSizeUI();
    });

    document.getElementById('sizeMinus').addEventListener('click', () => {
      this.input.setBrushSize(this.input.getBrushSize() - 1);
      this.updateBrushSizeUI();
    });
  }

  setupCallbacks() {
    this.input.onBrush = (x, y, type) => {
      this.simulation.setParticle(x, y, type);
    };

    this.input.onErase = (x, y) => {
      this.simulation.setParticle(x, y, ParticleType.EMPTY);
    };

    this.input.onClear = () => {
      this.simulation.clear();
    };

    this.input.onTypeChange = () => {
      this.updateTypeUI();
    };
  }

  updateBrushSizeUI() {
    document.getElementById('brushSize').textContent = this.input.getBrushSize();
  }

  updateTypeUI() {
    const currentType = this.input.getCurrentType();
    const sandBtn = document.getElementById('sandBtn');
    const waterBtn = document.getElementById('waterBtn');
    const stoneBtn = document.getElementById('stoneBtn');
    
    sandBtn.classList.remove('active');
    waterBtn.classList.remove('active');
    stoneBtn.classList.remove('active');
    
    if (currentType === ParticleType.SAND) {
      sandBtn.classList.add('active');
    } else if (currentType === ParticleType.WATER) {
      waterBtn.classList.add('active');
    } else if (currentType === ParticleType.STONE) {
      stoneBtn.classList.add('active');
    }
  }

  update(currentTime) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
      document.getElementById('fpsCounter').textContent = `FPS: ${this.fps}`;
    }
    
    this.updateBrushSizeUI();
    
    for (let i = 0; i < 4; i++) {
      this.simulation.step();
    }
  }

  render() {
    this.renderer.render(this.simulation.grid);
  }

  gameLoop(currentTime) {
    if (!this.running) return;
    
    this.update(currentTime);
    this.render();
    
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  start() {
    requestAnimationFrame((time) => this.gameLoop(time));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});
