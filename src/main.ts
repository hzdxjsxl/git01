import { OrderBookMerger, OrderEntry, OrderSide } from './OrderBookMerger';
import { DepthCanvasRenderer } from './DepthCanvasRenderer';

interface WebRTCMessage {
  side: 'bid' | 'ask';
  orders: OrderEntry[];
  type: 'snapshot' | 'update';
}

interface StatsData {
  fps: number;
  updatesPerSecond: number;
  bidLevels: number;
  askLevels: number;
  lastUpdateTime: number;
}

class DepthChartApplication {
  private merger: OrderBookMerger;
  private renderer: DepthCanvasRenderer | null = null;
  private animationFrameId: number | null = null;

  private stats: StatsData = {
    fps: 0,
    updatesPerSecond: 0,
    bidLevels: 0,
    askLevels: 0,
    lastUpdateTime: performance.now()
  };

  private frameCount: number = 0;
  private updateCount: number = 0;
  private lastStatsTime: number = performance.now();

  private basePrice: number = 50000;
  private isRunning: boolean = false;

  private statsElement: HTMLElement | null = null;

  constructor() {
    this.merger = new OrderBookMerger(200);
    this.initializeMockData();
  }

  public start(): void {
    const canvas = document.getElementById('depth-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    this.renderer = new DepthCanvasRenderer(canvas);
    this.statsElement = document.getElementById('stats');

    this.setupEventListeners();
    this.isRunning = true;

    this.startDataSimulation();
    this.startRenderLoop();
    this.startStatsLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      if (this.renderer) {
        this.renderer.resize();
      }
    });
  }

  private initializeMockData(): void {
    const snapshot = this.generateOrderBookSnapshot();
    this.processWebRTCMessage(snapshot);
  }

  private generateOrderBookSnapshot(): WebRTCMessage {
    const bids: OrderEntry[] = [];
    const asks: OrderEntry[] = [];

    for (let i = 0; i < 50; i++) {
      const bidPrice = this.basePrice - (i + 1) * 5 + Math.random() * 2;
      const askPrice = this.basePrice + (i + 1) * 5 + Math.random() * 2;

      bids.push({
        price: Math.round(bidPrice * 100) / 100,
        quantity: Math.random() * 10 + 1
      });

      asks.push({
        price: Math.round(askPrice * 100) / 100,
        quantity: Math.random() * 10 + 1
      });
    }

    this.merger.batchUpdate('bid', bids);
    this.merger.batchUpdate('ask', asks);

    return {
      side: 'bid',
      orders: bids,
      type: 'snapshot'
    };
  }

  private startDataSimulation(): void {
    const sendRandomUpdates = () => {
      if (!this.isRunning) return;

      const updateCount = Math.floor(Math.random() * 5) + 1;

      for (let i = 0; i < updateCount; i++) {
        const side: OrderSide = Math.random() > 0.5 ? 'bid' : 'ask';
        const priceOffset = (Math.random() - 0.5) * 200;
        const price = Math.round((this.basePrice + priceOffset) * 100) / 100;
        const quantity = Math.random() > 0.1 ? Math.random() * 5 + 0.5 : 0;

        this.merger.updateOrder(side, price, quantity);
        this.updateCount++;
      }

      if (Math.random() < 0.1) {
        this.basePrice += (Math.random() - 0.5) * 10;
      }

      setTimeout(sendRandomUpdates, 50 + Math.random() * 100);
    };

    setTimeout(sendRandomUpdates, 100);
  }

  private processWebRTCMessage(message: WebRTCMessage): void {
    if (message.type === 'snapshot') {
      this.merger.clear();
    }

    this.merger.batchUpdate(message.side, message.orders);
    this.updateCount++;
  }

  private startRenderLoop(): void {
    const render = () => {
      if (!this.isRunning || !this.renderer) return;

      const orderBook = this.merger.getOrderBook();
      this.renderer.render(orderBook);

      this.stats.bidLevels = orderBook.bids.length;
      this.stats.askLevels = orderBook.asks.length;

      this.frameCount++;
      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  private startStatsLoop(): void {
    const updateStats = () => {
      if (!this.isRunning) return;

      const now = performance.now();
      const elapsed = (now - this.lastStatsTime) / 1000;

      if (elapsed >= 1) {
        this.stats.fps = Math.round(this.frameCount / elapsed);
        this.stats.updatesPerSecond = Math.round(this.updateCount / elapsed);

        this.frameCount = 0;
        this.updateCount = 0;
        this.lastStatsTime = now;

        this.renderStats();
      }

      setTimeout(updateStats, 100);
    };

    updateStats();
  }

  private renderStats(): void {
    if (!this.statsElement) return;

    const orderBook = this.merger.getOrderBook();

    this.statsElement.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">FPS:</span>
        <span class="stat-value">${this.stats.fps}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Updates/s:</span>
        <span class="stat-value">${this.stats.updatesPerSecond}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Bid Levels:</span>
        <span class="stat-value bid">${this.stats.bidLevels}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Ask Levels:</span>
        <span class="stat-value ask">${this.stats.askLevels}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Best Bid:</span>
        <span class="stat-value bid">${orderBook.bestBid?.toFixed(2) || '-'}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Best Ask:</span>
        <span class="stat-value ask">${orderBook.bestAsk?.toFixed(2) || '-'}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Spread:</span>
        <span class="stat-value">${orderBook.spread?.toFixed(2) || '-'}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Mid Price:</span>
        <span class="stat-value mid">${orderBook.midPrice?.toFixed(2) || '-'}</span>
      </div>
    `;
  }
}

const app = new DepthChartApplication();

document.addEventListener('DOMContentLoaded', () => {
  app.start();
});

if ((import.meta as any).hot) {
  (import.meta as any).hot.dispose(() => {
    app.stop();
  });
}
