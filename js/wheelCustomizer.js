class WheelCustomizer {
    constructor(options) {
        this.scene = options.scene;
        this.engine = options.engine;
        this.config = options.config || {};
        this.environmentHelper = null;
        this.reflectionProbe = null;
        this.wheelMeshes = [];
        this.materialGenerator = null;
        this.currentConfig = {
            color: '#c0c0c0',
            roughness: 0.2,
            metallic: 1.0,
            environmentIntensity: 1.5
        };
        
        this._onConfigChangeCallbacks = [];
    }

    async initialize() {
        this.materialGenerator = new MaterialGenerator(this.scene);
        await this._setupEnvironment();
        this._findWheelMeshes();
        this._applyDefaultConfig();
    }

    async _setupEnvironment() {
        const sceneConfig = this.config.sceneConfig || {};
        const envConfig = sceneConfig.environment || {};
        
        const environmentOptions = {
            createGround: envConfig.ground?.enabled !== false,
            groundSize: envConfig.ground?.size || 100,
            groundColor: new BABYLON.Color3(0.1, 0.1, 0.1),
            groundOpacity: envConfig.ground?.opacity || 0.8,
            createSkybox: envConfig.skybox?.enabled !== false,
            skyboxSize: envConfig.skybox?.size || 1000,
            skyboxColor: new BABYLON.Color3(0.02, 0.02, 0.05)
        };
        
        this.environmentHelper = this.scene.createDefaultEnvironment(environmentOptions);
        
        if (this.environmentHelper && this.environmentHelper.skybox) {
            this.environmentHelper.skybox.infiniteDistance = true;
        }
        
        if (this.environmentHelper && this.environmentHelper.ground) {
            if (envConfig.ground?.reflectionTexture) {
                const mirrorTexture = new BABYLON.MirrorTexture(
                    'mirror',
                    envConfig.ground?.mirrorTextureSize || 1024,
                    this.scene,
                    true
                );
                mirrorTexture.mirrorPlane = new BABYLON.Plane(0, -1, 0, 0);
                
                const groundMaterial = new BABYLON.StandardMaterial('groundMaterial', this.scene);
                groundMaterial.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.08);
                groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
                groundMaterial.reflectionTexture = mirrorTexture;
                groundMaterial.reflectionTexture.level = 0.4;
                groundMaterial.alpha = envConfig.ground?.opacity || 0.8;
                
                this.environmentHelper.ground.material = groundMaterial;
                this._groundMirrorTexture = mirrorTexture;
            }
        }
        
        const probeSize = envConfig.reflectionProbe?.size || 512;
        this.reflectionProbe = new BABYLON.ReflectionProbe('wheelReflectionProbe', probeSize, this.scene);
        
        if (this.environmentHelper && this.environmentHelper.skybox) {
            this.reflectionProbe.renderList.push(this.environmentHelper.skybox);
        }
        
        if (this._groundMirrorTexture) {
            this._groundMirrorTexture.renderList = [];
        }
        
        return this.environmentHelper;
    }

    _findWheelMeshes() {
        const wheelConfig = this.config.wheelConfig || {};
        const pattern = wheelConfig.meshNamePattern || 'Wheel';
        
        this.wheelMeshes = [];
        
        this.scene.meshes.forEach((mesh) => {
            if (this._matchesPattern(mesh.name, pattern)) {
                this.wheelMeshes.push(mesh);
                if (this.reflectionProbe) {
                    this.reflectionProbe.renderList.push(mesh);
                }
            }
        });
        
        console.log(`Found ${this.wheelMeshes.length} wheel meshes matching pattern '${pattern}'`);
        return this.wheelMeshes;
    }

    _matchesPattern(meshName, pattern) {
        return meshName.toLowerCase().includes(pattern.toLowerCase());
    }

    _applyDefaultConfig() {
        const wheelConfig = this.config.wheelConfig || {};
        
        this.currentConfig = {
            color: wheelConfig.defaultColor || '#c0c0c0',
            roughness: wheelConfig.defaultRoughness || 0.2,
            metallic: 1.0,
            environmentIntensity: wheelConfig.defaultEnvironmentIntensity || 1.5
        };
        
        this.applyConfig(this.currentConfig);
    }

    applyConfig(config) {
        const mergedConfig = { ...this.currentConfig, ...config };
        this.currentConfig = mergedConfig;
        
        const material = this.materialGenerator.createPBRMaterial({
            color: mergedConfig.color,
            roughness: mergedConfig.roughness,
            metallic: mergedConfig.metallic,
            environmentIntensity: mergedConfig.environmentIntensity,
            environmentTexture: this._getEnvironmentTexture(),
            name: 'wheelMaterial'
        });
        
        this._applyMaterialToWheels(material);
        this._updateEnvironmentIntensity(mergedConfig.environmentIntensity);
        
        this._notifyConfigChange(mergedConfig);
        
        return mergedConfig;
    }

    _applyMaterialToWheels(material) {
        this.wheelMeshes.forEach((mesh) => {
            mesh.material = material;
            
            if (mesh.getChildren) {
                mesh.getChildren().forEach((child) => {
                    if (child.material) {
                        this.materialGenerator.updateMaterialProperties(child.material, {
                            environmentIntensity: this.currentConfig.environmentIntensity,
                            environmentTexture: this._getEnvironmentTexture()
                        });
                    }
                });
            }
        });
    }

    _getEnvironmentTexture() {
        if (this.reflectionProbe) {
            return this.reflectionProbe.cubeTexture;
        }
        if (this.environmentHelper && this.environmentHelper.skyboxTexture) {
            return this.environmentHelper.skyboxTexture;
        }
        return null;
    }

    _updateEnvironmentIntensity(intensity) {
        this.wheelMeshes.forEach((mesh) => {
            if (mesh.material) {
                mesh.material.environmentIntensity = intensity;
            }
        });
        
        if (this._groundMirrorTexture && this._groundMirrorTexture.level !== undefined) {
            this._groundMirrorTexture.level = Math.min(intensity * 0.25, 0.6);
        }
    }

    applyPreset(presetName) {
        const wheelConfig = this.config.wheelConfig || {};
        const presets = wheelConfig.presets || {};
        const preset = presets[presetName];
        
        if (!preset) {
            console.warn(`Preset '${presetName}' not found`);
            return null;
        }
        
        return this.applyConfig({
            color: preset.color,
            roughness: preset.roughness,
            metallic: preset.metallic !== undefined ? preset.metallic : 1.0,
            environmentIntensity: preset.environmentIntensity !== undefined 
                ? preset.environmentIntensity 
                : this.currentConfig.environmentIntensity
        });
    }

    updateColor(color) {
        return this.applyConfig({ color });
    }

    updateRoughness(roughness) {
        return this.applyConfig({ roughness: parseFloat(roughness) });
    }

    updateEnvironmentIntensity(intensity) {
        return this.applyConfig({ environmentIntensity: parseFloat(intensity) });
    }

    addMeshToReflectionProbe(mesh) {
        if (this.reflectionProbe && mesh) {
            this.reflectionProbe.renderList.push(mesh);
        }
    }

    updateReflectionProbeRenderList() {
        if (!this.reflectionProbe) return;
        
        this.reflectionProbe.renderList.length = 0;
        
        if (this.environmentHelper && this.environmentHelper.skybox) {
            this.reflectionProbe.renderList.push(this.environmentHelper.skybox);
        }
        
        this.wheelMeshes.forEach((mesh) => {
            this.reflectionProbe.renderList.push(mesh);
        });
    }

    onConfigChange(callback) {
        if (typeof callback === 'function') {
            this._onConfigChangeCallbacks.push(callback);
        }
    }

    _notifyConfigChange(config) {
        this._onConfigChangeCallbacks.forEach((callback) => {
            try {
                callback(config);
            } catch (error) {
                console.error('Error in config change callback:', error);
            }
        });
    }

    getWheelMeshes() {
        return [...this.wheelMeshes];
    }

    getCurrentConfig() {
        return { ...this.currentConfig };
    }

    dispose() {
        if (this.materialGenerator) {
            this.materialGenerator.dispose();
        }
        if (this.reflectionProbe) {
            this.reflectionProbe.dispose();
        }
        this._onConfigChangeCallbacks = [];
        this.wheelMeshes = [];
    }
}

if (typeof window !== 'undefined') {
    window.WheelCustomizer = WheelCustomizer;
}
