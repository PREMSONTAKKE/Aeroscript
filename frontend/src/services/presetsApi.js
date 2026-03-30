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
    return fetchWithAuth('/api/brush-presets/styles/presets', {});
  },
};

export const profileApi = {
  get: async (token) => {
    return fetchWithAuth('/api/profile', {}, token);
  },

  update: async (token, profile) => {
    return fetchWithAuth('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }, token);
  },

  updatePreferences: async (token, preferences) => {
    return fetchWithAuth('/api/profile/preferences', {
      method: 'POST',
      body: JSON.stringify({ preferences }),
    }, token);
  },

  recordAnalytics: async (token, analytics) => {
    return fetchWithAuth('/api/profile/analytics', {
      method: 'POST',
      body: JSON.stringify(analytics),
    }, token);
  },

  getAnalyticsSummary: async (token, period = 'week') => {
    return fetchWithAuth(`/api/profile/analytics/summary?period=${period}`, {}, token);
  },

  getHistory: async (token, limit = 30) => {
    return fetchWithAuth(`/api/profile/history?limit=${limit}`, {}, token);
  },
};

export const shareApi = {
  generateLinks: async (token, { artworkData, thumbnail, title, platform }) => {
    return fetchWithAuth('/api/share/share', {
      method: 'POST',
      body: JSON.stringify({ artworkData, thumbnail, title, platform }),
    }, token);
  },

  download: (token, artwork, format = 'png') => {
    const url = `${API_URL}/api/share/download?artwork=${encodeURIComponent(artwork)}&format=${format}`;
    return fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  export: async (token, data) => {
    const response = await fetchWithAuth('/api/share/export', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
    return response;
  },
};
