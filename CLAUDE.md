# CLAUDE.md — OpenClaw Model Load Optimizer

## Project shape

Monorepo with two sibling TypeScript OpenClaw plugins. Each is an independent npm package — no workspace glue, no shared lockfile. Build each one from its own directory.

```
openclaw model load optimizer/
├── model-load-optimizer/    # Ollama routing plugin
└── usage-limiter/           # Budget enforcement plugin
```

Read `HANDOFF.md` first for deployment state and phased rollout plan.

## Build

From either subpackage:
```bash
npm install
npm run build        # tsc → dist/
npm run dev          # tsc --watch
```

Both plugins:
- ESM (`"type": "module"`)
- TypeScript 5.7+
- Target: OpenClaw `>=2026.2.0`
- Node 20+

## Testing

There are currently **no tests** in either plugin. If you touch `router.ts` or `limits.ts`, write a smoke test first. Router tests should mock `OllamaClient` + GPU state and exercise the decision tree. Limiter tests should seed SQLite with known usage and assert `checkAllBudgets` output.

## Code conventions

- **Structural typing at plugin boundaries.** The plugin API surface uses structural types (see `PluginApi` in `model-load-optimizer/src/index.ts`) rather than importing concrete types from `openclaw`. Preserve this — it keeps the plugin loosely coupled.
- **Keep `gpu-detect.ts` cross-platform.** It handles Windows / Linux / macOS + NVIDIA / AMD / Apple Silicon. Don't introduce platform-specific code elsewhere — centralize it here.
- **Verbose logging.** Per global Matt preference. `logger.info` for every major decision in `router.ts`, `logger.debug` for every state transition. Never log token content (PII / cost leak).
- **SQLite schema lives in `db.ts`.** If you change it, add a migration — the DB is persistent across plugin restarts.
- **Decision branches get named reasons.** Every `router.ts` decision returns a `RouteDecision.reason` string. Keep these human-readable — they're what the dashboard displays.

## Common tasks

### Rebuilding both plugins
```bash
( cd "model-load-optimizer" && npm run build ) && ( cd "usage-limiter" && npm run build )
```

### Testing GPU detection standalone
```typescript
// Quick harness — not committed
import { detectGpus, getNvidiaVramUsage, getNvidiaGpuUtilization } from "./model-load-optimizer/src/gpu-detect.js";
console.log(detectGpus());
console.log(getNvidiaVramUsage());
console.log(getNvidiaGpuUtilization());
```

### Watching Ollama model status
```bash
curl -s http://localhost:11434/api/ps | jq
curl -s http://localhost:11434/api/tags | jq '.models[].name'
```

## Target hardware

kokonoe with 2x Tesla P100 (32GB total VRAM). Pascal constraints:
- `OLLAMA_FLASH_ATTENTION=0` is mandatory (compute 6.0, no FA support)
- No tensor cores — K-quants (Q5_K_M, Q4_K_M) are the sweet spot
- Primary model target: `qwen2.5-coder:32b-instruct-q5_K_M` (~23GB)
- Sidecar model target: `qwen2.5-coder:7b-instruct-q4_K_M` (~4GB)

## Things to avoid

- **Don't mix package managers** — both plugins use npm. Don't introduce pnpm/yarn.
- **Don't import across plugins.** They're independent. If they need to share code, either copy it or extract a third package.
- **Don't log token content** in either plugin, ever.
- **Don't hardcode nvidia-smi paths.** `tryExec` already handles PATH resolution; keep it that way.
- **Don't add GitHub Actions.** CI is banned on Matt's account — builds run locally.

## Cleanup debt (see HANDOFF.md Phase 5)

- Both subpackage READMEs are DocSync autogen garbage (100 `---` dividers + a random PayPal link) — replace with real ones
- Stray files at repo root: `nul` (empty), `kalshi-weather-traderscriptspnl-analysis.js` (belongs elsewhere), `.playwright-mcp/` (old MCP session)
- No `.gitignore` yet — add one (`node_modules/`, `dist/`, `*.db`, `*.db-wal`)
- No git history yet — first commit pending
