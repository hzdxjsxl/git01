class DetectionCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.parser = new DetectionParser();
        this.loadedImage = null;
        this.originalImageWidth = 0;
        this.originalImageHeight = 0;
        this.boxColor = '#ff0000';
        this.boxLineWidth = 2;
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.loadedImage = img;
                    this.originalImageWidth = img.width;
                    this.originalImageHeight = img.height;
                    this.renderImage();
                    resolve(img);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    renderImage() {
        if (!this.loadedImage) return;

        this.clearCanvas();
        
        const { displayWidth, displayHeight, offsetX, offsetY } = this.getImageFitDimensions();
        
        this.ctx.drawImage(
            this.loadedImage,
            offsetX, offsetY,
            displayWidth, displayHeight
        );
    }

    getImageFitDimensions() {
        if (!this.loadedImage) {
            return { displayWidth: 0, displayHeight: 0, offsetX: 0, offsetY: 0 };
        }

        const canvasAspect = this.canvas.width / this.canvas.height;
        const imageAspect = this.loadedImage.width / this.loadedImage.height;

        let displayWidth, displayHeight;

        if (imageAspect > canvasAspect) {
            displayWidth = this.canvas.width;
            displayHeight = this.canvas.width / imageAspect;
        } else {
            displayHeight = this.canvas.height;
            displayWidth = this.canvas.height * imageAspect;
        }

        const offsetX = (this.canvas.width - displayWidth) / 2;
        const offsetY = (this.canvas.height - displayHeight) / 2;

        return { displayWidth, displayHeight, offsetX, offsetY };
    }

    drawDetections(flatArray) {
        if (!this.loadedImage) {
            console.warn('No image loaded, cannot draw detections');
            return;
        }

        const boxes = this.parser.parseFlatArray(flatArray);
        const { displayWidth, displayHeight, offsetX, offsetY } = this.getImageFitDimensions();

        const scaledBoxes = this.parser.scaleBoxes(
            boxes,
            this.originalImageWidth,
            this.originalImageHeight,
            displayWidth,
            displayHeight
        );

        this.ctx.strokeStyle = this.boxColor;
        this.ctx.lineWidth = this.boxLineWidth;

        scaledBoxes.forEach((box, index) => {
            const dims = this.parser.getBoxDimensions(box);
            
            this.ctx.strokeRect(
                dims.x + offsetX,
                dims.y + offsetY,
                dims.width,
                dims.height
            );

            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = this.boxColor;
            this.ctx.fillText(
                `#${index + 1}`,
                dims.x + offsetX + 5,
                dims.y + offsetY + 18
            );
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = new DetectionCanvas('canvas');
    const imageInput = document.getElementById('imageInput');
    const inferBtn = document.getElementById('inferBtn');
    const status = document.getElementById('status');

    let selectedFile = null;

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            status.textContent = 'Loading image...';
            selectedFile = file;
            await canvas.loadImage(file);
            status.textContent = `Image loaded: ${canvas.originalImageWidth}x${canvas.originalImageHeight}`;
        } catch (err) {
            status.textContent = 'Error loading image';
            console.error(err);
        }
    });

    inferBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            status.textContent = 'Please select an image first';
            return;
        }

        try {
            status.textContent = 'Running inference...';
            inferBtn.disabled = true;

            const formData = new FormData();
            formData.append('image', selectedFile);

            const response = await fetch('http://localhost:8000/api/infer', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const flatArray = await response.json();
            console.log('Received detections:', flatArray);

            canvas.renderImage();
            canvas.drawDetections(flatArray);

            const numBoxes = Math.floor(flatArray.length / 4);
            status.textContent = `Done! Found ${numBoxes} detections`;
        } catch (err) {
            status.textContent = 'Inference failed';
            console.error(err);
        } finally {
            inferBtn.disabled = false;
        }
    });
});
