import { useEffect, useRef, useState, useCallback } from 'react';
import Scheduler, { PlaybackState, SchedulerNote } from './audio/Scheduler';
import { TrackConfig, OscillatorType } from './audio/AudioManager';
import TrackUI from './components/TrackUI';

const TOTAL_BEATS = 16;

const NOTE_FREQUENCIES = [
  { label: 'C4', freq: 261.63 },
  { label: 'D4', freq: 293.66 },
  { label: 'E4', freq: 329.63 },
  { label: 'F4', freq: 349.23 },
  { label: 'G4', freq: 392.00 },
  { label: 'A4', freq: 440.00 },
  { label: 'B4', freq: 493.88 },
  { label: 'C5', freq: 523.25 },
];

const generateId = () => Math.random().toString(36).substring(2, 11);

function App() {
  const schedulerRef = useRef<Scheduler | null>(null);
  const [tracks, setTracks] = useState<TrackConfig[]>([]);
  const [notes, setNotes] = useState<Map<string, SchedulerNote>>(new Map());
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentBeat: 0,
    bpm: 120,
  });

  useEffect(() => {
    schedulerRef.current = new Scheduler();

    const unsubscribe = schedulerRef.current.subscribe((state) => {
      setPlaybackState(state);
    });

    const defaultTracks: TrackConfig[] = [
      {
        id: 'track-1',
        name: '主旋律',
        oscillatorType: 'sine',
        volume: 0.8,
        muted: false,
      },
      {
        id: 'track-2',
        name: '贝斯',
        oscillatorType: 'sawtooth',
        volume: 0.6,
        muted: false,
      },
      {
        id: 'track-3',
        name: '和弦',
        oscillatorType: 'triangle',
        volume: 0.5,
        muted: false,
      },
    ];

    defaultTracks.forEach((track) => {
      schedulerRef.current!.addTrack(track);
    });
    setTracks(defaultTracks);

    const melodyPattern = [0, 2, 4, 5, 7, 9, 11, 12];
    const presetNotes: SchedulerNote[] = [];

    for (let i = 0; i < TOTAL_BEATS; i++) {
      if (i % 1 === 0) {
        const noteIndex = i % melodyPattern.length;
        presetNotes.push({
          id: generateId(),
          trackId: 'track-1',
          beat: i,
          duration: 0.9,
          frequency: NOTE_FREQUENCIES[noteIndex].freq,
          velocity: 0.7,
        });
      }
    }

    for (let i = 0; i < TOTAL_BEATS; i += 2) {
      presetNotes.push({
        id: generateId(),
        trackId: 'track-2',
        beat: i,
        duration: 1.9,
        frequency: 130.81,
        velocity: 0.6,
      });
    }

    const chordPattern = [
      [0, 4, 7],
      [5, 9, 12],
      [7, 11, 14],
      [0, 4, 7],
    ];
    for (let measure = 0; measure < 4; measure++) {
      const chord = chordPattern[measure % chordPattern.length];
      chord.forEach((interval) => {
        const freqIndex = Math.min(interval, NOTE_FREQUENCIES.length - 1);
        presetNotes.push({
          id: generateId(),
          trackId: 'track-3',
          beat: measure * 4,
          duration: 3.9,
          frequency: NOTE_FREQUENCIES[freqIndex].freq,
          velocity: 0.4,
        });
      });
    }

    const noteMap = new Map<string, SchedulerNote>();
    presetNotes.forEach((note) => {
      noteMap.set(note.id, note);
      schedulerRef.current!.addNote(note);
    });
    setNotes(noteMap);

    return () => {
      unsubscribe();
      schedulerRef.current?.dispose();
    };
  }, []);

  const handlePlay = useCallback(async () => {
    await schedulerRef.current?.start();
  }, []);

  const handleStop = useCallback(() => {
    schedulerRef.current?.stop();
  }, []);

  const handleToggleMute = useCallback((trackId: string) => {
    setTracks((prev) => {
      const updated = prev.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t
      );
      const track = updated.find((t) => t.id === trackId);
      if (track && schedulerRef.current) {
        schedulerRef.current.updateTrack(trackId, { muted: track.muted });
      }
      return updated;
    });
  }, []);

  const handleVolumeChange = useCallback((trackId: string, volume: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume } : t))
    );
    if (schedulerRef.current) {
      schedulerRef.current.updateTrack(trackId, { volume });
    }
  }, []);

  const handleWaveTypeChange = useCallback(
    (trackId: string, type: OscillatorType) => {
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, oscillatorType: type } : t))
      );
      if (schedulerRef.current) {
        schedulerRef.current.updateTrack(trackId, { oscillatorType: type });
      }
    },
    []
  );

  const handleNoteToggle = useCallback(
    (trackId: string, beat: number, frequency: number, duration: number) => {
      const noteKey = `${trackId}-${beat}-${frequency}`;
      let existingNoteId: string | null = null;

      notes.forEach((note) => {
        if (
          note.trackId === trackId &&
          note.beat === beat &&
          note.frequency === frequency
        ) {
          existingNoteId = note.id;
        }
      });

      if (existingNoteId) {
        setNotes((prev) => {
          const next = new Map(prev);
          next.delete(existingNoteId!);
          return next;
        });
        if (schedulerRef.current) {
          schedulerRef.current.removeNote(existingNoteId);
        }
      } else {
        const newNote: SchedulerNote = {
          id: generateId(),
          trackId,
          beat,
          duration,
          frequency,
          velocity: 0.7,
        };
        setNotes((prev) => {
          const next = new Map(prev);
          next.set(newNote.id, newNote);
          return next;
        });
        if (schedulerRef.current) {
          schedulerRef.current.addNote(newNote);
        }
      }
    },
    [notes]
  );

  const handleBPMChange = useCallback((newBPM: number) => {
    if (schedulerRef.current) {
      schedulerRef.current.setBPM(newBPM);
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>
            🎵 多音轨编辑器
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
            纯 Web Audio API 实现 · 不依赖任何外部音频库
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
              BPM:
            </span>
            <input
              type="range"
              min="60"
              max="200"
              value={playbackState.bpm}
              onChange={(e) => handleBPMChange(parseInt(e.target.value))}
              style={{ width: '120px' }}
            />
            <span
              style={{
                minWidth: '40px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#e94560',
              }}
            >
              {playbackState.bpm}
            </span>
          </div>

          <button
            onClick={playbackState.isPlaying ? handleStop : handlePlay}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              background: playbackState.isPlaying ? '#e94560' : '#00d9ff',
              color: '#1a1a2e',
              transition: 'all 0.2s',
              boxShadow: playbackState.isPlaying
                ? '0 0 20px rgba(233,69,96,0.3)'
                : '0 0 20px rgba(0,217,255,0.3)',
            }}
          >
            {playbackState.isPlaying ? '⏹ 停止' : '▶ 播放'}
          </button>
        </div>
      </div>

      <div
        style={{
          marginBottom: '20px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: playbackState.isPlaying ? '#00d9ff' : 'rgba(255,255,255,0.3)',
              boxShadow: playbackState.isPlaying
                ? '0 0 10px rgba(0,217,255,0.5)'
                : 'none',
              transition: 'all 0.2s',
            }}
          />
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            状态: {playbackState.isPlaying ? '播放中' : '已停止'}
          </span>
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>|</div>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
          当前拍子: {playbackState.currentBeat.toFixed(2)} / {TOTAL_BEATS}
        </span>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>|</div>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
          模块: AudioManager + Scheduler + TrackUI
        </span>
      </div>

      <div>
        {tracks.map((track) => (
          <TrackUI
            key={track.id}
            track={track}
            notes={Array.from(notes.values()).filter((n) => n.trackId === track.id)}
            currentBeat={playbackState.currentBeat}
            totalBeats={TOTAL_BEATS}
            onToggleMute={handleToggleMute}
            onVolumeChange={handleVolumeChange}
            onWaveTypeChange={handleWaveTypeChange}
            onNoteToggle={handleNoteToggle}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: '24px',
          padding: '16px 20px',
          background: 'rgba(0,217,255,0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(0,217,255,0.2)',
        }}
      >
        <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#00d9ff' }}>
          💡 使用说明
        </h3>
        <ul
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.7)',
            paddingLeft: '16px',
            lineHeight: '1.7',
          }}
        >
          <li>点击「播放」按钮启动音频（Web Audio API 需要用户交互才能激活）</li>
          <li>点击音轨网格中的格子可以添加/移除音符</li>
          <li>每轨道支持 4 种波形：正弦、方波、锯齿、三角波</li>
          <li>支持独立音量控制和静音切换</li>
          <li>调节 BPM 滑块可以改变播放速度（60-200）</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
