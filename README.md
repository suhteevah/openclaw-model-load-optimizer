# OpenClaw Model Load Optimizer (monorepo)

Two OpenClaw plugins that together form a local-first, budget-aware model-routing layer for OpenClaw agents. Built for running real workloads against local Ollama models (currently targeting a dual-P100 32GB setup on kokonoe) while still falling back to hosted APIs when the local side can't serve.

```
openclaw model load optimizer/
├── model-load-optimizer/   # Plugin 1: routes requests between primary / sidecar / remote
└── usage-limiter/          # Plugin 2: enforces token / cost / request budgets
```

## Plugin 1 — `model-load-optimizer`

**What it does:** Picks which Ollama model handles each request based on live GPU/VRAM load, model warm/cold state, and request complexity. Preloads the primary on startup; routes to a CPU sidecar when the GPU is saturated; falls back to a remote API (Anthropic/OpenAI) when Ollama is unreachable.

**Key modules (`src/`):**
- `gpu-detect.ts` — `nvidia-smi` / `rocm-smi` / macOS `system_profiler` probes for VRAM + utilization
- `ollama-client.ts` — `/api/tags`, `/api/ps`, keep-alive warm calls
- `router.ts` — the decision tree: primary loaded + GPU has headroom → primary; GPU over threshold or simple request → sidecar; nothing local → fallback
- `hooks/before-agent-start.ts` + `hooks/agent-end.ts` — OpenClaw plugin hooks
- `gateway/optimizer-methods.ts` — `status`, `route`, `refresh` gateway methods
- `web/dashboard.ts` — status dashboard served at `/plugins/model-load-optimizer/dashboard`

**Config knobs** (full schema in `model-load-optimizer/openclaw.plugin.json`):
- `primaryModel` — heavy model, GPU+RAM hybrid (e.g. `qwen2.5-coder:32b-instruct-q5_K_M`)
- `sidecarModel` — small CPU-only fast-path model (e.g. `deepseek-coder-v2:16b`)
- `fallbackModel` — remote model when local stack is down (e.g. `anthropic/claude-sonnet-4-5`)
- `gpuMemoryThreshold` (default `0.85`) — switch to sidecar when VRAM ratio exceeds this
- `keepAliveMinutes` — how long Ollama keeps models resident after last use
- `healthCheckIntervalSec` — poll interval for `nvidia-smi` + Ollama status
- `preloadOnStart`, `autoRoute`, `dashboardEnabled`

## Plugin 2 — `usage-limiter`

**What it does:** Tracks tokens / cost / requests per period (daily / weekly / monthly) against configurable budgets. Warns at 80%, blocks at 100%, optionally auto-downgrades to a cheaper model when approaching the warn line.

**Key modules (`src/`):**
- `db.ts` — SQLite (`better-sqlite3`) usage aggregation + manual-reset tracking
- `periods.ts` — period-start computation with IANA timezone support
- `limits.ts` — budget check across periods, emits `BudgetStatus[]`
- `downgrade.ts` — logic for swapping to the fallback model when over threshold
- `cli/usage-cli.ts` + `commands/usage-command.ts` — CLI surface
- `web/` — dashboard at `/plugins/usage-limiter/dashboard`

**Config knobs** (full schema in `usage-limiter/openclaw.plugin.json`):
- `limits.{daily,weekly,monthly}.{tokens,cost,requests}` — whatever combination you set is what gets enforced
- `warnThreshold` (default `0.8`), `blockThreshold` (default `1.0`)
- `timezone` — IANA zone for period boundaries
- `fallbackModel` — cheaper model when auto-downgrading
- `autoDowngrade` — whether to automatically swap at the warn threshold

## Why both plugins together

The optimizer decides *which model*. The limiter decides *whether to serve at all* and *which cheaper model to downgrade to*. They cover the two orthogonal axes of cost control: compute placement and compute quota.

## Build

Each plugin is an independent npm package. From its own directory:

```bash
npm install
npm run build     # tsc → dist/
# or
npm run dev       # tsc --watch
```

Both target ESM (`"type": "module"`), TypeScript 5.7, OpenClaw `>=2026.2.0`, Node 20+.

## Install into OpenClaw

Each plugin drops into OpenClaw's plugin directory as-is — the `openclaw.plugin.json` manifest + compiled `dist/index.js` are what OpenClaw loads.

## Target environment

kokonoe with 2x Tesla P100 (16GB each, 32GB total VRAM). Pascal — no tensor cores, no FlashAttention on compute < 7.0. Pair with:

```bash
OLLAMA_FLASH_ATTENTION=0   # Pascal doesn't support it
```

Recommended primary: `qwen2.5-coder:32b-instruct-q5_K_M` (~23GB, leaves ~8GB headroom for context). Recommended sidecar: `qwen2.5-coder:7b-instruct-q4_K_M` or `deepseek-coder-v2:16b` for the CPU-only fast path.

## Status

- Both plugins have compiled `dist/` builds and DocSync-generated architecture docs under each `docs/` dir.
- Plugin manifests, config schemas, hooks, gateway methods, dashboards are all wired.
- Awaiting the P100 hardware arrival for end-to-end deployment. See `HANDOFF.md` for the phased deployment plan.

## License

MIT on each subpackage.

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

## Support This Project

If you find this project useful, consider buying me a coffee! Your support helps me keep building and sharing open-source tools.

[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg?logo=paypal)](https://www.paypal.me/baal_hosting)

**PayPal:** [baal_hosting@live.com](https://paypal.me/baal_hosting)

Every donation, no matter how small, is greatly appreciated and motivates continued development. Thank you!
