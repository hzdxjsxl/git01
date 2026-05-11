import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

class VolumeTextureLoader {
    constructor(manager) {
        this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
    }

    load(url, onLoad, onProgress, onError) {
        const loader = new THREE.FileLoader(this.manager);
        loader.setResponseType('arraybuffer');
        
        loader.load(url, (data) => {
            const volumeData = this.parse(data);
            const texture = this.createTexture(volumeData);
            if (onLoad) onLoad(texture, volumeData.dimensions);
        }, onProgress, onError);
    }

    parse(data) {
        const dataView = new DataView(data);
        
        const width = dataView.getUint32(0, true);
        const height = dataView.getUint32(4, true);
        const depth = dataView.getUint32(8, true);
        
        const voxelData = new Float32Array(data, 12, width * height * depth);
        
        console.log(`Loaded volume: ${width}x${height}x${depth}, voxels: ${voxelData.length}`);
        
        return {
            dimensions: { width, height, depth },
            data: voxelData
        };
    }

    createTexture(volumeData) {
        const { width, height, depth } = volumeData.dimensions;
        
        const texture = new THREE.Data3DTexture(
            volumeData.data,
            width,
            height,
            depth
        );
        
        texture.type = THREE.FloatType;
        texture.format = THREE.RedFormat;
        texture.internalFormat = 'R32F';
        
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.wrapR = THREE.ClampToEdgeWrapping;
        
        texture.needsUpdate = true;
        
        return texture;
    }
}

export { VolumeTextureLoader };
