export class GcodeInterpreter {
    constructor() {
        this.currentPosition = {
            x: null,
            y: null,
            z: null,
            e: null,
            f: null
        };
        this.lastE = 0;
        this.layerIndex = 0;
        this.lastZ = null;
        this.absoluteMode = true;
        this.absoluteEMode = true;
        this.minPos = { x: Infinity, y: Infinity, z: Infinity, e: null, f: null };
        this.maxPos = { x: -Infinity, y: -Infinity, z: -Infinity, e: null, f: null };
        this.lines = [];
        this.layers = [];
        this.currentLayerLines = [];
        this.reset();
    }
    reset() {
        this.currentPosition = { x: null, y: null, z: null, e: null, f: null };
        this.lastE = 0;
        this.layerIndex = 0;
        this.lastZ = null;
        this.absoluteMode = true;
        this.absoluteEMode = true;
        this.minPos = { x: Infinity, y: Infinity, z: Infinity, e: null, f: null };
        this.maxPos = { x: -Infinity, y: -Infinity, z: -Infinity, e: null, f: null };
        this.lines = [];
        this.layers = [];
        this.currentLayerLines = [];
    }
    parse(gcodeText) {
        this.reset();
        const rawLines = gcodeText.split(/\r?\n/);
        for (let lineNumber = 0; lineNumber < rawLines.length; lineNumber++) {
            const line = rawLines[lineNumber];
            const command = this.parseLine(line, lineNumber);
            if (command) {
                this.executeCommand(command);
            }
        }
        this.flushLayer();
        return this.buildModel();
    }
    parseLine(line, lineNumber) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(';')) {
            return null;
        }
        const withoutComment = trimmed.split(';')[0].trim();
        if (!withoutComment) {
            return null;
        }
        const tokens = withoutComment.match(/[A-Za-z][-+]?\d*\.?\d+/g);
        if (!tokens || tokens.length === 0) {
            return null;
        }
        const params = new Map();
        let command = '';
        for (const token of tokens) {
            const letter = token[0].toUpperCase();
            const value = parseFloat(token.substring(1));
            if (letter === 'G' || letter === 'M') {
                command = `${letter}${Math.floor(value)}`;
            }
            else {
                params.set(letter, value);
            }
        }
        if (!command) {
            return null;
        }
        return {
            line: lineNumber,
            raw: line,
            command,
            params
        };
    }
    executeCommand(cmd) {
        const { command, params } = cmd;
        switch (command) {
            case 'G0':
            case 'G1':
                this.handleMove(cmd, command === 'G0');
                break;
            case 'G2':
            case 'G3':
                this.handleArc(cmd, command === 'G2');
                break;
            case 'G28':
                this.handleHome(params);
                break;
            case 'G90':
                this.absoluteMode = true;
                break;
            case 'G91':
                this.absoluteMode = false;
                break;
            case 'G92':
                this.handlePositionSet(params);
                break;
            case 'M82':
                this.absoluteEMode = true;
                break;
            case 'M83':
                this.absoluteEMode = false;
                break;
            default:
                break;
        }
    }
    handleMove(cmd, isRapid) {
        const { params, line: lineNumber } = cmd;
        const startPosition = { ...this.currentPosition };
        const newPosition = { ...this.currentPosition };
        if (params.has('X')) {
            const x = params.get('X');
            newPosition.x = this.absoluteMode ? x : (newPosition.x ?? 0) + x;
        }
        if (params.has('Y')) {
            const y = params.get('Y');
            newPosition.y = this.absoluteMode ? y : (newPosition.y ?? 0) + y;
        }
        if (params.has('Z')) {
            const z = params.get('Z');
            newPosition.z = this.absoluteMode ? z : (newPosition.z ?? 0) + z;
        }
        if (params.has('E')) {
            const e = params.get('E');
            if (this.absoluteEMode) {
                newPosition.e = e;
            }
            else {
                newPosition.e = (newPosition.e ?? 0) + e;
            }
        }
        if (params.has('F')) {
            newPosition.f = params.get('F');
        }
        const eDelta = (newPosition.e ?? 0) - (this.lastE);
        const isExtruding = eDelta > 0;
        const travel = !isExtruding && !isRapid;
        if (newPosition.z !== null && this.lastZ !== null && newPosition.z > this.lastZ) {
            this.flushLayer();
            this.layerIndex++;
        }
        if (this.hasPositionChange(startPosition, newPosition)) {
            const gcodeLine = {
                lineNumber,
                startPosition,
                endPosition: newPosition,
                isExtruding,
                feedRate: newPosition.f ?? 0,
                travel,
                layerIndex: this.layerIndex,
                isRapid
            };
            this.lines.push(gcodeLine);
            this.currentLayerLines.push(gcodeLine);
            this.updateBounds(newPosition);
        }
        if (isExtruding) {
            this.lastE = newPosition.e ?? 0;
        }
        if (newPosition.z !== null) {
            this.lastZ = newPosition.z;
        }
        this.currentPosition = newPosition;
    }
    handleArc(cmd, isClockwise) {
        const { params, line: lineNumber } = cmd;
        const startPosition = { ...this.currentPosition };
        const newPosition = { ...this.currentPosition };
        if (params.has('X')) {
            const x = params.get('X');
            newPosition.x = this.absoluteMode ? x : (newPosition.x ?? 0) + x;
        }
        if (params.has('Y')) {
            const y = params.get('Y');
            newPosition.y = this.absoluteMode ? y : (newPosition.y ?? 0) + y;
        }
        if (params.has('Z')) {
            const z = params.get('Z');
            newPosition.z = this.absoluteMode ? z : (newPosition.z ?? 0) + z;
        }
        if (params.has('E')) {
            const e = params.get('E');
            if (this.absoluteEMode) {
                newPosition.e = e;
            }
            else {
                newPosition.e = (newPosition.e ?? 0) + e;
            }
        }
        if (params.has('F')) {
            newPosition.f = params.get('F');
        }
        const i = params.get('I') ?? 0;
        const j = params.get('J') ?? 0;
        const centerX = (startPosition.x ?? 0) + i;
        const centerY = (startPosition.y ?? 0) + j;
        const startAngle = Math.atan2((startPosition.y ?? 0) - centerY, (startPosition.x ?? 0) - centerX);
        let endAngle = Math.atan2((newPosition.y ?? 0) - centerY, (newPosition.x ?? 0) - centerX);
        if (isClockwise) {
            while (endAngle >= startAngle)
                endAngle -= 2 * Math.PI;
        }
        else {
            while (endAngle <= startAngle)
                endAngle += 2 * Math.PI;
        }
        const eDelta = (newPosition.e ?? 0) - (this.lastE);
        const isExtruding = eDelta > 0;
        const numSteps = 20;
        for (let step = 1; step <= numSteps; step++) {
            const t = step / numSteps;
            const angle = startAngle + (endAngle - startAngle) * t;
            const radius = Math.sqrt(i * i + j * j);
            const arcX = centerX + radius * Math.cos(angle);
            const arcY = centerY + radius * Math.sin(angle);
            const arcZ = (startPosition.z ?? 0) + ((newPosition.z ?? 0) - (startPosition.z ?? 0)) * t;
            const arcPosition = {
                x: arcX,
                y: arcY,
                z: arcZ,
                e: newPosition.e,
                f: newPosition.f
            };
            const prevPos = step === 1 ? startPosition : { ...this.currentPosition };
            if (this.hasPositionChange(prevPos, arcPosition)) {
                const gcodeLine = {
                    lineNumber,
                    startPosition: prevPos,
                    endPosition: arcPosition,
                    isExtruding,
                    feedRate: newPosition.f ?? 0,
                    travel: false,
                    layerIndex: this.layerIndex,
                    isRapid: false
                };
                this.lines.push(gcodeLine);
                this.currentLayerLines.push(gcodeLine);
                this.updateBounds(arcPosition);
            }
            this.currentPosition = arcPosition;
        }
        if (isExtruding) {
            this.lastE = newPosition.e ?? 0;
        }
        if (newPosition.z !== null) {
            this.lastZ = newPosition.z;
        }
        this.currentPosition = newPosition;
    }
    handleHome(params) {
        const hasAny = params.size === 0;
        if (hasAny || params.has('X')) {
            this.currentPosition.x = 0;
        }
        if (hasAny || params.has('Y')) {
            this.currentPosition.y = 0;
        }
        if (hasAny || params.has('Z')) {
            this.currentPosition.z = 0;
        }
    }
    handlePositionSet(params) {
        if (params.has('X')) {
            this.currentPosition.x = params.get('X');
        }
        if (params.has('Y')) {
            this.currentPosition.y = params.get('Y');
        }
        if (params.has('Z')) {
            this.currentPosition.z = params.get('Z');
        }
        if (params.has('E')) {
            this.currentPosition.e = params.get('E');
            this.lastE = params.get('E');
        }
    }
    hasPositionChange(pos1, pos2) {
        return pos1.x !== pos2.x || pos1.y !== pos2.y || pos1.z !== pos2.z;
    }
    updateBounds(pos) {
        if (pos.x !== null) {
            this.minPos.x = Math.min(this.minPos.x, pos.x);
            this.maxPos.x = Math.max(this.maxPos.x, pos.x);
        }
        if (pos.y !== null) {
            this.minPos.y = Math.min(this.minPos.y, pos.y);
            this.maxPos.y = Math.max(this.maxPos.y, pos.y);
        }
        if (pos.z !== null) {
            this.minPos.z = Math.min(this.minPos.z, pos.z);
            this.maxPos.z = Math.max(this.maxPos.z, pos.z);
        }
    }
    flushLayer() {
        if (this.currentLayerLines.length > 0) {
            this.layers.push({
                index: this.layerIndex,
                z: this.lastZ ?? 0,
                lines: [...this.currentLayerLines]
            });
            this.currentLayerLines = [];
        }
    }
    buildModel() {
        const filamentUsed = this.lastE;
        let estimatedTime = 0;
        for (const line of this.lines) {
            const dx = (line.endPosition.x ?? 0) - (line.startPosition.x ?? 0);
            const dy = (line.endPosition.y ?? 0) - (line.startPosition.y ?? 0);
            const dz = (line.endPosition.z ?? 0) - (line.startPosition.z ?? 0);
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const feedRate = line.feedRate || 100;
            estimatedTime += distance / feedRate;
        }
        const model = {
            totalLines: this.lines.length,
            totalLayers: this.layers.length,
            layers: this.layers,
            minPos: {
                x: this.minPos.x === Infinity ? 0 : this.minPos.x,
                y: this.minPos.y === Infinity ? 0 : this.minPos.y,
                z: this.minPos.z === Infinity ? 0 : this.minPos.z,
                e: null,
                f: null
            },
            maxPos: {
                x: this.maxPos.x === -Infinity ? 0 : this.maxPos.x,
                y: this.maxPos.y === -Infinity ? 0 : this.maxPos.y,
                z: this.maxPos.z === -Infinity ? 0 : this.maxPos.z,
                e: null,
                f: null
            },
            centerPos: {
                x: ((this.minPos.x === Infinity ? 0 : this.minPos.x) + (this.maxPos.x === -Infinity ? 0 : this.maxPos.x)) / 2,
                y: ((this.minPos.y === Infinity ? 0 : this.minPos.y) + (this.maxPos.y === -Infinity ? 0 : this.maxPos.y)) / 2,
                z: ((this.minPos.z === Infinity ? 0 : this.minPos.z) + (this.maxPos.z === -Infinity ? 0 : this.maxPos.z)) / 2,
                e: null,
                f: null
            },
            filamentUsed,
            estimatedTime: estimatedTime / 60
        };
        return model;
    }
}
//# sourceMappingURL=GcodeInterpreter.js.map