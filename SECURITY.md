# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | ✅                 |
| < 1.2.0 | ❌                 |

## Reporting a Vulnerability

Cruncher is designed to run as an MCP server connected to AI assistants. If you discover a security issue:

1. **Do not open a public issue** — this could expose the vulnerability to abuse
2. **Contact**: Open a private issue or contact the maintainer directly
3. **Response time**: Within 48 hours for acknowledged vulnerabilities

## Security Model

### Expression Evaluation (`evaluate_expression`)

The `evaluate_expression` tool accepts arbitrary math strings and evaluates them. Security is enforced through:

| Layer | Protection |
|-------|-----------|
| **Input sanitization** | Strict regex whitelist: only digits, operators `+ - * / % ^`, parentheses, decimals, commas, and approved function names |
| **Function substitution** | All built-in functions (`sin`, `cos`, `sqrt`, `log10`, etc.) are converted to `Math.*` equivalents via regex replacement *before* the security check |
| **Post-validation check** | After function substitution, a second check verifies no unapproved `Math.*` calls remain |
| **Constant substitution** | Constants (`pi`, `e`, `c`, etc.) are replaced with numeric literals via longest-match-first regex |
| **Safe evaluation** | The final expression is evaluated via `new Function("return (...)")` — only after passing all checks above |
| **Domain protection** | NaN and Infinity results are caught and reported as domain errors, not returned as raw values |

### What is NOT allowed in expressions

- Variables or identifiers (except approved constants and Math.* functions)
- Property access (`obj.key`)
- Function declarations or calls (except approved Math.* functions)
- Template literals, destructuring, or spread operators
- `eval()`, `require()`, `process`, `global`, `this`, `window`

### Input Validation (JSON Schema)

All tool inputs are validated against strict JSON Schema definitions using a **custom recursive validator** — no third-party libraries:

- **Type enforcement**: `number` must be a JSON number, not a string `"5"`
- **Enum enforcement**: Only enumerated values accepted (e.g., `enum: ["degrees", "radians"]`)
- **Recursive validation**: Nested objects and arrays are validated depth-first
- **Structured errors**: Validation failures return detailed `-32602` errors with parameter context

### Worker Thread Isolation

Computationally heavy operations run in isolated Node.js `worker_threads`:

- **Timeout protection**: Default 3-second timeout (configurable via `CRUNCHER_TIMEOUT`)
- **Thread termination**: Workers are forcefully killed if timeout is exceeded
- **Memory isolation**: Workers receive a snapshot of main-thread state (memory), not a live reference
- **Result verification**: Worker results are validated before being sent to the client

### Cache Security

- Cache keys are deterministic (sorted args, tool name)
- Cache only stores results from approved cacheable tools
- Stateful tools (`memory_*`, `batch`, `cache_*`) are marked as `NON_CACHEABLE`

### Tiered Exposure

The `CRUNCHER_TOOL_SET` environment variable limits which tools are exposed:

| Tier | Tools | Description |
|------|-------|-------------|
| `minimal` | 5 | Core arithmetic only |
| `standard` | 34 | Math, trig, stats, percentages, constants, unit conversion |
| `full` | 43 | All tools including memory, base conversion, percentiles, batch, cache, angle |

### What is Protected Against

| Threat | Protection |
|--------|-----------|
| **Code injection** | Regex whitelist, no eval, Math.* substitution verified |
| **Prototype pollution** | Schema validation blocks non-string/array/number types |
| **ReDoS** | No user-controlled regex patterns; pre-compiled patterns used |
| **Infinite loops** | Worker timeout kills execution after 3s |
| **Memory exhaustion** | Cache limited to 1000 entries with LRU eviction |
| **Concurrent data races** | Atomic memory queue serializes state modifications |

### What is NOT Protected Against

| Scenario | Notes |
|----------|-------|
| **Massively expensive single expressions** | e.g., `9^999999999999` — the result will overflow to Infinity, caught by domain check, but the JS engine may take a moment to determine this |
| **Hostile MCP clients** | The server trusts the MCP client connection — it does not authenticate or encrypt the stdio channel |

## Best Practices for Deployment

1. **Set `CRUNCHER_TIMEOUT`** to your desired maximum (in milliseconds) — default is 3000ms
2. **Use `minimal` or `standard` tier** unless you need advanced tools — reduces surface area
3. **Don't accept untrusted input directly in `evaluate_expression`** — use the typed tools (`add`, `multiply`, etc.) for user-provided values
4. **Run in a container or restricted environment** if exposing the stdio connection to untrusted clients
