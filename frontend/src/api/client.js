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
  const response = await fetch(path, {
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

  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return handleResponse(response);
};
