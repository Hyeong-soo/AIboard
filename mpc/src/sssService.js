import { init, combine_ed25519 } from 'sssui_wasm';
import nacl from 'tweetnacl';
import { createHash } from 'crypto';

let wasmInitialized = false;

const ensureWasm = () => {
  if (!wasmInitialized) {
    init();
    wasmInitialized = true;
  }
};

const isHexString = (value) => /^[0-9a-fA-F]+$/.test(value);

const stringToUint8Array = (value, label) => {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`);
  }

  const trimmed = value.replace(/^0x/i, '');
  if (trimmed.length > 0 && trimmed.length % 2 === 0 && isHexString(trimmed)) {
    return Uint8Array.from(Buffer.from(trimmed, 'hex'));
  }

  try {
    const decoded = Buffer.from(value, 'base64');
    if (decoded.length > 0) {
      return Uint8Array.from(decoded);
    }
  } catch (error) {
    // fallthrough
  }

  throw new Error(`${label} must be a hex or base64 string`);
};

const toLittleEndian = (bytes) => {
  const copy = Uint8Array.from(bytes);
  copy.reverse();
  return copy;
};

const toUint8Array = (value, label) => {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (Array.isArray(value)) {
    return Uint8Array.from(value);
  }

  throw new Error(`${label} must be a Uint8Array or an array of numbers`);
};

const normalizeShare = (share, index) => {
  if (share == null) {
    throw new Error(`Share at index ${index} is null or undefined`);
  }

  if (typeof share === 'object' && 'x' in share && 'y' in share) {
    const xRaw =
      typeof share.x === 'string'
        ? stringToUint8Array(share.x, `share[${index}].x`)
        : toUint8Array(share.x, `share[${index}].x`);
    const yRaw =
      typeof share.y === 'string'
        ? stringToUint8Array(share.y, `share[${index}].y`)
        : toUint8Array(share.y, `share[${index}].y`);
    const x = toLittleEndian(xRaw);
    const y = toLittleEndian(yRaw);
    return [Array.from(x), Array.from(y)];
  }

  if (Array.isArray(share) && share.length === 2) {
    const [xValue, yValue] = share;
    const xRaw =
      typeof xValue === 'string'
        ? stringToUint8Array(xValue, `share[${index}][0]`)
        : toUint8Array(xValue, `share[${index}][0]`);
    const yRaw =
      typeof yValue === 'string'
        ? stringToUint8Array(yValue, `share[${index}][1]`)
        : toUint8Array(yValue, `share[${index}][1]`);
    const x = toLittleEndian(xRaw);
    const y = toLittleEndian(yRaw);
    return [Array.from(x), Array.from(y)];
  }

  return share;
};

export const combineShares = (shares, threshold) => {
  ensureWasm();

  if (!Array.isArray(shares) || shares.length === 0) {
    throw new Error('shares must be a non-empty array');
  }

  const normalizedShares = shares.map((share, index) => normalizeShare(share, index));
  const secret = combine_ed25519(normalizedShares, threshold);
  const secretArray = toUint8Array(secret, 'Combined secret');

  if (secretArray.length !== 32) {
    throw new Error(
      `Combined secret must be 32 bytes for ed25519 but received length=${secretArray.length}`,
    );
  }

  return secretArray;
};

export const hashMessage = (message) =>
  createHash('sha256').update(message, 'utf8').digest('hex');

export const signMessage = (message, seed) => {
  const seedArray = toUint8Array(seed, 'Seed');
  if (seedArray.length !== 32) {
    throw new Error(`Seed must be 32 bytes for ed25519 but received length=${seedArray.length}`);
  }

  const { secretKey, publicKey } = nacl.sign.keyPair.fromSeed(seedArray);
  const encoder = new TextEncoder();
  const signature = nacl.sign.detached(encoder.encode(message), secretKey);

  return {
    signature: Buffer.from(signature),
    publicKey: Buffer.from(publicKey),
  };
};

export const verifyDetachedSignature = ({ message, signature, publicKey }) => {
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const signatureBytes =
    typeof signature === 'string'
      ? stringToUint8Array(signature, 'signature')
      : toUint8Array(signature, 'signature');
  const publicKeyBytes =
    typeof publicKey === 'string'
      ? stringToUint8Array(publicKey, 'publicKey')
      : toUint8Array(publicKey, 'publicKey');

  if (signatureBytes.length !== nacl.sign.signatureLength) {
    throw new Error(
      `Signature must be ${nacl.sign.signatureLength} bytes but received length=${signatureBytes.length}`,
    );
  }
  if (publicKeyBytes.length !== nacl.sign.publicKeyLength) {
    throw new Error(
      `Public key must be ${nacl.sign.publicKeyLength} bytes but received length=${publicKeyBytes.length}`,
    );
  }

  return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
};
