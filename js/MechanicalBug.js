import { IKSolver } from './IKSolver.js';
import { Segment, HeadSegment, TailSegment } from './Segment.js';

export class MechanicalBug {
    constructor(startX, startY, segmentCount = 12, segmentLength = 25) {
        this.segments = [];
        this.legs = [];
        this.startX = startX;
        this.startY = startY;
        this.segmentCount = segmentCount;
        this.segmentLength = segmentLength;
        this.speed = 0.12;
        this.headAngle = 0;
        this.moveTime = 0;
        this.legPhase = 0;

        this.initSegments();
        this.initLegs();
    }

    initSegments() {
        this.segments = [];

        const head = new HeadSegment(
            this.startX,
            this.startY,
            this.segmentLength
        );
        this.segments.push(head);

        for (let i = 1; i < this.segmentCount - 1; i++) {
            const segment = new Segment(
                this.startX - i * this.segmentLength,
                this.startY,
                this.segmentLength,
                0,
                i
            );
            this.segments.push(segment);
        }

        if (this.segmentCount > 1) {
            const tail = new TailSegment(
                this.startX - (this.segmentCount - 1) * this.segmentLength,
                this.startY,
                this.segmentLength,
                0,
                this.segmentCount - 1
            );
            this.segments.push(tail);
        }
    }

    initLegs() {
        this.legs = [];
        const legSpacing = 3;
        const legCount = Math.floor((this.segmentCount - 2) / legSpacing);

        for (let i = 0; i < legCount; i++) {
            const segmentIndex = 1 + i * legSpacing;
            if (segmentIndex >= this.segmentCount - 1) break;

            this.legs.push({
                segmentIndex: segmentIndex,
                side: 'left',
                offset: 0,
                targetOffset: 0,
                phase: i * (Math.PI / legCount)
            });

            this.legs.push({
                segmentIndex: segmentIndex,
                side: 'right',
                offset: 0,
                targetOffset: 0,
                phase: i * (Math.PI / legCount) + Math.PI
            });
        }
    }

    update(targetX, targetY, deltaTime) {
        this.moveTime += deltaTime;
        this.legPhase = this.moveTime * 8;

        const head = this.segments[0];

        const dx = targetX - head.x;
        const dy = targetY - head.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            const moveFactor = Math.min(distance * 0.08, 12);
            const targetHeadX = head.x + (dx / distance) * moveFactor;
            const targetHeadY = head.y + (dy / distance) * moveFactor;

            head.x += (targetHeadX - head.x) * this.speed;
            head.y += (targetHeadY - head.y) * this.speed;

            this.headAngle = Math.atan2(dy, dx);
            head.angle = this.headAngle;
        }

        head.updateEyeAngle(targetX, targetY);
        head.updateBlink(deltaTime);

        IKSolver.solveChain(this.segments, head.x, head.y);

        this.updateLegs(deltaTime, distance > 5);
    }

    updateLegs(deltaTime, isMoving) {
        for (const leg of this.legs) {
            const wave = Math.sin(this.legPhase + leg.phase);
            const baseOffset = isMoving ? wave * 8 : 0;
            leg.offset += (baseOffset - leg.offset) * 0.2;
        }
    }

    render(ctx) {
        this.renderGlowTrail(ctx);

        for (let i = this.segments.length - 1; i >= 0; i--) {
            const segment = this.segments[i];
            const options = {
                strokeColor: this.getSegmentColor(i),
                fillColor: '#0a1628',
                lineWidth: 3,
                segmentWidth: 18,
                glowIntensity: i === 0 ? 1 : 0.5
            };
            segment.render(ctx, options);
        }

        this.renderLegs(ctx);
        this.renderJoints(ctx);
    }

    renderGlowTrail(ctx) {
        ctx.save();
        for (let i = 0; i < this.segments.length - 1; i++) {
            const current = this.segments[i];
            const alpha = 0.15 * (1 - i / this.segments.length);

            ctx.strokeStyle = `rgba(0, 217, 255, ${alpha})`;
            ctx.lineWidth = 30;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(current.x, current.y);
            ctx.lineTo(this.segments[i + 1].x, this.segments[i + 1].y);
            ctx.stroke();
        }
        ctx.restore();
    }

    renderLegs(ctx) {
        ctx.save();

        for (const leg of this.legs) {
            const segment = this.segments[leg.segmentIndex];
            const legLength = 20;
            const sideFactor = leg.side === 'left' ? 1 : -1;
            const baseY = 10 * sideFactor;

            const legStartX = segment.x + Math.cos(segment.angle + Math.PI / 2 * sideFactor) * 8;
            const legStartY = segment.y + Math.sin(segment.angle + Math.PI / 2 * sideFactor) * 8;

            const perpX = Math.cos(segment.angle + Math.PI / 2 * sideFactor);
            const perpY = Math.sin(segment.angle + Math.PI / 2 * sideFactor);

            const midOffset = leg.offset * 0.5;
            const endOffset = leg.offset;

            const midX = legStartX + perpX * (legLength * 0.5) + midOffset * 0.3;
            const midY = legStartY + perpY * (legLength * 0.5) + midOffset * 0.3;

            const endX = legStartX + perpX * legLength + endOffset * 0.5;
            const endY = legStartY + perpY * legLength + endOffset * 0.5;

            ctx.shadowColor = '#64ffda';
            ctx.shadowBlur = 8;

            ctx.strokeStyle = '#64ffda';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(legStartX, legStartY);
            ctx.lineTo(midX, midY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            ctx.fillStyle = '#64ffda';
            ctx.beginPath();
            ctx.arc(midX, midY, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(endX, endY, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    renderJoints(ctx) {
        ctx.save();

        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const alpha = 0.8 * (1 - i / this.segments.length * 0.5);

            ctx.fillStyle = `rgba(0, 217, 255, ${alpha})`;
            ctx.shadowColor = '#00d9ff';
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(segment.x, segment.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getSegmentColor(index) {
        if (index === 0) return '#00d9ff';
        if (index === this.segments.length - 1) return '#ff0066';

        const t = index / this.segments.length;
        const r = Math.floor(0 * (1 - t) + 255 * t);
        const g = Math.floor(217 * (1 - t) + 0 * t);
        const b = Math.floor(255 * (1 - t) + 102 * t);
        return `rgb(${r}, ${g}, ${b})`;
    }

    setSegmentCount(count) {
        this.segmentCount = count;
        const headPos = { x: this.segments[0].x, y: this.segments[0].y };
        this.initSegments();
        this.initLegs();
        this.segments[0].x = headPos.x;
        this.segments[0].y = headPos.y;
    }

    setSegmentLength(length) {
        this.segmentLength = length;
        const headPos = { x: this.segments[0].x, y: this.segments[0].y };
        this.initSegments();
        this.initLegs();
        this.segments[0].x = headPos.x;
        this.segments[0].y = headPos.y;
    }
}
