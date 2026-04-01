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
- **Zero dependencies**

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
{"level":"info","time":"2026-04-01T09:30:15.482Z","msg":"server started","port":3000}
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

## Silent Mode

```js
const log = createLogger({ level: 'silent' }); // suppress all output
```

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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | `string` | `'info'` | Minimum log level |
| `pretty` | `boolean` | auto-detect | Force pretty/JSON mode |
| `base` | `object` | `{}` | Fields included in every log entry |
| `stdout` | `WritableStream` | `process.stdout` | Output for trace–warn |
| `stderr` | `WritableStream` | `process.stderr` | Output for error–fatal |

### Logger methods

| Method | Description |
|--------|-------------|
| `log.fatal(msg, extra?)` | Level 60 — unrecoverable |
| `log.error(msg, extra?)` | Level 50 — errors |
| `log.warn(msg, extra?)` | Level 40 — warnings |
| `log.info(msg, extra?)` | Level 30 — informational |
| `log.debug(msg, extra?)` | Level 20 — debug details |
| `log.trace(msg, extra?)` | Level 10 — fine-grained trace |
| `log.child(fields)` | Create child logger with extra fields |
| `log.time(label)` | Start a timer |
| `log.timeEnd(label, level?)` | End timer, log elapsed ms |
| `log.level` | Current level name (readonly) |

### Level symbols (TTY)

| Level | Symbol | Label |
|-------|--------|-------|
| fatal | ✖ | FTL |
| error | ✘ | ERR |
| warn | ▲ | WRN |
| info | ● | INF |
| debug | ○ | DBG |
| trace | ┈ | TRC |

## License

[MIT](LICENSE)
