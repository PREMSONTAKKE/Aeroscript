const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchWithAuth(url, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const brushPresetsApi = {
  create: async (token, preset) => {
    return fetchWithAuth('/api/brush-presets', {
      method: 'POST',
      body: JSON.stringify(preset),
    }, token);
  },

  getAll: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`/api/brush-presets${query ? `?${query}` : ''}`, {}, token);
  },

  getById: async (token, id) => {
    return fetchWithAuth(`/api/brush-presets/${id}`, {}, token);
  },

  update: async (token, id, updates) => {
    return fetchWithAuth(`/api/brush-presets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, token);
  },

  delete: async (token, id) => {
    return fetchWithAuth(`/api/brush-presets/${id}`, {
      method: 'DELETE',
    }, token);
  },

  use: async (token, id) => {
    return fetchWithAuth(`/api/brush-presets/${id}/use`, {
      method: 'POST',
    }, token);
  },

  getStylePresets: async () => {
    return fetchWithAuth('/api/brush-presets/styles', {});
  },
};

export const profileApi = {
  async get(token) {
    return fetchWithAuth('/api/profile', {}, token);
  },

  async update(token, profileData) {
    return fetchWithAuth('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }, token);
  },

  async updatePreferences(token, preferences) {
    return fetchWithAuth('/api/profile/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    }, token);
  },

  async getAnalyticsSummary(token, period = 'week') {
    return fetchWithAuth(`/api/profile/analytics/summary?period=${period}`, {}, token);
  },

  async getDrawingStats(token) {
    return fetchWithAuth('/api/profile/analytics/drawings', {}, token);
  },

  async getInkUsage(token) {
    return fetchWithAuth('/api/profile/analytics/ink-usage', {}, token);
  },
};

export const shareApi = {
  generateLinks: async (token, data) => {
    return fetchWithAuth('/api/share/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  },

  getPublic: async (shareId) => {
    return fetchWithAuth(`/api/share/${shareId}`, {});
  },

  recordShare: async (token, shareId, platform) => {
    return fetchWithAuth(`/api/share/${shareId}/track`, {
      method: 'POST',
      body: JSON.stringify({ platform }),
    }, token);
  },
};

export default {
  brushPresetsApi,
  profileApi,
  shareApi,
};