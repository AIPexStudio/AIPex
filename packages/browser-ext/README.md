# AIPex Browser Extension (`@aipexstudio/cool-aipex`)

Chrome/Chromium extension (Manifest V3) that assembles the AIPex packages:

- `@aipexstudio/aipex-core` (agent framework)
- `@aipexstudio/browser-runtime` (Chrome/extension runtime implementations)
- `@aipexstudio/aipex-react` (React UI)

Built with Vite + `@crxjs/vite-plugin`.

## What this extension does

- **Side panel**: runs the main AIPex chat UI
- **Content script**: provides an Omni command menu and page-side helpers (e.g. element capture, fake mouse)
- **Options page**: configure providers, models, and UI settings

## Architecture (MV3)

### Background service worker (`src/background.ts`)

- Opens the side panel when the extension action icon is clicked
- Handles keyboard commands (see `manifest.json` → `commands`)
- Relays element capture events and persists the latest event to `chrome.storage.local`

### Content script (`src/content.tsx` → `src/pages/content/`)

- Injects a React UI into the page context (using Shadow DOM + inline Tailwind CSS)
- Listens for messages such as `{ request: "open-aipex" }` (sent by the background command handler)
- Implements element capture mode and publishes results via `chrome.runtime.sendMessage`

### Side panel (`src/pages/sidepanel/`)

- Hosts the main chat experience
- Uses workspace packages directly during development via Vite aliases (see `vite.config.ts`)

### Options page (`src/pages/options/`)

- Uses `SettingsPage` from `@aipexstudio/aipex-react`
- Wraps i18n and theme providers (`@aipexstudio/aipex-react/i18n/context`, `@aipexstudio/aipex-react/theme/context`)
- Persists settings with `ChromeStorageAdapter` (`@aipexstudio/browser-runtime`)

## Development

From the repository root:

```bash
pnpm install
pnpm dev
```

Or run just this workspace:

```bash
pnpm --filter @aipexstudio/cool-aipex dev
```

### Load unpacked (dev)

- Open `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked**
- Select the Vite output directory (by default `packages/browser-ext/dist/`)
- Keep the dev server running for HMR

## Build

```bash
pnpm --filter @aipexstudio/cool-aipex build
```

Vite outputs to `dist/` by default (unless `build.outDir` is configured).
Load the built extension by selecting the build output directory in `chrome://extensions`.

## Project structure

- `manifest.json`: MV3 manifest
- `src/background.ts`: background/service worker entry
- `src/content.tsx`: content script entry
- `src/pages/sidepanel/`: side panel UI
- `src/pages/options/`: options page UI
- `src/pages/content/`: content UI entry

## Permissions

The extension requests powerful permissions for automation and context gathering.
See `manifest.json` for the full list (e.g. `tabs`, `scripting`, `storage`, `debugger`, `history`, `downloads`, ...).

## Testing

```bash
pnpm --filter @aipexstudio/cool-aipex test
```

## License

MIT (see repository root)
