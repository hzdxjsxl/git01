export interface GcodeCommand {
    line: number;
    raw: string;
    command: string;
    params: Map<string, number>;
}
export interface GcodePosition {
    x: number | null;
    y: number | null;
    z: number | null;
    e: number | null;
    f: number | null;
}
export interface GcodeLine {
    lineNumber: number;
    startPosition: GcodePosition;
    endPosition: GcodePosition;
    isExtruding: boolean;
    feedRate: number;
    travel: boolean;
    layerIndex: number;
    isRapid: boolean;
}
export interface GcodeLayer {
    index: number;
    z: number;
    lines: GcodeLine[];
}
export interface GcodeModel {
    totalLines: number;
    totalLayers: number;
    layers: GcodeLayer[];
    minPos: GcodePosition;
    maxPos: GcodePosition;
    centerPos: GcodePosition;
    filamentUsed: number;
    estimatedTime: number;
}
export declare class GcodeInterpreter {
    private currentPosition;
    private lastE;
    private layerIndex;
    private lastZ;
    private absoluteMode;
    private absoluteEMode;
    private minPos;
    private maxPos;
    private lines;
    private layers;
    private currentLayerLines;
    constructor();
    reset(): void;
    parse(gcodeText: string): GcodeModel;
    private parseLine;
    private executeCommand;
    private handleMove;
    private handleArc;
    private handleHome;
    private handlePositionSet;
    private hasPositionChange;
    private updateBounds;
    private flushLayer;
    private buildModel;
}
//# sourceMappingURL=GcodeInterpreter.d.ts.map