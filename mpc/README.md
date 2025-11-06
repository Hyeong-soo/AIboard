# MPC Signature Service

Node.js service that restores an Ed25519 private key from Shamir secret shares using `sssui_wasm`, hashes the provided message, and returns a detached signature alongside metadata.

## Requirements

- Node.js 18+
- `--experimental-wasm-modules` flag (already included in npm scripts)

## Setup

```bash
cd mpc
npm install
```

## Running

```bash
npm start
```

The service listens on `PORT` (defaults to `4000`).

### Health Check

```
GET /health
```

Returns:

```json
{ "status": "ok", "timestamp": "..." }
```

### Combine & Sign

```
POST /api/v1/sss/sign
Content-Type: application/json
```

Example payload:

```json
{
  "message": "hello SSS world",
  "threshold": 3,
  "shares": [
    [1, "share1"],
    [2, "share2"],
    [3, "share3"]
  ]
}
```

> ⚠️ The shape of each share must match the output of `sssui_wasm.split_ed25519`. The service forwards the provided share objects directly into `sssui_wasm.combine_ed25519`.

Successful response:

```json
{
  "message": "hello SSS world",
  "hash": "0c30c8320d0f...",
  "signature": "y/jM+...",
  "publicKey": "2J4V...",
  "shareCount": 3,
  "threshold": 3
}
```

### Error Handling

- 400 – validation errors (missing fields, insufficient shares, malformed payload)
- 500 – unexpected server errors

### Verify Signature

```
POST /api/v1/sss/verify
Content-Type: application/json
```

Example payload:

```json
{
  "message": "hello SSS world",
  "signature": "y/jM+...",
  "publicKey": "2J4V..."
}
```

Response:

```json
{
  "message": "hello SSS world",
  "valid": true,
  "evaluatedAt": "2025-11-06T05:12:02.123Z"
}
```

## Development

```bash
npm run dev  # restarts on changes
```

## Notes

- Secrets and shares are processed in-memory only; no logging occurs for their raw values.
- Consider adding authentication, rate limiting, and HTTPS termination before using in production.
