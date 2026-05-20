const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const CELL_WIDTH = 120;
const ROW_HEIGHT = 50;

let state = {
    bookings: [],
    rooms: [],
    viewStart: null,
    viewEnd: null,
    totalDays: 21,
    dragging: null,
    resizing: null
};

const colors = [
    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63',
    '#00BCD4', '#8BC34A', '#FF5722', '#3F51B5', '#009688'
];

const elements = {
    roomList: document.getElementById('roomList'),
    timelineDates: document.getElementById('timelineDates'),
    ganttGrid: document.getElementById('ganttGrid'),
    ganttBars: document.getElementById('ganttBars'),
    currentRange: document.getElementById('currentRange'),
    prevWeek: document.getElementById('prevWeek'),
    nextWeek: document.getElementById('nextWeek'),
    today: document.getElementById('today'),
    refresh: document.getElementById('refresh'),
    tooltip: document.getElementById('tooltip'),
    ganttContainer: document.getElementById('ganttContainer')
};

function init() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    state.viewStart = now.getTime() - 3 * DAY;
    state.viewEnd = state.viewStart + state.totalDays * DAY;
    
    bindEvents();
    loadBookings();
}

function bindEvents() {
    elements.prevWeek.addEventListener('click', () => {
        state.viewStart -= 7 * DAY;
        state.viewEnd = state.viewStart + state.totalDays * DAY;
        render();
    });

    elements.nextWeek.addEventListener('click', () => {
        state.viewStart += 7 * DAY;
        state.viewEnd = state.viewStart + state.totalDays * DAY;
        render();
    });

    elements.today.addEventListener('click', () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        state.viewStart = now.getTime() - 3 * DAY;
        state.viewEnd = state.viewStart + state.totalDays * DAY;
        render();
    });

    elements.refresh.addEventListener('click', loadBookings);

    elements.ganttContainer.addEventListener('scroll', () => {
        document.querySelector('.timeline-header').scrollLeft = elements.ganttContainer.scrollLeft;
    });

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

async function loadBookings() {
    try {
        const response = await fetch('/api/bookings');
        const data = await response.json();
        state.bookings = data;
        
        const roomMap = {};
        data.forEach(b => {
            if (!roomMap[b.room_number]) {
                roomMap[b.room_number] = b.room_type;
            }
        });
        
        state.rooms = Object.entries(roomMap)
            .map(([number, type]) => ({ number, type }))
            .sort((a, b) => a.number.localeCompare(b.number));
        
        render();
    } catch (error) {
        console.error('加载预订数据失败:', error);
    }
}

function render() {
    renderDateRange();
    renderTimelineHeader();
    renderRoomList();
    renderGrid();
    renderBookingBars();
    renderTodayLine();
}

function renderDateRange() {
    const start = new Date(state.viewStart);
    const end = new Date(state.viewEnd - DAY);
    elements.currentRange.textContent = `${formatDate(start)} - ${formatDate(end)}`;
}

function renderTimelineHeader() {
    elements.timelineDates.innerHTML = '';
    elements.timelineDates.style.width = `${state.totalDays * CELL_WIDTH}px`;
    
    for (let i = 0; i < state.totalDays; i++) {
        const date = new Date(state.viewStart + i * DAY);
        const col = document.createElement('div');
        col.className = 'date-column';
        col.style.width = `${CELL_WIDTH}px`;
        
        const weekday = date.getDay();
        if (weekday === 0 || weekday === 6) {
            col.classList.add('weekend');
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date.getTime() === today.getTime()) {
            col.classList.add('today');
        }
        
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        col.innerHTML = `
            <div class="date-day">${date.getDate()}</div>
            <div class="date-weekday">${date.getMonth() + 1}月 周${weekdays[weekday]}</div>
        `;
        
        elements.timelineDates.appendChild(col);
    }
}

function renderRoomList() {
    elements.roomList.innerHTML = '';
    state.rooms.forEach(room => {
        const item = document.createElement('div');
        item.className = 'room-item';
        item.innerHTML = `
            <div class="room-number">${room.number}</div>
            <div class="room-type">${room.type}</div>
        `;
        elements.roomList.appendChild(item);
    });
}

function renderGrid() {
    elements.ganttGrid.innerHTML = '';
    elements.ganttGrid.style.width = `${state.totalDays * CELL_WIDTH}px`;
    
    state.rooms.forEach(() => {
        const row = document.createElement('div');
        row.className = 'grid-row';
        
        for (let i = 0; i < state.totalDays; i++) {
            const date = new Date(state.viewStart + i * DAY);
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.style.width = `${CELL_WIDTH}px`;
            
            const weekday = date.getDay();
            if (weekday === 0 || weekday === 6) {
                cell.classList.add('weekend');
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date.getTime() === today.getTime()) {
                cell.classList.add('today');
            }
            
            row.appendChild(cell);
        }
        
        elements.ganttGrid.appendChild(row);
    });
}

function renderBookingBars() {
    elements.ganttBars.innerHTML = '';
    elements.ganttBars.style.width = `${state.totalDays * CELL_WIDTH}px`;
    
    state.rooms.forEach((room, roomIndex) => {
        const roomBookings = state.bookings
            .filter(b => b.room_number === room.number)
            .filter(b => b.check_out > state.viewStart && b.check_in < state.viewEnd)
            .sort((a, b) => a.check_in - b.check_in);
        
        roomBookings.forEach(booking => {
            const bar = createBookingBar(booking, roomIndex);
            elements.ganttBars.appendChild(bar);
        });
    });
}

function createBookingBar(booking, roomIndex) {
    const bar = document.createElement('div');
    bar.className = 'booking-bar';
    bar.dataset.id = booking.id;
    
    const { left, width } = calculateBarPosition(booking);
    bar.style.left = `${left}px`;
    bar.style.width = `${width}px`;
    bar.style.top = `${roomIndex * ROW_HEIGHT + 6}px`;
    
    const color = getBookingColor(booking);
    bar.style.background = `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`;
    
    bar.innerHTML = `
        <div class="resize-handle-left"></div>
        <span class="guest-name">${booking.guest_name || '未命名'}</span>
        <div class="resize-handle-right"></div>
    `;
    
    bar.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('resize-handle-left')) {
            startResizing(booking, 'left', e);
        } else if (e.target.classList.contains('resize-handle-right')) {
            startResizing(booking, 'right', e);
        } else {
            startDragging(booking, e);
        }
    });
    
    bar.addEventListener('mouseenter', (e) => showTooltip(booking, e));
    bar.addEventListener('mouseleave', hideTooltip);
    
    return bar;
}

function calculateBarPosition(booking) {
    const checkIn = Math.max(booking.check_in, state.viewStart);
    const checkOut = Math.min(booking.check_out, state.viewEnd);
    
    const left = ((checkIn - state.viewStart) / DAY) * CELL_WIDTH;
    const width = Math.max(((checkOut - checkIn) / DAY) * CELL_WIDTH, 20);
    
    return { left, width };
}

function getBookingColor(booking) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    
    if (booking.check_in <= todayTime && booking.check_out > todayTime + DAY) {
        return '#4CAF50';
    }
    if (booking.check_in <= todayTime && booking.check_out <= todayTime + DAY && booking.check_out > todayTime) {
        return '#f44336';
    }
    if (booking.check_in > todayTime && booking.check_in <= todayTime + DAY) {
        return '#FF9800';
    }
    return colors[booking.id % colors.length];
}

function startDragging(booking, e) {
    e.preventDefault();
    const bar = e.currentTarget;
    bar.classList.add('dragging');
    
    const roomIndex = state.rooms.findIndex(r => r.number === booking.room_number);
    
    state.dragging = {
        booking,
        bar,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: parseFloat(bar.style.left),
        startTop: parseFloat(bar.style.top),
        startRoomIndex: roomIndex,
        originalCheckIn: booking.check_in,
        originalCheckOut: booking.check_out,
        originalRoomNumber: booking.room_number
    };
}

function startResizing(booking, side, e) {
    e.preventDefault();
    e.stopPropagation();
    const bar = e.currentTarget.parentElement;
    bar.classList.add('dragging');
    
    state.resizing = {
        booking,
        bar,
        side,
        startX: e.clientX,
        startLeft: parseFloat(bar.style.left),
        startWidth: parseFloat(bar.style.width),
        originalCheckIn: booking.check_in,
        originalCheckOut: booking.check_out
    };
}

function handleMouseMove(e) {
    if (state.dragging) {
        handleDrag(e);
    } else if (state.resizing) {
        handleResize(e);
    }
}

function handleDrag(e) {
    const { dragging } = state;
    const dx = e.clientX - dragging.startX;
    const dy = e.clientY - dragging.startY;
    
    const dayDelta = Math.round(dx / CELL_WIDTH);
    const roomDelta = Math.round(dy / ROW_HEIGHT);
    
    let newRoomIndex = Math.max(0, Math.min(state.rooms.length - 1, dragging.startRoomIndex + roomDelta));
    const newRoomNumber = state.rooms[newRoomIndex].number;
    
    const duration = dragging.originalCheckOut - dragging.originalCheckIn;
    let newCheckIn = dragging.originalCheckIn + dayDelta * DAY;
    let newCheckOut = newCheckIn + duration;
    
    if (checkCollision(dragging.booking.id, newRoomNumber, newCheckIn, newCheckOut)) {
        dragging.bar.classList.add('conflict');
    } else {
        dragging.bar.classList.remove('conflict');
    }
    
    const newLeft = Math.max(0, dragging.startLeft + dayDelta * CELL_WIDTH);
    const newTop = newRoomIndex * ROW_HEIGHT + 6;
    
    dragging.bar.style.left = `${newLeft}px`;
    dragging.bar.style.top = `${newTop}px`;
    
    dragging.pending = {
        roomNumber: newRoomNumber,
        checkIn: newCheckIn,
        checkOut: newCheckOut
    };
}

function handleResize(e) {
    const { resizing } = state;
    const dx = e.clientX - resizing.startX;
    const dayDelta = Math.round(dx / CELL_WIDTH);
    
    let newCheckIn = resizing.originalCheckIn;
    let newCheckOut = resizing.originalCheckOut;
    
    if (resizing.side === 'left') {
        newCheckIn = Math.max(0, resizing.originalCheckIn + dayDelta * DAY);
        if (newCheckOut - newCheckIn < DAY) {
            newCheckIn = newCheckOut - DAY;
        }
    } else {
        newCheckOut = Math.max(newCheckIn + DAY, resizing.originalCheckOut + dayDelta * DAY);
    }
    
    if (checkCollision(resizing.booking.id, resizing.booking.room_number, newCheckIn, newCheckOut)) {
        resizing.bar.classList.add('conflict');
    } else {
        resizing.bar.classList.remove('conflict');
    }
    
    const { left, width } = calculateBarPosition({
        check_in: newCheckIn,
        check_out: newCheckOut
    });
    
    resizing.bar.style.left = `${left}px`;
    resizing.bar.style.width = `${width}px`;
    
    resizing.pending = {
        checkIn: newCheckIn,
        checkOut: newCheckOut
    };
}

async function handleMouseUp() {
    if (state.dragging) {
        const { dragging } = state;
        dragging.bar.classList.remove('dragging', 'conflict');
        
        if (dragging.pending && !checkCollision(
            dragging.booking.id,
            dragging.pending.roomNumber,
            dragging.pending.checkIn,
            dragging.pending.checkOut
        )) {
            dragging.booking.room_number = dragging.pending.roomNumber;
            dragging.booking.check_in = dragging.pending.checkIn;
            dragging.booking.check_out = dragging.pending.checkOut;
            
            await saveBooking(dragging.booking);
        }
        
        render();
        state.dragging = null;
    }
    
    if (state.resizing) {
        const { resizing } = state;
        resizing.bar.classList.remove('dragging', 'conflict');
        
        if (resizing.pending && !checkCollision(
            resizing.booking.id,
            resizing.booking.room_number,
            resizing.pending.checkIn,
            resizing.pending.checkOut
        )) {
            resizing.booking.check_in = resizing.pending.checkIn;
            resizing.booking.check_out = resizing.pending.checkOut;
            
            await saveBooking(resizing.booking);
        }
        
        render();
        state.resizing = null;
    }
}

function checkCollision(bookingId, roomNumber, checkIn, checkOut) {
    return state.bookings.some(b => {
        if (b.id === bookingId) return false;
        if (b.room_number !== roomNumber) return false;
        return !(checkOut <= b.check_in || checkIn >= b.check_out);
    });
}

async function saveBooking(booking) {
    try {
        await fetch(`/api/bookings/${booking.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                check_in: booking.check_in,
                check_out: booking.check_out
            })
        });
    } catch (error) {
        console.error('保存预订失败:', error);
    }
}

function renderTodayLine() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    
    if (todayTime >= state.viewStart && todayTime < state.viewEnd) {
        const existingLine = document.querySelector('.today-line');
        if (existingLine) existingLine.remove();
        
        const line = document.createElement('div');
        line.className = 'today-line';
        
        const now = Date.now();
        const offset = ((now - state.viewStart) / DAY) * CELL_WIDTH;
        line.style.left = `${offset}px`;
        line.style.height = `${state.rooms.length * ROW_HEIGHT}px`;
        
        elements.ganttBars.appendChild(line);
    }
}

function showTooltip(booking, e) {
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    const nights = Math.round((booking.check_out - booking.check_in) / DAY);
    
    elements.tooltip.innerHTML = `
        <strong>${booking.guest_name || '未命名'}</strong>
        <div>房间: ${booking.room_number} (${booking.room_type})</div>
        <div>入住: ${formatDateTime(checkIn)}</div>
        <div>退房: ${formatDateTime(checkOut)}</div>
        <div>共 ${nights} 晚</div>
    `;
    
    elements.tooltip.classList.add('visible');
    updateTooltipPosition(e);
}

function updateTooltipPosition(e) {
    elements.tooltip.style.left = `${e.clientX + 15}px`;
    elements.tooltip.style.top = `${e.clientY + 15}px`;
}

function hideTooltip() {
    elements.tooltip.classList.remove('visible');
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateTime(date) {
    return `${formatDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function adjustColor(color, amount) {
    const num = parseInt(color.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

init();
