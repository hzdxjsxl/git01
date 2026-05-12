class AnimationController {
    static instance = null;

    constructor() {
        if (AnimationController.instance) {
            return AnimationController.instance;
        }

        this.animations = [];
        this.currentProgress = 0;

        AnimationController.instance = this;
    }

    static getInstance() {
        if (!AnimationController.instance) {
            AnimationController.instance = new AnimationController();
        }
        return AnimationController.instance;
    }

    addAnimation(options) {
        const animation = {
            element: options.element,
            initial: options.initial || {},
            final: options.final || {},
            update: options.update || null,
            keyframes: options.keyframes || null
        };
        this.animations.push(animation);
        return this;
    }

    removeAnimation(element) {
        this.animations = this.animations.filter(anim => anim.element !== element);
        return this;
    }

    update(progress) {
        const clampedProgress = Math.max(0, Math.min(1, progress));
        this.currentProgress = clampedProgress;

        this.animations.forEach(animation => {
            if (animation.update) {
                animation.update(animation.element, clampedProgress);
            } else {
                this.applyTransform(animation, clampedProgress);
            }
        });

        return this;
    }

    applyTransform(animation, progress) {
        const { element, initial, final } = animation;
        const state = this.interpolate(initial, final, progress);
        const transforms = [];

        if (state.translateX !== undefined) {
            transforms.push(`translateX(${state.translateX}px)`);
        }
        if (state.translateY !== undefined) {
            transforms.push(`translateY(${state.translateY}px)`);
        }
        if (state.translateZ !== undefined) {
            transforms.push(`translateZ(${state.translateZ}px)`);
        }
        if (state.rotateX !== undefined) {
            transforms.push(`rotateX(${state.rotateX}deg)`);
        }
        if (state.rotateY !== undefined) {
            transforms.push(`rotateY(${state.rotateY}deg)`);
        }
        if (state.rotateZ !== undefined) {
            transforms.push(`rotateZ(${state.rotateZ}deg)`);
        }
        if (state.scale !== undefined) {
            transforms.push(`scale(${state.scale})`);
        }

        if (transforms.length > 0) {
            element.style.transform = transforms.join(' ');
        }

        if (state.opacity !== undefined) {
            element.style.opacity = state.opacity;
        }
    }

    interpolate(initial, final, progress) {
        const result = {};
        const keys = new Set([...Object.keys(initial), ...Object.keys(final)]);
        keys.forEach(key => {
            const init = initial[key] !== undefined ? initial[key] : final[key];
            const fin = final[key] !== undefined ? final[key] : initial[key];
            result[key] = this.lerp(init, fin, progress);
        });
        return result;
    }

    lerp(start, end, t) {
        if (typeof start === 'number' && typeof end === 'number') {
            return start + (end - start) * t;
        }
        return t < 0.5 ? start : end;
    }

    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    easeInCubic(t) {
        return t * t * t;
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    }

    easeInQuad(t) {
        return t * t;
    }

    getProgress() {
        return this.currentProgress;
    }

    destroy() {
        this.animations = [];
        AnimationController.instance = null;
    }
}

window.AnimationController = AnimationController;
