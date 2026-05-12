import { ColorStop } from './types';

export class ColorMapper {
  private stops: ColorStop[];

  constructor(stops: ColorStop[]) {
    this.stops = [...stops].sort((a, b) => a.value - b.value);
  }

  interpolate(value: number): [number, number, number, number] {
    if (this.stops.length === 0) {
      return [0, 0, 0, 255];
    }

    if (value <= this.stops[0].value) {
      return [this.stops[0].r, this.stops[0].g, this.stops[0].b, this.stops[0].a];
    }

    if (value >= this.stops[this.stops.length - 1].value) {
      const last = this.stops[this.stops.length - 1];
      return [last.r, last.g, last.b, last.a];
    }

    for (let i = 0; i < this.stops.length - 1; i++) {
      const lower = this.stops[i];
      const upper = this.stops[i + 1];

      if (value >= lower.value && value <= upper.value) {
        const t = (value - lower.value) / (upper.value - lower.value);
        return [
          Math.round(lower.r + (upper.r - lower.r) * t),
          Math.round(lower.g + (upper.g - lower.g) * t),
          Math.round(lower.b + (upper.b - lower.b) * t),
          Math.round(lower.a + (upper.a - lower.a) * t)
        ];
      }
    }

    return [0, 0, 0, 255];
  }

  createColorData(grid: Float32Array, width: number, height: number): ImageData {
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < grid.length; i++) {
      const value = grid[i];
      const [r, g, b, a] = this.interpolate(value);
      const idx = i * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }

    return imageData;
  }

  getStops(): ColorStop[] {
    return [...this.stops];
  }

  updateStops(stops: ColorStop[]): void {
    this.stops = [...stops].sort((a, b) => a.value - b.value);
  }

  static createDefaultHumidityMapper(): ColorMapper {
    return new ColorMapper([
      { value: 0, r: 139, g: 69, b: 19, a: 200 },
      { value: 20, r: 160, g: 82, b: 45, a: 200 },
      { value: 30, r: 139, g: 119, b: 101, a: 200 },
      { value: 40, r: 107, g: 142, b: 35, a: 200 },
      { value: 50, r: 34, g: 139, b: 34, a: 200 },
      { value: 60, r: 50, g: 205, b: 50, a: 200 },
      { value: 70, r: 65, g: 105, b: 225, a: 200 },
      { value: 80, r: 30, g: 144, b: 255, a: 200 },
      { value: 90, r: 0, g: 0, b: 205, a: 200 },
      { value: 100, r: 0, g: 0, b: 139, a: 200 }
    ]);
  }
}
