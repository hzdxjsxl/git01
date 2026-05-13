import { MechanicalBug } from './MechanicalBug.js';
import { IKSolver } from './IKSolver.js';

class App {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 900;
        this.height = 600;
        this.bug = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.smoothMouseX = 0;
        this.smoothMouseY = 0;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.isRunning = false;
        this.particles = [];
        this.backgroundStars = [];

        this.init();
    }

    init() {
        this.canvas = document.getElementById('canvas');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.resize();

        this.initBackgroundStars();

        const centerX = this.width / 2;
        const centerY = this.height / 2;
        this.bug = new MechanicalBug(centerX, centerY, 12, 25);

        this.mouseX = centerX;
        this.mouseY = centerY;
        this.smoothMouseX = centerX;
        this.smoothMouseY = centerY;

        this.bindEvents();

        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
    }

    initBackgroundStars() {
        this.backgroundStars = [];
        for (let i = 0; i < 50; i++) {
            this.backgroundStars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.5 + 0.1,
                twinkleSpeed: Math.random() * 0.02 + 0.01
            });
        }
    }

    resize() {
        const container = this.canvas.parentElement;
        const maxWidth = Math.min(window.innerWidth - 40, 900);
        const maxHeight = Math.min(window.innerHeight - 250, 600);
        const aspectRatio = 900 / 600;

        if (maxWidth / aspectRatio <= maxHeight) {
            this.width = maxWidth;
            this.height = maxWidth / aspectRatio;
        } else {
            this.height = maxHeight;
            this.width = maxHeight * aspectRatio;
        }

        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouseX = this.width / 2;
            this.mouseY = this.height / 2;
        });

        window.addEventListener('resize', () => {
            this.resize();
            this.initBackgroundStars();
        });

        const segmentSlider = document.getElementById('segmentSlider');
        const segmentCountDisplay = document.getElementById('segmentCount');

        if (segmentSlider && segmentCountDisplay) {
            segmentSlider.addEventListener('input', (e) => {
                const count = parseInt(e.target.value);
                segmentCountDisplay.textContent = count;
                if (this.bug) {
                    this.bug.setSegmentCount(count);
                }
            });
        }

        const lengthSlider = document.getElementById('lengthSlider');
        const segmentLengthDisplay = document.getElementById('segmentLength');

        if (lengthSlider && segmentLengthDisplay) {
            lengthSlider.addEventListener('input', (e) => {
                const length = parseInt(e.target.value);
                segmentLengthDisplay.textContent = length;
                if (this.bug) {
                    this.bug.setSegmentLength(length);
                }
            });
        }
    }

    update() {
        this.smoothMouseX = IKSolver.lerp(this.smoothMouseX, this.mouseX, 0.08);
        this.smoothMouseY = IKSolver.lerp(this.smoothMouseY, this.mouseY, 0.08);

        const clampedX = IKSolver.clamp(this.smoothMouseX, 30, this.width - 30);
        const clampedY = IKSolver.clamp(this.smoothMouseY, 30, this.height - 30);

        if (this.bug) {
            this.bug.update(clampedX, clampedY, this.deltaTime);
        }

        this.updateParticles();
        this.updateBackgroundStars();
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= this.deltaTime;
            p.alpha = Math.max(0, p.life / p.maxLife);

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateBackgroundStars() {
        for (const star of this.backgroundStars) {
            star.alpha += Math.sin(performance.now() * star.twinkleSpeed) * 0.002;
            star.alpha = IKSolver.clamp(star.alpha, 0.1, 0.6);
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.renderBackground();
        this.renderGrid();

        if (this.bug) {
            this.bug.render(this.ctx);
        }

        this.renderCursor();
        this.renderParticles();
    }

    renderBackground() {
        const gradient = this.ctx.createRadialGradient(
            this.width / 2,
            this.height / 2,
            0,
            this.width / 2,
            this.height / 2,
            this.width * 0.7
        );
        gradient.addColorStop(0, '#0f1a2a');
        gradient.addColorStop(1, '#050a15');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        for (const star of this.backgroundStars) {
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(0, 217, 255, ${star.alpha})`;
            this.ctx.fill();
        }
    }

    renderGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 217, 255, 0.05)';
        this.ctx.lineWidth = 1;

        const gridSize = 50;

        for (let x = 0; x <= this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    renderCursor() {
        this.ctx.save();

        this.ctx.shadowColor = '#64ffda';
        this.ctx.shadowBlur = 20;

        this.ctx.strokeStyle = '#64ffda';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.arc(this.smoothMouseX, this.smoothMouseY, 12, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(this.smoothMouseX, this.smoothMouseY, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#64ffda';
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(100, 255, 218, 0.5)';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.moveTo(this.smoothMouseX - 20, this.smoothMouseY);
        this.ctx.lineTo(this.smoothMouseX - 8, this.smoothMouseY);
        this.ctx.moveTo(this.smoothMouseX + 8, this.smoothMouseY);
        this.ctx.lineTo(this.smoothMouseX + 20, this.smoothMouseY);
        this.ctx.moveTo(this.smoothMouseX, this.smoothMouseY - 20);
        this.ctx.lineTo(this.smoothMouseX, this.smoothMouseY - 8);
        this.ctx.moveTo(this.smoothMouseX, this.smoothMouseY + 8);
        this.ctx.lineTo(this.smoothMouseX, this.smoothMouseY + 20);
        this.ctx.stroke();

        this.ctx.restore();
    }

    renderParticles() {
        for (const p of this.particles) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(0, 217, 255, ${p.alpha * 0.5})`;
            this.ctx.fill();
        }
    }

    animate() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.deltaTime = Math.min(this.deltaTime, 0.1);
        this.lastTime = currentTime;

        this.update();
        this.render();

        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
