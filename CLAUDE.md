# axon-logger

Lightweight structured logger for the Axon family. Zero dependencies.

## Project overview

- **Package**: `@e-watson/axon-logger`
- **Runtime**: Node.js >= 18, ESM-only
- **Zero runtime dependencies**
- **Peer dep**: `@e-watson/axon` (optional — only for plugin)
- **No TypeScript** — plain JS with JSDoc types (`jsconfig.json` has `checkJs: true`)

## Architecture

- `src/index.js` — `Logger` class and `createLogger()` factory
- `src/colors.js` — ANSI color codes, level symbols, value formatting
- `src/plugin.js` — `axonLogger` Axon plugin (decorates `app.log`, `ctx.log`)

## Key features

- Dual mode: colored TTY output (symbols + colors) / JSON lines (piped)
- 6 levels: fatal(60), error(50), warn(40), info(30), debug(20), trace(10) + silent(100)
- Child loggers: `log.child({ reqId })` inherits level and base fields
- Timers: `log.time(label)` / `log.timeEnd(label)` for perf measurement
- Configurable output streams (stdout/stderr)
- Silent mode for tests

## Commands

- `npm test` — run tests
- `npm run lint` — ESLint

## Conventions

- File naming: dot-separated
- Tests in `tests/` directory
- Prettier: single quotes, trailing commas, 100 char width, 2-space indent
- Same style conventions as `@e-watson/axon`

## Relation to Axon core

- Independent package and repo
- Plugin integration via `app.register(axonLogger, opts)`
- Axon core's `src/utils/logger.js` can be replaced by this package
