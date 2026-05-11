import os
import glob
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")


class LogFile(BaseModel):
    name: str
    size_bytes: int


class LogContent(BaseModel):
    filename: str
    lines: List[str]
    total_lines: int


@app.get("/api/logs")
def list_log_files() -> List[LogFile]:
    if not os.path.exists(LOG_DIR):
        raise HTTPException(status_code=404, detail="Log directory not found")
    
    log_files = []
    for filepath in glob.glob(os.path.join(LOG_DIR, "*")):
        if os.path.isfile(filepath):
            stat = os.stat(filepath)
            log_files.append(LogFile(
                name=os.path.basename(filepath),
                size_bytes=stat.st_size
            ))
    
    return log_files


@app.get("/api/logs/{filename}")
def read_log_file(filename: str, limit: Optional[int] = None) -> LogContent:
    filepath = os.path.join(LOG_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"File {filename} not found")
    
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=400, detail=f"{filename} is not a file")
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")
    
    total_lines = len(lines)
    clean_lines = [line.rstrip('\n') for line in lines]
    
    if limit is not None and limit > 0:
        clean_lines = clean_lines[-limit:]
    
    return LogContent(
        filename=filename,
        lines=clean_lines,
        total_lines=total_lines
    )


@app.get("/api/logs/directory")
def get_log_directory() -> dict:
    return {"directory": LOG_DIR, "exists": os.path.exists(LOG_DIR)}
