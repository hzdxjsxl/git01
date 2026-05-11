export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface NoteEvent {
  id: string;
  frequency: number;
  startTime: number;
  duration: number;
  trackId: string;
  velocity?: number;
}

export interface TrackConfig {
  id: string;
  name: string;
  oscillatorType: OscillatorType;
  volume: number;
  muted: boolean;
}

interface PendingTrackConfig {
  volume: number;
  muted: boolean;
}

class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tracks: Map<string, GainNode> = new Map();
  private scheduledNodes: Map<string, { oscillator: OscillatorNode; gain: GainNode }[]> = new Map();
  private pendingTracks: Map<string, PendingTrackConfig> = new Map();
  private isInitialized: boolean = false;

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public async init(): Promise<void> {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      if (this.isInitialized) {
        return;
      }
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.audioContext.destination);

    this.isInitialized = true;

    this.pendingTracks.forEach((config, trackId) => {
      this.createTrackReal(trackId, config.volume, config.muted);
    });
    this.pendingTracks.clear();
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  public getContext(): AudioContext {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized. Call init() first.');
    }
    return this.audioContext;
  }

  public getCurrentTime(): number {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized. Call init() first.');
    }
    return this.audioContext.currentTime;
  }

  private createTrackReal(trackId: string, volume: number, muted: boolean): GainNode {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('AudioContext not initialized.');
    }

    if (this.tracks.has(trackId)) {
      return this.tracks.get(trackId)!;
    }

    const trackGain = this.audioContext.createGain();
    trackGain.gain.value = muted ? 0 : volume;
    trackGain.connect(this.masterGain);
    this.tracks.set(trackId, trackGain);
    this.scheduledNodes.set(trackId, []);

    return trackGain;
  }

  public registerTrack(trackId: string, volume: number = 1.0, muted: boolean = false): void {
    if (this.isInitialized) {
      this.createTrackReal(trackId, volume, muted);
    } else {
      this.pendingTracks.set(trackId, { volume, muted });
    }
  }

  public createTrack(trackId: string): GainNode | null {
    if (!this.isInitialized) {
      this.registerTrack(trackId);
      return null;
    }
    return this.createTrackReal(trackId, 1.0, false);
  }

  public setTrackVolume(trackId: string, volume: number): void {
    const normalized = Math.max(0, Math.min(1, volume));

    const trackGain = this.tracks.get(trackId);
    if (trackGain) {
      trackGain.gain.value = normalized;
      return;
    }

    const pending = this.pendingTracks.get(trackId);
    if (pending) {
      pending.volume = normalized;
    }
  }

  public setTrackMuted(trackId: string, muted: boolean): void {
    const trackGain = this.tracks.get(trackId);
    if (trackGain) {
      const pending = this.pendingTracks.get(trackId);
      const volume = pending ? pending.volume : 1.0;
      trackGain.gain.value = muted ? 0 : volume;
      return;
    }

    const pending = this.pendingTracks.get(trackId);
    if (pending) {
      pending.muted = muted;
    }
  }

  public scheduleNote(
    trackId: string,
    frequency: number,
    startTime: number,
    duration: number,
    oscillatorType: OscillatorType = 'sine',
    velocity: number = 0.7
  ): void {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('AudioContext not initialized. Call init() first.');
    }

    let trackGain = this.tracks.get(trackId);
    if (!trackGain) {
      this.createTrackReal(trackId, 1.0, false);
      trackGain = this.tracks.get(trackId)!;
    }

    const oscillator = this.audioContext.createOscillator();
    const noteGain = this.audioContext.createGain();

    oscillator.type = oscillatorType;
    oscillator.frequency.value = frequency;

    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(velocity, startTime + 0.01);
    noteGain.gain.linearRampToValueAtTime(velocity, startTime + duration - 0.05);
    noteGain.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(noteGain);
    noteGain.connect(trackGain);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.1);

    const trackNodes = this.scheduledNodes.get(trackId);
    if (trackNodes) {
      trackNodes.push({ oscillator, gain: noteGain });
    }
  }

  public stopAllNotes(trackId?: string): void {
    const stopTrack = (id: string) => {
      const nodes = this.scheduledNodes.get(id);
      if (nodes) {
        nodes.forEach(({ oscillator, gain }) => {
          try {
            oscillator.stop();
            oscillator.disconnect();
            gain.disconnect();
          } catch (e) {}
        });
        nodes.length = 0;
      }
    };

    if (trackId) {
      stopTrack(trackId);
    } else {
      this.tracks.forEach((_, id) => stopTrack(id));
    }
  }

  public dispose(): void {
    this.stopAllNotes();
    this.tracks.forEach((gain) => gain.disconnect());
    this.tracks.clear();
    this.scheduledNodes.clear();
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export default AudioManager;
