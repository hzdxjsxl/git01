import { OrderBookData, OrderEntry } from './OrderBookMerger';

export interface RenderConfig {
  bidColor: string;
  askColor: string;
  bidGradientEnd: string;
  askGradientEnd: string;
  lineWidth: number;
  fontSize: number;
  fontFamily: string;
  gridColor: string;
  textColor: string;
  priceTickCount: number;
  volumeTickCount: number;
}

export interface ViewPort {
  minPrice: number;
  maxPrice: number;
  maxVolume: number;
  spread: number | null;
}

const defaultConfig: RenderConfig = {
  bidColor: '#2ecc71',
  askColor: '#e74c3c',
  bidGradientEnd: 'rgba(46, 204, 113, 0.1)',
  askGradientEnd: 'rgba(231, 76, 60, 0.1)',
  lineWidth: 2,
  fontSize: 12,
  fontFamily: 'Consolas, Monaco, monospace',
  gridColor: 'rgba(255, 255, 255, 0.1)',
  textColor: '#ecf0f1',
  priceTickCount: 5,
  volumeTickCount: 5
};

export class DepthCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private devicePixelRatio: number;

  private padding = {
    left: 80,
    right: 80,
    top: 20,
    bottom: 40
  };

  constructor(canvas: HTMLCanvasElement, config?: Partial<RenderConfig>) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.config = { ...defaultConfig, ...config };
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.devicePixelRatio;
    this.canvas.height = rect.height * this.devicePixelRatio;
    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
  }

  public resize(): void {
    this.setupCanvas();
  }

  public render(orderBook: OrderBookData): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.ctx.clearRect(0, 0, width, height);
    this.drawBackground(width, height);

    const viewport = this.calculateViewport(orderBook);
    if (!viewport) return;

    this.drawGrid(width, height);
    this.drawAsks(orderBook.cumulativeAsks, viewport, width, height);
    this.drawBids(orderBook.cumulativeBids, viewport, width, height);
    this.drawSpreadLine(viewport, width, height);
    this.drawAxisLabels(width, height, viewport);
    this.drawPriceLabels(orderBook, viewport, width, height);
  }

  private drawBackground(width: number, height: number): void {
    this.ctx.fillStyle = '#1e1e2e';
    this.ctx.fillRect(0, 0, width, height);
  }

  private calculateViewport(
    orderBook: OrderBookData
  ): ViewPort | null {
    const allPrices = [
      ...orderBook.bids.map(o => o.price),
      ...orderBook.asks.map(o => o.price)
    ];

    if (allPrices.length === 0) return null;

    const allCumulativeVolumes = [
      ...orderBook.cumulativeBids.map(o => o.quantity),
      ...orderBook.cumulativeAsks.map(o => o.quantity)
    ];

    const maxVolume = Math.max(...allCumulativeVolumes, 1);

    let minPrice: number;
    let maxPrice: number;

    if (orderBook.midPrice !== null) {
      const spread = orderBook.spread ?? 0;
      const range = Math.max(
        spread * 10,
        (Math.max(...allPrices) - Math.min(...allPrices)) * 1.2
      );
      minPrice = orderBook.midPrice - range / 2;
      maxPrice = orderBook.midPrice + range / 2;
    } else {
      minPrice = Math.min(...allPrices);
      maxPrice = Math.max(...allPrices);
      const padding = (maxPrice - minPrice) * 0.1;
      minPrice -= padding;
      maxPrice += padding;
    }

    return {
      minPrice,
      maxPrice,
      maxVolume,
      spread: orderBook.spread
    };
  }

  private drawGrid(width: number, height: number): void {
    const { left, right, top, bottom } = this.padding;
    const gridWidth = width - left - right;
    const gridHeight = height - top - bottom;

    this.ctx.strokeStyle = this.config.gridColor;
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= this.config.priceTickCount; i++) {
      const y = top + (gridHeight * i) / this.config.priceTickCount;
      this.ctx.beginPath();
      this.ctx.moveTo(left, y);
      this.ctx.lineTo(width - right, y);
      this.ctx.stroke();
    }

    for (let i = 0; i <= this.config.volumeTickCount; i++) {
      const x = left + (gridWidth * i) / this.config.volumeTickCount;
      this.ctx.beginPath();
      this.ctx.moveTo(x, top);
      this.ctx.lineTo(x, height - bottom);
      this.ctx.stroke();
    }
  }

  private drawAsks(
    cumulativeAsks: OrderEntry[],
    viewport: ViewPort,
    width: number,
    height: number
  ): void {
    if (cumulativeAsks.length === 0) return;

    const { left, right, top, bottom } = this.padding;
    const gridWidth = width - left - right;
    const gridHeight = height - top - bottom;

    const priceRange = viewport.maxPrice - viewport.minPrice;
    const volumeRange = viewport.maxVolume;

    const points: { x: number; y: number }[] = [];

    for (const order of cumulativeAsks) {
      const x =
        left + (order.quantity / volumeRange) * gridWidth;
      const y =
        top +
        gridHeight -
        ((order.price - viewport.minPrice) / priceRange) * gridHeight;
      points.push({ x, y });
    }

    if (points.length > 0) {
      const lastY = top + gridHeight;
      const firstX = left;

      const gradient = this.ctx.createLinearGradient(left, 0, width - right, 0);
      gradient.addColorStop(0, this.config.askColor);
      gradient.addColorStop(1, this.config.askGradientEnd);

      this.ctx.beginPath();
      this.ctx.moveTo(firstX, lastY);

      let prevX = firstX;
      for (const point of points) {
        this.ctx.lineTo(prevX, point.y);
        this.ctx.lineTo(point.x, point.y);
        prevX = point.x;
      }

      this.ctx.lineTo(prevX, top);
      this.ctx.lineTo(firstX, top);
      this.ctx.closePath();

      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.strokeStyle = this.config.askColor;
      this.ctx.lineWidth = this.config.lineWidth;
      this.ctx.beginPath();

      prevX = firstX;
      for (const point of points) {
        this.ctx.lineTo(prevX, point.y);
        this.ctx.lineTo(point.x, point.y);
        prevX = point.x;
      }
      this.ctx.stroke();
    }
  }

  private drawBids(
    cumulativeBids: OrderEntry[],
    viewport: ViewPort,
    width: number,
    height: number
  ): void {
    if (cumulativeBids.length === 0) return;

    const { left, right, top, bottom } = this.padding;
    const gridWidth = width - left - right;
    const gridHeight = height - top - bottom;

    const priceRange = viewport.maxPrice - viewport.minPrice;
    const volumeRange = viewport.maxVolume;

    const points: { x: number; y: number }[] = [];

    for (const order of cumulativeBids) {
      const x =
        left + (order.quantity / volumeRange) * gridWidth;
      const y =
        top +
        gridHeight -
        ((order.price - viewport.minPrice) / priceRange) * gridHeight;
      points.push({ x, y });
    }

    if (points.length > 0) {
      const lastY = top + gridHeight;
      const firstX = left;

      const gradient = this.ctx.createLinearGradient(left, 0, width - right, 0);
      gradient.addColorStop(0, this.config.bidColor);
      gradient.addColorStop(1, this.config.bidGradientEnd);

      this.ctx.beginPath();
      this.ctx.moveTo(firstX, lastY);

      let prevX = firstX;
      for (const point of points) {
        this.ctx.lineTo(prevX, point.y);
        this.ctx.lineTo(point.x, point.y);
        prevX = point.x;
      }

      this.ctx.lineTo(prevX, top);
      this.ctx.lineTo(firstX, top);
      this.ctx.closePath();

      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.strokeStyle = this.config.bidColor;
      this.ctx.lineWidth = this.config.lineWidth;
      this.ctx.beginPath();

      prevX = firstX;
      for (const point of points) {
        this.ctx.lineTo(prevX, point.y);
        this.ctx.lineTo(point.x, point.y);
        prevX = point.x;
      }
      this.ctx.stroke();
    }
  }

  private drawSpreadLine(viewport: ViewPort, width: number, height: number): void {
    if (viewport.spread === null || viewport.spread === 0) return;

    const { left, right, top, bottom } = this.padding;
    const gridHeight = height - top - bottom;
    const priceRange = viewport.maxPrice - viewport.minPrice;

    const askStartY = top + gridHeight - ((viewport.minPrice + priceRange * 0.5) / priceRange) * gridHeight;

    this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(left, askStartY);
    this.ctx.lineTo(width - right, askStartY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawAxisLabels(width: number, height: number, viewport: ViewPort): void {
    const { left, right, top, bottom } = this.padding;
    const gridWidth = width - left - right;
    const gridHeight = height - top - bottom;

    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';

    for (let i = 0; i <= this.config.priceTickCount; i++) {
      const y = top + (gridHeight * i) / this.config.priceTickCount;
      const ratio = 1 - i / this.config.priceTickCount;
      const price = viewport.minPrice + ratio * (viewport.maxPrice - viewport.minPrice);
      this.ctx.fillText(this.formatPrice(price), left - 10, y);
    }

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    for (let i = 0; i <= this.config.volumeTickCount; i++) {
      const x = left + (gridWidth * i) / this.config.volumeTickCount;
      const ratio = i / this.config.volumeTickCount;
      const volume = ratio * viewport.maxVolume;
      this.ctx.fillText(this.formatVolume(volume), x, height - bottom + 10);
    }
  }

  private drawPriceLabels(
    orderBook: OrderBookData,
    viewport: ViewPort,
    width: number,
    height: number
  ): void {
    const { left, right, top, bottom } = this.padding;
    const gridHeight = height - top - bottom;
    const priceRange = viewport.maxPrice - viewport.minPrice;

    this.ctx.font = `bold ${this.config.fontSize}px ${this.config.fontFamily}`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    if (orderBook.bestBid !== null) {
      const y =
        top +
        gridHeight -
        ((orderBook.bestBid - viewport.minPrice) / priceRange) * gridHeight;
      this.ctx.fillStyle = this.config.bidColor;
      this.ctx.fillText(
        `BID: ${this.formatPrice(orderBook.bestBid)}`,
        width - right + 10,
        y
      );
    }

    if (orderBook.bestAsk !== null) {
      const y =
        top +
        gridHeight -
        ((orderBook.bestAsk - viewport.minPrice) / priceRange) * gridHeight;
      this.ctx.fillStyle = this.config.askColor;
      this.ctx.fillText(
        `ASK: ${this.formatPrice(orderBook.bestAsk)}`,
        width - right + 10,
        y
      );
    }

    if (orderBook.midPrice !== null) {
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        `Mid: ${this.formatPrice(orderBook.midPrice)}`,
        left + (width - left - right) / 2,
        10
      );
    }

    if (orderBook.spread !== null) {
      this.ctx.fillStyle = '#95a5a6';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(
        `Spread: ${this.formatPrice(orderBook.spread)}`,
        width - 10,
        10
      );
    }
  }

  private formatPrice(price: number): string {
    return price.toFixed(2);
  }

  private formatVolume(volume: number): string {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(2) + 'M';
    }
    if (volume >= 1000) {
      return (volume / 1000).toFixed(2) + 'K';
    }
    return volume.toFixed(0);
  }
}
