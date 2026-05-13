export class Segment {
    constructor(x, y, length, angle = 0, index = 0) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.angle = angle;
        this.index = index;
        this.targetX = x;
        this.targetY = y;
        this.smoothFactor = 0.15;
    }

    get endX() {
        return this.x + Math.cos(this.angle) * this.length;
    }

    get endY() {
        return this.y + Math.sin(this.angle) * this.length;
    }

    updateSmooth(targetX, targetY) {
        this.x += (targetX - this.x) * this.smoothFactor;
        this.y += (targetY - this.y) * this.smoothFactor;
    }

    render(ctx, options = {}) {
        const {
            strokeColor = '#00d9ff',
            fillColor = '#0a1628',
            lineWidth = 4,
            segmentWidth = 16,
            glowIntensity = 0.3
        } = options;

        const endX = this.endX;
        const endY = this.endY;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 15 * glowIntensity;

        const bodyWidth = segmentWidth - (this.index * 0.5);
        const actualWidth = Math.max(bodyWidth, 6);

        ctx.beginPath();
        ctx.moveTo(0, -actualWidth / 2);
        ctx.lineTo(this.length, -actualWidth / 3);
        ctx.lineTo(this.length, actualWidth / 3);
        ctx.lineTo(0, actualWidth / 2);
        ctx.closePath();

        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.length * 0.3, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.length * 0.7, 0, 2, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(0, 0, actualWidth / 4, 0, Math.PI * 2);
        ctx.fillStyle = '#16213e';
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}

export class HeadSegment extends Segment {
    constructor(x, y, length, angle = 0) {
        super(x, y, length, angle, 0);
        this.eyeAngle = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
    }

    updateEyeAngle(targetX, targetY) {
        this.eyeAngle = Math.atan2(targetY - this.y, targetX - this.x);
    }

    updateBlink(deltaTime) {
        this.blinkTimer += deltaTime;
        if (this.blinkTimer > 3) {
            this.isBlinking = true;
            setTimeout(() => {
                this.isBlinking = false;
                this.blinkTimer = 0;
            }, 150);
        }
    }

    render(ctx, options = {}) {
        const {
            strokeColor = '#00d9ff',
            fillColor = '#0a1628',
            lineWidth = 4,
            segmentWidth = 16
        } = options;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.shadowColor = '#ff0066';
        ctx.shadowBlur = 20;

        const headWidth = segmentWidth + 6;

        ctx.beginPath();
        ctx.moveTo(-10, -headWidth / 2);
        ctx.lineTo(this.length + 15, -headWidth / 3);
        ctx.lineTo(this.length + 25, 0);
        ctx.lineTo(this.length + 15, headWidth / 3);
        ctx.lineTo(-10, headWidth / 2);
        ctx.closePath();

        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.save();
        ctx.translate(this.length * 0.5, 0);
        ctx.rotate(this.eyeAngle - this.angle);

        if (!this.isBlinking) {
            const eyeOffsetY = headWidth / 3;
            const eyeSize = 5;

            ctx.shadowColor = '#ff0066';
            ctx.shadowBlur = 15;

            ctx.beginPath();
            ctx.arc(0, -eyeOffsetY, eyeSize, 0, Math.PI * 2);
            ctx.fillStyle = '#ff0066';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, eyeOffsetY, eyeSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;

            ctx.beginPath();
            ctx.arc(0, -eyeOffsetY, eyeSize * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, eyeOffsetY, eyeSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(0, 0, headWidth / 4, 0, Math.PI * 2);
        ctx.fillStyle = '#16213e';
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}

export class TailSegment extends Segment {
    constructor(x, y, length, angle = 0, index = 0) {
        super(x, y, length, angle, index);
    }

    render(ctx, options = {}) {
        const {
            strokeColor = '#00d9ff',
            fillColor = '#0a1628',
            lineWidth = 4,
            segmentWidth = 16
        } = options;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 10;

        const bodyWidth = Math.max(segmentWidth - (this.index * 0.8), 6);

        ctx.beginPath();
        ctx.moveTo(0, -bodyWidth / 2);
        ctx.lineTo(this.length * 0.7, -bodyWidth / 3);
        ctx.lineTo(this.length, 0);
        ctx.lineTo(this.length * 0.7, bodyWidth / 3);
        ctx.lineTo(0, bodyWidth / 2);
        ctx.closePath();

        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(0, 0, bodyWidth / 4, 0, Math.PI * 2);
        ctx.fillStyle = '#16213e';
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}
