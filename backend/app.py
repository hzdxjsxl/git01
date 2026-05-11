import struct
import numpy as np
from flask import Flask, Response, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

VOLUME_SHAPE = (64, 64, 64)

def generate_dummy_volume():
    x, y, z = np.meshgrid(
        np.linspace(-1, 1, VOLUME_SHAPE[0]),
        np.linspace(-1, 1, VOLUME_SHAPE[1]),
        np.linspace(-1, 1, VOLUME_SHAPE[2]),
        indexing='ij'
    )
    
    distance = np.sqrt(x**2 + y**2 + z**2)
    
    volume = np.zeros(VOLUME_SHAPE, dtype=np.float32)
    
    skin_condition = (distance > 0.4) & (distance < 0.7)
    volume[skin_condition] = 0.3 + 0.1 * np.sin(x[skin_condition] * 10) * np.sin(y[skin_condition] * 10)
    
    bone_condition = (distance > 0.2) & (distance < 0.35)
    volume[bone_condition] = 0.8 + 0.05 * np.sin(z[bone_condition] * 15)
    
    center_condition = distance < 0.15
    volume[center_condition] = 0.6
    
    return volume

@app.route('/api/volume', methods=['GET'])
def get_volume():
    volume = generate_dummy_volume()
    
    header = struct.pack('<III', VOLUME_SHAPE[0], VOLUME_SHAPE[1], VOLUME_SHAPE[2])
    data = header + volume.tobytes()
    
    return Response(
        data,
        mimetype='application/octet-stream',
        headers={
            'Content-Length': str(len(data)),
            'X-Volume-Width': str(VOLUME_SHAPE[0]),
            'X-Volume-Height': str(VOLUME_SHAPE[1]),
            'X-Volume-Depth': str(VOLUME_SHAPE[2])
        }
    )

@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../frontend', path)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
