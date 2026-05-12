document.addEventListener('DOMContentLoaded', () => {
    const scrollDebouncer = ScrollDebouncer.getInstance();
    const animationController = AnimationController.getInstance();

    const animationSection = document.querySelector('.animation-section');
    const scene = document.getElementById('explosionScene');
    const shell = document.querySelector('.product-shell');
    const parts = document.querySelectorAll('.product-part');

    const initialState = {
        shell: {
            scale: 1,
            translateZ: 0,
            rotateX: 0,
            rotateY: 0,
            opacity: 1
        },
        parts: [
            { translateZ: 0, translateX: 0, translateY: 0, rotateX: 0, rotateY: 0, opacity: 0 },
            { translateZ: 0, translateX: 0, translateY: 0, rotateX: 0, rotateY: 0, opacity: 0 },
            { translateZ: 0, translateX: 0, translateY: 0, rotateX: 0, rotateY: 0, opacity: 0 },
            { translateZ: 0, translateX: 0, translateY: 0, rotateX: 0, rotateY: 0, opacity: 0 },
            { translateZ: 0, translateX: 0, translateY: 0, rotateX: 0, rotateY: 0, opacity: 0 },
            { translateZ: 0, translateX: 0, translateY: 0, rotateX: 0, rotateY: 0, opacity: 0 }
        ]
    };

    const finalState = {
        shell: {
            scale: 1.2,
            translateZ: -200,
            rotateX: 25,
            rotateY: -15,
            opacity: 0.3
        },
        parts: [
            { translateZ: 400, translateX: -150, translateY: -100, rotateX: 45, rotateY: -60, opacity: 1 },
            { translateZ: 350, translateX: 180, translateY: -80, rotateX: -30, rotateY: 45, opacity: 1 },
            { translateZ: 300, translateX: -120, translateY: 150, rotateX: 60, rotateY: -30, opacity: 1 },
            { translateZ: 450, translateX: 100, translateY: 120, rotateX: -45, rotateY: 60, opacity: 1 },
            { translateZ: 250, translateX: -200, translateY: 50, rotateX: 30, rotateY: -90, opacity: 1 },
            { translateZ: 380, translateX: 150, translateY: -150, rotateX: -60, rotateY: 30, opacity: 1 }
        ]
    };

    animationController.addAnimation({
        element: scene,
        initial: {},
        final: {},
        update: (element, progress) => {
            updateAnimation(progress);
        }
    });

    function updateAnimation(progress) {
        const eased = animationController.easeInOutCubic(progress);

        const shellTransform = `
            scale(${animationController.lerp(initialState.shell.scale, finalState.shell.scale, eased)})
            translateZ(${animationController.lerp(initialState.shell.translateZ, finalState.shell.translateZ, eased)}px)
            rotateX(${animationController.lerp(initialState.shell.rotateX, finalState.shell.rotateX, eased)}deg)
            rotateY(${animationController.lerp(initialState.shell.rotateY, finalState.shell.rotateY, eased)}deg)
        `;
        shell.style.transform = shellTransform;
        shell.style.opacity = animationController.lerp(initialState.shell.opacity, finalState.shell.opacity, eased);

        parts.forEach((part, index) => {
            const initial = initialState.parts[index];
            const final = finalState.parts[index];

            const partTransform = `
                translateZ(${animationController.lerp(initial.translateZ, final.translateZ, eased)}px)
                translateX(${animationController.lerp(initial.translateX, final.translateX, eased)}px)
                translateY(${animationController.lerp(initial.translateY, final.translateY, eased)}px)
                rotateX(${animationController.lerp(initial.rotateX, final.rotateX, eased)}deg)
                rotateY(${animationController.lerp(initial.rotateY, final.rotateY, eased)}deg)
            `;
            part.style.transform = partTransform;
            part.style.opacity = animationController.lerp(initial.opacity, final.opacity, eased);
        });
    }

    scrollDebouncer.onScroll((scrollY, progress) => {
        const sectionProgress = calculateSectionProgress(scrollY);
        animationController.update(sectionProgress);
    });

    function calculateSectionProgress(scrollY) {
        const sectionOffsetTop = animationSection.offsetTop;
        const sectionHeight = animationSection.offsetHeight - window.innerHeight;

        const relativeScroll = scrollY - sectionOffsetTop;
        const progress = Math.max(0, Math.min(1, relativeScroll / sectionHeight));
        return progress;
    }

    window.addEventListener('resize', () => {
        scrollDebouncer.update();
    });
});
