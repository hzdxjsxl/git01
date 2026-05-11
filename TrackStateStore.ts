
/**
 * 轨道状态管理与碰撞检测
 * 负责片段存储、重叠检测、拖拽吸附等核心交互逻辑
 */

export interface TrackClip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  sourceStartTime: number;
  name: string;
  type: 'video' | 'audio';
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio';
  height: number;
}

export interface SnapPoint {
  time: number;
  type: 'clip-start' | 'clip-end' | 'grid';
  clipId?: string;
}

export interface CollisionResult {
  overlappingClips: TrackClip[];
  needsAdjustment: boolean;
  suggestedStartTime?: number;
}

export interface DragState {
  clipId: string;
  initialStartTime: number;
  mouseOffsetTime: number;
  dragEdge: 'start' | 'end' | 'body' | null;
}

export type TrackStateChange =
  | { type: 'clip-added'; clip: TrackClip }
  | { type: 'clip-removed'; clipId: string }
  | { type: 'clip-updated'; clip: TrackClip }
  | { type: 'track-added'; track: Track }
  | { type: 'track-removed'; trackId: string };

type Listener = (change: TrackStateChange) => void;

export class TrackStateStore {
  private tracks: Map<string, Track> = new Map();
  private clips: Map<string, TrackClip> = new Map();
  private listeners: Set<Listener> = new Set();
  private dragState: DragState | null = null;

  constructor() {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(change: TrackStateChange): void {
    this.listeners.forEach(listener => listener(change));
  }

  getTracks(): Track[] {
    return Array.from(this.tracks.values());
  }

  getTrack(trackId: string): Track | undefined {
    return this.tracks.get(trackId);
  }

  addTrack(track: Track): void {
    this.tracks.set(track.id, track);
    this.notify({ type: 'track-added', track });
  }

  removeTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    
    this.tracks.delete(trackId);
    Array.from(this.clips.values())
      .filter(clip => clip.trackId === trackId)
      .forEach(clip => {
        this.clips.delete(clip.id);
        this.notify({ type: 'clip-removed', clipId: clip.id });
      });
    this.notify({ type: 'track-removed', trackId });
  }

  getClips(): TrackClip[] {
    return Array.from(this.clips.values());
  }

  getClip(clipId: string): TrackClip | undefined {
    return this.clips.get(clipId);
  }

  getClipsByTrack(trackId: string): TrackClip[] {
    return Array.from(this.clips.values()).filter(clip => clip.trackId === trackId);
  }

  addClip(clip: TrackClip): boolean {
    if (this.clips.has(clip.id)) return false;
    if (!this.tracks.has(clip.trackId)) return false;

    const collision = this.checkCollision(clip);
    if (collision.needsAdjustment) {
      return false;
    }

    this.clips.set(clip.id, clip);
    this.notify({ type: 'clip-added', clip });
    return true;
  }

  removeClip(clipId: string): void {
    const clip = this.clips.get(clipId);
    if (!clip) return;
    this.clips.delete(clipId);
    this.notify({ type: 'clip-removed', clipId });
  }

  updateClip(clipId: string, updates: Partial<TrackClip>): TrackClip | null {
    const clip = this.clips.get(clipId);
    if (!clip) return null;

    const updatedClip = { ...clip, ...updates };
    const collision = this.checkCollision(updatedClip, clipId);
    if (collision.needsAdjustment) {
      return null;
    }

    this.clips.set(clipId, updatedClip);
    this.notify({ type: 'clip-updated', clip: updatedClip });
    return updatedClip;
  }

  checkCollision(clip: TrackClip, excludeClipId?: string): CollisionResult {
    const overlappingClips = this.getClipsByTrack(clip.trackId).filter(c => {
      if (excludeClipId && c.id === excludeClipId) return false;
      return this.rangesOverlap(
        clip.startTime,
        clip.startTime + clip.duration,
        c.startTime,
        c.startTime + c.duration
      );
    });

    return {
      overlappingClips,
      needsAdjustment: overlappingClips.length > 0,
    };
  }

  private rangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && end1 > start2;
  }

  getSnapPoints(
    currentClip: TrackClip,
    currentTime: number,
    dragEdge: 'start' | 'end' | null
  ): SnapPoint[] {
    const points: SnapPoint[] = [];
    const trackClips = this.getClipsByTrack(currentClip.trackId);
    
    trackClips.forEach(clip => {
      if (clip.id === currentClip.id) return;
      
      const clipEnd = clip.startTime + clip.duration;
      
      if (dragEdge === 'start' || dragEdge === 'end') {
        points.push({ time: clip.startTime, type: 'clip-start', clipId: clip.id });
        points.push({ time: clipEnd, type: 'clip-end', clipId: clip.id });
      } else {
        points.push({ time: clip.startTime, type: 'clip-start', clipId: clip.id });
        points.push({ time: clipEnd, type: 'clip-end', clipId: clip.id });
      }
    });

    return points;
  }

  calculateSnappedTime(
    targetTime: number,
    snapPoints: SnapPoint[],
    snapThresholdMs: number = 20
  ): { snapped: boolean; time: number; closestPoint?: SnapPoint } {
    if (snapPoints.length === 0) {
      return { snapped: false, time: targetTime };
    }

    let closestPoint: SnapPoint | undefined;
    let minDiff = Infinity;

    for (const point of snapPoints) {
      const diff = Math.abs(point.time - targetTime);
      if (diff < minDiff && diff <= snapThresholdMs) {
        minDiff = diff;
        closestPoint = point;
      }
    }

    if (closestPoint) {
      return {
        snapped: true,
        time: closestPoint.time,
        closestPoint,
      };
    }

    return { snapped: false, time: targetTime };
  }

  startDrag(clipId: string, mouseTime: number, dragEdge: 'start' | 'end' | 'body'): DragState | null {
    const clip = this.clips.get(clipId);
    if (!clip) return null;

    let mouseOffsetTime: number;
    if (dragEdge === 'start') {
      mouseOffsetTime = clip.startTime - mouseTime;
    } else if (dragEdge === 'end') {
      mouseOffsetTime = (clip.startTime + clip.duration) - mouseTime;
    } else {
      mouseOffsetTime = clip.startTime - mouseTime;
    }

    this.dragState = {
      clipId,
      initialStartTime: clip.startTime,
      mouseOffsetTime,
      dragEdge,
    };

    return this.dragState;
  }

  handleDrag(mouseTime: number): TrackClip | null {
    if (!this.dragState) return null;

    const clip = this.clips.get(this.dragState.clipId);
    if (!clip) return null;

    const { dragEdge, mouseOffsetTime } = this.dragState;
    let updates: Partial<TrackClip> = {};

    if (dragEdge === 'start') {
      const newStartTime = mouseTime + mouseOffsetTime;
      const snapPoints = this.getSnapPoints(clip, newStartTime, 'start');
      const { time: snappedTime } = this.calculateSnappedTime(newStartTime, snapPoints);
      
      const newDuration = clip.startTime + clip.duration - snappedTime;
      if (newDuration > 0) {
        updates = {
          startTime: snappedTime,
          duration: newDuration,
        };
      }
    } else if (dragEdge === 'end') {
      const newEndTime = mouseTime + mouseOffsetTime;
      const snapPoints = this.getSnapPoints(clip, newEndTime, 'end');
      const { time: snappedTime } = this.calculateSnappedTime(newEndTime, snapPoints);
      
      const newDuration = snappedTime - clip.startTime;
      if (newDuration > 0) {
        updates = { duration: newDuration };
      }
    } else {
      const newStartTime = mouseTime + mouseOffsetTime;
      const currentEndTime = newStartTime + clip.duration;
      
      const startSnapPoints = this.getSnapPoints({ ...clip, startTime: newStartTime }, newStartTime, 'start');
      const endSnapPoints = this.getSnapPoints({ ...clip, startTime: newStartTime }, currentEndTime, 'end');
      
      const startSnapped = this.calculateSnappedTime(newStartTime, startSnapPoints);
      const endSnapped = this.calculateSnappedTime(currentEndTime, endSnapPoints);
      
      if (startSnapped.snapped && endSnapped.snapped) {
        const startDiff = Math.abs(startSnapped.time - newStartTime);
        const endDiff = Math.abs(endSnapped.time - currentEndTime);
        updates = { startTime: startDiff <= endDiff ? startSnapped.time : (endSnapped.time - clip.duration) };
      } else if (startSnapped.snapped) {
        updates = { startTime: startSnapped.time };
      } else if (endSnapped.snapped) {
        updates = { startTime: endSnapped.time - clip.duration };
      } else {
        updates = { startTime: newStartTime };
      }
    }

    if (Object.keys(updates).length > 0) {
      return this.updateClip(clip.id, updates);
    }

    return null;
  }

  endDrag(): void {
    this.dragState = null;
  }

  getDragState(): DragState | null {
    return this.dragState;
  }

  findClipAtTime(trackId: string, time: number): TrackClip | undefined {
    return this.getClipsByTrack(trackId).find(clip => 
      time >= clip.startTime && time < clip.startTime + clip.duration
    );
  }

  findClipById(clipId: string): TrackClip | undefined {
    return this.clips.get(clipId);
  }

  splitClip(clipId: string, splitTime: number): [TrackClip, TrackClip] | null {
    const clip = this.clips.get(clipId);
    if (!clip) return null;

    if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
      return null;
    }

    const firstDuration = splitTime - clip.startTime;
    const secondStartTime = splitTime;
    const secondDuration = clip.startTime + clip.duration - splitTime;

    const firstClip: TrackClip = {
      ...clip,
      id: `${clip.id}-1`,
      duration: firstDuration,
    };

    const secondClip: TrackClip = {
      ...clip,
      id: `${clip.id}-2`,
      startTime: secondStartTime,
      duration: secondDuration,
      sourceStartTime: clip.sourceStartTime + firstDuration,
    };

    this.removeClip(clipId);
    this.addClip(firstClip);
    this.addClip(secondClip);

    return [firstClip, secondClip];
  }

  getTotalDuration(): number {
    const clips = this.getClips();
    if (clips.length === 0) return 0;
    
    return Math.max(...clips.map(clip => clip.startTime + clip.duration));
  }
}
