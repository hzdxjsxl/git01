import React, { useState, useEffect, useMemo, useCallback } from 'react';

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function buildSchedule(coaches, rooms, timeSlots) {
  const schedule = {};

  timeSlots.forEach(ts => {
    schedule[ts.id] = {};
    const usedCoachIds = new Set();

    rooms.forEach(room => {
      let assigned = null;

      for (const coach of coaches) {
        if (!usedCoachIds.has(coach.id)) {
          assigned = coach;
          usedCoachIds.add(coach.id);
          break;
        }
      }

      if (assigned) {
        schedule[ts.id][room.id] = {
          coachId: assigned.id,
          coachName: assigned.name,
          coachStyle: assigned.style,
          roomId: room.id,
          roomName: room.name,
          timeSlotId: ts.id,
          day: ts.day,
          start: ts.start,
          end: ts.end
        };
      }
    });
  });

  return schedule;
}

function App() {
  const [data, setData] = useState({ rooms: [], coaches: [], timeSlots: [] });
  const [schedule, setSchedule] = useState({});
  const [dragging, setDragging] = useState(null);
  const [conflicts, setConflicts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/data')
      .then(r => {
        if (!r.ok) throw new Error('服务端响应异常');
        return r.json();
      })
      .then(d => {
        setData(d);
        setSchedule(buildSchedule(d.coaches, d.rooms, d.timeSlots));
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const { rooms, coaches, timeSlots } = data;

  const slotsByDay = useMemo(() => {
    const grouped = {};
    timeSlots.forEach(s => {
      if (!grouped[s.day]) grouped[s.day] = [];
      grouped[s.day].push(s);
    });
    Object.keys(grouped).forEach(d => {
      grouped[d].sort((a, b) => a.start.localeCompare(b.start));
    });
    return grouped;
  }, [timeSlots]);

  const checkConflict = useCallback((targetTimeSlotId, targetRoomId, sourceAssignment) => {
    const result = { roomConflict: false, coachConflict: false, isConflict: false };

    const existing = schedule[targetTimeSlotId] && schedule[targetTimeSlotId][targetRoomId];
    if (existing) {
      const isSameCell = sourceAssignment &&
        existing.coachId === sourceAssignment.coachId &&
        existing.roomId === sourceAssignment.roomId &&
        existing.timeSlotId === sourceAssignment.timeSlotId;
      if (!isSameCell) {
        result.roomConflict = true;
        result.isConflict = true;
      }
    }

    if (sourceAssignment && sourceAssignment.timeSlotId !== targetTimeSlotId) {
      const dayAssignments = schedule[targetTimeSlotId] || {};
      for (const rid in dayAssignments) {
        const a = dayAssignments[rid];
        if (a.coachId === sourceAssignment.coachId && a.roomId !== targetRoomId) {
          result.coachConflict = true;
          result.isConflict = true;
          break;
        }
      }
    }

    return result;
  }, [schedule]);

  const handleDragStart = (e, assignment) => {
    setDragging(assignment);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, timeSlotId, roomId) => {
    e.preventDefault();
    if (!dragging) return;
    const conflictInfo = checkConflict(timeSlotId, roomId, dragging);
    const cellKey = `${timeSlotId}_${roomId}`;
    setConflicts(prev => {
      const next = { ...prev };
      if (conflictInfo.isConflict) {
        next[cellKey] = conflictInfo;
      } else {
        delete next[cellKey];
      }
      return next;
    });
  };

  const handleDragLeave = (e, timeSlotId, roomId) => {
    const cellKey = `${timeSlotId}_${roomId}`;
    setConflicts(prev => {
      const next = { ...prev };
      delete next[cellKey];
      return next;
    });
  };

  const handleDrop = (e, timeSlotId, roomId) => {
    e.preventDefault();
    if (!dragging) return;

    const cellKey = `${timeSlotId}_${roomId}`;
    setConflicts(prev => {
      const next = { ...prev };
      delete next[cellKey];
      return next;
    });

    const conflictInfo = checkConflict(timeSlotId, roomId, dragging);
    if (conflictInfo.isConflict) {
      return;
    }

    setSchedule(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next[dragging.timeSlotId]) {
        delete next[dragging.timeSlotId][dragging.roomId];
      }
      if (!next[timeSlotId]) next[timeSlotId] = {};
      next[timeSlotId][roomId] = {
        ...dragging,
        timeSlotId,
        roomId,
        roomName: rooms.find(r => r.id === roomId)?.name || dragging.roomName,
        day: timeSlots.find(s => s.id === timeSlotId)?.day || dragging.day,
        start: timeSlots.find(s => s.id === timeSlotId)?.start || dragging.start,
        end: timeSlots.find(s => s.id === timeSlotId)?.end || dragging.end
      };
      return next;
    });

    setDragging(null);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setConflicts({});
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>正在加载排课数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>加载失败</h2>
        <p>{error}</p>
        <p className="hint">请确认后端服务已启动：npm start（端口 3001）</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🧘 瑜伽馆周排课系统</h1>
        <div className="legend">
          <span className="legend-item"><span className="legend-box conflict-room"></span>教室已被占用</span>
          <span className="legend-item"><span className="legend-box conflict-coach"></span>教练在此时段已有课</span>
          <span className="legend-item"><span className="legend-box conflict-both"></span>教室+教练双重冲突</span>
          <span className="legend-item"><span className="legend-box dragging"></span>正在拖拽的课程卡片</span>
        </div>
      </header>

      <div className="stats-bar">
        <span>🏠 教室: {rooms.length} 间</span>
        <span>👩‍🏫 教练: {coaches.length} 位</span>
        <span>⏰ 时间段: {timeSlots.length} 个</span>
        <span>📋 已排课程: {Object.values(schedule).reduce((acc, day) => acc + Object.keys(day).length, 0)} 节</span>
      </div>

      <div className="schedule-wrapper">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="corner-cell">时间段</th>
              {rooms.map(room => (
                <th key={room.id} className="room-header">
                  {room.name}
                  <span className="room-cap">（{room.capacity}人）</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(slotsByDay).map(dayKey => {
              const day = parseInt(dayKey);
              const daySlots = slotsByDay[dayKey];
              return (
                <React.Fragment key={dayKey}>
                  <tr className="day-divider">
                    <td colSpan={rooms.length + 1} className="day-label">
                      {DAY_NAMES[day]}
                    </td>
                  </tr>
                  {daySlots.map(slot => (
                    <tr key={slot.id} className="time-row">
                      <td className="time-cell">
                        <div className="time-range">{slot.start} - {slot.end}</div>
                      </td>
                      {rooms.map(room => {
                        const cellKey = `${slot.id}_${room.id}`;
                        const assignment = schedule[slot.id] && schedule[slot.id][room.id];
                        const conflictInfo = conflicts[cellKey];
                        const isConflict = conflictInfo && conflictInfo.isConflict;
                        const conflictClass = isConflict
                          ? (conflictInfo.roomConflict && conflictInfo.coachConflict
                              ? 'conflict-both'
                              : conflictInfo.roomConflict ? 'conflict-room' : 'conflict-coach')
                          : '';
                        const isDraggingSource = dragging &&
                          dragging.timeSlotId === slot.id &&
                          dragging.roomId === room.id;
                        return (
                          <td
                            key={room.id}
                            className={`schedule-cell ${conflictClass} ${isDraggingSource ? 'dragging-source' : ''}`}
                            onDragOver={(e) => handleDragOver(e, slot.id, room.id)}
                            onDragLeave={(e) => handleDragLeave(e, slot.id, room.id)}
                            onDrop={(e) => handleDrop(e, slot.id, room.id)}
                          >
                            {assignment && (
                              <div
                                className={`class-card ${isDraggingSource ? 'dragging' : ''}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, assignment)}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="coach-name">{assignment.coachName}</div>
                                <div className="coach-style">{assignment.coachStyle}</div>
                              </div>
                            )}
                            {!assignment && (
                              <div className="empty-cell">空闲</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="app-footer">
        <p>提示：将教练卡片拖拽到其他时间段，系统会自动检测教室占用 & 教练占用双重冲突</p>
        <p>后端: Node.js + Express（端口 3001） | 前端: React + Vite（端口 5173）</p>
      </footer>
    </div>
  );
}

export default App;
