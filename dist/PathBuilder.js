import { Vector3, Color3, MeshBuilder } from 'babylonjs';
export class PathBuilder {
    constructor(scene, options) {
        this.renderedPaths = [];
        this.scene = scene;
        this.options = { ...PathBuilder.defaultOptions, ...options };
    }
    updateOptions(options) {
        this.options = { ...this.options, ...options };
    }
    render(model, layerRange) {
        this.dispose();
        const layersToRender = layerRange
            ? model.layers.filter(l => l.index >= layerRange.start && l.index <= layerRange.end)
            : model.layers;
        const travelPaths = [];
        const rapidPaths = [];
        const extrudePaths = [];
        for (const layer of layersToRender) {
            const layerTravelPaths = [];
            const layerRapidPaths = [];
            const layerExtrudePaths = [];
            let currentTravelPath = null;
            let currentRapidPath = null;
            let currentExtrudePath = null;
            for (const line of layer.lines) {
                const startPoint = this.positionToVector(line.startPosition);
                const endPoint = this.positionToVector(line.endPosition);
                if (line.isExtruding) {
                    if (currentExtrudePath === null) {
                        currentExtrudePath = [startPoint];
                    }
                    currentExtrudePath.push(endPoint);
                    currentTravelPath = null;
                    currentRapidPath = null;
                }
                else if (line.isRapid) {
                    if (currentRapidPath === null) {
                        currentRapidPath = [startPoint];
                    }
                    currentRapidPath.push(endPoint);
                    currentExtrudePath = null;
                    currentTravelPath = null;
                }
                else if (line.travel) {
                    if (currentTravelPath === null) {
                        currentTravelPath = [startPoint];
                    }
                    currentTravelPath.push(endPoint);
                    currentExtrudePath = null;
                    currentRapidPath = null;
                }
            }
            if (currentExtrudePath) {
                layerExtrudePaths.push(currentExtrudePath);
            }
            if (currentRapidPath && this.options.showRapidMoves) {
                layerRapidPaths.push(currentRapidPath);
            }
            if (currentTravelPath && this.options.showTravelMoves) {
                layerTravelPaths.push(currentTravelPath);
            }
            travelPaths.push(...layerTravelPaths);
            rapidPaths.push(...layerRapidPaths);
            extrudePaths.push(...layerExtrudePaths);
        }
        if (this.options.useRibbon && extrudePaths.length > 0) {
            for (const path of extrudePaths) {
                if (path.length >= 2) {
                    const ribbon = this.createRibbon(path);
                    if (ribbon) {
                        this.renderedPaths.push({
                            mesh: ribbon,
                            type: 'extrude',
                            layerIndex: layerRange ? layerRange.start : 0
                        });
                    }
                }
            }
        }
        else if (extrudePaths.length > 0) {
            const extrudeLines = this.createLineSystem(extrudePaths, this.options.extrudeColor, 2);
            this.renderedPaths.push({
                mesh: extrudeLines,
                type: 'extrude',
                layerIndex: layerRange ? layerRange.start : 0
            });
        }
        if (this.options.showTravelMoves && travelPaths.length > 0) {
            const travelLines = this.createLineSystem(travelPaths, this.options.travelColor, 1);
            this.renderedPaths.push({
                mesh: travelLines,
                type: 'travel',
                layerIndex: layerRange ? layerRange.start : 0
            });
        }
        if (this.options.showRapidMoves && rapidPaths.length > 0) {
            const rapidLines = this.createLineSystem(rapidPaths, this.options.rapidColor, 1);
            this.renderedPaths.push({
                mesh: rapidLines,
                type: 'rapid',
                layerIndex: layerRange ? layerRange.start : 0
            });
        }
        return this.renderedPaths;
    }
    createLineSystem(paths, color, lineWidth) {
        const options = {
            lines: paths,
            useVertexAlpha: false
        };
        const lineSystem = MeshBuilder.CreateLineSystem('gcode-path', options, this.scene);
        lineSystem.color = color;
        return lineSystem;
    }
    createRibbon(path) {
        if (path.length < 2) {
            return null;
        }
        const profiles = [];
        const thickness = this.options.layerHeight * 0.5;
        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            const nextPoint = path[Math.min(i + 1, path.length - 1)];
            const prevPoint = path[Math.max(i - 1, 0)];
            const direction = nextPoint.subtract(prevPoint);
            const direction2D = new Vector3(direction.x, 0, direction.z);
            if (direction2D.lengthSquared() < 0.0001) {
                const baseUp = new Vector3(0, 1, 0);
                profiles.push([
                    point.add(new Vector3(thickness, 0, 0)),
                    point.add(new Vector3(0, thickness, 0)),
                    point.add(new Vector3(-thickness, 0, 0)),
                    point.add(new Vector3(0, -thickness, 0))
                ]);
            }
            else {
                const normalizedDir = direction2D.normalize();
                const perpendicular = new Vector3(-normalizedDir.z, 0, normalizedDir.x);
                const up = new Vector3(0, 1, 0);
                const halfWidth = this.options.extrudeWidth / 2;
                const halfHeight = this.options.layerHeight / 2;
                const topRight = point.add(perpendicular.scale(halfWidth)).add(up.scale(halfHeight));
                const topLeft = point.add(perpendicular.scale(-halfWidth)).add(up.scale(halfHeight));
                const bottomLeft = point.add(perpendicular.scale(-halfWidth)).add(up.scale(-halfHeight));
                const bottomRight = point.add(perpendicular.scale(halfWidth)).add(up.scale(-halfHeight));
                profiles.push([topRight, topLeft, bottomLeft, bottomRight]);
            }
        }
        const options = {
            pathArray: profiles,
            closeArray: false,
            closePath: true
        };
        const ribbon = MeshBuilder.CreateRibbon('gcode-ribbon', options, this.scene);
        return ribbon;
    }
    positionToVector(pos) {
        return new Vector3(pos.x ?? 0, pos.z ?? 0, pos.y ?? 0);
    }
    dispose() {
        for (const path of this.renderedPaths) {
            path.mesh.dispose();
        }
        this.renderedPaths = [];
    }
    setVisibility(type, visible) {
        for (const path of this.renderedPaths) {
            if (path.type === type) {
                path.mesh.setEnabled(visible);
            }
        }
    }
    getRenderedPaths() {
        return this.renderedPaths;
    }
}
PathBuilder.defaultOptions = {
    showTravelMoves: false,
    showRapidMoves: false,
    extrudeWidth: 0.4,
    layerHeight: 0.2,
    travelColor: new Color3(0.5, 0.5, 0.5),
    rapidColor: new Color3(1, 0, 0),
    extrudeColor: new Color3(0, 0.8, 1),
    useRibbon: false
};
//# sourceMappingURL=PathBuilder.js.map