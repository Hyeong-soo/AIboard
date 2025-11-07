import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { z } from 'zod';
import {
  combineShares,
  hashMessage,
  signMessage,
  verifyDetachedSignature,
} from './sssService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const resolveEnvCandidates = () => {
  if (process.env.ENV_FILE) {
    return [process.env.ENV_FILE, '.env'];
  }
  const defaultFile = process.env.NODE_ENV === 'production' ? '.env.docker' : '.env.dev';
  return [defaultFile, '.env'];
};

const applyEnvFile = (filePath) => {
  const contents = fs.readFileSync(filePath, 'utf8');
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const normalized = trimmed.startsWith('export ') ? trimmed.slice(7) : trimmed;
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex === -1) {
      return;
    }
    const key = normalized.slice(0, separatorIndex).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
      return;
    }
    const rawValue = normalized.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  });
};

const envCandidates = Array.from(new Set(resolveEnvCandidates().filter(Boolean)));
const loadedEnvFile = envCandidates.find((candidate) => {
  const filePath = path.isAbsolute(candidate)
    ? candidate
    : path.resolve(projectRoot, candidate);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  applyEnvFile(filePath);
  return true;
});

if (!loadedEnvFile && process.env.NODE_ENV !== 'production') {
  console.warn(
    `[env] MPC service could not find an env file. Checked: ${envCandidates
      .map((candidate) =>
        path.isAbsolute(candidate) ? candidate : path.resolve(projectRoot, candidate),
      )
      .join(', ')}`,
  );
}

const PORT = Number(process.env.PORT) || 4000;

const shareRequestSchema = z.object({
  message: z.string().min(1, 'message must not be empty'),
  threshold: z.number().int().min(1, 'threshold must be at least 1'),
  shares: z.array(z.any()).min(1, 'shares must contain at least one entry'),
});

const verifyRequestSchema = z.object({
  message: z.string().min(1, 'message must not be empty'),
  signature: z.string().min(1, 'signature must not be empty'),
  publicKey: z.string().min(1, 'publicKey must not be empty'),
});
const unwrapShares = (shares) => {
  let current = shares;
  while (
    Array.isArray(current) &&
    current.length === 1 &&
    Array.isArray(current[0]) &&
    !(current[0] && typeof current[0] === 'object' && ('x' in current[0] || 'y' in current[0]))
  ) {
    current = current[0];
  }
  return current;
};

const app = express();

app.use(
  express.json({
    limit: '1mb',
  }),
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/v1/sss/sign', async (req, res) => {
  try {
    const { message, shares, threshold } = shareRequestSchema.parse(req.body);
    const normalizedShares = unwrapShares(shares);

    if (!Array.isArray(normalizedShares) || normalizedShares.length < threshold) {
      return res.status(400).json({
        message: 'Insufficient number of shares provided',
        details: `Received ${Array.isArray(normalizedShares) ? normalizedShares.length : 0} shares but threshold requires ${threshold}`,
      });
    }

    const seed = combineShares(normalizedShares, threshold);
    const messageHash = hashMessage(message);
    const { signature, publicKey } = signMessage(message, seed);

    return res.json({
      message,
      hash: messageHash,
      signature: signature.toString('base64'),
      publicKey: publicKey.toString('base64'),
      shareCount: shares.length,
      threshold,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid request payload',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    console.error('[api] Failed to process sign request', error);
    return res.status(500).json({ message: 'Failed to process shares' });
  }
});

app.post('/api/v1/sss/verify', async (req, res) => {
  try {
    const { message, signature, publicKey } = verifyRequestSchema.parse(req.body);
    const valid = verifyDetachedSignature({ message, signature, publicKey });

    return res.json({
      message,
      valid,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid request payload',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    console.error('[api] Failed to verify signature', error);
    return res.status(500).json({ message: 'Failed to verify signature' });
  }
});

app.use((err, req, res, _next) => {
  console.error('[server] Unhandled error', err);
  res.status(500).json({ message: 'Unexpected server error' });
});

app.listen(PORT, () => {
  console.log(`[server] MPC signature service running on port ${PORT}`);
});
