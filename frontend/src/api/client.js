const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
console.log('API base URL:', import.meta.env.VITE_API_BASE_URL);

const isRelativeBase =
  API_BASE_URL && !/^https?:\/\//i.test(API_BASE_URL) && !API_BASE_URL.startsWith('//');

const normalizePath = (path) => {
  if (!path) {
    return '/';
  }

  let normalized = path.startsWith('/') ? path : `/${path}`;

  if (isRelativeBase) {
    const baseSegment = API_BASE_URL.toLowerCase();
    if (normalized.toLowerCase().startsWith(baseSegment)) {
      const stripped = normalized.slice(API_BASE_URL.length);
      normalized = stripped.startsWith('/') ? stripped : `/${stripped}`;
    }
  }

  return normalized;
};

const buildUrl = (path) => {
  if (!API_BASE_URL) {
    return path;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE_URL}${normalizePath(path)}`;
};

const buildHeaders = (headers = {}) => ({
  Accept: 'application/json',
  ...headers,
});

const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && payload.message
        ? payload.message
        : response.statusText || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const apiGet = async (path, options = {}) => {
  const response = await fetch(buildUrl(path), {
    method: 'GET',
    headers: buildHeaders(options.headers),
  });
  return handleResponse(response);
};

export const apiPost = async (path, body, options = {}) => {
  const headers = buildHeaders({
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  });

  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return handleResponse(response);
};
