import { API_BASE } from '../config/api';

const jsonHeaders = {
  'Content-Type': 'application/json'
};

const authHeaders = (token) => ({
  ...jsonHeaders,
  Authorization: `Bearer ${token}`
});

async function parseJson(response) {
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: `Unexpected response (${response.status})` };
  }

  if (!response.ok) {
    throw new Error(data.details || data.error || 'Request failed');
  }

  return data;
}

export async function fetchHistory(token, mode) {
  const url = new URL(`${API_BASE}/history`);
  if (mode) {
    url.searchParams.set('mode', mode);
  }

  const response = await fetch(url, {
    headers: authHeaders(token)
  });

  return parseJson(response);
}

export async function saveSession(token, payload) {
  const response = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });

  return parseJson(response);
}

export async function updateSession(token, id, payload) {
  const response = await fetch(`${API_BASE}/sessions/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });

  return parseJson(response);
}

export async function deleteSession(token, id) {
  const response = await fetch(`${API_BASE}/sessions/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });

  return parseJson(response);
}

