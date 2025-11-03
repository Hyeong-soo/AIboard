import { apiGet, apiPost } from './client.js';

export const fetchLlmStatus = async () => {
  const result = await apiGet('/api/llms');
  return Array.isArray(result?.items) ? result.items : [];
};

export const fetchDecisionList = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);

  const search = query.toString();
  const result = await apiGet(`/api/decisions${search ? `?${search}` : ''}`);
  return {
    total: typeof result?.total === 'number' ? result.total : 0,
    items: Array.isArray(result?.items) ? result.items : [],
  };
};

export const fetchDecisionDetail = async (id) => apiGet(`/api/decisions/${id}`);

export const fetchManuals = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.taskType) query.set('taskType', params.taskType);
  if (params.llmName) query.set('llmName', params.llmName);
  if (params.withInactive) query.set('withInactive', params.withInactive ? 'true' : 'false');

  const search = query.toString();
  const result = await apiGet(`/api/manuals${search ? `?${search}` : ''}`);
  return Array.isArray(result?.items) ? result.items : [];
};

export const saveManual = async ({ taskType, llmName, content, version }) => {
  const payload = {
    taskType,
    llmName: llmName ?? null,
    content,
  };

  if (version) {
    payload.version = version;
  }

  return apiPost('/api/manuals', payload);
};
