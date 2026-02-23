# Deployment Guide

## Railway (recommended)

This repository includes a ready-to-use `Dockerfile` and `railway.json`.

### 1) Connect repo
- Create a Railway project or open existing one.
- Connect this repository/branch.

### 2) Configure environment variables
Set all required variables:
- `NODE_ENV=production`
- `PORT=3000`
- `VITE_APP_ID`
- `JWT_SECRET`
- `DATABASE_URL`
- `OAUTH_SERVER_URL`
- Optional: `OWNER_OPEN_ID`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`

### 3) Deploy
- Trigger deploy from Railway UI.
- Wait for healthcheck on `GET /healthz`.

### 4) Verify
- Open `<your-domain>/healthz` (expect `{ "ok": true }`).
- Open app root URL and login flow.

## Notes
- Build uses `pnpm build` (client + bundled Node server).
- Start command runs `pnpm start`.
