import { describe, it, expect } from 'vitest';
import { TariffCalculator } from './TariffCalculator';
import type { MeterReading } from './TariffCalculator';

describe('TariffCalculator', () => {
  describe('跨时段计费逻辑', () => {
    let calculator: TariffCalculator;

    beforeEach(() => {
      calculator = new TariffCalculator();
    });

    it('应该正确识别时段内的读数（不跨边界）', () => {
      const date = new Date('2026-05-11');

      const r1: MeterReading = {
        timestamp: new Date(date).setHours(10, 0, 0, 0),
        powerWatts: 10000,
        meterId: 'TEST'
      };

      const result1 = calculator.processReading(r1);
      expect(result1.length).toBe(0);

      const r2: MeterReading = {
        timestamp: new Date(date).setHours(10, 30, 0, 0),
        powerWatts: 10000,
        meterId: 'TEST'
      };

      const result2 = calculator.processReading(r2);
      expect(result2.length).toBe(1);
      expect(result2[0].period).toBe('peak');
      expect(result2[0].rate).toBe(1.25);

      const expectedEnergy = (10000 * 1800) / (1000 * 3600);
      expect(calculator.getTotalEnergyKwh()).toBeCloseTo(expectedEnergy, 6);
    });

    it('应该正确切分跨越峰→平时段边界的数据', () => {
      const date = new Date('2026-05-11');

      const t1 = new Date(date).setHours(10, 59, 0, 0);
      const t2 = new Date(date).setHours(11, 1, 0, 0);

      const r1: MeterReading = {
        timestamp: t1,
        powerWatts: 10000,
        meterId: 'TEST'
      };
      calculator.processReading(r1);

      const r2: MeterReading = {
        timestamp: t2,
        powerWatts: 10000,
        meterId: 'TEST'
      };
      const records = calculator.processReading(r2);

      expect(records.length).toBe(2);

      expect(records[0].period).toBe('peak');
      expect(records[0].rate).toBe(1.25);

      expect(records[1].period).toBe('flat');
      expect(records[1].rate).toBe(0.85);

      const totalEnergy = records.reduce((sum, r) => sum + r.energyKwh, 0);
      const expectedEnergy = (10000 * 120) / (1000 * 3600);
      expect(totalEnergy).toBeCloseTo(expectedEnergy, 6);

      const peakSeconds = 60;
      const flatSeconds = 60;
      const peakEnergy = (10000 * peakSeconds) / (1000 * 3600);
      const flatEnergy = (10000 * flatSeconds) / (1000 * 3600);
      const expectedCost = peakEnergy * 1.25 + flatEnergy * 0.85;

      const actualCost = records.reduce((sum, r) => sum + r.cost, 0);
      expect(actualCost).toBeCloseTo(expectedCost, 6);

      const oldLogicCost = expectedEnergy * 0.85;
      expect(actualCost).not.toBeCloseTo(oldLogicCost, 6);
    });

    it('应该正确切分跨越平→谷时段边界的数据', () => {
      const date = new Date('2026-05-11');

      const t1 = new Date(date).setHours(22, 59, 30, 0);
      const t2 = new Date(date).setHours(23, 0, 30, 0);

      const r1: MeterReading = {
        timestamp: t1,
        powerWatts: 10000,
        meterId: 'TEST'
      };
      calculator.processReading(r1);

      const r2: MeterReading = {
        timestamp: t2,
        powerWatts: 10000,
        meterId: 'TEST'
      };
      const records = calculator.processReading(r2);

      expect(records.length).toBe(2);

      expect(records[0].period).toBe('peak');
      expect(records[0].rate).toBe(1.25);

      expect(records[1].period).toBe('valley');
      expect(records[1].rate).toBe(0.35);

      const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
      const peakEnergy = (10000 * 30) / (1000 * 3600);
      const valleyEnergy = (10000 * 30) / (1000 * 3600);
      const expectedCost = peakEnergy * 1.25 + valleyEnergy * 0.35;

      expect(totalCost).toBeCloseTo(expectedCost, 6);
    });

    it('应该正确处理跨越谷→峰时段边界（次日08:00）', () => {
      const date = new Date('2026-05-11');

      const t1 = new Date(date).setHours(7, 59, 0, 0);
      const t2 = new Date(date).setHours(8, 1, 0, 0);

      const r1: MeterReading = {
        timestamp: t1,
        powerWatts: 10000,
        meterId: 'TEST'
      };
      calculator.processReading(r1);

      const r2: MeterReading = {
        timestamp: t2,
        powerWatts: 10000,
        meterId: 'TEST'
      };
      const records = calculator.processReading(r2);

      expect(records.length).toBe(2);

      expect(records[0].period).toBe('valley');
      expect(records[0].rate).toBe(0.35);

      expect(records[1].period).toBe('peak');
      expect(records[1].rate).toBe(1.25);
    });

    it('应该正确处理跨越多个时段边界', () => {
      const date = new Date('2026-05-11');

      const t1 = new Date(date).setHours(10, 30, 0, 0);
      const t2 = new Date(date).setHours(11, 30, 0, 0);

      const r1: MeterReading = {
        timestamp: t1,
        powerWatts: 10000,
        meterId: 'TEST'
      };
      calculator.processReading(r1);

      const r2: MeterReading = {
        timestamp: t2,
        powerWatts: 10000,
        meterId: 'TEST'
      };
      const records = calculator.processReading(r2);

      expect(records.length).toBe(2);

      expect(records[0].period).toBe('peak');
      expect(records[1].period).toBe('flat');

      const peakSeconds = 1800;
      const flatSeconds = 1800;
      const peakEnergy = (10000 * peakSeconds) / (1000 * 3600);
      const flatEnergy = (10000 * flatSeconds) / (1000 * 3600);
      const expectedCost = peakEnergy * 1.25 + flatEnergy * 0.85;

      const actualCost = records.reduce((sum, r) => sum + r.cost, 0);
      expect(actualCost).toBeCloseTo(expectedCost, 6);
    });

    it('应该在跨越边界时正确累计各时段的费用', () => {
      const date = new Date('2026-05-11');

      const t1 = new Date(date).setHours(10, 0, 0, 0);
      const t2 = new Date(date).setHours(12, 0, 0, 0);

      const r1: MeterReading = {
        timestamp: t1,
        powerWatts: 10000,
        meterId: 'TEST'
      };
      calculator.processReading(r1);

      const r2: MeterReading = {
        timestamp: t2,
        powerWatts: 10000,
        meterId: 'TEST'
      };
      calculator.processReading(r2);

      expect(calculator.getPeakCost()).toBeGreaterThan(0);
      expect(calculator.getFlatCost()).toBeGreaterThan(0);
      expect(calculator.getValleyCost()).toBe(0);

      const peakSeconds = 3600;
      const flatSeconds = 3600;
      const peakEnergy = (10000 * peakSeconds) / (1000 * 3600);
      const flatEnergy = (10000 * flatSeconds) / (1000 * 3600);

      expect(calculator.getPeakEnergy()).toBeCloseTo(peakEnergy, 6);
      expect(calculator.getFlatEnergy()).toBeCloseTo(flatEnergy, 6);
      expect(calculator.getTotalEnergyKwh()).toBeCloseTo(peakEnergy + flatEnergy, 6);

      const expectedTotalCost = peakEnergy * 1.25 + flatEnergy * 0.85;
      expect(calculator.getTotalCost()).toBeCloseTo(expectedTotalCost, 6);
    });
  });

  describe('阶梯电价逻辑', () => {
    it('应该正确应用阶梯电价', () => {
      const calculator = new TariffCalculator();
      const date = new Date('2026-05-11');

      const highPower = 1000000;

      const t1 = new Date(date).setHours(10, 0, 0, 0);
      const r1: MeterReading = {
        timestamp: t1,
        powerWatts: highPower,
        meterId: 'TEST'
      };
      calculator.processReading(r1);

      const readingsNeededForTier2 = Math.ceil(2000 / ((highPower * 3600) / (1000 * 3600)));

      for (let i = 1; i <= readingsNeededForTier2; i++) {
        const t = new Date(date).setHours(10, i, 0, 0);
        const r: MeterReading = {
          timestamp: t,
          powerWatts: highPower,
          meterId: 'TEST'
        };
        calculator.processReading(r);
      }

      const dailyTotal = calculator.getDailyTotalKwh('2026-05-11');
      expect(dailyTotal).toBeGreaterThanOrEqual(2000);

      const tier = calculator.determineTier(dailyTotal);
      expect(tier).toBeGreaterThanOrEqual(2);
    });
  });
});
