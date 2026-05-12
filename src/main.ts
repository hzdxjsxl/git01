declare var L: any;

import { IDWHeatmapLayer } from './IDWHeatmapLayer';
import { SensorPoint } from './types';

interface SensorDataResponse {
  count: number;
  data: SensorPoint[];
}

interface StatsResponse {
  count: number;
  avgHumidity: number;
  minHumidity: number;
  maxHumidity: number;
}

class App {
  private map: any;
  private heatmapLayer: IDWHeatmapLayer | null = null;
  private sensorPoints: SensorPoint[] = [];
  private currentZoom: number = 11;

  constructor() {
    this.map = L.map('map', {
      center: [39.9, 116.4],
      zoom: 11,
      minZoom: 5,
      maxZoom: 18
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.init();
  }

  private async init(): Promise<void> {
    this.showLoading();
    await this.loadSensorData();
    this.hideLoading();
    this.setupEventListeners();
  }

  private async loadSensorData(): Promise<void> {
    try {
      const [dataResponse, statsResponse] = await Promise.all([
        fetch('/api/sensors/all'),
        fetch('/api/sensors/stats')
      ]);

      const sensorData: SensorDataResponse = await dataResponse.json();
      const stats: StatsResponse = await statsResponse.json();

      this.sensorPoints = sensorData.data;
      this.updateStatsPanel(stats);
      this.renderHeatmap();
    } catch (error) {
      console.error('Error loading sensor data:', error);
      this.showError('Failed to load sensor data. Using mock data.');
      this.loadMockData();
    }
  }

  private loadMockData(): void {
    const mockPoints: SensorPoint[] = [];
    const centerLat = 39.9;
    const centerLng = 116.4;
    const radius = 0.5;

    for (let i = 0; i < 3000; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const r = Math.sqrt(Math.random()) * radius;
      const lat = centerLat + r * Math.cos(angle);
      const lng = centerLng + r * Math.sin(angle);
      
      const distFromCenter = Math.sqrt(
        Math.pow(lat - centerLat, 2) + Math.pow(lng - centerLng, 2)
      );
      const normalizedDist = distFromCenter / radius;
      const baseHumidity = 20 + 65 * (1 - normalizedDist);
      const noise = (Math.random() - 0.5) * 15;
      const humidity = Math.max(20, Math.min(85, baseHumidity + noise));

      mockPoints.push({
        sensorId: `MOCK_${String(i).padStart(6, '0')}`,
        longitude: lng,
        latitude: lat,
        humidity: humidity,
        timestamp: new Date().toISOString()
      });
    }

    this.sensorPoints = mockPoints;
    
    const humidities = mockPoints.map(p => p.humidity);
    this.updateStatsPanel({
      count: mockPoints.length,
      avgHumidity: humidities.reduce((a, b) => a + b, 0) / humidities.length,
      minHumidity: Math.min(...humidities),
      maxHumidity: Math.max(...humidities)
    });

    this.renderHeatmap();
  }

  private renderHeatmap(): void {
    if (this.heatmapLayer) {
      this.map.removeLayer(this.heatmapLayer);
    }

    this.heatmapLayer = new IDWHeatmapLayer(this.sensorPoints, {
      idwConfig: {
        power: 2,
        neighborCount: 12
      },
      resolution: 4,
      opacity: 0.75
    });

    this.heatmapLayer.addTo(this.map);
  }

  private updateStatsPanel(stats: StatsResponse): void {
    document.getElementById('sensor-count')!.textContent = stats.count.toString();
    document.getElementById('avg-humidity')!.textContent = stats.avgHumidity.toFixed(1) + '%';
    document.getElementById('min-humidity')!.textContent = stats.minHumidity.toFixed(1) + '%';
    document.getElementById('max-humidity')!.textContent = stats.maxHumidity.toFixed(1) + '%';
  }

  private setupEventListeners(): void {
    this.map.on('zoomend', () => {
      const newZoom = this.map.getZoom();
      if (this.heatmapLayer && Math.abs(newZoom - this.currentZoom) >= 2) {
        this.currentZoom = newZoom;
        this.updateResolution();
      }
    });

    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      this.refreshData();
    });

    const powerSlider = document.getElementById('power-slider') as HTMLInputElement;
    const powerValue = document.getElementById('power-value')!;

    powerSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      powerValue.textContent = value.toFixed(1);
      if (this.heatmapLayer) {
        this.heatmapLayer.setIDWConfig({ power: value });
      }
    });

    const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
    const opacityValue = document.getElementById('opacity-value')!;

    opacitySlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      opacityValue.textContent = value.toFixed(2);
      if (this.heatmapLayer) {
        this.heatmapLayer.setOpacity(value);
      }
    });

    const resolutionSlider = document.getElementById('resolution-slider') as HTMLInputElement;
    const resolutionValue = document.getElementById('resolution-value')!;

    resolutionSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      resolutionValue.textContent = value.toString();
      if (this.heatmapLayer) {
        this.heatmapLayer.setResolution(value);
      }
    });
  }

  private updateResolution(): void {
    const zoom = this.map.getZoom();
    let resolution = 4;

    if (zoom <= 8) resolution = 8;
    else if (zoom <= 10) resolution = 6;
    else if (zoom <= 12) resolution = 4;
    else if (zoom <= 14) resolution = 3;
    else resolution = 2;

    if (this.heatmapLayer) {
      this.heatmapLayer.setResolution(resolution);
    }
  }

  private async refreshData(): Promise<void> {
    this.showLoading();
    await this.loadSensorData();
    this.hideLoading();
  }

  private showLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'flex';
    }
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  private showError(message: string): void {
    console.warn(message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
