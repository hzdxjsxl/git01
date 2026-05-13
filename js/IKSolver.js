export class IKSolver {
    constructor() {}

    static solveChain(joints, headTargetX, headTargetY) {
        if (joints.length < 1) return;

        joints[0].x = headTargetX;
        joints[0].y = headTargetY;

        for (let i = 1; i < joints.length; i++) {
            const current = joints[i];
            const previous = joints[i - 1];

            const dx = previous.x - current.x;
            const dy = previous.y - current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 0.0001) continue;

            const ratio = current.length / distance;

            current.x = previous.x - dx * ratio;
            current.y = previous.y - dy * ratio;

            current.angle = Math.atan2(dy, dx);
        }
    }

    static solveLeg(rootX, rootY, targetX, targetY, segments) {
        if (segments.length < 1) return;

        for (let i = 0; i < 3; i++) {
            segments[0].x = rootX;
            segments[0].y = rootY;

            for (let j = 1; j < segments.length; j++) {
                const current = segments[j];
                const previous = segments[j - 1];

                const dx = previous.x - current.x;
                const dy = previous.y - current.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 0.0001) continue;

                const ratio = current.length / distance;

                current.x = previous.x - dx * ratio;
                current.y = previous.y - dy * ratio;

                current.angle = Math.atan2(dy, dx);
            }

            const last = segments[segments.length - 1];
            const dx = targetX - last.x;
            const dy = targetY - last.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 0.0001) break;

            const ratio = last.length / distance;
            const moveX = dx * ratio;
            const moveY = dy * ratio;

            for (let j = segments.length - 1; j >= 0; j--) {
                segments[j].x += moveX;
                segments[j].y += moveY;
            }
        }
    }

    static angleBetween(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    static distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}
