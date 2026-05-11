
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TimelineEngine } from './TimelineEngine';
import { TrackStateStore, Track, TrackClip } from './TrackStateStore';

const RESIZE_HANDLE_WIDTH = 6;
const TRACK_HEADER_WIDTH = 150;
const RULER_HEIGHT = 30;
const DEFAULT_TRACK_HEIGHT = 60;
const SNAP_INDICATOR_COLOR = '#4CAF50';

interface CanvasTimelineProps {
  width: number;
  height: number;
  engine: TimelineEngine;
  store: TrackStateStore;
}

interface TimelineState {
  currentTime: number;
  isPlaying: boolean;
  selectedClipId: string | null;
}

export const CanvasTimeline: React.FC<CanvasTimelineProps> = ({
  width,
  height,
  engine,
  store,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<TimelineState>({
    currentTime: 0,
    isPlaying: false,
    selectedClipId: null,
  });
  const animationRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const dragInfoRef = useRef<{
    trackId: string;
    clipId: string;
    dragType: 'start' | 'end' | 'body' | 'ruler' | 'pan';
    startX: number;
    startY: number;
    initialStartTime: number;
    initialDuration: number;
  } | null>(null);

  const getCanvasContext = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  }, []);

  const clearCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const drawRuler = useCallback((ctx: CanvasRenderingContext2D) => {
    const { pixelsPerSecond, startTime } = engine.getConfig();
    const intervals = engine.getOptimalGridIntervals();
    const mainInterval = intervals[1];
    const subInterval = intervals[0];

    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(TRACK_HEADER_WIDTH, 0, width - TRACK_HEADER_WIDTH, RULER_HEIGHT);

    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(TRACK_HEADER_WIDTH, RULER_HEIGHT);
    ctx.lineTo(width, RULER_HEIGHT);
    ctx.stroke();

    ctx.font = '11px Arial';
    ctx.fillStyle = '#9a9abf';
    ctx.textAlign = 'center';

    const startPixel = TRACK_HEADER_WIDTH;
    const endPixel = width;

    const firstMainTime = Math.ceil(startTime / mainInterval) * mainInterval;
    for (let t = firstMainTime; ; t += mainInterval) {
      const x = startPixel + engine.timeToPixel(t);
      if (x > endPixel) break;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, RULER_HEIGHT);
      ctx.stroke();

      const label = engine.formatTime(t, 'MM:SS.ms');
      ctx.fillText(label, x, RULER_HEIGHT - 8);
    }

    ctx.strokeStyle = '#3a3a5a';
    const firstSubTime = Math.ceil(startTime / subInterval) * subInterval;
    for (let t = firstSubTime; ; t += subInterval) {
      const x = startPixel + engine.timeToPixel(t);
      if (x > endPixel) break;

      ctx.beginPath();
      ctx.moveTo(x, RULER_HEIGHT - 10);
      ctx.lineTo(x, RULER_HEIGHT);
      ctx.stroke();
    }
  }, [engine, width]);

  const drawTrack = useCallback((ctx: CanvasRenderingContext2D, track: Track, y: number) => {
    const clips = store.getClipsByTrack(track.id);

    ctx.fillStyle = track.type === 'video' ? '#252540' : '#2a2a48';
    ctx.fillRect(0, y, width, track.height);

    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + track.height);
    ctx.lineTo(width, y + track.height);
    ctx.stroke();

    ctx.fillStyle = '#e0e0f0';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(track.name, 10, y + track.height / 2 + 4);

    ctx.fillStyle = '#1e1e35';
    ctx.fillRect(TRACK_HEADER_WIDTH, y, width - TRACK_HEADER_WIDTH, track.height);

    clips.forEach(clip => this.drawClip(ctx, clip, y, track.height));
  }, [store, width, engine]);

  const drawClip = useCallback((ctx: CanvasRenderingContext2D, clip: TrackClip, trackY: number, trackHeight: number) => {
    const x = TRACK_HEADER_WIDTH + engine.timeToPixel(clip.startTime);
    const w = engine.durationToWidth(clip.duration);
    const h = trackHeight - 10;
    const y = trackY + 5;

    const isSelected = state.selectedClipId === clip.id;

    ctx.fillStyle = clip.type === 'video' 
      ? (isSelected ? '#5c6bc0' : '#3f51b5')
      : (isSelected ? '#81c784' : '#4caf50');
    
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#ffeb3b' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    if (w > 40) {
      ctx.fillText(clip.name, x + 8, y + h / 2 + 4);
    }

    if (isSelected && w > RESIZE_HANDLE_WIDTH * 2) {
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(x, y, RESIZE_HANDLE_WIDTH, h);
      ctx.fillRect(x + w - RESIZE_HANDLE_WIDTH, y, RESIZE_HANDLE_WIDTH, h);
    }
  }, [engine, state.selectedClipId]);

  const drawPlayhead = useCallback((ctx: CanvasRenderingContext2D) => {
    const x = TRACK_HEADER_WIDTH + engine.timeToPixel(state.currentTime);
    
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(x - 6, 0);
    ctx.lineTo(x + 6, 0);
    ctx.lineTo(x, 10);
    ctx.closePath();
    ctx.fill();
  }, [engine, state.currentTime, height]);

  const drawSnapIndicator = useCallback((ctx: CanvasRenderingContext2D, snapTime: number) => {
    const x = TRACK_HEADER_WIDTH + engine.timeToPixel(snapTime);
    
    ctx.strokeStyle = SNAP_INDICATOR_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, RULER_HEIGHT);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [engine, height]);

  const render = useCallback(() => {
    const ctx = getCanvasContext();
    if (!ctx) return;

    clearCanvas(ctx);
    drawRuler(ctx);

    let currentY = RULER_HEIGHT;
    store.getTracks().forEach(track => {
      this.drawTrack(ctx, track, currentY);
      currentY += track.height;
    });

    drawPlayhead(ctx);
  }, [
    getCanvasContext,
    clearCanvas,
    drawRuler,
    drawTrack,
    drawPlayhead,
    store,
  ]);

  const hitTestClip = useCallback((x: number, y: number): {
    clip: TrackClip;
    track: Track;
    dragType: 'start' | 'end' | 'body';
  } | null => {
    if (x < TRACK_HEADER_WIDTH || y < RULER_HEIGHT) return null;

    let currentY = RULER_HEIGHT;
    const tracks = store.getTracks();

    for (const track of tracks) {
      if (y >= currentY && y < currentY + track.height) {
        const timeX = x - TRACK_HEADER_WIDTH;
        const time = engine.pixelToTime(timeX);
        const clip = store.findClipAtTime(track.id, time);

        if (clip) {
          const clipX = TRACK_HEADER_WIDTH + engine.timeToPixel(clip.startTime);
          const clipW = engine.durationToWidth(clip.duration);

          let dragType: 'start' | 'end' | 'body' = 'body';
          if (x - clipX < RESIZE_HANDLE_WIDTH && state.selectedClipId === clip.id) {
            dragType = 'start';
          } else if (clipX + clipW - x < RESIZE_HANDLE_WIDTH && state.selectedClipId === clip.id) {
            dragType = 'end';
          }

          return { clip, track, dragType };
        }
        break;
      }
      currentY += track.height;
    }

    return null;
  }, [store, engine, state.selectedClipId]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isDraggingRef.current = true;
      dragInfoRef.current = {
        trackId: '',
        clipId: '',
        dragType: 'pan',
        startX: x,
        startY: y,
        initialStartTime: 0,
        initialDuration: 0,
      };
      canvas.style.cursor = 'grabbing';
      return;
    }

    const hit = hitTestClip(x, y);
    if (hit) {
      const { clip, dragType } = hit;
      isDraggingRef.current = true;
      dragInfoRef.current = {
        trackId: clip.trackId,
        clipId: clip.id,
        dragType,
        startX: x,
        startY: y,
        initialStartTime: clip.startTime,
        initialDuration: clip.duration,
      };
      
      if (dragType === 'body') {
        store.startDrag(clip.id, engine.pixelToTime(x - TRACK_HEADER_WIDTH), 'body');
      } else if (dragType === 'start') {
        store.startDrag(clip.id, engine.pixelToTime(x - TRACK_HEADER_WIDTH), 'start');
      } else {
        store.startDrag(clip.id, engine.pixelToTime(x - TRACK_HEADER_WIDTH), 'end');
      }

      setState(prev => ({ ...prev, selectedClipId: clip.id }));
      return;
    }

    if (y < RULER_HEIGHT && x >= TRACK_HEADER_WIDTH) {
      const time = engine.pixelToTime(x - TRACK_HEADER_WIDTH);
      setState(prev => ({ ...prev, currentTime: Math.max(0, time) }));
      return;
    }

    setState(prev => ({ ...prev, selectedClipId: null }));
  }, [hitTestClip, store, engine]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDraggingRef.current && dragInfoRef.current) {
      const info = dragInfoRef.current;

      if (info.dragType === 'pan') {
        const deltaX = x - info.startX;
        engine.pan(-deltaX);
        info.startX = x;
      } else if (info.dragType === 'body' || info.dragType === 'start' || info.dragType === 'end') {
        const mouseTime = engine.pixelToTime(x - TRACK_HEADER_WIDTH);
        store.handleDrag(mouseTime);
      }
    } else {
      const hit = hitTestClip(x, y);
      if (hit) {
        const { clip, dragType } = hit;
        if (dragType === 'start' && state.selectedClipId === clip.id) {
          canvas.style.cursor = 'w-resize';
        } else if (dragType === 'end' && state.selectedClipId === clip.id) {
          canvas.style.cursor = 'e-resize';
        } else {
          canvas.style.cursor = 'move';
        }
      } else if (y < RULER_HEIGHT && x >= TRACK_HEADER_WIDTH) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    }

    render();
  }, [isDraggingRef, dragInfoRef, engine, store, hitTestClip, state.selectedClipId, render]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragInfoRef.current = null;
    store.endDrag();

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }

    render();
  }, [store, render]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const zoomCenter = x - TRACK_HEADER_WIDTH;
    engine.zoom(zoomFactor, zoomCenter);

    render();
  }, [engine, render]);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      render();
    });

    return unsubscribe;
  }, [store, render]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    if (state.isPlaying) {
      const startTime = performance.now();
      const startCurrentTime = state.currentTime;

      const animate = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        const newCurrentTime = startCurrentTime + elapsed;
        
        setState(prev => ({
          ...prev,
          currentTime: newCurrentTime,
        }));
        
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationRef.current);
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [state.isPlaying]);

  return (
    <div style={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          display: 'block',
          cursor: 'default',
          userSelect: 'none',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}>
        <button
          onClick={() => setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
          style={{
            padding: '4px 12px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          {state.isPlaying ? '暂停' : '播放'}
        </button>
        <span style={{ color: '#9a9abf', fontFamily: 'monospace', fontSize: 12 }}>
          当前时间: {engine.formatTime(state.currentTime, 'MM:SS.ms')}
        </span>
      </div>
    </div>
  );
};
