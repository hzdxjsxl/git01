import type { ClickRecord } from '../utils/SankeyGraphBuilder';

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
}

export interface ClickStreamResponse {
  data: ClickRecord[];
  pagination: PaginationInfo;
}

export interface StatsResponse {
  totalRecords: number;
  maxPageSize: number;
  defaultPageSize: number;
}

const BASE_URL = '/api/click-stream';

async function fetchWithTimeout(url: string, timeout: number = 30000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function fetchClickStream(
  page: number = 1,
  pageSize: number = 1000,
  options: {
    startTime?: number;
    endTime?: number;
    sessionId?: string;
  } = {}
): Promise<ClickStreamResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString()
  });

  if (options.startTime) {
    params.append('startTime', options.startTime.toString());
  }
  if (options.endTime) {
    params.append('endTime', options.endTime.toString());
  }
  if (options.sessionId) {
    params.append('sessionId', options.sessionId);
  }

  const url = `${BASE_URL}?${params.toString()}`;
  const response = await fetchWithTimeout(url);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  const response = await fetchWithTimeout(`${BASE_URL}/stats`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export async function* fetchAllClickStream(
  pageSize: number = 1000,
  options: {
    maxPages?: number;
    startTime?: number;
    endTime?: number;
    sessionId?: string;
  } = {}
): AsyncGenerator<ClickRecord[], void, unknown> {
  let page = 1;
  const maxPages = options.maxPages || Infinity;
  let pagesFetched = 0;

  while (pagesFetched < maxPages) {
    const response = await fetchClickStream(page, pageSize, options);
    
    if (response.data.length === 0) {
      break;
    }

    yield response.data;
    pagesFetched++;

    if (!response.pagination.hasNext) {
      break;
    }

    page++;
  }
}
