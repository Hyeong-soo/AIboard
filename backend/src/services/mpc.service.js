const { mpcServiceUrl, mpcRequestTimeoutMs } = require('../config/env');
const { fetchWithTimeout, readResponseBody } = require('../utils/http');

const requestSignature = async ({ message, shares, threshold }) => {
  if (!mpcServiceUrl) {
    const error = new Error('MPC service URL is not configured');
    error.code = 'MPC_NOT_CONFIGURED';
    throw error;
  }

  const payload = {
    message,
    shares,
    threshold,
  };

  const response = await fetchWithTimeout(mpcServiceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeoutMs: mpcRequestTimeoutMs,
  });

  const data = await readResponseBody(response);

  if (!response.ok) {
    const body =
      typeof data === 'string'
        ? data
        : data && typeof data === 'object'
        ? JSON.stringify(data)
        : '';
    const error = new Error(
      `MPC service responded with status ${response.status}${body ? `: ${body}` : ''}`,
    );
    error.statusCode = response.status;
    throw error;
  }

  return data;
};

module.exports = {
  requestSignature,
};
