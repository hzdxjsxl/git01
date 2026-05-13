const LightningRenderer = (() => {
    class Renderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
        }

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        clear() {
            this.ctx.fillStyle = '#0a0a12';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        drawFlash(intensity) {
            if (intensity <= 0) return;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.15})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        drawLightning(lightning) {
            this.ctx.save();
            this.ctx.globalAlpha = lightning.alpha;

            const baseColor = `rgba(255, 255, 255, ${lightning.alpha})`;
            const glowColor = `rgba(100, 150, 255, ${lightning.alpha * 0.6})`;
            const branchScale = Math.max(0.3, 1 - lightning.depth * 0.2);

            this.ctx.strokeStyle = glowColor;
            this.ctx.lineWidth = 8 * branchScale;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = glowColor;

            this._drawSegments(lightning.segments);

            this.ctx.strokeStyle = baseColor;
            this.ctx.lineWidth = 3 * branchScale;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = baseColor;

            this._drawSegments(lightning.segments);

            lightning.branches.forEach(branch => this.drawLightning(branch));

            this.ctx.restore();
        }

        _drawSegments(segments) {
            if (segments.length < 1) return;

            this.ctx.beginPath();
            this.ctx.moveTo(segments[0].x, segments[0].y);

            for (let i = 0; i < segments.length; i++) {
                this.ctx.lineTo(segments[i].endX, segments[i].endY);
            }

            this.ctx.stroke();
        }

        render(thunderstorm) {
            this.clear();
            this.drawFlash(thunderstorm.flashIntensity);
            thunderstorm.lightnings.forEach(lightning => this.drawLightning(lightning));
        }
    }

    return { Renderer };
})();
