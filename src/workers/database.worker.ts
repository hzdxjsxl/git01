import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

interface WorkerMessage {
  type: 'init' | 'exec' | 'export' | 'close';
  sql?: string;
  data?: ArrayBuffer;
}

interface WorkerResponse {
  type: 'ready' | 'result' | 'error' | 'exported' | 'closed';
  results?: QueryResult[];
  error?: string;
  data?: ArrayBuffer;
}

interface QueryResult {
  columns: string[];
  values: any[][];
}

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

async function initDb(data?: ArrayBuffer) {
  if (!SQL) {
    const wasmUrl = new URL('sql.js/dist/sql-wasm.wasm', import.meta.url).href;
    SQL = await initSqlJs({
      locateFile: () => wasmUrl
    });
  }
  
  db = data ? new SQL.Database(new Uint8Array(data)) : new SQL.Database();
  
  const response: WorkerResponse = { type: 'ready' };
  self.postMessage(response);
}

function executeSql(sql: string) {
  if (!db) {
    const response: WorkerResponse = {
      type: 'error',
      error: '数据库未初始化'
    };
    self.postMessage(response);
    return;
  }

  try {
    const results: QueryResult[] = [];
    
    const statements = db.prepare(sql);
    while (statements.step()) {
      const columns = statements.getColumnNames();
      const values = statements.get();
      if (results.length === 0 || results[results.length - 1].columns.length === 0) {
        results.push({ columns, values: [values] });
      } else {
        results[results.length - 1].values.push(values);
      }
    }
    statements.free();
    
    const response: WorkerResponse = {
      type: 'result',
      results
    };
    self.postMessage(response);
  } catch (e) {
    const response: WorkerResponse = {
      type: 'error',
      error: e instanceof Error ? e.message : String(e)
    };
    self.postMessage(response);
  }
}

function exportDb() {
  if (!db) {
    const response: WorkerResponse = {
      type: 'error',
      error: '数据库未初始化'
    };
    self.postMessage(response);
    return;
  }

  const data = db.export();
  const buffer = data.buffer;
  
  const response: WorkerResponse = {
    type: 'exported',
    data: buffer
  };
  self.postMessage(response, [buffer]);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
  
  const response: WorkerResponse = { type: 'closed' };
  self.postMessage(response);
}

self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  switch (e.data.type) {
    case 'init':
      initDb(e.data.data);
      break;
    case 'exec':
      if (e.data.sql) {
        executeSql(e.data.sql);
      }
      break;
    case 'export':
      exportDb();
      break;
    case 'close':
      closeDb();
      break;
  }
};
