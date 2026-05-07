import { api } from './api-client';
import type { PaginatedResponse, PaginationMeta } from './api-types';

export type ParserScheduleRunType = 'plp' | 'pdp';
export type ParserRunRecordType = 'plp' | 'pdp' | 'sync';
export type ParserTargetEnv = 'local' | 'prod';

export interface ParserCatalogItem {
  code: string;
  label: string;
  domain: string;
  supportedRunTypes: ParserScheduleRunType[];
  scanInputMode?: 'pages' | 'profile_login';
  adminAvailability: string;
  releaseStage: string;
  isVisibleInAdmin: boolean;
  manualRunEnabled: boolean;
  schedulerEnabled: boolean;
  plpMode: 'mono' | 'multi';
  registrySyncEnabled?: boolean;
}

export interface ParserRun {
  id: string;
  parser_code: string;
  run_type: ParserRunRecordType;
  domain: string;
  assigned_user_id: string | null;
  target_env: ParserTargetEnv;
  trigger_mode: string;
  schedule_id: string | null;
  status: string;
  config_snapshot: Record<string, unknown>;
  started_at: string | null;
  finished_at: string | null;
  cancel_requested_at: string | null;
  created_by_admin_user_id: string;
  log_storage_key: string | null;
  report_storage_key: string | null;
  counters: Record<string, unknown> | null;
  source_status_summary: Record<string, unknown> | null;
  error_summary: string | null;
  process_pid: number | null;
  created_at: string;
  updated_at: string;
}

export interface ParserLogChunk {
  id: string;
  run_id: string;
  seq: number;
  level: string;
  message: string;
  raw_line: string | null;
  created_at: string;
}

export interface ParserRunCurrentPlpFile {
  fileName: string;
  missing: boolean;
  content: string | null;
}

export interface ParserPlpFileOption {
  key: string;
  fileName: string;
  label: string;
  updatedAt: string | null;
  itemsCount: number | null;
}

export interface PlpFileInfo {
  parserCode: string;
  parserLabel: string;
  fileName: string;
  fileKey: string;
  label: string;
  lastUpdatedAt: string | null;
  itemsCount: number;
  errorItemsCount: number;
  missingCandidatesCount: number;
  fileSizeBytes: number;
}

export interface ParserSchedule {
  id: string;
  parser_code: string;
  run_type: ParserScheduleRunType;
  domain: string;
  assigned_user_id: string | null;
  target_env: ParserTargetEnv;
  cron_expression: string;
  frequency_preset: string | null;
  timezone: string;
  status: string;
  config_snapshot: Record<string, unknown>;
  next_run_at: string | null;
  last_run_at: string | null;
  resource_availability_status: string | null;
  resource_availability_checked_at: string | null;
  resource_availability_summary: string | null;
  resource_availability_scope: Record<string, unknown> | null;
  created_by_admin_user_id: string;
  updated_by_admin_user_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePlpRunPayload {
  parserCode?: string;
  assignedUserId?: string;
  scanMode?: 'first_n' | 'range' | 'all';
  pagesFirst?: number;
  pageFrom?: number;
  pageTo?: number;
  login?: string;
  pageSize?: number;
  maxItems?: number;
  delayMs?: number;
  dryRun?: boolean;
}

export interface CreatePdpRunPayload {
  parserCode?: string;
  assignedUserId: string;
  plpFileKey: string;
  listingStatus: 'active' | 'paused';
  limit?: number;
  resume?: boolean;
  dryRun?: boolean;
  onlyFailed?: boolean;
  updateExisting?: boolean;
  registrationType: string;
  defaultHp: number;
  city: string;
  delayMs?: number;
  removeClosed?: boolean;
  checkUserDuplicatesBeforeCreate?: boolean;
}

export interface CreateParserSchedulePayload {
  parserCode?: string;
  runType: ParserScheduleRunType;
  assignedUserId?: string;
  frequencyPreset: 'every_n_hours' | 'every_n_days' | 'daily' | 'weekly' | 'custom';
  everyNHours?: number;
  everyNDays?: number;
  presetTime?: string;
  presetWeekday?: string;
  cronExpression?: string;
  timezone?: string;
  configSnapshot: Record<string, unknown>;
}

export interface UpdateParserSchedulePayload {
  frequencyPreset?: 'every_n_hours' | 'every_n_days' | 'daily' | 'weekly' | 'custom';
  everyNHours?: number;
  everyNDays?: number;
  presetTime?: string;
  presetWeekday?: string;
  cronExpression?: string;
  timezone?: string;
  configSnapshot?: Record<string, unknown>;
}

export const adminParsingApi = {
  getCatalog: () =>
    api.get<{
      data: ParserCatalogItem[];
      meta: { targetEnv: ParserTargetEnv };
    }>('/api/admin/parsing/catalog'),
  getPlpRuns: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<ParserRun, PaginationMeta>>(
      `/api/admin/parsing/plp-runs?page=${page}&limit=${limit}`,
    ),
  getPdpRuns: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<ParserRun, PaginationMeta>>(
      `/api/admin/parsing/pdp-runs?page=${page}&limit=${limit}`,
    ),
  getRun: (id: string) => api.get<ParserRun>(`/api/admin/parsing/runs/${id}`),
  getRunLogs: (id: string, afterSeq = 0) =>
    api.get<{ data: ParserLogChunk[] }>(`/api/admin/parsing/runs/${id}/logs?afterSeq=${afterSeq}`),
  getRunReport: (id: string) =>
    api.get<Record<string, unknown>>(`/api/admin/parsing/runs/${id}/report`),
  getRunCurrentPlpFile: (id: string) =>
    api.get<ParserRunCurrentPlpFile>(`/api/admin/parsing/runs/${id}/current-plp-file`),
  getParserPlpFiles: (parserCode: string) =>
    api.get<{ data: ParserPlpFileOption[] }>(
      `/api/admin/parsing/parsers/${encodeURIComponent(parserCode)}/plp-files`,
    ),
  getPlpFiles: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<PlpFileInfo, PaginationMeta>>(
      `/api/admin/parsing/plp-files?page=${page}&limit=${limit}`,
    ),
  getPlpFileContent: (parserCode: string, fileKey: string) =>
    api.get<ParserRunCurrentPlpFile>(
      `/api/admin/parsing/parsers/${encodeURIComponent(parserCode)}/plp-files/${encodeURIComponent(fileKey)}`,
    ),
  downloadPlpFile: (parserCode: string, fileKey: string) =>
    api.get<Blob>(
      `/api/admin/parsing/parsers/${encodeURIComponent(parserCode)}/plp-files/${encodeURIComponent(fileKey)}/download`,
      {
        responseType: 'blob',
      },
    ),
  deletePlpFile: (parserCode: string, fileKey: string) =>
    api.delete<{ ok: boolean }>(
      `/api/admin/parsing/parsers/${encodeURIComponent(parserCode)}/plp-files/${encodeURIComponent(fileKey)}`,
    ),
  createPlpRun: (body: CreatePlpRunPayload) =>
    api.post<ParserRun>('/api/admin/parsing/plp-runs', body),
  createPdpRun: (body: CreatePdpRunPayload) =>
    api.post<ParserRun>('/api/admin/parsing/pdp-runs', body),
  cancelRun: (id: string) => api.post<ParserRun>(`/api/admin/parsing/runs/${id}/cancel`, {}),
  getSchedules: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<ParserSchedule, PaginationMeta>>(
      `/api/admin/parsing/schedules?page=${page}&limit=${limit}`,
    ),
  createSchedule: (body: CreateParserSchedulePayload) =>
    api.post<ParserSchedule>('/api/admin/parsing/schedules', body),
  updateSchedule: (id: string, body: UpdateParserSchedulePayload) =>
    api.patch<ParserSchedule>(`/api/admin/parsing/schedules/${id}`, body),
  setScheduleStatus: (id: string, status: 'active' | 'deactivated') =>
    api.patch<ParserSchedule>(`/api/admin/parsing/schedules/${id}/status`, { status }),
  deleteSchedule: (id: string) => api.delete<{ ok: boolean }>(`/api/admin/parsing/schedules/${id}`),
  runScheduleNow: (id: string) =>
    api.post<{ runId: string | null }>(`/api/admin/parsing/schedules/${id}/run-now`, {}),
  getRegistrySyncHint: (parserCode: string, fileKey: string) =>
    api.get<{
      login: string | null;
      suggestedAssignedUserId: string | null;
      plpLoginMatchesFileKey: boolean;
    }>(
      `/api/admin/parsing/parsers/${encodeURIComponent(parserCode)}/plp-files/${encodeURIComponent(fileKey)}/sync-hint`,
    ),
  createRegistrySyncRun: (parserCode: string, fileKey: string, body: { assignedUserId?: string }) =>
    api.post<ParserRun>(
      `/api/admin/parsing/parsers/${encodeURIComponent(parserCode)}/plp-files/${encodeURIComponent(fileKey)}/sync-runs`,
      body,
    ),
};
