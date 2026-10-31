# Heirloom Frontend

Heirloom is an offline family-archive web application built with React, TypeScript, and Tailwind CSS. All processing runs locally on your machine with no external network requests.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

Install frontend dependencies:

```bash
cd frontend
npm install
```

### Running Locally

Start the Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

Compile TypeScript and build the optimized production assets:

```bash
npm run build
```

Production output is generated in `frontend/dist/`. The bundle uses relative paths (`/api` and `/media`) for seamless hosting and offline usage.

## Configuration & Mock Mode

### Mock Switch (`VITE_USE_MOCK`)

Heirloom includes a comprehensive local mock layer that simulates the backend API and Ollama engine in the browser:

- When `VITE_USE_MOCK=true` (default): all API requests are served from in-memory and `localStorage` mock fixtures. No backend or Ollama server is required.
- When `VITE_USE_MOCK=false`: API requests are routed through `/api` and `/media` to the local backend service (proxied to `http://localhost:8000` in dev).

You can toggle this in your environment or `.env.local`:

```bash
VITE_USE_MOCK=false npm run dev
```

### Error Simulation Query Parameter (`?mock=...`)

When running in mock mode, you can simulate backend error states by adding the `mock` URL query parameter:

- `?mock=ollama_not_running`  
  Simulates Ollama local service being offline. Triggers the "The model is not running" error card and status indicator.
- `?mock=model_not_installed`  
  Simulates a requested model not being pulled locally. Displays the `model_not_installed` warning card with an `ollama pull <model>` command and Copy button.
- `?mock=model_failed`  
  Simulates engine transcription or translation failure on a page. Displays the "The model could not read this page" error card with retry options.

Example: `http://localhost:5173/#/settings?mock=ollama_not_running`

## Offline Verification

Heirloom is designed to operate completely offline without internet connectivity. To verify that no disallowed external URLs or third-party assets are referenced in the source code or production bundles:

```bash
npm run check:offline
```

This script scans `index.html`, `src/`, and `dist/` to ensure no remote URLs (other than localhost and SVG namespace) exist.
