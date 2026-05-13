const app = (() => {
    const canvas = document.getElementById('lightning-canvas');
    const renderer = new LightningRenderer.Renderer(canvas);
    const thunderstorm = new LightningLogic.Thunderstorm();
    let frameCount = 0;

    function animate() {
        frameCount++;
        thunderstorm.update(canvas.width, canvas.height, frameCount);
        renderer.render(thunderstorm);
        requestAnimationFrame(animate);
    }

    function init() {
        animate();
    }

    return { init };
})();

window.addEventListener('load', app.init);
