import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Color3, MeshBuilder, StandardMaterial } from 'babylonjs';
import { GcodeInterpreter } from './GcodeInterpreter';
import { PathBuilder } from './PathBuilder';
class GcodeViewerApp {
    constructor() {
        this.currentModel = null;
        this.fileList = [];
        this.selectedFile = null;
        this.isLoading = false;
        this.showTravelMoves = false;
        this.showRapidMoves = false;
        this.useRibbon = false;
        this.currentLayerStart = 0;
        this.currentLayerEnd = Infinity;
        this.canvas = document.getElementById('renderCanvas');
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.interpreter = new GcodeInterpreter();
        this.pathBuilder = new PathBuilder(this.scene, {
            showTravelMoves: this.showTravelMoves,
            showRapidMoves: this.showRapidMoves,
            useRibbon: this.useRibbon
        });
        this.setupScene();
        this.setupUI();
        this.setupEventListeners();
        this.startRenderLoop();
        this.loadFileList();
    }
    setupScene() {
        this.scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.1, 1);
        this.camera = new ArcRotateCamera('camera', -Math.PI / 3, Math.PI / 3, 200, Vector3.Zero(), this.scene);
        this.camera.attachControl(this.canvas, true);
        this.camera.upperRadiusLimit = 1000;
        this.camera.lowerRadiusLimit = 5;
        this.camera.wheelPrecision = 50;
        this.light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
        this.light.intensity = 0.7;
        this.createBuildPlate();
        this.createAxes();
    }
    createBuildPlate() {
        const plateSize = 200;
        const plate = MeshBuilder.CreateGround('buildPlate', {
            width: plateSize,
            height: plateSize
        }, this.scene);
        const material = new StandardMaterial('plateMaterial', this.scene);
        material.ambientColor = new Color3(0.2, 0.2, 0.2);
        material.diffuseColor = new Color3(0.15, 0.15, 0.15);
        material.specularColor = new Color3(0.1, 0.1, 0.1);
        plate.material = material;
        plate.position.y = -0.1;
    }
    createAxes() {
        const axisLength = 50;
        const xAxis = MeshBuilder.CreateLines('xAxis', {
            points: [
                new Vector3(0, 0.1, 0),
                new Vector3(axisLength, 0.1, 0)
            ]
        }, this.scene);
        xAxis.color = new Color3(1, 0, 0);
        const yAxis = MeshBuilder.CreateLines('yAxis', {
            points: [
                new Vector3(0, 0.1, 0),
                new Vector3(0, 0.1, axisLength)
            ]
        }, this.scene);
        yAxis.color = new Color3(0, 1, 0);
        const zAxis = MeshBuilder.CreateLines('zAxis', {
            points: [
                new Vector3(0, 0.1, 0),
                new Vector3(0, axisLength, 0)
            ]
        }, this.scene);
        zAxis.color = new Color3(0, 0, 1);
    }
    setupUI() {
        const fileSelect = document.getElementById('fileSelect');
        const travelToggle = document.getElementById('showTravel');
        const rapidToggle = document.getElementById('showRapid');
        const ribbonToggle = document.getElementById('useRibbon');
        const layerStart = document.getElementById('layerStart');
        const layerEnd = document.getElementById('layerEnd');
        const loadButton = document.getElementById('loadButton');
        const fileInput = document.getElementById('fileInput');
        travelToggle.checked = this.showTravelMoves;
        rapidToggle.checked = this.showRapidMoves;
        ribbonToggle.checked = this.useRibbon;
    }
    setupEventListeners() {
        const fileSelect = document.getElementById('fileSelect');
        const travelToggle = document.getElementById('showTravel');
        const rapidToggle = document.getElementById('showRapid');
        const ribbonToggle = document.getElementById('useRibbon');
        const layerStart = document.getElementById('layerStart');
        const layerEnd = document.getElementById('layerEnd');
        const loadButton = document.getElementById('loadButton');
        const fileInput = document.getElementById('fileInput');
        const uploadButton = document.getElementById('uploadButton');
        fileSelect.addEventListener('change', (e) => {
            this.selectedFile = fileSelect.value || null;
            this.updateUI();
        });
        travelToggle.addEventListener('change', (e) => {
            this.showTravelMoves = e.target.checked;
            this.pathBuilder.updateOptions({ showTravelMoves: this.showTravelMoves });
            this.refreshRender();
        });
        rapidToggle.addEventListener('change', (e) => {
            this.showRapidMoves = e.target.checked;
            this.pathBuilder.updateOptions({ showRapidMoves: this.showRapidMoves });
            this.refreshRender();
        });
        ribbonToggle.addEventListener('change', (e) => {
            this.useRibbon = e.target.checked;
            this.pathBuilder.updateOptions({ useRibbon: this.useRibbon });
            this.refreshRender();
        });
        layerStart.addEventListener('input', (e) => {
            this.currentLayerStart = parseInt(e.target.value) || 0;
            this.refreshRender();
        });
        layerEnd.addEventListener('input', (e) => {
            const value = e.target.value;
            this.currentLayerEnd = value === '' ? Infinity : parseInt(value) || 0;
            this.refreshRender();
        });
        loadButton.addEventListener('click', () => {
            if (this.selectedFile) {
                this.loadGcodeFile(this.selectedFile);
            }
        });
        uploadButton.addEventListener('click', () => {
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
    async loadFileList() {
        try {
            const response = await fetch('/api/gcode-list');
            const data = await response.json();
            this.fileList = data.files || [];
            this.updateFileListUI();
        }
        catch (error) {
            console.error('Failed to load file list:', error);
            this.fileList = [];
            this.updateFileListUI();
        }
    }
    updateFileListUI() {
        const fileSelect = document.getElementById('fileSelect');
        fileSelect.innerHTML = '<option value="">-- Select G-code File --</option>';
        for (const file of this.fileList) {
            const option = document.createElement('option');
            option.value = file.name;
            option.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
            fileSelect.appendChild(option);
        }
    }
    formatFileSize(bytes) {
        if (bytes < 1024)
            return bytes + ' B';
        if (bytes < 1024 * 1024)
            return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    async loadGcodeFile(filename) {
        if (this.isLoading)
            return;
        this.isLoading = true;
        this.showLoading(true);
        try {
            const response = await fetch(`/api/gcode/${encodeURIComponent(filename)}`);
            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.statusText}`);
            }
            const gcodeText = await response.text();
            console.log(`Loaded G-code file: ${filename}, size: ${gcodeText.length} characters`);
            this.interpreter.reset();
            this.currentModel = this.interpreter.parse(gcodeText);
            this.adjustCamera();
            this.refreshRender();
            this.updateInfoPanel();
        }
        catch (error) {
            console.error('Error loading G-code file:', error);
            alert('Failed to load G-code file. Please check the console for details.');
        }
        finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }
    handleFileUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const gcodeText = e.target?.result;
            console.log(`Uploaded file: ${file.name}, size: ${this.formatFileSize(file.size)}`);
            this.interpreter.reset();
            this.currentModel = this.interpreter.parse(gcodeText);
            this.adjustCamera();
            this.refreshRender();
            this.updateInfoPanel();
            alert('File loaded successfully from local file system!');
        };
        reader.readAsText(file);
    }
    adjustCamera() {
        if (!this.currentModel)
            return;
        const { minPos, maxPos, centerPos } = this.currentModel;
        const width = (maxPos.x - minPos.x);
        const depth = (maxPos.y - minPos.y);
        const height = (maxPos.z - minPos.z);
        const maxDim = Math.max(width, depth, height);
        const distance = maxDim * 2.5;
        this.camera.setTarget(new Vector3(centerPos.x, centerPos.z, centerPos.y));
        this.camera.radius = distance;
    }
    refreshRender() {
        if (!this.currentModel)
            return;
        const layerRange = this.getLayerRange();
        this.pathBuilder.render(this.currentModel, layerRange);
    }
    getLayerRange() {
        if (!this.currentModel)
            return undefined;
        const maxLayer = this.currentModel.totalLayers - 1;
        const start = Math.max(0, this.currentLayerStart);
        const end = this.currentLayerEnd === Infinity ? maxLayer : Math.min(maxLayer, this.currentLayerEnd);
        if (start > end)
            return undefined;
        return { start, end };
    }
    updateInfoPanel() {
        if (!this.currentModel)
            return;
        const { minPos, maxPos, totalLayers, filamentUsed, estimatedTime, totalLines } = this.currentModel;
        const info = `
      <strong>Model Information</strong><br><br>
      <strong>Dimensions:</strong><br>
      X: ${minPos.x.toFixed(1)} - ${maxPos.x.toFixed(1)} mm (${(maxPos.x - minPos.x).toFixed(1)} mm)<br>
      Y: ${minPos.y.toFixed(1)} - ${maxPos.y.toFixed(1)} mm (${(maxPos.y - minPos.y).toFixed(1)} mm)<br>
      Z: ${minPos.z.toFixed(1)} - ${maxPos.z.toFixed(1)} mm (${(maxPos.z - minPos.z).toFixed(1)} mm)<br><br>
      <strong>Statistics:</strong><br>
      Layers: ${totalLayers}<br>
      Movements: ${totalLines}<br>
      Filament: ${filamentUsed.toFixed(2)} mm<br>
      Estimated Time: ${estimatedTime.toFixed(1)} minutes
    `;
        const infoPanel = document.getElementById('infoPanel');
        if (infoPanel) {
            infoPanel.innerHTML = info;
        }
    }
    updateUI() {
        const loadButton = document.getElementById('loadButton');
        loadButton.disabled = !this.selectedFile;
    }
    showLoading(show) {
        const loading = document.getElementById('loadingIndicator');
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
    }
    startRenderLoop() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }
    dispose() {
        this.pathBuilder.dispose();
        this.engine.dispose();
    }
}
window.addEventListener('DOMContentLoaded', () => {
    const app = new GcodeViewerApp();
    window.gcodeApp = app;
});
//# sourceMappingURL=app.js.map