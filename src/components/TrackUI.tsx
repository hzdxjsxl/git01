import React, { useMemo } from 'react';
import { TrackConfig, OscillatorType } from '../audio/AudioManager';
import { SchedulerNote, PlaybackState } from '../audio/Scheduler';

interface TrackUIProps {
  track: TrackConfig;
  notes: SchedulerNote[];
  currentBeat: number;
  totalBeats: number;
  onToggleMute: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onWaveTypeChange: (trackId: string, type: OscillatorType) => void;
  onNoteToggle: (trackId: string, beat: number, frequency: number, duration: number) => void;
}

const WAVE_TYPES: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];

const WAVE_LABELS: Record<OscillatorType, string> = {
  sine: '正弦',
  square: '方波',
  sawtooth: '锯齿',
  triangle: '三角',
};

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

const BEATS_PER_MEASURE = 4;
const SUB_DIVISIONS = 4;

const TrackUI: React.FC<TrackUIProps> = ({
  track,
  notes,
  currentBeat,
  totalBeats,
  onToggleMute,
  onVolumeChange,
  onWaveTypeChange,
  onNoteToggle,
}) => {
  const noteSet = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((note) => {
      set.add(`${note.beat}-${note.frequency}`);
    });
    return set;
  }, [notes]);

  const totalColumns = totalBeats * SUB_DIVISIONS;
  const playheadPosition = (currentBeat / totalBeats) * 100;

  const handleCellClick = (beat: number, freq: number) => {
    onNoteToggle(track.id, beat, freq, 0.2);
  };

  return (
    <div
      style={{
        marginBottom: '16px',
        background: track.muted ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          gap: '16px',
        }}
      >
        <div style={{ width: '120px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            {track.name}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
            轨道 {track.id}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {WAVE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onWaveTypeChange(track.id, type)}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: track.oscillatorType === type ? '#e94560' : 'rgba(255,255,255,0.1)',
                color: 'white',
                transition: 'all 0.2s',
              }}
            >
              {WAVE_LABELS[type]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>音量</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={track.volume}
            onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
            style={{ width: '100px', cursor: 'pointer' }}
          />
          <button
            onClick={() => onToggleMute(track.id)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: track.muted ? '#e94560' : 'rgba(255,255,255,0.15)',
              color: 'white',
              minWidth: '50px',
              transition: 'all 0.2s',
            }}
          >
            {track.muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', padding: '12px 16px 16px' }}>
        {currentBeat >= 0 && currentBeat < totalBeats && (
          <div
            style={{
              position: 'absolute',
              left: `calc(${playheadPosition}% + 16px)`,
              top: '0',
              bottom: '0',
              width: '2px',
              background: '#e94560',
              zIndex: 10,
              pointerEvents: 'none',
              boxShadow: '0 0 8px rgba(233,69,96,0.5)',
            }}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {NOTE_FREQUENCIES.map((note) => (
            <div key={note.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '40px',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  textAlign: 'right',
                }}
              >
                {note.label}
              </div>

              <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
                {Array.from({ length: totalColumns }).map((_, idx) => {
                  const beat = idx / SUB_DIVISIONS;
                  const isMeasure = idx % (BEATS_PER_MEASURE * SUB_DIVISIONS) === 0;
                  const isBeat = idx % SUB_DIVISIONS === 0;
                  const noteKey = `${beat}-${note.freq}`;
                  const hasNote = noteSet.has(noteKey);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleCellClick(beat, note.freq)}
                      style={{
                        flex: 1,
                        height: '24px',
                        borderRadius: '3px',
                        background: hasNote
                          ? '#e94560'
                          : isMeasure
                          ? 'rgba(255,255,255,0.15)'
                          : isBeat
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        border: hasNote ? '1px solid rgba(255,255,255,0.3)' : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', marginTop: '8px', paddingLeft: '48px' }}>
          {Array.from({ length: totalBeats }).map((_, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
                textAlign: 'center',
              }}
            >
              {idx % BEATS_PER_MEASURE === 0 ? `| ${idx + 1}` : `${idx + 1}`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrackUI;
