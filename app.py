from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import random
from typing import List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/infer", response_model=List[float])
async def infer(image: UploadFile = File(...)):
    image_contents = await image.read()
    
    mock_detections = []
    num_boxes = random.randint(2, 6)
    
    for _ in range(num_boxes):
        x1 = random.uniform(50, 400)
        y1 = random.uniform(50, 300)
        width = random.uniform(50, 200)
        height = random.uniform(30, 150)
        
        x2 = x1 + width
        y2 = y1 + height
        
        mock_detections.extend([x1, y1, x2, y2])
    
    return mock_detections


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
