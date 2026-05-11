import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Color3,
  MeshBuilder,
  StandardMaterial
} from 'babylonjs';
import { GcodeInterpreter, GcodeModel } from './GcodeInterpreter';
import { PathBuilder } from './PathBuilder';

interface FileInfo {
  name: string;
  size: number;
  modified: string;
}

class GcodeViewerApp {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera!: ArcRotateCamera;
  private light!: HemisphericLight;
  private interpreter: GcodeInterpreter;
  private pathBuilder: PathBuilder;
  private currentModel: GcodeModel | null = null;
  private fileList: FileInfo[] = [];
  private selectedFile: string | null = null;
  private isLoading: boolean = false;

  private showTravelMoves: boolean = false;
  private showRapidMoves: boolean = false;
  private useRibbon: boolean = false;
  private currentLayerStart: number = 0;
  private currentLayerEnd: number = Infinity;

  constructor() {
    this.canvas = document.getElementById('renderCanvas') as unknown as HTMLCanvasElement;
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

  private setupScene(): void {
    this.scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.1, 1);

    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 3,
      Math.PI / 3,
      200,
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(this.canvas, true);
    this.camera.upperRadiusLimit = 1000;
    this.camera.lowerRadiusLimit = 5;
    this.camera.wheelPrecision = 50;

    this.light = new HemisphericLight(
      'light',
      new Vector3(0, 1, 0),
      this.scene
    );
    this.light.intensity = 0.7;

    this.createBuildPlate();
    this.createAxes();
  }

  private createBuildPlate(): void {
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

  private createAxes(): void {
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

  private setupUI(): void {
    const fileSelect = document.getElementById('fileSelect') as HTMLSelectElement;
    const travelToggle = document.getElementById('showTravel') as HTMLInputElement;
    const rapidToggle = document.getElementById('showRapid') as HTMLInputElement;
    const ribbonToggle = document.getElementById('useRibbon') as HTMLInputElement;
    const layerStart = document.getElementById('layerStart') as HTMLInputElement;
    const layerEnd = document.getElementById('layerEnd') as HTMLInputElement;
    const loadButton = document.getElementById('loadButton') as HTMLButtonElement;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;

    travelToggle.checked = this.showTravelMoves;
    rapidToggle.checked = this.showRapidMoves;
    ribbonToggle.checked = this.useRibbon;
  }

  private setupEventListeners(): void {
    const fileSelect = document.getElementById('fileSelect') as HTMLSelectElement;
    const travelToggle = document.getElementById('showTravel') as HTMLInputElement;
    const rapidToggle = document.getElementById('showRapid') as HTMLInputElement;
    const ribbonToggle = document.getElementById('useRibbon') as HTMLInputElement;
    const layerStart = document.getElementById('layerStart') as HTMLInputElement;
    const layerEnd = document.getElementById('layerEnd') as HTMLInputElement;
    const loadButton = document.getElementById('loadButton') as HTMLButtonElement;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const uploadButton = document.getElementById('uploadButton') as HTMLButtonElement;

    fileSelect.addEventListener('change', (e) => {
      this.selectedFile = fileSelect.value || null;
      this.updateUI();
    });

    travelToggle.addEventListener('change', (e) => {
      this.showTravelMoves = (e.target as HTMLInputElement).checked;
      this.pathBuilder.updateOptions({ showTravelMoves: this.showTravelMoves });
      this.refreshRender();
    });

    rapidToggle.addEventListener('change', (e) => {
      this.showRapidMoves = (e.target as HTMLInputElement).checked;
      this.pathBuilder.updateOptions({ showRapidMoves: this.showRapidMoves });
      this.refreshRender();
    });

    ribbonToggle.addEventListener('change', (e) => {
      this.useRibbon = (e.target as HTMLInputElement).checked;
      this.pathBuilder.updateOptions({ useRibbon: this.useRibbon });
      this.refreshRender();
    });

    layerStart.addEventListener('input', (e) => {
      this.currentLayerStart = parseInt((e.target as HTMLInputElement).value) || 0;
      this.refreshRender();
    });

    layerEnd.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
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
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.handleFileUpload(files[0]);
      }
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private async loadFileList(): Promise<void> {
    try {
      const response = await fetch('/api/gcode-list');
      const data = await response.json();
      this.fileList = data.files || [];
      this.updateFileListUI();
    } catch (error) {
      console.error('Failed to load file list:', error);
      this.fileList = [];
      this.updateFileListUI();
    }
  }

  private updateFileListUI(): void {
    const fileSelect = document.getElementById('fileSelect') as HTMLSelectElement;
    fileSelect.innerHTML = '<option value="">-- Select G-code File --</option>';

    for (const file of this.fileList) {
      const option = document.createElement('option');
      option.value = file.name;
      option.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
      fileSelect.appendChild(option);
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  private async loadGcodeFile(filename: string): Promise<void> {
    if (this.isLoading) return;
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
    } catch (error) {
      console.error('Error loading G-code file:', error);
      alert('Failed to load G-code file. Please check the console for details.');
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  private handleFileUpload(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const gcodeText = e.target?.result as string;
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

  private adjustCamera(): void {
    if (!this.currentModel) return;

    const { minPos, maxPos, centerPos } = this.currentModel;
    const width = (maxPos.x! - minPos.x!);
    const depth = (maxPos.y! - minPos.y!);
    const height = (maxPos.z! - minPos.z!);
    
    const maxDim = Math.max(width, depth, height);
    const distance = maxDim * 2.5;

    this.camera.setTarget(new Vector3(centerPos.x!, centerPos.z!, centerPos.y!));
    this.camera.radius = distance;
  }

  private refreshRender(): void {
    if (!this.currentModel) return;

    const layerRange = this.getLayerRange();
    this.pathBuilder.render(this.currentModel, layerRange);
  }

  private getLayerRange(): { start: number; end: number } | undefined {
    if (!this.currentModel) return undefined;

    const maxLayer = this.currentModel.totalLayers - 1;
    const start = Math.max(0, this.currentLayerStart);
    const end = this.currentLayerEnd === Infinity ? maxLayer : Math.min(maxLayer, this.currentLayerEnd);

    if (start > end) return undefined;

    return { start, end };
  }

  private updateInfoPanel(): void {
    if (!this.currentModel) return;

    const { minPos, maxPos, totalLayers, filamentUsed, estimatedTime, totalLines } = this.currentModel;

    const info = `
      <strong>Model Information</strong><br><br>
      <strong>Dimensions:</strong><br>
      X: ${minPos.x!.toFixed(1)} - ${maxPos.x!.toFixed(1)} mm (${(maxPos.x! - minPos.x!).toFixed(1)} mm)<br>
      Y: ${minPos.y!.toFixed(1)} - ${maxPos.y!.toFixed(1)} mm (${(maxPos.y! - minPos.y!).toFixed(1)} mm)<br>
      Z: ${minPos.z!.toFixed(1)} - ${maxPos.z!.toFixed(1)} mm (${(maxPos.z! - minPos.z!).toFixed(1)} mm)<br><br>
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

  private updateUI(): void {
    const loadButton = document.getElementById('loadButton') as HTMLButtonElement;
    loadButton.disabled = !this.selectedFile;
  }

  private showLoading(show: boolean): void {
    const loading = document.getElementById('loadingIndicator');
    if (loading) {
      loading.style.display = show ? 'block' : 'none';
    }
  }

  private startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  public dispose(): void {
    this.pathBuilder.dispose();
    this.engine.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new GcodeViewerApp();
  (window as any).gcodeApp = app;
});
