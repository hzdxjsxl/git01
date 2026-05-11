import { Color3, LinesMesh, Mesh, Scene } from 'babylonjs';
import { GcodeModel } from './GcodeInterpreter';
export interface PathBuilderOptions {
    showTravelMoves: boolean;
    showRapidMoves: boolean;
    extrudeWidth: number;
    layerHeight: number;
    travelColor: Color3;
    rapidColor: Color3;
    extrudeColor: Color3;
    useRibbon: boolean;
}
export interface RenderedPath {
    mesh: Mesh | LinesMesh;
    type: 'travel' | 'rapid' | 'extrude';
    layerIndex: number;
}
export declare class PathBuilder {
    private scene;
    private options;
    private renderedPaths;
    private static defaultOptions;
    constructor(scene: Scene, options?: Partial<PathBuilderOptions>);
    updateOptions(options: Partial<PathBuilderOptions>): void;
    render(model: GcodeModel, layerRange?: {
        start: number;
        end: number;
    }): RenderedPath[];
    private createLineSystem;
    private createRibbon;
    private positionToVector;
    dispose(): void;
    setVisibility(type: 'travel' | 'rapid' | 'extrude', visible: boolean): void;
    getRenderedPaths(): RenderedPath[];
}
//# sourceMappingURL=PathBuilder.d.ts.map