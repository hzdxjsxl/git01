export interface OrderEntry {
  price: number;
  quantity: number;
}

export interface OrderBookData {
  bids: OrderEntry[];
  asks: OrderEntry[];
  cumulativeBids: OrderEntry[];
  cumulativeAsks: OrderEntry[];
  bestBid: number | null;
  bestAsk: number | null;
  midPrice: number | null;
  spread: number | null;
}

export type OrderSide = 'bid' | 'ask';

export class OrderBookMerger {
  private bids: Map<number, number> = new Map();
  private asks: Map<number, number> = new Map();
  private maxPriceLevels: number;

  private sortedBids: number[] = [];
  private sortedAsks: number[] = [];

  private cachedBids: OrderEntry[] = [];
  private cachedAsks: OrderEntry[] = [];
  private cachedCumulativeBids: OrderEntry[] = [];
  private cachedCumulativeAsks: OrderEntry[] = [];
  private isDirty: boolean = true;

  constructor(maxPriceLevels: number = 100) {
    this.maxPriceLevels = maxPriceLevels;
  }

  public updateOrder(side: OrderSide, price: number, quantity: number): void {
    const map = side === 'bid' ? this.bids : this.asks;

    if (quantity <= 0) {
      map.delete(price);
    } else {
      map.set(price, quantity);
    }

    this.isDirty = true;
  }

  public batchUpdate(side: OrderSide, orders: OrderEntry[]): void {
    const map = side === 'bid' ? this.bids : this.asks;

    for (const order of orders) {
      if (order.quantity <= 0) {
        map.delete(order.price);
      } else {
        map.set(order.price, order.quantity);
      }
    }

    this.isDirty = true;
  }

  public clear(): void {
    this.bids.clear();
    this.asks.clear();
    this.sortedBids = [];
    this.sortedAsks = [];
    this.isDirty = true;
  }

  public setMaxLevels(max: number): void {
    this.maxPriceLevels = max;
    this.isDirty = true;
  }

  public getOrderBook(): OrderBookData {
    if (this.isDirty) {
      this.compute();
    }

    const bestBid = this.cachedBids.length > 0 ? this.cachedBids[0].price : null;
    const bestAsk = this.cachedAsks.length > 0 ? this.cachedAsks[0].price : null;
    const midPrice = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;
    const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;

    return {
      bids: this.cachedBids,
      asks: this.cachedAsks,
      cumulativeBids: this.cachedCumulativeBids,
      cumulativeAsks: this.cachedCumulativeAsks,
      bestBid,
      bestAsk,
      midPrice,
      spread
    };
  }

  private compute(): void {
    this.sortedBids = Array.from(this.bids.keys()).sort((a, b) => b - a);
    this.sortedAsks = Array.from(this.asks.keys()).sort((a, b) => a - b);

    this.sortedBids = this.sortedBids.slice(0, this.maxPriceLevels);
    this.sortedAsks = this.sortedAsks.slice(0, this.maxPriceLevels);

    this.cachedBids = this.sortedBids.map(price => ({
      price,
      quantity: this.bids.get(price)!
    }));

    this.cachedAsks = this.sortedAsks.map(price => ({
      price,
      quantity: this.asks.get(price)!
    }));

    this.cachedCumulativeBids = this.computeCumulative(this.cachedBids);
    this.cachedCumulativeAsks = this.computeCumulative(this.cachedAsks);

    this.isDirty = false;
  }

  private computeCumulative(orders: OrderEntry[]): OrderEntry[] {
    let cumulative = 0;
    return orders.map(order => {
      cumulative += order.quantity;
      return {
        price: order.price,
        quantity: cumulative
      };
    });
  }

  public getTotalVolume(side: OrderSide): number {
    if (this.isDirty) {
      this.compute();
    }

    const cumulative = side === 'bid' ? this.cachedCumulativeBids : this.cachedCumulativeAsks;
    return cumulative.length > 0 ? cumulative[cumulative.length - 1].quantity : 0;
  }

  public getSpread(): number | null {
    if (this.isDirty) {
      this.compute();
    }

    const bestBid = this.cachedBids.length > 0 ? this.cachedBids[0].price : null;
    const bestAsk = this.cachedAsks.length > 0 ? this.cachedAsks[0].price : null;

    if (bestBid === null || bestAsk === null) {
      return null;
    }

    return bestAsk - bestBid;
  }
}
