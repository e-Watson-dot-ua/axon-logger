# axon-logger

Lightweight structured logger for the Axon family. Zero dependencies.

## Project overview

- **Package**: `@e-watson/axon-logger`
- **Runtime**: Node.js >= 18, ESM-only
- **Zero runtime dependencies**
- **Peer dep**: `@e-watson/axon` (optional — only for plugin)
- **TypeScript** (since v2) — source in `src/*.ts`, compiled by `tsc` to `dist/`
  (ESM `.js` + `.d.ts`). Strict mode. The published package ships only `dist/`.

## Architecture

- `src/index.ts` — `Logger` class, `createLogger()` factory, level/option types
- `src/colors.ts` — ANSI colors, level symbols, value formatting, safe serialization
- `src/plugin.ts` — `axonLogger` Axon plugin (decorates `app.log`, `ctx.log`)
- Build: `tsconfig.json` (typecheck, `noEmit`) + `tsconfig.build.json` (emits `dist/`)

## Key features

- Dual mode: colored TTY output (symbols + colors) / JSON lines (piped)
- 6 levels: fatal(60), error(50), warn(40), info(30), debug(20), trace(10) + silent(100)
- Child loggers: `log.child({ reqId })` inherits level and base fields
- Timers: `log.time(label)` / `log.timeEnd(label)` for perf measurement
- Configurable output streams (stdout/stderr)
- Silent mode for tests

## Commands

- `npm run build` — clean + compile `src/` to `dist/`
- `npm run typecheck` — type-check everything (`src/` + `tests/`) with no emit
- `npm test` — run tests (TS, executed via `tsx`)
- `npm run lint` — ESLint (typescript-eslint)
- `npm run format` / `format:check` — Prettier

## Conventions

- File naming: dot-separated
- Source and tests are TypeScript (`.ts`); relative imports use `.js` extensions (NodeNext)
- Tests in `tests/` directory, named `*.test.ts`, run with `node --import tsx --test`
- Prettier: single quotes, trailing commas, 100 char width, 2-space indent
- Same style conventions as `@e-watson/axon`

## Relation to Axon core

- Independent package and repo
- Plugin integration via `app.register(axonLogger, opts)`
- Axon core's `src/utils/logger.js` can be replaced by this package
