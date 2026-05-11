class DetectionParser {
    constructor() {}

    parseFlatArray(flatArray) {
        if (!flatArray || !Array.isArray(flatArray)) {
            throw new Error('Invalid input: expected an array');
        }

        if (flatArray.length % 4 !== 0) {
            console.warn(`Warning: array length ${flatArray.length} is not divisible by 4`);
        }

        const boxes = [];
        const numBoxes = Math.floor(flatArray.length / 4);

        for (let i = 0; i < numBoxes; i++) {
            const offset = i * 4;
            const box = {
                x1: flatArray[offset],
                y1: flatArray[offset + 1],
                x2: flatArray[offset + 2],
                y2: flatArray[offset + 3]
            };
            boxes.push(this.normalizeBox(box));
        }

        return boxes;
    }

    normalizeBox(box) {
        return {
            x1: Math.min(box.x1, box.x2),
            y1: Math.min(box.y1, box.y2),
            x2: Math.max(box.x1, box.x2),
            y2: Math.max(box.y1, box.y2)
        };
    }

    scaleBoxes(boxes, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        const scaleX = targetWidth / sourceWidth;
        const scaleY = targetHeight / sourceHeight;

        return boxes.map(box => ({
            x1: box.x1 * scaleX,
            y1: box.y1 * scaleY,
            x2: box.x2 * scaleX,
            y2: box.y2 * scaleY
        }));
    }

    getBoxDimensions(box) {
        return {
            x: box.x1,
            y: box.y1,
            width: box.x2 - box.x1,
            height: box.y2 - box.y1
        };
    }
}
