# HANDOFF.md — OpenClaw Model Load Optimizer

## Last Updated: 2026-04-16
## Project Status: 🟡 Code complete, awaiting P100 deployment

## Context

Two OpenClaw plugins (`model-load-optimizer` + `usage-limiter`) that together do local-first agent routing with budget enforcement. Code was written Feb 2026, dashboard screenshots captured, then set aside. Matt is now redeploying OpenClaw on kokonoe with 2x Tesla P100 (32GB total VRAM) and this plugin pair is the routing layer for that stack.

## What Exists Today

### `model-load-optimizer/`
- `src/` — 25 TypeScript files, 54 symbols (per DocSync's `docs/ARCHITECTURE.md`)
- Working: GPU detection (nvidia-smi), Ollama client, router decision tree, hooks (before-agent-start, agent-end), gateway methods (status/route/refresh), dashboard handler
- Manifest: `openclaw.plugin.json` — nine config knobs, schema-validated
- `dist/` built

### `usage-limiter/`
- `src/` — SQLite-backed usage tracking with `better-sqlite3`
- Working: period aggregation (daily/weekly/monthly), manual-reset tracking, timezone-aware period starts, budget checks, auto-downgrade, CLI, dashboard
- `dist/` built

### Screenshots (at repo root)
- `dashboard-clean.png`, `dashboard-live.png`, `dashboard-live-data.png`, `dashboard-with-tour.png`, `login-page.png`, `wizard-complete.png` — from the Feb 2026 dev session

### Stray files (cleanup candidates)
- `nul` — empty, probably Windows `> nul` typo, delete
- `kalshi-weather-traderscriptspnl-analysis.js` — unrelated, belongs elsewhere or delete
- `.playwright-mcp/` — leftover from Playwright MCP session

## Phased Deployment Plan

### Phase 1: Local build + unit verification (no hardware required)
**Goal:** Both plugins compile cleanly, type-check, and pass smoke tests before the P100s land.

- [ ] `cd model-load-optimizer && npm install && npm run build` — fix any tsc errors from bit-rot
- [ ] `cd usage-limiter && npm install && npm run build` — same
- [ ] Audit `dist/` vs `src/` freshness; rebuild both
- [ ] Run `model-load-optimizer/src/gpu-detect.ts` directly via a temp test harness — confirm it reports the *current* 3070 Ti correctly as a baseline
- [ ] Write minimal smoke tests (if none exist) for `router.ts` decision tree using mocked `OllamaClient` + mocked GPU state
- [ ] Write smoke tests for `usage-limiter/limits.ts` — seed SQLite with known usage, assert `checkAllBudgets` returns expected `ok`/`warn`/`blocked`

### Phase 2: P100 hardware bring-up
**Goal:** Both P100s visible to `nvidia-smi`, driver installed, Ollama seeing combined VRAM.

- [ ] Physical install + verify both cards enumerate (`nvidia-smi` shows 2x P100)
- [ ] Pascal-specific Ollama config:
  ```
  OLLAMA_FLASH_ATTENTION=0
  OLLAMA_NUM_PARALLEL=2
  ```
- [ ] Pull target models:
  ```
  ollama pull qwen2.5-coder:32b-instruct-q5_K_M   # primary (~23GB)
  ollama pull qwen2.5-coder:7b-instruct-q4_K_M    # sidecar (~4GB)
  ```
- [ ] Verify tensor split across both cards (check `nvidia-smi` during load)
- [ ] Benchmark primary cold-start, warm-call latency, tokens/sec at 4K / 16K / 32K context

### Phase 3: OpenClaw plugin install
**Goal:** Both plugins loaded by OpenClaw, manifests validated, dashboards reachable.

- [ ] Drop `model-load-optimizer/dist/` + `openclaw.plugin.json` into OpenClaw's plugin dir
- [ ] Drop `usage-limiter/dist/` + `openclaw.plugin.json` into OpenClaw's plugin dir
- [ ] Configure `model-load-optimizer`:
  - `primaryModel`: `qwen2.5-coder:32b-instruct-q5_K_M`
  - `sidecarModel`: `qwen2.5-coder:7b-instruct-q4_K_M`
  - `fallbackModel`: `anthropic/claude-sonnet-4-5`
  - `gpuMemoryThreshold`: `0.85`
  - `preloadOnStart`: `true`
- [ ] Configure `usage-limiter` with starting budgets (propose: `$10/day`, `$50/week`, `$150/month` cost caps on remote fallback only — local is free)
- [ ] Hit `/plugins/model-load-optimizer/dashboard` — confirm live GPU metrics, model status
- [ ] Hit `/plugins/usage-limiter/dashboard` — confirm period aggregates render

### Phase 4: Integration test with real agent traffic
**Goal:** Watch the router make real decisions, verify the sidecar path works, confirm the remote fallback triggers correctly.

- [ ] Fire a batch of short "simple" requests — expect the sidecar to handle them (`isSimpleRequest` = true)
- [ ] Fire a batch of long/complex requests — expect the primary to handle them
- [ ] Saturate the GPU manually (load a second heavy model) — expect the router to switch to sidecar
- [ ] Stop Ollama entirely — expect remote fallback
- [ ] Exercise `usage-limiter` by lowering a period limit and watching the warn → block transition
- [ ] Test `autoDowngrade`: set `fallbackModel`, trip the warn threshold, confirm requests route to the cheaper model

### Phase 5: Polish + production hardening
- [ ] Clean up the garbage in `model-load-optimizer/README.md` and `usage-limiter/README.md` (DocSync left 100 `---` separators and a random PayPal link)
- [ ] Fill in the `docs/ARCHITECTURE.md` TODOs for both plugins
- [ ] Delete stray files at repo root (`nul`, the kalshi JS file, `.playwright-mcp/`)
- [ ] Add `.gitignore` (`node_modules/`, `dist/`, `*.db`, `*.db-wal`)
- [ ] Commit — repo has no git history yet
- [ ] Tag `v1.0.0` after Phase 4 passes

## Pascal-Specific Gotchas

- **No FlashAttention on compute < 7.0.** P100 is compute 6.0. Must set `OLLAMA_FLASH_ATTENTION=0`. The optimizer doesn't currently detect this — consider adding a compute-capability check in `gpu-detect.ts` if you want it to auto-warn.
- **No tensor cores.** FP16 throughput is decent, INT8 via tensor cores is unavailable. Q5_K_M / Q4_K_M K-quants are the sweet spot; avoid Q8_0 (slow) and FP16 full-precision (VRAM-bound).
- **Tensor split** between the two cards is handled by Ollama automatically, but verify with `nvidia-smi` during a generation that both cards are active.
- **PCIe bandwidth.** P100s communicate over PCIe (no NVLink on most boards). Large tensor splits can be bandwidth-limited. If you see low utilization, that's why.

## Cross-Links

- OpenClaw core (Matt's role: deployer/operator, not creator) — see global CLAUDE.md
- Wraith: different MCP, different repo, unrelated — don't confuse
- `scratch/` note in this session's transcript: Qwen 2.5-Coder 32B Q5_K_M recommended as top pick with ~8GB headroom on 32GB

## Blocking Issues

- P100 hardware not yet installed
- No git history on the repo (first commit pending)
- Stub READMEs in both subpackages are auto-gen garbage

## What's Next (in priority order)

1. Phase 1 (build verification) — can do today, no hardware needed
2. Write actual tests for `router.ts` + `limits.ts` (the code has zero test coverage)
3. Git init + clean commit of existing state
4. Wait for P100 install, then Phase 2–4
5. Consider adding compute-capability detection to `gpu-detect.ts` for the Pascal warning
