import Worker from '../workers/database.worker?worker';

export interface QueryResult {
  columns: string[];
  values: any[][];
}

type OnReady = () => void;
type OnResult = (results: QueryResult[]) => void;
type OnError = (error: string) => void;
type OnExport = (data: ArrayBuffer) => void;

interface DatabaseWorkerConfig {
  onReady?: OnReady;
  onResult?: OnResult;
  onError?: OnError;
  onExport?: OnExport;
}

export class DatabaseWorkerManager {
  private worker: Worker;
  private isReady: boolean = false;

  constructor(config: DatabaseWorkerConfig = {}) {
    this.worker = new Worker();
    
    this.worker.onmessage = (e) => {
      switch (e.data.type) {
        case 'ready':
          this.isReady = true;
          config.onReady?.();
          break;
        case 'result':
          config.onResult?.(e.data.results);
          break;
        case 'error':
          config.onError?.(e.data.error);
          break;
        case 'exported':
          config.onExport?.(e.data.data);
          break;
        case 'closed':
          this.isReady = false;
          break;
      }
    };
  }

  init(data?: ArrayBuffer): void {
    this.worker.postMessage({
      type: 'init',
      data
    });
  }

  execute(sql: string): void {
    if (!this.isReady) {
      console.warn('数据库尚未就绪');
      return;
    }
    
    this.worker.postMessage({
      type: 'exec',
      sql
    });
  }

  export(): void {
    if (!this.isReady) {
      console.warn('数据库尚未就绪');
      return;
    }
    
    this.worker.postMessage({
      type: 'export'
    });
  }

  close(): void {
    this.worker.postMessage({
      type: 'close'
    });
    this.worker.terminate();
  }

  ready(): boolean {
    return this.isReady;
  }
}
