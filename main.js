document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing animation...');
    
    if (ScrollDebouncer.instance) ScrollDebouncer.instance = null;
    if (AnimationController.instance) AnimationController.instance = null;
    
    const scrollDebouncer = ScrollDebouncer.getInstance();
    const animationController = AnimationController.getInstance();

    const animationSection = document.querySelector('.animation-section');
    const scene = document.getElementById('explosionScene');
    const shell = document.querySelector('.product-shell');
    const parts = document.querySelectorAll('.product-part');
    
    console.log('Found parts:', parts.length);

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

    function updateAnimation(progress) {
        const clampedProgress = Math.max(0, Math.min(1, progress));
        const eased = animationController.easeInOutCubic(clampedProgress);

        const shellScale = animationController.lerp(initialState.shell.scale, finalState.shell.scale, eased);
        const shellTZ = animationController.lerp(initialState.shell.translateZ, finalState.shell.translateZ, eased);
        const shellRX = animationController.lerp(initialState.shell.rotateX, finalState.shell.rotateX, eased);
        const shellRY = animationController.lerp(initialState.shell.rotateY, finalState.shell.rotateY, eased);
        const shellOpacity = animationController.lerp(initialState.shell.opacity, finalState.shell.opacity, eased);

        shell.style.transform = `scale(${shellScale}) translateZ(${shellTZ}px) rotateX(${shellRX}deg) rotateY(${shellRY}deg)`;
        shell.style.opacity = shellOpacity;

        parts.forEach((part, index) => {
            const initial = initialState.parts[index];
            const final = finalState.parts[index];

            const pTZ = animationController.lerp(initial.translateZ, final.translateZ, eased);
            const pTX = animationController.lerp(initial.translateX, final.translateX, eased);
            const pTY = animationController.lerp(initial.translateY, final.translateY, eased);
            const pRX = animationController.lerp(initial.rotateX, final.rotateX, eased);
            const pRY = animationController.lerp(initial.rotateY, final.rotateY, eased);
            const pOpacity = animationController.lerp(initial.opacity, final.opacity, eased);

            part.style.transform = `translateZ(${pTZ}px) translateX(${pTX}px) translateY(${pTY}px) rotateX(${pRX}deg) rotateY(${pRY}deg)`;
            part.style.opacity = pOpacity;
        });
    }

    updateAnimation(0);
    console.log('Initial animation state set');

    function calculateSectionProgress(scrollY) {
        const sectionOffsetTop = animationSection.offsetTop;
        const sectionHeight = animationSection.offsetHeight;
        const viewportHeight = window.innerHeight;
        const availableScroll = sectionHeight - viewportHeight;

        if (availableScroll <= 0) return 0;

        const relativeScroll = scrollY - sectionOffsetTop;
        const progress = relativeScroll / availableScroll;
        return Math.max(0, Math.min(1, progress));
    }

    scrollDebouncer.onScroll((scrollY, globalProgress) => {
        const sectionProgress = calculateSectionProgress(scrollY);
        console.log('Scroll - scrollY:', scrollY, 'sectionProgress:', sectionProgress.toFixed(3));
        updateAnimation(sectionProgress);
    });

    window.addEventListener('resize', () => {
        const currentProgress = calculateSectionProgress(window.scrollY);
        updateAnimation(currentProgress);
    });
    
    console.log('Animation system initialized successfully!');
    
    window.testAnimation = function(progress) {
        updateAnimation(progress);
        console.log('Test animation at progress:', progress);
    };
});
