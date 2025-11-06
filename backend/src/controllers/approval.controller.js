const fs = require('fs');
const path = require('path');
const { requestApprovals } = require('../services/approval.service');
const { requestSignature } = require('../services/mpc.service');
const decisionRepository = require('../repositories/decision.repository');
const { mpcThreshold: configuredMpcThreshold } = require('../config/env');

const decodeEncodedWord = (value) => {
  const match = value.match(/^=\?([^?]+)\?([bBqQ])\?([^?]+)\?=$/);
  if (!match) return null;
  const [, , encoding, encodedText] = match;
  if (encoding.toUpperCase() === 'B') {
    try {
      return Buffer.from(encodedText, 'base64').toString('utf8');
    } catch (error) {
      return null;
    }
  }

  if (encoding.toUpperCase() === 'Q') {
    try {
      const text = encodedText.replace(/_/g, ' ').replace(/=([A-Fa-f0-9]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
      return text;
    } catch (error) {
      return null;
    }
  }

  return null;
};

const decodeHeaderValue = (value) => {
  if (typeof value !== 'string') return null;
  let trimmed = value.trim().replace(/\r?\n/g, ' ');

  trimmed = trimmed.replace(/^(subject|from):\s*/i, '');

  trimmed = trimmed.replace(/=\?[^?]+\?[bBqQ]\?[^?]+\?=/g, (token) => {
    const decoded = decodeEncodedWord(token);
    return decoded ?? token;
  });

  trimmed = trimmed.replace(/\s{2,}/g, ' ').trim();

  return trimmed.length > 0 ? trimmed : null;
};

const normalizeString = (value) => {
  const decoded = decodeHeaderValue(value);
  if (decoded !== null) return decoded;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeName = (value) => {
  const decoded = decodeHeaderValue(value);
  if (!decoded) return null;
  const angleMatch = decoded.match(/^(.*?)(<[^>]+>)$/);
  if (angleMatch) {
    const namePart = angleMatch[1].trim();
    const emailPart = angleMatch[2].replace(/[<>]/g, '').trim();
    return namePart.length > 0 ? namePart : emailPart;
  }
  return decoded;
};

const normalizeSubject = (value) => decodeHeaderValue(value);

const normalizeMetadata = (metadata = {}, fallbackSummary) => {
  const now = new Date();
  const reference =
    metadata.reference ||
    `RB-${now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.floor(
      Math.random() * 900 + 100,
    )}`;

  const submittedAtRaw = metadata.submittedAt ? new Date(metadata.submittedAt) : now;
  const submittedAt = Number.isNaN(submittedAtRaw.getTime()) ? now : submittedAtRaw;

  const normalizedSubject =
    normalizeSubject(metadata.subject) || normalizeString(metadata.title);
  const normalizedName =
    normalizeName(metadata.name) ||
    normalizeString(metadata.from) ||
    normalizeString(metadata.requester);

  return {
    reference,
    title:
      normalizedSubject ||
      normalizeString(metadata.title) ||
      (fallbackSummary.length > 200 ? `${fallbackSummary.slice(0, 197)}...` : fallbackSummary) ||
      `요청 ${reference}`,
    requester: normalizedName || normalizeString(metadata.requester) || '신청자 미상',
    submittedAt,
    summary:
      metadata.summary ||
      (fallbackSummary.length > 200
        ? `${fallbackSummary.slice(0, 197)}...`
        : fallbackSummary),
  };
};

const determineFinalDecision = (approvals) => {
  const approveCount = approvals.filter((item) => item.decision === 'APPROVE').length;
  const rejectCount = approvals.filter((item) => item.decision === 'REJECT').length;

  if (approveCount === 0 && rejectCount === 0) {
    return 'REJECT';
  }

  if (approveCount > rejectCount) {
    return 'APPROVE';
  }

  if (rejectCount > approveCount) {
    return 'REJECT';
  }

  return 'REJECT';
};

const prepareApprovalForPersistence = (approval) => {
  if (approval.success) {
    const decision = (approval.data?.decision || 'PENDING').toUpperCase();
    const share =
      decision === 'APPROVE' &&
      approval.data?.share &&
      typeof approval.data.share === 'object' &&
      approval.data.share !== null
        ? {
            x: String(approval.data.share.x ?? '').trim(),
            y: String(approval.data.share.y ?? '').trim(),
          }
        : null;
    if (share && (!share.x || !share.y)) {
      share.x = share.x || null;
      share.y = share.y || null;
    }
    return {
      llmName: approval.name,
      decision: decision === 'APPROVE' || decision === 'REJECT' ? decision : 'PENDING',
      confidence:
        typeof approval.data?.confidence === 'number' ? approval.data.confidence : null,
      summary:
        approval.data?.summary ||
        `LLM responded with status ${approval.status ?? '200'}.`,
      issues: Array.isArray(approval.data?.issues) ? approval.data.issues : [],
      durationMs: approval.durationMs,
      share:
        share && share.x && share.y
          ? { x: share.x, y: share.y }
          : null,
    };
  }

  return {
    llmName: approval.name,
    decision: 'PENDING',
    confidence: null,
    summary: approval.error || 'LLM request failed',
    issues: approval.error ? [approval.error] : [],
    durationMs: approval.durationMs,
    share: null,
  };
};

const approve = async (req, res, next) => {
  let textCandidate;
  let originalMetadata;
  try {
    const { pdfText, body, metadata, subject, name, requester, title } = req.body || {};
    originalMetadata = metadata;
    textCandidate = typeof pdfText === 'string' ? pdfText : body;

    if (typeof textCandidate !== 'string' || textCandidate.trim().length === 0) {
      return res
        .status(400)
        .json({ message: 'pdfText must be provided as a non-empty string' });
    }

    const preview = textCandidate.slice(0, 100);
    console.log('[approval] Received approve request', {
      preview,
      length: textCandidate.length,
    });

    const metadataInput = { ...(metadata || {}) };
    if (subject !== undefined) metadataInput.subject = subject;
    if (name !== undefined) metadataInput.name = name;
    if (title !== undefined) metadataInput.title = title;
    if (requester !== undefined) metadataInput.requester = requester;

    const normalized = normalizeMetadata(metadataInput, textCandidate);

    console.log('[approval] Dispatching approval requests to LLM services');
    const approvalResults = await requestApprovals(textCandidate);
    console.log('[approval] Approval responses collected', { approvalResults });

    const approvalsForDb = approvalResults.map(prepareApprovalForPersistence);
    const decision = determineFinalDecision(approvalsForDb);

    const sharesForMpc = approvalsForDb
      .filter(
        (approval) =>
          approval.decision === 'APPROVE' &&
          approval.share &&
          approval.share.x &&
          approval.share.y,
      )
      .map((approval) => [approval.share.x, approval.share.y]);

    let signaturePayload = null;
    let signatureError = null;

    const configuredThreshold =
      Number.isFinite(configuredMpcThreshold) && configuredMpcThreshold > 0
        ? configuredMpcThreshold
        : 0;
    const effectiveThreshold =
      configuredThreshold > 0 ? configuredThreshold : sharesForMpc.length;

    if (sharesForMpc.length > 0 && effectiveThreshold > 0) {
      if (sharesForMpc.length >= effectiveThreshold) {
        try {
          signaturePayload = await requestSignature({
            message: textCandidate,
            shares: sharesForMpc,
            threshold: effectiveThreshold,
          });
        } catch (mpcError) {
          console.error('[approval] MPC signature request failed', {
            message: mpcError.message,
          });
          signatureError = mpcError.message;
        }
      } else {
        signatureError = `Insufficient shares for MPC signature (have ${sharesForMpc.length}, need ${effectiveThreshold})`;
      }
    }

    const savedDecision = await decisionRepository.createDecision({
      reference: normalized.reference,
      title: normalized.title,
      requester: normalized.requester,
      submittedAt: normalized.submittedAt,
      summary: normalized.summary,
      finalDecision: decision,
      approvals: approvalsForDb,
    });

    const sanitizedDecisionTask = {
      ...savedDecision,
      approvals: savedDecision.approvals.map(({ share: _share, ...rest }) => rest),
    };
    const responseApprovals = approvalsForDb.map(({ share: _share, ...rest }) => rest);

    return res.status(201).json({
      decision,
      decisionTask: sanitizedDecisionTask,
      approvals: responseApprovals,
      signature: signaturePayload,
      signatureError,
    });
  } catch (error) {
    const logEntry = `[${new Date().toISOString()}] approval error: ${
      error.message
    }\nStack: ${error.stack}\nRequest metadata: ${JSON.stringify(
      {
        pdfLength: typeof textCandidate === 'string' ? textCandidate.length : null,
        metadata: originalMetadata,
      },
      null,
      2,
    )}\n\n`;
    try {
      fs.appendFileSync(path.resolve(__dirname, '../../logs/approval-error.log'), logEntry);
    } catch (logError) {
      console.error('[approval] Failed to write error log', logError);
    }
    console.error('[approval] Error occurred', { message: error.message, stack: error.stack });
    if (error.code === 'NO_LLM_SERVICES') {
      return res.status(503).json({ message: 'No LLM services configured' });
    }

    return next(error);
  }
};

module.exports = {
  approve,
};
