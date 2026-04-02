import type { BaseChartData, PointResult, DatasetResult, DesignZoneRequest, DesignZoneResult, ProcessResult } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

type ApiError = Error & { body?: unknown };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, options);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const err: ApiError = new Error(
      typeof errorBody?.detail === 'string'
        ? errorBody.detail
        : `Request failed: ${response.status}`
    );
    err.body = errorBody;
    throw err;
  }
  return response.json();
}

export function fetchBaseChartData(): Promise<BaseChartData> {
  return request('/api/v1/chart/base-data');
}

export function calculatePoint(temperature: number, humidity: number): Promise<PointResult> {
  return request('/api/v1/calculate/point', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temperature, humidity }),
  });
}

export function calculateDataset(
  file: File,
  tempColumn?: string,
  humidityColumn?: string,
): Promise<DatasetResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (tempColumn) formData.append('temp_column', tempColumn);
  if (humidityColumn) formData.append('humidity_column', humidityColumn);
  return request('/api/v1/calculate/dataset', {
    method: 'POST',
    body: formData,
  });
}

export function calculateDesignZone(config: DesignZoneRequest): Promise<DesignZoneResult> {
  return request('/api/v1/calculate/design-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

export function calculateProcess(body: Record<string, unknown>): Promise<ProcessResult> {
  return request('/api/v1/calculate/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
