import { FractalTree } from './fractalTree.js';
import { Renderer } from './renderer.js';
import '../style.css';

class App {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.renderer = new Renderer(this.canvas);
    this.tree = null;
    this.animationId = null;
    this.isRunning = false;
    
    this.bindEvents();
    this.resizeCanvas();
    this.init();
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());
    this.canvas.addEventListener('click', () => this.restart());
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.renderer.resize();
    
    if (this.tree) {
      this.tree.init();
    }
  }

  createTree() {
    const rect = this.canvas.getBoundingClientRect();
    const canvasHeight = rect.height;
    
    return new FractalTree(this.canvas, {
      maxDepth: Math.floor(Math.random() * 2) + 9,
      initialLength: canvasHeight * 0.15,
      lengthDecay: 0.68 + Math.random() * 0.08,
      angleSpread: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      branchCount: Math.floor(Math.random() * 2) + 2,
      randomness: 0.1 + Math.random() * 0.15
    });
  }

  init() {
    this.tree = this.createTree();
    this.tree.init();
    this.start();
  }

  restart() {
    this.stop();
    this.tree = this.createTree();
    this.tree.init();
    this.start();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  animate() {
    if (!this.isRunning) return;
    
    this.tree.update();
    this.renderer.draw(this.tree);
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
