# PromptTune Chrome Extension (WXT + React)

MV3 extension built with **WXT**, **React**, **TypeScript**, and **webextension-polyfill**.

## Features

- Popup + Side Panel UI with tabs: **Improve** / **Library**
- Improve flow: calls `POST /v1/improve`, shows loading spinner + skeleton UI
- Local prompt library (via `storage.local`): save, list, search, copy, delete
- Rate-limit badge in the header based on `GET /v1/limits`
- Error states: rate-limit, network, auth/invalid installation, backend validation
- Popup/Side Panel switch (bonus): preserves draft state via `storage.local`

## Backend contract (assumed)

`VITE_API_BASE_URL` defaults to `http://localhost:8000`

- `GET  /v1/limits?installation_id=...`
- `POST /v1/improve`
- `POST /v1/prompts`

See `src/shared/apiContract.ts` for the request/response types.

## Setup

1. Install deps:
   ```bash
   npm install
   ```
2. Ensure backend is running on:
   ```bash
   http://localhost:8000
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```
4. Production build:
   ```bash
   npm run build
   ```
5. Tests:
   ```bash
   npm run test
   ```
6. Typecheck:
   ```bash
   npm run lint
   ```

## Architecture notes

- Entry points:
  - `entrypoints/popup/*` and `entrypoints/sidepanel/*` render the same `PromptTuneApp`
  - `entrypoints/background/*` handles UI mode switching behaviour
- Shared/core logic:
  - `src/shared/apiClient.ts` (typed API calls + error mapping)
  - `src/shared/installation.ts` (generates/stores `installation_id`)
  - `src/shared/promptLibraryStorage.ts` (local library in `storage.local`)
  - `src/shared/rateLimit.ts` (badge thresholds + formatting)
- UI:
  - `src/ui/PromptTuneApp.tsx` ties everything together and renders error/loading/library UI

## Storage keys

- `installation_id`: generated once per extension install
- `prompt_library_v1`: last up to 200 prompt pairs
- `pt_draft_v1`: draft state (tab + text) to preserve popup <-> side panel switching

