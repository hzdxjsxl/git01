import AudioManager, { NoteEvent, OscillatorType, TrackConfig } from './AudioManager';

export interface SchedulerNote {
  id: string;
  trackId: string;
  beat: number;
  duration: number;
  frequency: number;
  velocity?: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentBeat: number;
  bpm: number;
}

type SchedulerCallback = (state: PlaybackState) => void;

const LOOKAHEAD = 25.0;
const SCHEDULE_AHEAD_TIME = 0.1;

class Scheduler {
  private audioManager: AudioManager;
  private isPlaying: boolean = false;
  private bpm: number = 120;
  private currentBeat: number = 0;
  private nextNoteBeat: number = 0;
  private startTime: number = 0;
  private notes: Map<string, SchedulerNote> = new Map();
  private timerId: number | null = null;
  private tracks: Map<string, TrackConfig> = new Map();
  private callbacks: Set<SchedulerCallback> = new Set();
  private animationFrameId: number | null = null;

  constructor() {
    this.audioManager = AudioManager.getInstance();
  }

  public setBPM(bpm: number): void {
    this.bpm = Math.max(30, Math.min(300, bpm));
    this.notifyCallbacks();
  }

  public getBPM(): number {
    return this.bpm;
  }

  public getState(): PlaybackState {
    return {
      isPlaying: this.isPlaying,
      currentBeat: this.currentBeat,
      bpm: this.bpm,
    };
  }

  public addTrack(config: TrackConfig): void {
    this.tracks.set(config.id, config);
    this.audioManager.createTrack(config.id);
    this.audioManager.setTrackVolume(config.id, config.volume);
    this.audioManager.setTrackMuted(config.id, config.muted);
  }

  public updateTrack(trackId: string, updates: Partial<TrackConfig>): void {
    const track = this.tracks.get(trackId);
    if (track) {
      const updated = { ...track, ...updates };
      this.tracks.set(trackId, updated);
      if (updates.volume !== undefined) {
        this.audioManager.setTrackVolume(trackId, updates.volume);
      }
      if (updates.muted !== undefined) {
        this.audioManager.setTrackMuted(trackId, updates.muted);
      }
    }
  }

  public removeTrack(trackId: string): void {
    this.tracks.delete(trackId);
    const trackNotes = Array.from(this.notes.values()).filter(n => n.trackId === trackId);
    trackNotes.forEach(n => this.notes.delete(n.id));
  }

  public addNote(note: SchedulerNote): void {
    this.notes.set(note.id, note);
  }

  public removeNote(noteId: string): void {
    this.notes.delete(noteId);
  }

  public getNotesForTrack(trackId: string): SchedulerNote[] {
    return Array.from(this.notes.values()).filter(n => n.trackId === trackId);
  }

  public subscribe(callback: SchedulerCallback): () => void {
    this.callbacks.add(callback);
    callback(this.getState());
    return () => {
      this.callbacks.delete(callback);
    };
  }

  public async start(): Promise<void> {
    if (this.isPlaying) return;

    await this.audioManager.init();

    this.isPlaying = true;
    this.startTime = this.audioManager.getCurrentTime() + 0.1;
    this.nextNoteBeat = 0;
    this.currentBeat = 0;

    this.scheduler();
    this.startProgressLoop();
    this.notifyCallbacks();
  }

  public stop(): void {
    this.isPlaying = false;

    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.audioManager.stopAllNotes();
    this.currentBeat = 0;
    this.nextNoteBeat = 0;
    this.notifyCallbacks();
  }

  public pause(): void {
    this.isPlaying = false;

    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.audioManager.stopAllNotes();
    this.notifyCallbacks();
  }

  private beatToSeconds(beat: number): number {
    const secondsPerBeat = 60.0 / this.bpm;
    return beat * secondsPerBeat;
  }

  private nextNote(): void {
    const secondsPerBeat = 60.0 / this.bpm;
    const notesArray = Array.from(this.notes.values()).sort((a, b) => a.beat - b.beat);

    while (this.nextNoteBeat < this.currentBeat + 16) {
      const notesAtBeat = notesArray.filter(n => n.beat === this.nextNoteBeat);

      for (const note of notesAtBeat) {
        const noteTime = this.startTime + this.beatToSeconds(note.beat);
        const noteDuration = this.beatToSeconds(note.duration);
        const track = this.tracks.get(note.trackId);

        if (track) {
          this.audioManager.scheduleNote(
            note.trackId,
            note.frequency,
            noteTime,
            noteDuration,
            track.oscillatorType,
            note.velocity ?? 0.7
          );
        }
      }

      this.nextNoteBeat += 0.25;
    }

    const nextNoteTime = this.startTime + (this.nextNoteBeat * secondsPerBeat);
    while (nextNoteTime < this.audioManager.getCurrentTime() + SCHEDULE_AHEAD_TIME) {
      this.nextNoteBeat += 0.25;
    }
  }

  private scheduler = (): void => {
    if (!this.isPlaying) return;

    const secondsPerBeat = 60.0 / this.bpm;
    let nextNoteTime = this.startTime + this.beatToSeconds(this.nextNoteBeat);

    while (nextNoteTime < this.audioManager.getCurrentTime() + SCHEDULE_AHEAD_TIME) {
      this.scheduleNotesAtBeat(this.nextNoteBeat, nextNoteTime);
      this.nextNoteBeat += 0.25;
      nextNoteTime = this.startTime + this.beatToSeconds(this.nextNoteBeat);
    }

    this.timerId = window.setTimeout(this.scheduler, LOOKAHEAD);
  };

  private scheduleNotesAtBeat(beat: number, time: number): void {
    const notesAtBeat = Array.from(this.notes.values()).filter(n => n.beat === beat);

    for (const note of notesAtBeat) {
      const noteDuration = this.beatToSeconds(note.duration);
      const track = this.tracks.get(note.trackId);

      if (track) {
        this.audioManager.scheduleNote(
          note.trackId,
          note.frequency,
          time,
          noteDuration,
          track.oscillatorType,
          note.velocity ?? 0.7
        );
      }
    }
  }

  private startProgressLoop(): void {
    const updateProgress = () => {
      if (!this.isPlaying) return;

      const elapsed = this.audioManager.getCurrentTime() - this.startTime;
      const secondsPerBeat = 60.0 / this.bpm;
      this.currentBeat = Math.max(0, elapsed / secondsPerBeat);

      this.notifyCallbacks();
      this.animationFrameId = requestAnimationFrame(updateProgress);
    };

    this.animationFrameId = requestAnimationFrame(updateProgress);
  }

  private notifyCallbacks(): void {
    const state = this.getState();
    this.callbacks.forEach(cb => cb(state));
  }

  public dispose(): void {
    this.stop();
    this.notes.clear();
    this.tracks.clear();
    this.callbacks.clear();
  }
}

export default Scheduler;
