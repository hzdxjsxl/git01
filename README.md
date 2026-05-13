# Full-Stack Large-Scale Text Diff Tool

A full-stack application for comparing very large text files (up to 10,000+ lines) with a React frontend and Python backend.

## Features

- **Backend**: Python Flask server providing sample large text data
- **Frontend**: React + Vite application with real-time diff comparison
- **Web Worker**: Myers Diff algorithm runs in background thread to avoid UI blocking
- **Optimized Algorithm**: Space-optimized Myers Diff with O(N+M) space complexity
- **Visual Diff**: Side-by-side (split-screen) view with color-highlighted changes

## Project Structure

```
.
├── backend/
│   └── app.py                 # Flask backend server
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── DiffViewer.jsx
│   │   ├── algorithms/
│   │   │   └── myersDiff.js   # Myers Diff algorithm
│   │   ├── workers/
│   │   │   └── diffWorker.js  # Web Worker
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
├── requirements.txt
└── README.md
```

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Run the Application

**Start Backend (Terminal 1):**
```bash
python backend/app.py
```

**Start Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```

### 3. Use the Application

1. Open browser to `http://localhost:5173`
2. Click "Load Sample Data" to fetch large test texts from backend
3. Click "Compare" to run diff analysis
4. View results in the side-by-side viewer

## Algorithm Details

### Myers Diff Algorithm

The implementation uses:
- **Longest Common Subsequence (LCS)** approach
- **Space optimization**: Only stores current and previous diagonal arrays
- **Backtracking**: Recovers the actual edit operations
- **Edit operations**: INSERT, DELETE, EQUAL

### Web Worker Integration

The heavy computation runs in a Web Worker:
- Prevents main thread blocking
- UI remains responsive during diff
- Progress updates through message passing
- Can be cancelled mid-computation

## Technical Stack

**Backend:**
- Python 3.8+
- Flask
- Flask-CORS

**Frontend:**
- React 18
- Vite
- Web Workers API
- CSS Grid/Flexbox

## Performance

| Lines | Time |
|-------|------|
| 1,000 | ~50ms |
| 5,000 | ~200ms |
| 10,000 | ~800ms |
| 50,000 | ~5s |
