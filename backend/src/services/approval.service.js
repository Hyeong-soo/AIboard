const { performance } = require('node:perf_hooks');
const { llmServices } = require('../config/llm');
const { llmRequestTimeoutMs } = require('../config/env');
const { fetchWithTimeout, readResponseBody } = require('../utils/http');

const requestApprovals = async (text) => {
  if (!llmServices.length) {
    const error = new Error('No LLM services configured');
    error.code = 'NO_LLM_SERVICES';
    throw error;
  }

  const tasks = llmServices.map(async (service) => {
    const startedAt = performance.now();
    const timeoutMs = Number.isFinite(service.timeoutMs)
      ? service.timeoutMs
      : llmRequestTimeoutMs;
    console.log('[approval-service] Sending request', {
      service: service.name,
      url: service.url,
      timeoutMs,
    });

    try {
      const response = await fetchWithTimeout(service.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfText: text }),
        timeoutMs,
      });

      const payload = await readResponseBody(response);

      if (!response.ok) {
        const errorMessage =
          typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);

        throw new Error(
          `Service ${service.name} responded with status ${response.status}: ${errorMessage}`,
        );
      }

      const successResult = {
        name: service.name,
        success: true,
        status: response.status,
        data: payload,
        durationMs: Math.round(performance.now() - startedAt),
      };

      console.log('[approval-service] Received successful response', successResult);
      return successResult;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      const isAbortError = error.name === 'AbortError';
      const message = isAbortError
        ? `Request to ${service.name} timed out after ${timeoutMs}ms`
        : error.message;

      const failureResult = {
        name: service.name,
        success: false,
        error: message,
        durationMs,
      };

      console.warn('[approval-service] Request failed', failureResult);
      return failureResult;
    }
  });

  return Promise.all(tasks);
};

module.exports = {
  requestApprovals,
};
