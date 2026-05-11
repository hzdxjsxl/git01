class App {
    constructor() {
        this.canvas = null;
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.wheelCustomizer = null;
        this.config = null;
    }

    async run() {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = new BABYLON.Engine(this.canvas, true, { 
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true
        }, true);
        
        await this._loadConfig();
        await this._createScene();
        await this._createDemoWheels();
        this._createReflectionObjects();
        await this._setupWheelCustomizer();
        this._setupUI();
        this._hideLoading();
        
        this.engine.runRenderLoop(() => {
            if (this.scene && this.scene.render());
        });
        
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }

    async _loadConfig() {
        try {
            const response = await fetch('mock/config.json');
            const configText = await response.text();
            const safeConfigText = configText
                .replace(/-Math\.PI \/ 4/g, '-0.7853981633974483')
                .replace(/Math\.PI \/ 3/g, '1.0471975511965976')
                .replace(/Math\.PI \/ 2/g, '1.5707963267948966')
                .replace(/Math\.PI \/ 2 - 0\.1/g, '1.4707963267948966');
            this.config = JSON.parse(safeConfigText);
            console.log('Config loaded:', this.config);
        } catch (error) {
            console.warn('Failed to load config, using defaults:', error);
            this.config = this._getDefaultConfig();
        }
    }

    _getDefaultConfig() {
        return {
            version: '1.0',
            wheelConfig: {
                defaultColor: '#c0c0c0',
                defaultRoughness: 0.2,
                defaultEnvironmentIntensity: 1.5,
                meshNamePattern: 'Wheel',
                presets: {
                    chrome: { color: '#e8e8e8', roughness: 0.05, metallic: 1.0, environmentIntensity: 2.0 },
                    matte: { color: '#2a2a2a', roughness: 0.85, metallic: 0.3, environmentIntensity: 0.8 },
                    gold: { color: '#ffd700', roughness: 0.15, metallic: 1.0, environmentIntensity: 1.8 },
                    blue: { color: '#1e90ff', roughness: 0.25, metallic: 0.9, environmentIntensity: 1.5 }
                }
            },
            sceneConfig: {
                clearColor: '#0a0a0f',
                ambientColor: '#333344',
                camera: {
                    type: 'ArcRotateCamera',
                    alpha: -0.7854,
                    beta: 1.0472,
                    radius: 12,
                    target: [0, 1.5, 0],
                    lowerRadiusLimit: 5,
                    upperRadiusLimit: 30,
                    lowerBetaLimit: 0.1,
                    upperBetaLimit: 1.4708
                },
                lighting: {
                    mainLight: { type: 'HemisphericLight', direction: [1, 1, 0], intensity: 0.7, diffuse: '#ffffff', groundColor: '#333333' },
                    keyLight: { type: 'DirectionalLight', direction: [-1, -1, -1], intensity: 1.2, position: [10, 15, 10] },
                    fillLight: { type: 'PointLight', position: [-8, 5, -8], intensity: 0.5, diffuse: '#4488ff' },
                    rimLight: { type: 'PointLight', position: [8, 5, 8], intensity: 0.4, diffuse: '#ff8844' }
                }
            }
        };
    }

    async _createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        
        const sceneConfig = this.config.sceneConfig || {};
        
        if (sceneConfig.clearColor) {
            const r = parseInt(sceneConfig.clearColor.substring(1, 3), 16) / 255;
            const g = parseInt(sceneConfig.clearColor.substring(3, 5), 16) / 255;
            const b = parseInt(sceneConfig.clearColor.substring(5, 7), 16) / 255;
            this.scene.clearColor = new BABYLON.Color4(r, g, b, 1);
        }
        
        if (sceneConfig.ambientColor) {
            const r = parseInt(sceneConfig.ambientColor.substring(1, 3), 16) / 255;
            const g = parseInt(sceneConfig.ambientColor.substring(3, 5), 16) / 255;
            const b = parseInt(sceneConfig.ambientColor.substring(5, 7), 16) / 255;
            this.scene.ambientColor = new BABYLON.Color3(r, g, b);
        }
        
        await this._createCamera(sceneConfig.camera || {});
        this._createLights(sceneConfig.lighting || {});
        
        this.scene.useRightHandedSystem = true;
    }

    async _createCamera(cameraConfig) {
        const alpha = cameraConfig.alpha || -Math.PI / 4;
        const beta = cameraConfig.beta || Math.PI / 3;
        const radius = cameraConfig.radius || 12;
        const target = cameraConfig.target || [0, 1.5, 0];
        
        this.camera = new BABYLON.ArcRotateCamera(
            'camera',
            alpha,
            beta,
            radius,
            new BABYLON.Vector3(target[0], target[1], target[2]),
            this.scene
        );
        
        this.camera.attachControl(this.canvas, true);
        
        if (cameraConfig.lowerRadiusLimit !== undefined) {
            this.camera.lowerRadiusLimit = cameraConfig.lowerRadiusLimit;
        }
        if (cameraConfig.upperRadiusLimit !== undefined) {
            this.camera.upperRadiusLimit = cameraConfig.upperRadiusLimit;
        }
        if (cameraConfig.lowerBetaLimit !== undefined) {
            this.camera.lowerBetaLimit = cameraConfig.lowerBetaLimit;
        }
        if (cameraConfig.upperBetaLimit !== undefined) {
            this.camera.upperBetaLimit = cameraConfig.upperBetaLimit;
        }
        
        this.camera.wheelPrecision = 50;
        this.camera.inertia = 0.9;
    }

    _createLights(lightingConfig) {
        if (lightingConfig.mainLight) {
            const lightConfig = lightingConfig.mainLight;
            const dir = lightConfig.direction || [1, 1, 0];
            const hemiLight = new BABYLON.HemisphericLight(
                'mainLight',
                new BABYLON.Vector3(dir[0], dir[1], dir[2]),
                this.scene
            );
            hemiLight.intensity = lightConfig.intensity || 0.7;
            if (lightConfig.diffuse) {
                const r = parseInt(lightConfig.diffuse.substring(1, 3), 16) / 255;
                const g = parseInt(lightConfig.diffuse.substring(3, 5), 16) / 255;
                const b = parseInt(lightConfig.diffuse.substring(5, 7), 16) / 255;
                hemiLight.diffuse = new BABYLON.Color3(r, g, b);
            }
            if (lightConfig.groundColor) {
                const r = parseInt(lightConfig.groundColor.substring(1, 3), 16) / 255;
                const g = parseInt(lightConfig.groundColor.substring(3, 5), 16) / 255;
                const b = parseInt(lightConfig.groundColor.substring(5, 7), 16) / 255;
                hemiLight.groundColor = new BABYLON.Color3(r, g, b);
            }
        }
        
        if (lightingConfig.keyLight) {
            const lightConfig = lightingConfig.keyLight;
            const dir = lightConfig.direction || [-1, -1, -1];
            const pos = lightConfig.position || [10, 15, 10];
            const dirLight = new BABYLON.DirectionalLight(
                'keyLight',
                new BABYLON.Vector3(dir[0], dir[1], dir[2]),
                this.scene
            );
            dirLight.position = new BABYLON.Vector3(pos[0], pos[1], pos[2]);
            dirLight.intensity = lightConfig.intensity || 1.2;
        }
        
        if (lightingConfig.fillLight) {
            const lightConfig = lightingConfig.fillLight;
            const pos = lightConfig.position || [-8, 5, -8];
            const fillLight = new BABYLON.PointLight(
                'fillLight',
                new BABYLON.Vector3(pos[0], pos[1], pos[2]),
                this.scene
            );
            fillLight.intensity = lightConfig.intensity || 0.5;
            if (lightConfig.diffuse) {
                const r = parseInt(lightConfig.diffuse.substring(1, 3), 16) / 255;
                const g = parseInt(lightConfig.diffuse.substring(3, 5), 16) / 255;
                const b = parseInt(lightConfig.diffuse.substring(5, 7), 16) / 255;
                fillLight.diffuse = new BABYLON.Color3(r, g, b);
            }
        }
        
        if (lightingConfig.rimLight) {
            const lightConfig = lightingConfig.rimLight;
            const pos = lightConfig.position || [8, 5, 8];
            const rimLight = new BABYLON.PointLight(
                'rimLight',
                new BABYLON.Vector3(pos[0], pos[1], pos[2]),
                this.scene
            );
            rimLight.intensity = lightConfig.intensity || 0.4;
            if (lightConfig.diffuse) {
                const r = parseInt(lightConfig.diffuse.substring(1, 3), 16) / 255;
                const g = parseInt(lightConfig.diffuse.substring(3, 5), 16) / 255;
                const b = parseInt(lightConfig.diffuse.substring(5, 7), 16) / 255;
                rimLight.diffuse = new BABYLON.Color3(r, g, b);
            }
        }
    }

    async _createDemoWheels() {
        const wheelPositions = [
            { x: -2.5, y: 0.8, z: 2.0 },
            { x: 2.5, y: 0.8, z: 2.0 },
            { x: -2.5, y: 0.8, z: -2.0 },
            { x: 2.5, y: 0.8, z: -2.0 }
        ];
        
        wheelPositions.forEach((pos, index) => {
            this._createWheelMesh(`FrontLeftWheel_${index}`, pos);
        });
    }

    _createWheelMesh(name, position) {
        const wheel = new BABYLON.Mesh(name, this.scene);
        
        const rim = this._createWheelRim(`${name}_rim`, position);
        const tire = this._createTire(`${name}_tire`, position);
        const spokes = this._createSpokes(`${name}_spokes`, position);
        
        rim.parent = wheel;
        tire.parent = wheel;
        spokes.parent = wheel;
        
        wheel.position = new BABYLON.Vector3(position.x, position.y, position.z);
        
        const wheelMaterial = new BABYLON.PBRMetallicRoughnessMaterial(`${name}_material`, this.scene);
        wheelMaterial.baseColor = new BABYLON.Color3(0.75, 0.75, 0.75);
        wheelMaterial.roughness = 0.2;
        wheelMaterial.metallic = 1.0;
        wheelMaterial.environmentIntensity = 1.5;
        
        rim.material = wheelMaterial;
        spokes.material = wheelMaterial;
        
        const tireMaterial = new BABYLON.PBRMetallicRoughnessMaterial(`${name}_tire_material`, this.scene);
        tireMaterial.baseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        tireMaterial.roughness = 0.9;
        tireMaterial.metallic = 0.0;
        tire.material = tireMaterial;
        
        return wheel;
    }

    _createWheelRim(name, position) {
        const rimOuter = BABYLON.MeshBuilder.CreateTorus(`${name}_outer`, {
            diameter: 0.7,
            thickness: 0.1,
            tessellation: 48
        }, this.scene);
        rimOuter.rotation.x = Math.PI / 2;
        
        const rimInner = BABYLON.MeshBuilder.CreateTorus(`${name}_inner`, {
            diameter: 0.4,
            thickness: 0.12,
            tessellation: 48
        }, this.scene);
        rimInner.rotation.x = Math.PI / 2;
        
        const rim = BABYLON.Mesh.MergeMeshes([rimOuter, rimInner], true);
        rim.name = name;
        
        return rim;
    }

    _createTire(name, position) {
        const tire = BABYLON.MeshBuilder.CreateTorus(name, {
            diameter: 0.85,
            thickness: 0.18,
            tessellation: 64
        }, this.scene);
        tire.rotation.x = Math.PI / 2;
        
        return tire;
    }

    _createSpokes(name, position) {
        const spokeGroup = new BABYLON.Mesh(name, this.scene);
        
        const numSpokes = 12;
        
        for (let i = 0; i < numSpokes; i++) {
            const angle = (i / numSpokes) * Math.PI * 2;
            
            const spoke = BABYLON.MeshBuilder.CreateCylinder(`${name}_spoke_${i}`, {
                height: 0.55,
                diameterTop: 0.015,
                diameterBottom: 0.025,
                tessellation: 6
            }, this.scene);
            
            spoke.position.x = Math.cos(angle) * 0.275;
            spoke.position.y = Math.sin(angle) * 0.275;
            spoke.rotation.z = angle + Math.PI / 2;
            
            spoke.parent = spokeGroup;
        }
        
        const centerHub = BABYLON.MeshBuilder.CreateCylinder(`${name}_hub`, {
            diameter: 0.15,
            height: 0.2,
            tessellation: 24
        }, this.scene);
        centerHub.rotation.x = Math.PI / 2;
        centerHub.parent = spokeGroup;
        
        spokeGroup.position = new BABYLON.Vector3(0, 0, 0);
        
        return spokeGroup;
    }

    _createReflectionObjects() {
        const box1 = BABYLON.MeshBuilder.CreateBox('reflectionBox1', {
            width: 0.8,
            height: 1.5,
            depth: 0.8
        }, this.scene);
        box1.position = new BABYLON.Vector3(-4, 0.75, 0);
        const box1Mat = new BABYLON.StandardMaterial('box1Mat', this.scene);
        box1Mat.diffuseColor = new BABYLON.Color3(0.9, 0.2, 0.2);
        box1Mat.emissiveColor = new BABYLON.Color3(0.3, 0.05, 0.05);
        box1.material = box1Mat;
        
        const box2 = BABYLON.MeshBuilder.CreateBox('reflectionBox2', {
            width: 0.6,
            height: 1.2,
            depth: 0.6
        }, this.scene);
        box2.position = new BABYLON.Vector3(4, 0.6, 0);
        const box2Mat = new BABYLON.StandardMaterial('box2Mat', this.scene);
        box2Mat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.9);
        box2Mat.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.3);
        box2.material = box2Mat;
        
        const sphere1 = BABYLON.MeshBuilder.CreateSphere('reflectionSphere1', {
            diameter: 0.8,
            segments: 32
        }, this.scene);
        sphere1.position = new BABYLON.Vector3(0, 0.5, 3.5);
        const sphere1Mat = new BABYLON.StandardMaterial('sphere1Mat', this.scene);
        sphere1Mat.diffuseColor = new BABYLON.Color3(0.2, 0.9, 0.3);
        sphere1Mat.emissiveColor = new BABYLON.Color3(0.05, 0.3, 0.1);
        sphere1.material = sphere1Mat;
        
        const sphere2 = BABYLON.MeshBuilder.CreateSphere('reflectionSphere2', {
            diameter: 0.6,
            segments: 32
        }, this.scene);
        sphere2.position = new BABYLON.Vector3(0, 0.4, -3.5);
        const sphere2Mat = new BABYLON.StandardMaterial('sphere2Mat', this.scene);
        sphere2Mat.diffuseColor = new BABYLON.Color3(0.9, 0.7, 0.2);
        sphere2Mat.emissiveColor = new BABYLON.Color3(0.3, 0.2, 0.05);
        sphere2.material = sphere2Mat;
        
        console.log('Reflection objects created for PBR testing');
    }

    async _setupWheelCustomizer() {
        this.wheelCustomizer = new WheelCustomizer({
            scene: this.scene,
            engine: this.engine,
            config: this.config
        });
        
        await this.wheelCustomizer.initialize();
        
        this.wheelCustomizer.onConfigChange((config) => {
            console.log('Config changed:', config);
        });
    }

    _setupUI() {
        const colorInput = document.getElementById('wheel-color');
        const roughnessInput = document.getElementById('roughness');
        const roughnessValue = document.getElementById('roughness-value');
        const environmentInput = document.getElementById('environment-intensity');
        const environmentValue = document.getElementById('environment-intensity-value');
        const presetButtons = document.querySelectorAll('.preset-btn');
        
        colorInput.addEventListener('input', (event) => {
            this.wheelCustomizer.updateColor(event.target.value);
        });
        
        roughnessInput.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            roughnessValue.textContent = value.toFixed(2);
            this.wheelCustomizer.updateRoughness(value);
        });
        
        environmentInput.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            environmentValue.textContent = value.toFixed(1);
            this.wheelCustomizer.updateEnvironmentIntensity(value);
        });
        
        presetButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const presetName = button.getAttribute('data-preset');
                const config = this.wheelCustomizer.applyPreset(presetName);
                
                if (config) {
                    colorInput.value = config.color;
                    roughnessInput.value = config.roughness;
                    roughnessValue.textContent = config.roughness.toFixed(2);
                    environmentInput.value = config.environmentIntensity;
                    environmentValue.textContent = config.environmentIntensity.toFixed(1);
                }
            });
        });
    }

    _hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
    }

    dispose() {
        if (this.wheelCustomizer) {
            this.wheelCustomizer.dispose();
        }
        if (this.scene) {
            this.scene.dispose();
        }
        if (this.engine) {
            this.engine.dispose();
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.run();
});
