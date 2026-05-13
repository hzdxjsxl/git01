const LightningLogic = (() => {
    class Segment {
        constructor(x, y, angle, length) {
            this.x = x;
            this.y = y;
            this.angle = angle;
            this.length = length;
            this.endX = x + Math.cos(angle) * length;
            this.endY = y + Math.sin(angle) * length;
        }
    }

    class Lightning {
        constructor(startX, startY, depth = 0) {
            this.startX = startX;
            this.startY = startY;
            this.segments = [];
            this.depth = depth;
            this.branches = [];
            this.alpha = 1;
            this.lifeTime = 0;
            this.maxLife = 30;
            this.fadeSpeed = 0.05;
            this.completed = false;
        }

        static random(min, max) {
            return Math.random() * (max - min) + min;
        }

        static randomAngle(baseAngle, variance) {
            return baseAngle + Lightning.random(-variance, variance);
        }

        generate(maxDepth = 3) {
            let currentX = this.startX;
            let currentY = this.startY;
            let currentAngle = Math.PI / 2;
            const maxSegments = Lightning.random(15, 30);
            const stepVariance = 0.4;
            const segmentLength = Lightning.random(15, 35);

            for (let i = 0; i < maxSegments; i++) {
                currentAngle = Lightning.randomAngle(currentAngle, stepVariance);

                const segment = new Segment(currentX, currentY, currentAngle, segmentLength);
                this.segments.push(segment);

                currentX = segment.endX;
                currentY = segment.endY;

                if (this.depth < maxDepth && Math.random() < 0.25) {
                    const branchAngle = Lightning.randomAngle(currentAngle, 1.2);
                    const branch = new Lightning(currentX, currentY, this.depth + 1);
                    branch.generate(maxDepth - 1);
                    this.branches.push(branch);
                }

                if (currentY > window.innerHeight + 0.9) {
                    break;
                }
            }

            this.completed = true;
        }

        update() {
            if (!this.completed) return;

            this.lifeTime++;
            if (this.lifeTime > this.maxLife) {
                this.alpha -= this.fadeSpeed;
                if (this.alpha < 0) {
                    this.alpha = 0;
                }
            }

            this.branches.forEach(branch => branch.update());
        }

        isAlive() {
            return this.alpha > 0;
        }
    }

    class Thunderstorm {
        constructor() {
            this.lightnings = [];
            this.flashIntensity = 0;
            this.nextLightning = 0;
            this.minInterval = 60;
            this.maxInterval = 180;
            this.scheduleNext();
        }

        scheduleNext() {
            this.nextLightning = Lightning.random(this.minInterval, this.maxInterval);
        }

        spawn(width) {
            const startX = Lightning.random(50, width - 50);
            const startY = Lightning.random(0, 100);
            const lightning = new Lightning(startX, startY);
            lightning.generate();
            this.lightnings.push(lightning);
            this.flashIntensity = 0.3;
        }

        update(width, frameCount) {
            this.flashIntensity *= 0.95;
            this.nextLightning--;

            if (this.nextLightning <= 0) {
                this.spawn(width);
                this.scheduleNext();
            }

            this.lightnings.forEach(lightning => lightning.update());
            this.lightnings = this.lightnings.filter(l => l.isAlive());
        }
    }

    return {
        Thunderstorm,
        Lightning
    };
})();
