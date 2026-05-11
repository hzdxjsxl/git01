export type TariffPeriod = 'peak' | 'valley' | 'flat';

export interface TariffRate {
  period: TariffPeriod;
  pricePerKwh: number;
  description: string;
}

export interface TariffTimeRange {
  period: TariffPeriod;
  startHour: number;
  endHour: number;
}

export interface TieredRate {
  tier: number;
  thresholdKwh: number;
  priceMultiplier: number;
}

export interface MeterReading {
  timestamp: number;
  powerWatts: number;
  meterId: string;
}

export interface BillingRecord {
  timestamp: number;
  powerWatts: number;
  energyKwh: number;
  period: TariffPeriod;
  rate: number;
  cost: number;
  tier: number;
}

export interface DailyStats {
  date: string;
  totalEnergyKwh: number;
  totalCost: number;
  peakEnergy: number;
  valleyEnergy: number;
  flatEnergy: number;
  peakCost: number;
  valleyCost: number;
  flatCost: number;
  maxPower: number;
  avgPower: number;
  records: BillingRecord[];
}

export interface TariffConfig {
  rates: TariffRate[];
  timeRanges: TariffTimeRange[];
  tieredRates: TieredRate[];
  timezone: string;
}

const DEFAULT_TARIFF_CONFIG: TariffConfig = {
  rates: [
    { period: 'peak', pricePerKwh: 1.25, description: '尖峰电价' },
    { period: 'valley', pricePerKwh: 0.35, description: '谷段电价' },
    { period: 'flat', pricePerKwh: 0.85, description: '平段电价' }
  ],
  timeRanges: [
    { period: 'peak', startHour: 8, endHour: 11 },
    { period: 'flat', startHour: 11, endHour: 14 },
    { period: 'peak', startHour: 14, endHour: 15 },
    { period: 'flat', startHour: 15, endHour: 18 },
    { period: 'peak', startHour: 18, endHour: 23 },
    { period: 'valley', startHour: 23, endHour: 24 },
    { period: 'valley', startHour: 0, endHour: 8 }
  ],
  tieredRates: [
    { tier: 1, thresholdKwh: 0, priceMultiplier: 1.0 },
    { tier: 2, thresholdKwh: 2000, priceMultiplier: 1.1 },
    { tier: 3, thresholdKwh: 5000, priceMultiplier: 1.25 }
  ],
  timezone: 'Asia/Shanghai'
};

export class TariffCalculator {
  private config: TariffConfig;
  private billingRecords: BillingRecord[] = [];
  private dailyStats: Map<string, DailyStats> = new Map();
  private lastTimestamp: number = 0;
  private sortedTimeRanges: TariffTimeRange[];

  constructor(config?: Partial<TariffConfig>) {
    this.config = {
      ...DEFAULT_TARIFF_CONFIG,
      ...config,
      rates: config?.rates ?? DEFAULT_TARIFF_CONFIG.rates,
      timeRanges: config?.timeRanges ?? DEFAULT_TARIFF_CONFIG.timeRanges,
      tieredRates: config?.tieredRates ?? DEFAULT_TARIFF_CONFIG.tieredRates
    };

    this.sortedTimeRanges = [...this.config.timeRanges].sort((a, b) => {
      const aIsWrap = a.startHour >= 23 || a.startHour < 6;
      const bIsWrap = b.startHour >= 23 || b.startHour < 6;
      if (aIsWrap && !bIsWrap) return 1;
      if (!aIsWrap && bIsWrap) return -1;
      return a.startHour - b.startHour;
    });
  }

  getTariffPeriod(timestamp: number): TariffPeriod {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const minute = date.getMinutes();
    const hourFraction = hour + minute / 60;

    for (const range of this.sortedTimeRanges) {
      if (range.startHour <= hourFraction && hourFraction < range.endHour) {
        return range.period;
      }
    }

    return 'flat';
  }

  getRateForPeriod(period: TariffPeriod): number {
    const rate = this.config.rates.find(r => r.period === period);
    return rate ? rate.pricePerKwh : 0.85;
  }

  getDailyTotalKwh(date: string): number {
    const stats = this.dailyStats.get(date);
    return stats ? stats.totalEnergyKwh : 0;
  }

  determineTier(totalDailyKwh: number): number {
    let currentTier = 1;
    const sortedRates = [...this.config.tieredRates].sort((a, b) => a.thresholdKwh - b.thresholdKwh);

    for (const tier of sortedRates) {
      if (totalDailyKwh >= tier.thresholdKwh) {
        currentTier = tier.tier;
      }
    }

    return currentTier;
  }

  getTierMultiplier(tier: number): number {
    const tierRate = this.config.tieredRates.find(t => t.tier === tier);
    return tierRate ? tierRate.priceMultiplier : 1.0;
  }

  wattsToKwh(powerWatts: number, durationSeconds: number): number {
    return (powerWatts * durationSeconds) / (1000 * 3600);
  }

  private getHourOfDay(timestamp: number): number {
    const date = new Date(timestamp);
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  }

  private findNextBoundaryTimestamp(timestamp: number): number {
    const date = new Date(timestamp);
    const currentHour = this.getHourOfDay(timestamp);

    for (const range of this.sortedTimeRanges) {
      if (range.startHour > currentHour) {
        const boundaryDate = new Date(timestamp);
        const startHour = Math.floor(range.startHour);
        const startMinute = Math.round((range.startHour - startHour) * 60);
        boundaryDate.setHours(startHour, startMinute, 0, 0);
        return boundaryDate.getTime();
      }

      if (range.startHour <= currentHour && currentHour < range.endHour) {
        const boundaryDate = new Date(timestamp);
        const endHour = Math.floor(range.endHour);
        const endMinute = Math.round((range.endHour - endHour) * 60);
        boundaryDate.setHours(endHour, endMinute, 0, 0);
        return boundaryDate.getTime();
      }
    }

    const nextDay = new Date(timestamp);
    nextDay.setHours(24, 0, 0, 0);
    return nextDay.getTime();
  }

  private splitIntervalByBoundaries(
    startTime: number,
    endTime: number
  ): Array<{ segmentStart: number; segmentEnd: number; period: TariffPeriod }> {
    const segments: Array<{
      segmentStart: number;
      segmentEnd: number;
      period: TariffPeriod;
    }> = [];

    let currentTime = startTime;

    while (currentTime < endTime) {
      const period = this.getTariffPeriod(currentTime);
      let nextBoundary = this.findNextBoundaryTimestamp(currentTime);

      if (nextBoundary <= currentTime) {
        const nextDay = new Date(currentTime);
        nextDay.setHours(24, 0, 0, 0);
        nextBoundary = nextDay.getTime();
      }

      const segmentEnd = Math.min(nextBoundary, endTime);

      segments.push({
        segmentStart: currentTime,
        segmentEnd,
        period
      });

      currentTime = segmentEnd;
    }

    return segments;
  }

  processReading(reading: MeterReading): BillingRecord[] {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = reading.timestamp;
      return [];
    }

    const durationSeconds = (reading.timestamp - this.lastTimestamp) / 1000;

    if (durationSeconds <= 0 || durationSeconds > 3600) {
      this.lastTimestamp = reading.timestamp;
      return [];
    }

    const segments = this.splitIntervalByBoundaries(
      this.lastTimestamp,
      reading.timestamp
    );

    const generatedRecords: BillingRecord[] = [];

    for (const segment of segments) {
      const segmentDurationSeconds = (segment.segmentEnd - segment.segmentStart) / 1000;

      if (segmentDurationSeconds <= 0) continue;

      const energyKwh = this.wattsToKwh(reading.powerWatts, segmentDurationSeconds);
      const dateKey = this.getDateKey(segment.segmentStart);

      const dailyTotalBefore = this.getDailyTotalKwh(dateKey);
      const tier = this.determineTier(dailyTotalBefore);
      const tierMultiplier = this.getTierMultiplier(tier);
      const baseRate = this.getRateForPeriod(segment.period);
      const effectiveRate = baseRate * tierMultiplier;
      const cost = energyKwh * effectiveRate;

      const record: BillingRecord = {
        timestamp: segment.segmentEnd,
        powerWatts: reading.powerWatts,
        energyKwh,
        period: segment.period,
        rate: effectiveRate,
        cost,
        tier
      };

      this.billingRecords.push(record);
      this.updateDailyStats(dateKey, record);
      generatedRecords.push(record);
    }

    this.lastTimestamp = reading.timestamp;

    return generatedRecords;
  }

  private updateDailyStats(dateKey: string, record: BillingRecord): void {
    let stats = this.dailyStats.get(dateKey);

    if (!stats) {
      stats = {
        date: dateKey,
        totalEnergyKwh: 0,
        totalCost: 0,
        peakEnergy: 0,
        valleyEnergy: 0,
        flatEnergy: 0,
        peakCost: 0,
        valleyCost: 0,
        flatCost: 0,
        maxPower: 0,
        avgPower: 0,
        records: []
      };
      this.dailyStats.set(dateKey, stats);
    }

    stats.totalEnergyKwh += record.energyKwh;
    stats.totalCost += record.cost;
    stats.records.push(record);

    if (record.period === 'peak') {
      stats.peakEnergy += record.energyKwh;
      stats.peakCost += record.cost;
    } else if (record.period === 'valley') {
      stats.valleyEnergy += record.energyKwh;
      stats.valleyCost += record.cost;
    } else {
      stats.flatEnergy += record.energyKwh;
      stats.flatCost += record.cost;
    }

    if (record.powerWatts > stats.maxPower) {
      stats.maxPower = record.powerWatts;
    }

    const totalPower = stats.records.reduce((sum, r) => sum + r.powerWatts, 0);
    stats.avgPower = totalPower / stats.records.length;
  }

  getDateKey(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getDailyStats(date: string): DailyStats | undefined {
    return this.dailyStats.get(date);
  }

  getAllDailyStats(): DailyStats[] {
    return Array.from(this.dailyStats.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  getTotalEnergyKwh(): number {
    return this.billingRecords.reduce((sum, r) => sum + r.energyKwh, 0);
  }

  getTotalCost(): number {
    return this.billingRecords.reduce((sum, r) => sum + r.cost, 0);
  }

  getPeakEnergy(): number {
    return this.billingRecords.filter(r => r.period === 'peak').reduce((sum, r) => sum + r.energyKwh, 0);
  }

  getValleyEnergy(): number {
    return this.billingRecords.filter(r => r.period === 'valley').reduce((sum, r) => sum + r.energyKwh, 0);
  }

  getFlatEnergy(): number {
    return this.billingRecords.filter(r => r.period === 'flat').reduce((sum, r) => sum + r.energyKwh, 0);
  }

  getPeakCost(): number {
    return this.billingRecords.filter(r => r.period === 'peak').reduce((sum, r) => sum + r.cost, 0);
  }

  getValleyCost(): number {
    return this.billingRecords.filter(r => r.period === 'valley').reduce((sum, r) => sum + r.cost, 0);
  }

  getFlatCost(): number {
    return this.billingRecords.filter(r => r.period === 'flat').reduce((sum, r) => sum + r.cost, 0);
  }

  getRecentRecords(count: number = 60): BillingRecord[] {
    return this.billingRecords.slice(-count);
  }

  getConfig(): TariffConfig {
    return { ...this.config };
  }

  reset(): void {
    this.billingRecords = [];
    this.dailyStats.clear();
    this.lastTimestamp = 0;
  }

  formatCurrency(amount: number): string {
    return `¥${amount.toFixed(2)}`;
  }

  formatEnergy(kwh: number): string {
    if (kwh >= 1000) {
      return `${(kwh / 1000).toFixed(2)} MWh`;
    }
    return `${kwh.toFixed(2)} kWh`;
  }

  formatPower(watts: number): string {
    if (watts >= 1000) {
      return `${(watts / 1000).toFixed(1)} kW`;
    }
    return `${watts.toFixed(0)} W`;
  }

  getCurrentPeriodInfo(timestamp: number = Date.now()): { period: TariffPeriod; rate: number; description: string } {
    const period = this.getTariffPeriod(timestamp);
    const rate = this.getRateForPeriod(period);
    const description = this.config.rates.find(r => r.period === period)?.description || '未知时段';

    return { period, rate, description };
  }
}

export default TariffCalculator;
