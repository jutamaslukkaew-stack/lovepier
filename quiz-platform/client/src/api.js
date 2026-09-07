const API_URL = import.meta.env.VITE_API_URL;

export async function api(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}
