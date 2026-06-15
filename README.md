# axon-logger

Lightweight structured logger with colored TTY output and JSON pipe mode.
Zero dependencies. Part of the Axon family.

## Features

- **Dual output** — colored human-readable lines on TTY, JSON lines when piped
- **6 log levels** — `fatal`, `error`, `warn`, `info`, `debug`, `trace` + `silent`
- **Child loggers** — `log.child({ reqId })` inherits level and base fields
- **Timers** — `log.time(label)` / `log.timeEnd(label)` for performance measurement
- **Custom streams** — configurable `stdout` and `stderr` targets
- **Axon plugin** — `app.register(axonLogger)` attaches `ctx.log` with request ID
- **First-class TypeScript** — written in TS, ships `.d.ts` declarations
- **Zero runtime dependencies**

## Requirements

- Node.js >= 18.0.0

## Install

```bash
npm install @e-watson/axon-logger
```

## Quick Start

```js
import { createLogger } from '@e-watson/axon-logger';

const log = createLogger({ level: 'debug' });

log.info('server started', { port: 3000 });
log.warn('deprecated API', { endpoint: '/v1' });
log.error('connection failed', { db: 'postgres' });
```

**TTY output:**

```
09:30:15.482 ● INF server started │ port=3000
09:30:15.483 ▲ WRN deprecated API │ endpoint=/v1
09:30:15.483 ✘ ERR connection failed │ db=postgres
```

**Piped output** (`node app.js | jq`):

```json
{ "level": "info", "time": "2026-04-01T09:30:15.482Z", "msg": "server started", "port": 3000 }
```

## Child Loggers

```js
const reqLog = log.child({ reqId: 'abc-123', method: 'GET' });

reqLog.info('request received', { path: '/users' });
reqLog.error('handler failed', { statusCode: 500 });
```

## Timers

```js
log.time('db-query');
const rows = await db.query('SELECT ...');
log.timeEnd('db-query');
// => INF db-query │ ms=12.34

log.time('build');
await build();
log.timeEnd('build', 'debug'); // custom level
```

## Errors

`Error` objects are serialized automatically — message and stack are preserved
(plain `JSON.stringify` would drop them, since `Error` has no enumerable fields):

```js
log.error('request failed', { err: new Error('timeout') });
// JSON: {"level":"error",...,"err":{"type":"Error","message":"timeout","stack":"..."}}
```

Circular references and `BigInt` values are handled safely too — the logger
never throws while serializing.

## Silent Mode

```js
const log = createLogger({ level: 'silent' }); // suppress all output

const log2 = createLogger({ level: 'info' });
log2.level = 'debug'; // change the level at runtime
```

Colors honor the [`NO_COLOR`](https://no-color.org) convention — set
`NO_COLOR=1` to keep the human-readable layout without ANSI codes.

## Custom Streams

```js
import { createWriteStream } from 'node:fs';

const log = createLogger({
  stdout: createWriteStream('./app.log'),
  stderr: createWriteStream('./error.log'),
  pretty: false, // force JSON mode for file output
});
```

## Axon Plugin

```js
import { createApp } from '@e-watson/axon';
import { axonLogger } from '@e-watson/axon-logger/plugin';

const app = createApp();
app.register(axonLogger, { level: 'debug' });

app.get('/users', (ctx) => {
  ctx.log.info('listing users');
  ctx.send([]);
});
```

The plugin decorates `app.log` (app-level logger) and `ctx.log` (request-scoped child with `reqId`).

## API

### `createLogger(opts?)`

| Option   | Type             | Default          | Description                        |
| -------- | ---------------- | ---------------- | ---------------------------------- |
| `level`  | `string`         | `'info'`         | Minimum log level                  |
| `pretty` | `boolean`        | auto-detect      | Force pretty/JSON mode             |
| `base`   | `object`         | `{}`             | Fields included in every log entry |
| `stdout` | `WritableStream` | `process.stdout` | Output for trace–warn              |
| `stderr` | `WritableStream` | `process.stderr` | Output for error–fatal             |

### Logger methods

| Method                       | Description                                                |
| ---------------------------- | ---------------------------------------------------------- |
| `log.fatal(msg, extra?)`     | Level 60 — unrecoverable                                   |
| `log.error(msg, extra?)`     | Level 50 — errors                                          |
| `log.warn(msg, extra?)`      | Level 40 — warnings                                        |
| `log.info(msg, extra?)`      | Level 30 — informational                                   |
| `log.debug(msg, extra?)`     | Level 20 — debug details                                   |
| `log.trace(msg, extra?)`     | Level 10 — fine-grained trace                              |
| `log.child(fields)`          | Create child logger with extra fields                      |
| `log.time(label)`            | Start a timer                                              |
| `log.timeEnd(label, level?)` | End timer, log elapsed ms                                  |
| `log.level`                  | Current level name (get/set — assign to change at runtime) |

### Level symbols (TTY)

| Level | Symbol | Label |
| ----- | ------ | ----- |
| fatal | ✖      | FTL   |
| error | ✘      | ERR   |
| warn  | ▲      | WRN   |
| info  | ●      | INF   |
| debug | ○      | DBG   |
| trace | ┈      | TRC   |

## Development

Source is TypeScript in `src/`, bundled with `tsup` to `dist/` (the published
artifact). Relative imports in source are extensionless (e.g. `./colors`).

```bash
npm install
npm run typecheck   # type-check src + tests
npm run lint        # eslint
npm test            # run tests via tsx
npm run build       # emit dist/ (.js + .d.ts)
```

> **v2 note:** v2 is a TypeScript rewrite. The public API is unchanged from v1 —
> the same imports and options work — but the package now ships compiled output
> from `dist/` with bundled type declarations.

## License

[MIT](LICENSE)
