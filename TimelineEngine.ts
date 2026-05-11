
/**
 * 时间轴坐标转换引擎
 * 负责时间戳(ms) <-> 像素坐标的双向映射，以及缩放、对齐等核心逻辑
 */

export interface TimelineConfig {
  /** 每秒对应的像素数 (px/s) */
  pixelsPerSecond: number;
  /** 时间轴起始时间 (ms) */
  startTime: number;
  /** 网格对齐阈值 (ms)，用于时间刻度吸附 */
  gridSnapThreshold: number;
}

export type TimeUnit = 'ms' | 's' | 'min' | 'hour';

export class TimelineEngine {
  private config: TimelineConfig;

  constructor(config: Partial<TimelineConfig> = {}) {
    this.config = {
      pixelsPerSecond: 100,
      startTime: 0,
      gridSnapThreshold: 5,
      ...config,
    };
  }

  /**
   * 获取当前配置
   */
  getConfig(): TimelineConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  setConfig(config: Partial<TimelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 时间戳 -> 像素坐标
   * @param time 时间戳 (ms)
   * @returns 像素坐标 (px)
   */
  timeToPixel(time: number): number {
    const relativeTime = time - this.config.startTime;
    return (relativeTime / 1000) * this.config.pixelsPerSecond;
  }

  /**
   * 像素坐标 -> 时间戳
   * @param pixel 像素坐标 (px)
   * @returns 时间戳 (ms)
   */
  pixelToTime(pixel: number): number {
    const relativeTime = (pixel / this.config.pixelsPerSecond) * 1000;
    return this.config.startTime + relativeTime;
  }

  /**
   * 持续时间 -> 像素长度
   * @param duration 持续时间 (ms)
   * @returns 像素长度 (px)
   */
  durationToWidth(duration: number): number {
    return (duration / 1000) * this.config.pixelsPerSecond;
  }

  /**
   * 像素长度 -> 持续时间
   * @param width 像素长度 (px)
   * @returns 持续时间 (ms)
   */
  widthToDuration(width: number): number {
    return (width / this.config.pixelsPerSecond) * 1000;
  }

  /**
   * 放大/缩小
   * @param factor 缩放因子 (1.0 为原始大小)
   * @param centerPixel 缩放中心像素坐标
   */
  zoom(factor: number, centerPixel: number = 0): void {
    const centerTime = this.pixelToTime(centerPixel);
    this.config.pixelsPerSecond *= factor;
    const newCenterPixel = this.timeToPixel(centerTime);
    this.config.startTime -= this.widthToDuration(newCenterPixel - centerPixel);
  }

  /**
   * 平移时间轴
   * @param deltaPixel 像素偏移量
   */
  pan(deltaPixel: number): void {
    this.config.startTime -= this.widthToDuration(deltaPixel);
  }

  /**
   * 对齐到最近的时间刻度
   * @param time 原始时间 (ms)
   * @param snapInterval 刻度间隔 (ms)
   * @returns 对齐后的时间
   */
  snapToGrid(time: number, snapInterval: number): number {
    if (snapInterval <= 0) return time;
    return Math.round(time / snapInterval) * snapInterval;
  }

  /**
   * 对齐到最近的时间刻度（带阈值检测）
   * @param time 原始时间 (ms)
   * @param snapInterval 刻度间隔 (ms)
   * @param thresholdPixel 像素阈值
   * @returns 对齐后的时间
   */
  snapToGridWithThreshold(
    time: number,
    snapInterval: number,
    thresholdPixel: number = this.config.gridSnapThreshold
  ): number {
    const snapped = this.snapToGrid(time, snapInterval);
    const diffPixel = this.durationToWidth(Math.abs(snapped - time));
    return diffPixel <= thresholdPixel ? snapped : time;
  }

  /**
   * 获取当前缩放级别下的最佳刻度间隔
   * @returns 刻度间隔列表 (ms)
   */
  getOptimalGridIntervals(): number[] {
    const pixelsPerMs = this.config.pixelsPerSecond / 1000;
    const targetPixels = [50, 100, 200, 400];
    
    return targetPixels.map(pixels => {
      const ms = Math.round(pixels / pixelsPerMs);
      return this.normalizeInterval(ms);
    });
  }

  /**
   * 规范化刻度间隔为易读的数值
   */
  private normalizeInterval(ms: number): number {
    if (ms <= 0) return 1;
    
    const second = 1000;
    const minute = 60 * second;
    const hour = 60 * minute;

    if (ms >= hour) {
      return Math.max(hour, Math.round(ms / hour) * hour);
    } else if (ms >= minute) {
      const minutes = [1, 5, 10, 15, 30];
      const rawMinutes = ms / minute;
      const norm = minutes.reduce((prev, curr) => 
        Math.abs(curr - rawMinutes) < Math.abs(prev - rawMinutes) ? curr : prev
      );
      return norm * minute;
    } else if (ms >= second) {
      const seconds = [1, 2, 5, 10, 15, 30];
      const rawSeconds = ms / second;
      const norm = seconds.reduce((prev, curr) => 
        Math.abs(curr - rawSeconds) < Math.abs(prev - rawSeconds) ? curr : prev
      );
      return norm * second;
    } else {
      const msIntervals = [1, 5, 10, 20, 50, 100, 200, 500];
      const norm = msIntervals.reduce((prev, curr) => 
        Math.abs(curr - ms) < Math.abs(prev - ms) ? curr : prev
      );
      return norm;
    }
  }

  /**
   * 格式化时间显示
   * @param time 时间戳 (ms)
   * @param format 格式类型
   */
  formatTime(time: number, format: 'HH:MM:SS:ms' | 'MM:SS.ms' | 'SS.ms' = 'HH:MM:SS:ms'): string {
    const absTime = Math.abs(time);
    const hours = Math.floor(absTime / 3600000);
    const minutes = Math.floor((absTime % 3600000) / 60000);
    const seconds = Math.floor((absTime % 60000) / 1000);
    const milliseconds = Math.floor(absTime % 1000);

    const sign = time < 0 ? '-' : '';
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    const ms = milliseconds.toString().padStart(3, '0');
    const msShort = Math.floor(milliseconds / 10).toString().padStart(2, '0');

    switch (format) {
      case 'HH:MM:SS:ms':
        return `${sign}${hh}:${mm}:${ss}:${ms}`;
      case 'MM:SS.ms':
        return `${sign}${(hours * 60 + minutes).toString().padStart(2, '0')}:${ss}.${msShort}`;
      case 'SS.ms':
        return `${sign}${Math.floor(absTime / 1000).toString()}.${msShort}`;
      default:
        return `${sign}${hh}:${mm}:${ss}:${ms}`;
    }
  }
}
