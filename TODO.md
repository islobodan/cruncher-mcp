# Cruncher MCP Server - TODO List

## Quick Overview

| # | Task | Status | Effort | Priority | Impact |
|---|------|--------|--------|----------|--------|
| 1 | Scientific Notation Support | `[x]` | L | 🔴 High | High |
| 2 | Atomic Memory Operations | `[x]` | M | 🔴 High | Medium |
| 3 | Configurable Timeout | `[x]` | L | 🔴 High | High |
| 4 | More Built-in Functions | `[x]` | L | 🟡 Medium | High |
| 5 | Angle Mode Toggle | `[x]` | L | 🟡 Medium | Medium |
| 6 | Result Caching | `[x]` | M | 🟡 Medium | High |
| 7 | Enhanced Error Messages | `[x]` | M | 🟡 Medium | Medium |
| 8 | Batch Operations | `[x]` | M | 🟡 Medium | High |
| O1 | Performance Optimizations | `[x]` | M | 🔴 High | High |
| O2 | Algorithm & Memory Optimizations | `[x]` | M | 🔴 High | High |
| O3 | Context Token Optimization | `[x]` | L | 🔴 High | High |
| O4 | Tiered Tool Exposure | `[x]` | L | 🔴 High | High |
| O5 | Constants in evaluate_expression | `[x]` | M | 🔴 High | High |
| O6 | Fuzzy Tool Name Matching | `[x]` | S | 🔴 High | High |
| O7 | Extended evaluate_expression Built-ins | `[x]` | S | 🔴 High | High |
| O8 | Improved Domain Error Messages | `[x]` | S | 🔴 High | High |
| O9 | std_dev & variance | `[x]` | S | 🔴 High | High |
| O10 | Standard tier refinement | `[x]` | S | 🟡 Medium | Medium |
| 9 | Unit Conversion Tool | `[x]` | M | 🟡 Medium | High |
| 10 | Complex Number Support | `[ ]` | H | 🟢 Low | Low (skipped) |
| 11 | Progress Streaming | `[ ]` | H | 🟢 Low | Low (skipped) |
| 12 | Statistics Mode | `[x]` | M | 🟢 Low | Medium |
| 13 | Expression History | `[ ]` | L | 🟢 Low | Low (skipped) |
| CR-1 | Worker timeout double-send race | `[x]` | S | 🔴 Critical | High |
| CR-2 | evaluate_expression no size limit (DoS) | `[x]` | S | 🔴 Critical | High |
| CR-3 | Array no size limit on stat tools (DoS) | `[x]` | M | 🔴 Critical | High |
| CR-4 | memory_recall stale read during add | `[x]` | M | 🟠 High | Medium |
| CR-5 | variance/std_dev duplicate logic | `[ ]` | S | 🟠 High | Medium |
| CR-6 | Standard tier hardcodes minimal names | `[ ]` | S | 🟡 Medium | Low |
| CR-7 | Cache labeled LRU but is FIFO | `[ ]` | S | 🟡 Medium | Low |
| CR-8 | Disallowed-chars regex has dead chars | `[ ]` | M | 🟡 Medium | Medium |
| CR-9 | Temperature error shows empty unit list | `[ ]` | S | 🟡 Medium | Low |
| CR-10 | safeMath.divide precision loss | `[ ]` | M | 🟡 Medium | Medium |
| CR-11 | No worker cleanup on SIGTERM | `[ ]` | S | 🟡 Medium | Low |
| CR-12 | evaluate_expression recompiles Function | `[ ]` | S | 🟢 Low | Low |
| CR-13 | Duplicate comment block | `[ ]` | S | 🟢 Low | Low |
| CR-14 | Error messages missing "pow" | `[ ]` | S | 🟢 Low | Low |
| CR-15 | Dead typeof module guard | `[ ]` | S | 🟢 Low | Low |

---

## Legend

### Status
- `[]` - Not started
- `[/]` - In progress
- `[x]` - Implemented

### Effort
- `S` - Small (< 30 min)
- `L` - Low (< 1 hour)
- `M` - Medium (1-4 hours)
- `H` - High (> 4 hours)

### Priority
- 🔴 - High
- 🟡 - Medium
- 🟢 - Low

### Impact
- High - Affects many users or critical functionality
- Medium - Noticeable improvement for some users
- Low - Nice to have, limited use cases

---

## Recently Completed Features

### O1-O2: Performance & Algorithm Optimizations (v1.2.9-v1.2.10)
**Implemented**: 2026-04-02

- Moved 15 instant tools from workers to main thread (power, sqrt, log, absolute, get_constant, memory_recall, count, min, max, etc.)
- Eliminated double-validation overhead
- O(1) tool lookup via `TOOL_LOOKUP_MAP` replacing O(n) `TOOLS.find()`
- Batch operations check/store cache before execution
- Conditional worker args clone (only for timeout-enabled tools)
- Supported-methods Set in `validateMessage`

### O3: Context Token Optimization (v1.2.11)
**Implemented**: 2026-04-02

- Trimmed redundant tool descriptions across all 43 tools (~560 tokens saved)
- `evaluate_expression` promoted as PRIMARY tool
- Removed repetitive warnings and verbose examples

### O4: Tiered Tool Exposure (v1.2.12)
**Implemented**: 2026-04-02

- `CRUNCHER_TOOL_SET` env var: `minimal` (5), `standard` (34 **default**), `full` (43)
- Dynamic tool filtering at startup
- Standard tier: Core math, trig, stats, percentages, constants, unit conversion
- Full tier: Standard + memory, base conversion, percentile, batch, cache management

### O5: Constants in evaluate_expression (v1.2.13)
**Implemented**: 2026-04-02

- 16 constants accessible directly in expressions (pi, e, tau, phi, sqrt2, c, g, G, h, k, R, NA, e_charge, m_e, m_p, euler_mascheroni)
- Dynamic substitution with longest-first matching
- Requires explicit operators: `2 * pi` works, `2pi` doesn't

### O6: Fuzzy Tool Name Matching (v1.2.14)
**Implemented**: 2026-04-02

- Levenshtein-distance typo recovery for tool names
- Prefix matching for short names (fact→factorial, fac→factorial)
- Typos caught (sinn→sine, squrt→sqrt, adddd→add, divid→divide)
- No false suggestions for gibberish (totally_wrong → no suggestion)

### O7: Extended evaluate_expression Built-ins (v1.2.15)
**Implemented**: 2026-04-02

- Trigonometric: sin(), cos(), tan(), asin(), acos(), atan()
- Math: sqrt(), log10(), ln(), log(x, base)
- Combined use: `sin(pi/6) + sqrt(16) + log10(100) = 6.5`

### O8: Improved Domain Error Messages (v1.2.15)
**Implemented**: 2026-04-02

- Split Infinity/NaN checks with domain-specific hints
- `sqrt(-1)` → "Check for: sqrt(negative), log(negative/zero), asin/acos out of [-1,1]"
- `1/0` → "Check for division by zero or overflow"
- `asin(5)` → "asin/acos out of [-1,1]"

### O9: std_dev & variance (v1.2.18)
**Implemented**: 2026-04-02

- Sample (n-1) and population (n) variants for both functions
- Proper error handling for empty arrays and single-element samples
- Zero dependencies, main-thread execution

### O10: Percentage Functions (v1.2.19)
**Implemented**: 2026-04-02

- `percentage_of`: What is X% of Y? (15% of 200 = 30)
- `percentage_change`: From→To % change (50→80 = +60%)
- `percentage_reverse`: X is Y% of what? (30 is 15% of 200)
- Anti-hallucination: LLM picks the semantically correct tool

### O11: Unit Conversion Tool (v1.2.22)
**Implemented**: 2026-04-02

- `convert_unit` tool: 80+ conversions across 8 categories
- **Categories**: length, weight, temperature, area, volume, time, speed, digital_storage
- **Temperature handled separately** (non-linear C/F/K formulas)
- **Other categories** use base-unit factor tables (e.g., all lengths → meters → target)
- **Case-insensitive** unit matching (`"KM"` and `"km"` both work)
- Returns structured JSON: `{ value, from, to, result, category }`
- Added to **standard** tier (33→34 tools)
- 25 new tests covering all categories, edge cases, and validation errors

### Statistics Mode: Done (v1.2.18)
**Implemented**: 2026-04-02

Variance and standard deviation with sample/population mode are now fully implemented. See O9.

---

## Previously Completed Features

### 1. Scientific Notation Support
**Implemented**: 2026-03-13

- Converts `1e6`, `2.5e-3` to safe Math.pow expressions before security check
- Supports both `e` and `E` notation with positive/negative exponents

### 2. Atomic Memory Operations
**Implemented**: 2026-03-13

- Promise-based queue (`memoryQueue`) serializes memory ops at main thread level
- Prevents race conditions in concurrent memory_add/memory_subtract calls

### 3. Configurable Timeout
**Implemented**: 2026-03-13

- Optional `timeout` parameter (100-60000ms) for factorial, median, percentile
- Default 3000ms via `CRUNCHER_TIMEOUT` env var

### 4. More Built-in Functions
**Implemented**: 2026-03-13

- abs(), round(), floor(), ceil(), min(), max() all available in evaluate_expression

### 5. Angle Mode Toggle
**Implemented**: 2026-04-01

- Global `angleMode` state with `set_angle_mode`/`get_angle_mode` tools
- Trigonometric functions moved to main-thread execution

### 6. Result Caching
**Implemented**: 2026-04-01

- Main-thread Map cache (1000 entries, 5-min TTL, LRU eviction)
- `cache_clear` and `cache_info` tools run in main thread

### 7. Enhanced Error Messages
**Implemented**: 2026-03-31

- Structured JSON-RPC errors with parameter context
- Format: `{ code, message, data: { parameter, expected, received, receivedValue, tool } }`

### 8. Batch Operations
**Implemented**: 2026-04-01

- Execute up to 50 tool calls sequentially in one request
- Partial failure tolerance with per-operation error reporting

---

## Intentionally Skipped

The following items were considered and intentionally not implemented.
Each would add complexity disproportionate to the benefit for an MCP calculator server.

### 10. Complex Number Support

**Decision**: Skipped - `[]`. Niche use case. The MCP model means the LLM has
conversation context, so multi-step complex math can be done iteratively.

### 11. Progress Streaming

**Decision**: Skipped - `[]`. Worker timeout (3s default, configurable) already
handles long-running tasks by terminating them cleanly. MCP streaming notifications
add protocol complexity without clear benefit - heavy calculations that exceed the
timeout should simply fail gracefully with a clear error message.

### 13. Expression History

**Decision**: Skipped - `[]`. The LLM already maintains conversation context, so
it can reference previous expressions and results naturally. Adding redundant
state storage duplicates functionality already provided by the MCP conversation model.

---

## Test Suite Status

| Version | Tests | Pass Rate | Key Features |
|---------|-------|-----------|--------------|
| v1.2.13 | 235 | 100% | Constants in expressions |
| v1.2.14 | 243 | 100% | Fuzzy tool matching |
| v1.2.15 | 261 | 100% | Built-ins + error messages |
| v1.2.18 | 269 | 100% | std_dev & variance |
| v1.2.19 | 279 | 100% | Percentage functions |
| v1.2.20 | 278 | 100% | Tier refinement |
| v1.2.21 | 278 | 100% | Documentation audit |
| **v1.2.22** | **302** | **100%** | **Unit conversion (8 cat, 80+ units, 25 tests)** |
| **v1.2.25** | **330** | **100%** | **Expanded test suite (28 new tests, 100% pass)** |
| **v1.2.26** | **330** | **100%** | **Docs refresh, test restructure, assert API, CHANGELOG** |
| **v1.2.27** | **335** | **100%** | **MCP protocol compliance (ping, notifications, garbage stdin)** |
| **v1.2.29** | **335** | **100%** | **MCP Registry: server.json, mcpName, registry-ready** |
| **v1.2.28** | **335** | **100%** | **MCP spec 2025-11-25: tool annotations, protocol version bump** |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-05-08 | v1.2.29 | MCP Registry: server.json, mcpName, registry-ready |
| 2026-04-29 | v1.2.28 | MCP spec 2025-11-25: tool annotations on all 43 tools, protocol version bump |
| 2026-04-28 | v1.2.27 | MCP protocol compliance: ping, notifications, garbage stdin, 335 tests |
| 2026-04-23 | v1.2.26 | Docs refresh, test restructure (tests/ dir), assert API, CHANGELOG v1.2.24+v1.2.25 entries |
| 2026-04-02 | v1.2.25 | Test suite expansion: 302→330 tests, 8 new sections (full-mode exclusives, eval built-ins, injection security, variance edges, unit conversion edges, batch boundaries, fuzzy matching, remaining constants)
| 2026-04-02 | v1.2.22 | Unit conversion: 8 categories (length, weight, temp, area, volume, time, speed, digital_storage), 80+ units, JSON structured output |
| 2026-04-02 | v1.2.21 | Comprehensive README.md audit: fixed tier counts (34/42), default=standard, added missing tools, updated examples |
| 2026-04-02 | v1.2.20 | Standard tier refinement: moved memory, convert_base, percentile to full tier |
| 2026-04-02 | v1.2.19 | Percentage tools: percentage_of, percentage_change, percentage_reverse |
| 2026-04-02 | v1.2.18 | std_dev & variance: standard deviation and variance (sample + population) |
| 2026-04-02 | v1.2.16 | Trimmed redundant domain constraints from asin/acos descriptions |
| 2026-04-02 | v1.2.15 | Extended evaluate_expression built-ins (sin, cos, tan, asin, acos, atan, sqrt, log10, ln, log(x,b)) + better error messages |
| 2026-04-02 | v1.2.14 | Fuzzy tool name matching (Levenshtein + prefix) for typo recovery |
| 2026-04-02 | v1.2.13 | Constants in evaluate_expression (pi, e, tau, phi, sqrt2, G, c, k, R, etc.) |
| 2026-04-02 | v1.2.12 | Tiered tool exposure via CRUNCHER_TOOL_SET env var |
| 2026-04-02 | v1.2.11 | Context token optimization (~40% description reduction) |
| 2026-04-02 | v1.2.10 | O(1) tool lookup, batch cache, conditional worker clone |
| 2026-04-02 | v1.2.9 | Moved 15 instant tools from workers to main thread |
| 2026-04-01 | v1.2.7-v1.2.8 | Result caching, angle mode toggle, batch operations |
| 2026-03-31 | v1.2.5-v1.2.6 | Enhanced errors, batch processing |
| 2026-03-13 | v1.2.1 | Added convert_base, timeout, built-ins, scientific notation |
| 2026-03-11 | v1.2.0 | Added evaluate_expression, worker threads, strict validation |
| 2026-03-01 | v1.1.0 | Added statistics functions, memory, inverse trig |
| 2026-02-15 | v1.0.0 | Initial release with basic math operations |

---

**Version**: v1.2.29
**Last Updated**: 2026-05-08
**Total Tasks**: 28 (13 original + 15 code review findings)
**Completed**: 17 ✅  |  **Code Review Open**: 11 📋
**Skipped**: 3 🚫 (low impact, disproportionate effort)

**Project Status**: Active maintenance — 15 issues identified, see Code Review Findings below.

---

## 🔍 Code Review Findings (2026-05-08)

Thorough senior-developer audit of `cruncher.js` (2468 lines, v1.2.29).
Each finding includes root cause analysis, impacted code locations, reproduction
steps, and concrete fix proposals with code.

---

### 🔴 Critical

#### CR-1: Race Condition — Worker Timeout & Completion Double-Send

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 Critical |
| **File/Lines** | `cruncher.js` L2360–L2410 (`processMessage` handler) |
| **Affected Tools** | All 9 worker-only tools: `add`, `subtract`, `multiply`, `divide`, `modulo`, `factorial`, `sum`, `avg`, `median`, `range`, `percentile`, `batch`, `memory_add`, `memory_subtract` |
| **Category** | Concurrency / Race Condition |

**Root Cause:**

The worker timeout callback and the worker's `on("message")` handler both emit
JSON-RPC responses for the **same request ID** without mutual exclusion.
`worker.terminate()` is asynchronous — the OS thread may deliver the worker's
result message to the main thread's libuv queue BEFORE the termination takes
effect. Result: two JSON-RPC responses race through stdout.

```
Timeline (race window shown):
  T=0ms     Worker starts computing factorial(100000)
  T=3000ms  setTimeout fires → sendError(id, -32000, "Execution Timeout")
            worker.terminate() called but OS has not scheduled termination yet
  T=3000ms  Worker's postMessage arrives in libuv queue
            ↓ NEXT EVENT LOOP TICK ↓
            worker.on("message") fires → sendSuccess(id, { result: 9.33e157 })
            worker.terminate() takes effect (too late)
  
  RESULT: Client receives TWO responses for request id=5:
    {"jsonrpc":"2.0","id":5,"error":{"code":-32000,"message":"Execution Timeout..."}}
    {"jsonrpc":"2.0","id":5,"result":{"content":[{"type":"text","text":"9.33e157"}]}}
```

MCP clients interpret this as protocol corruption — second response for same ID
is undefined behavior. Most clients will error or hang.

**Same vulnerability in `worker.on("error")` path** — if the worker exits with
an error after timeout fires, same double-send occurs.

**Proposed Fix:**

```js
// Add a responded guard shared by all 3 code paths
const executeTool = async () => {
    let responded = false;  // ← GUARD
    let releaseQueue = null;
    // ... queue setup unchanged ...

    const worker = new Worker(__filename, { workerData: { ... } });
    const timeoutId = setTimeout(() => {
        if (responded) return;  // ← GUARD
        responded = true;
        worker.terminate();
        sendError(message.id, -32000, {
            message: `Execution Timeout: The calculation took longer than ${timeout}ms ...`
        });
        if (releaseQueue) releaseQueue();
    }, timeout);

    worker.on("message", (result) => {
        clearTimeout(timeoutId);
        if (responded) return;  // ← GUARD
        responded = true;
        if (result.success) { /* ... sendSuccess ... */ }
        else { /* ... sendError ... */ }
        if (releaseQueue) releaseQueue();
    });

    worker.on("error", (error) => {
        clearTimeout(timeoutId);
        if (responded) return;  // ← GUARD
        responded = true;
        sendError(message.id, -32603, {
            message: `Worker Error: ${error.message}`
        });
        if (releaseQueue) releaseQueue();
    });
};
```

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| S (< 30 min) | 2 (timeout double-send, worker error after timeout) | Near zero — additive guard |

---

#### CR-2: No Input Size Limit on `evaluate_expression` — DoS Vector

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 Critical |
| **File/Lines** | `cruncher.js` L1790 (handler entry point) |
| **Affected Tools** | `evaluate_expression` |
| **Category** | Security / Denial of Service |

**Root Cause:**

Zero bound check on `expression` string length before processing. A 100 MB
expression string passes JSON-RPC transport, enters `toolHandlers.evaluate_expression()`
unchecked, gets fed through 13 regex replacements (each O(n) where n = input length),
all must complete before the `RE_DISALLOWED_CHARS` security check even runs.

**Attack Vector:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "evaluate_expression",
    "arguments": {
      "expression": "1+1[" + "+".repeat(100_000_000) + "]"
    }
  }
}
```

**Impact:**
- 100 MB string allocates ~200 MB memory (JS uses UTF-16 internally)
- 13 sequential regex replacements each scan the full 100 MB → ~1.3 GB scanned
- `new Function(return (${parsedExpr}))` compiles a 100 MB function body
- **V8 will OOM-crash the process** (not just timeout — hard crash)

This bypasses the 3-second worker timeout entirely because `evaluate_expression`
is a **main-thread tool** (`MAIN_THREAD_TOOLS`). No worker isolation, no timeout
protection — the event loop is blocked until V8 crashes.

**Proposed Fix:**

```js
evaluate_expression: ({ expression }) => {
    // Reject oversized expressions BEFORE any regex processing
    const MAX_EXPR_LENGTH = 4096;
    if (typeof expression !== "string") {
        throw new Error(
            "Type Error: expression must be a string, got " + typeof expression
        );
    }
    if (expression.length > MAX_EXPR_LENGTH) {
        throw new Error(
            `Expression too long (${expression.length} chars). Maximum is ${MAX_EXPR_LENGTH}.`
        );
    }
    // ... rest of handler unchanged ...
}
```

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| S (< 15 min) | 3 (empty string, exactly 4096, 4097 chars) | None — new guard |

---

#### CR-3: No Array Size Limits on Statistical Tools — DoS Vector

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 Critical |
| **File/Lines** | `cruncher.js` statistical handlers: `sum` L1460, `avg` L1475, `min` L1500, `max` L1513, `variance` L1655, `std_dev` L1695, `median` L1488, `range` L1630, `percentile` L1645, `count` L1625 |
| **Affected Tools** | `sum`, `avg`, `min`, `max`, `variance`, `std_dev`, `median`, `range`, `percentile`, `count` |
| **Category** | Security / Denial of Service |

**Root Cause:**

All 10 statistical tools accept unbounded `numbers[]` arrays. ALL of them run in
the **main thread** (`MAIN_THREAD_TOOLS`). No worker isolation, no timeout
protection. A 10-million-element array:

- **Blocks the event loop** for 2–8 seconds (sorting, reducing, spreading)
- **Renders the entire MCP server unresponsive** — `ping` won't respond,
  `tools/list` won't respond
- **Cannot be interrupted** — no timeout mechanism for main-thread tools

**Specific impact per tool:**

| Tool | Operation | 10M elements cost |
|------|-----------|-------------------|
| `sum`, `avg` | `reduce()` | ~200ms (just addition) |
| `min`, `max` | `Math.min/max(...arr)` | **~8s OR CRASH** — spread operator hits call stack limit around 125K elements, then V8 falls back to slow iteration; can OOM |
| `median`, `percentile` | `[...arr].sort()` | ~3s (O(n log n) sort) + memory double |
| `variance`, `std_dev` | 2x `reduce()` passes | ~400ms |
| `range` | `Math.min(...arr)`, `Math.max(...arr)` | Same as min/max — crash risk |

The `Math.min(...numbers)` and `Math.max(...numbers)` spread operator is
particularly dangerous: V8 has a hard limit of ~125,000 arguments to a function
call. Beyond that: `RangeError: Maximum call stack size exceeded` — or worse,
the fallback iteration path in V8 can OOM hard.

**Attack Vector:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "min",
    "arguments": {
      "numbers": "<array with 10,000,000 elements>"
    }
  }
}
```

This requires 10M numbers in JSON (~80 MB payload), but the transport accepts
it and `JSON.parse` won't reject it.

**Proposed Fix:**

Add a capped-length check in `validateArguments`, applied to all array-typed
schema properties. Also replace `Math.min/max(...arr)` with loop-based
implementations to eliminate the spread-operator crash.

**Fix Part 1 — Array length cap in `validateArguments`:**

```js
// In validateArguments, after array type check (L2216):
if (schema.type === "array") {
    if (!Array.isArray(args)) { /* existing check */ }
    const MAX_ARRAY_LENGTH = 10000;  // new constant at module level
    if (args.length > MAX_ARRAY_LENGTH) {
        throw structuredValidationError(-32602,
            `Validation Error: Array at ${path} exceeds maximum length ` +
            `${MAX_ARRAY_LENGTH} (got ${args.length})`,
            { parameter: path.replace("root.", ""),
              expected: `<= ${MAX_ARRAY_LENGTH} elements`,
              received: `${args.length} elements`,
              tool: toolName }
        );
    }
    if (schema.items) { /* existing item validation */ }
}
```

**Fix Part 2 — Replace `Math.min/max(...arr)` with loop:**

```js
// Replace min handler:
min: ({ numbers }) => {
    if (numbers.length === 0) throw new Error("Cannot find the minimum of an empty list.");
    let minVal = Infinity;
    for (let i = 0; i < numbers.length; i++) {
        if (numbers[i] < minVal) minVal = numbers[i];
    }
    return minVal;
},

// Replace max handler:
max: ({ numbers }) => {
    if (numbers.length === 0) throw new Error("Cannot find the maximum of an empty list.");
    let maxVal = -Infinity;
    for (let i = 0; i < numbers.length; i++) {
        if (numbers[i] > maxVal) maxVal = numbers[i];
    }
    return maxVal;
},

// Replace range handler (uses both):
range: ({ numbers }) => {
    if (numbers.length === 0) throw new Error("Cannot calculate the range of an empty list.");
    let minVal = Infinity, maxVal = -Infinity;
    for (let i = 0; i < numbers.length; i++) {
        const v = numbers[i];
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
    }
    return maxVal - minVal;
},
```

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| M (1–2 hours) | 6 (length cap per tool, min/max correctness on 10K arrays, empty array edge) | Low — additive guard, replacement preserves semantics |

---

### 🟠 High

#### CR-4: `memory_recall` Reads Stale Value During Concurrent `memory_add`

| Field | Detail |
|-------|--------|
| **Severity** | 🟠 High |
| **File/Lines** | `cruncher.js` L1571 (handler), L2345 (`MAIN_THREAD_TOOLS` set) |
| **Affected Tools** | `memory_recall`, `memory_add`, `memory_subtract` |
| **Category** | Concurrency / Correctness |

**Root Cause:**

`memory_recall` is in the `MAIN_THREAD_TOOLS` set, so it executes immediately on
the main thread by reading `memory` directly. Meanwhile, `memory_add` and
`memory_subtract` go through the worker+queue path. The main thread's `memory`
variable is only updated when the worker's `on("message")` callback fires and
executes `memory = result.newMemory`. Until that callback runs, `memory` holds
the OLD value.

**Trace of the Bug:**

```
 1. User calls memory_add({ value: 5 })
    → NOT in MAIN_THREAD_TOOLS → goes to worker path
    → Worker spawned with currentMemory: 0
    → main thread's `memory` variable STILL = 0

 2. User calls memory_recall()  ← BEFORE worker finishes
    → IS in MAIN_THREAD_TOOLS → fast path
    → Returns `memory` from main thread → returns 0 ❌
    → CORRECT answer should be 5 (or wait for memory_add to complete)

 3. Worker finishes, on("message") fires
    → memory = 5 (now correct, but memory_recall already returned wrong value)
```

**Realistic Trigger:**

An LLM agent calls `memory_add` then immediately calls `memory_recall` in the
next message. If the MCP client sends requests asynchronously (or the network
latency is low), the `memory_recall` can arrive before the worker thread finishes.
The 3ms worker spawn + execution time is the race window.

**Proposed Fix:**

Make `memory_recall` respect the memory queue — it must await all pending
mutations before reading.

```js
// Option A: Remove memory_recall from MAIN_THREAD_TOOLS, add queue await
// (most correct, slight latency cost)

// In the MAIN_THREAD_TOOLS Set — REMOVE "memory_recall"
const MAIN_THREAD_TOOLS = new Set([
    // ... other tools ... (remove "memory_recall")
]);

// In the tools/call handler, add special case BEFORE main-thread fast path:
if (name === "memory_recall") {
    // Await all pending memory mutations before reading
    const executeRecall = async () => {
        await memoryQueue;  // wait for pending ops
        sendSuccess(message.id, {
            content: [{ type: "text", text: String(memory) }],
        });
    };
    executeRecall().catch((error) => {
        sendError(message.id, -32603, {
            message: `Unexpected error: ${error.message}`
        });
    });
    return;
}

// Option B: Keep in MAIN_THREAD_TOOLS but read through queue
// (simpler, same correctness)

memory_recall: () => {
    // Now safe because caller awaits memoryQueue before this runs
    return memory;
},

// In tools/call handler, wrap main-thread memory ops:
if (MAIN_THREAD_TOOLS.has(name)) {
    const executeMain = async () => {
        if (name === "memory_recall" || name === "memory_clear") {
            await memoryQueue;
        }
        try {
            const result = handler(args);
            // ... rest unchanged ...
        } catch (error) { /* ... */ }
    };
    executeMain().catch(/* ... */);
    return;
}
```

**Recommendation:** Option B — keeps `memory_recall` fast for the common case
(no pending mutations) while ensuring correctness when mutations are in flight.
The `await memoryQueue` resolves immediately if no memory ops are queued (it's
a resolved promise in steady state).

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| M (1–2 hours) | 3 (concurrent add+recall, concurrent subtract+recall, recall after clear) | Medium — changes execution timing |

---

#### CR-5: Duplicate Logic — `variance` and `std_dev` Are Near-Clones

| Field | Detail |
|-------|--------|
| **Severity** | 🟠 High |
| **File/Lines** | `cruncher.js` L1655–L1720 (both handlers) |
| **Affected Tools** | `variance`, `std_dev` |
| **Category** | Maintainability / DRY |

**Root Cause:**

Two functions with 90% identical code. Both compute `mean` and `ss` (sum of
squared deviations) independently. Any bug fix or optimization must be applied
twice — history shows they already drifted: `variance` uses `numbers.reduce((a, b) => a + b, 0)`
(raw JS, no `safeMath`) while `std_dev` uses the same pattern. If one gets
optimized and the other doesn't, they'll return inconsistent results.

**Proposed Fix:**

```js
std_dev: ({ numbers, population }) => {
    return Math.sqrt(toolHandlers.variance({ numbers, population }));
},
```

This guarantees they can never diverge. The extra function call overhead is
negligible (~0.001ms).

**Or, if you want to avoid the call indirection:**

```js
// Shared implementation
const computeVariance = (numbers, population) => {
    if (numbers.length === 0)
        throw new Error("Cannot calculate variance of an empty list.");
    if (numbers.length === 1 && !population)
        throw new Error("Sample variance needs ≥2 values. Use population: true.");
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const ss = numbers.reduce((a, b) => a + (b - mean) ** 2, 0);
    return ss / (population ? numbers.length : numbers.length - 1);
};

// In toolHandlers:
variance: ({ numbers, population }) => computeVariance(numbers, population),
std_dev: ({ numbers, population }) => Math.sqrt(computeVariance(numbers, population)),
```

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| S (< 15 min) | 0 (existing variance/std_dev tests cover this) | Near zero — pure refactor |

---

### 🟡 Medium

#### CR-6: Standard Tier Hardcodes Minimal Tool Names — Fragile

| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **File/Lines** | `cruncher.js` L103–L109 (`TOOL_TIERS.standard`) |
| **Category** | Maintainability |

**Root Cause:**

```js
const TOOL_TIERS = {
    minimal: ["evaluate_expression", "add", "subtract", "multiply", "divide"],
    standard: [
        "evaluate_expression",
        "add", "subtract", "multiply", "divide",  // ← duplicated!
        "sqrt", "power", /* ... 29 more ... */
    ],
};
```

If a tool is added to or removed from `minimal`, the developer MUST remember to
update `standard` too. Already in sync now, but it's a future bug waiting to happen.

**Proposed Fix:**

```js
const TOOL_TIERS = {
    minimal: ["evaluate_expression", "add", "subtract", "multiply", "divide"],
    standard: [
        ...minimal,  // ← spread — always in sync
        "sqrt", "power", "absolute", "modulo", "factorial",
        "logarithm", "natural_log", "get_constant",
        // ... rest unchanged ...
    ],
};
```

Wait — there's a reference error risk: `...minimal` is used before `const` is
fully defined. Fix by defining minimal first as a standalone:

```js
const MINIMAL_TOOLS = ["evaluate_expression", "add", "subtract", "multiply", "divide"];
const TOOL_TIERS = {
    minimal: MINIMAL_TOOLS,
    standard: [
        ...MINIMAL_TOOLS,
        "sqrt", "power", /* ... */
    ],
};
```

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| S (< 10 min) | 1 (verify standard tier includes all minimal tools) | Near zero — spread is equivalent |

---

#### CR-7: Cache Eviction is FIFO, Labeled as LRU

| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **File/Lines** | `cruncher.js` L114–L140 (`cacheSet`) |
| **Category** | Documentation / Behavior Mismatch |

**Root Cause:**

```js
if (cache.size >= CACHE_MAX_SIZE) {
    const first = cache.keys().next().value;  // ← evicts OLDEST by insertion
    cache.delete(first);
}
```

This evicts the **first-inserted** entry regardless of access frequency. True LRU
would move an entry to the end on every `cacheGet()` hit, so hot entries are
always at the back and never evicted. Cruncher's cache does NOT reorder on get —
a frequently-hit entry can be evicted while a one-time-use entry survives.

**Real-world Impact:**

Low. With 1000 entries, 5-min TTL, and typical usage patterns, FIFO is
"close enough." The TTL expires cold entries before they crowd out hot ones.
But someone relying on the LRU label for performance tuning will be misled.

**Proposed Fix:**

Option A — Implement true LRU (higher overhead):

```js
function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    // Re-insert to move to end (LRU promotion)
    cache.delete(key);
    cache.set(key, entry);
    return entry.value;
}
```

Downside: `O(1)` get becomes `O(1)` delete + `O(1)` set = still O(1) but
with slight Map rehashing cost.

Option B — Fix the label (recommended):

Rename comments from "LRU eviction" to "FIFO eviction with TTL" and document
in `cache_info` description that FIFO is used intentionally for lower overhead.

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| S (< 15 min) for Option B | 0 | None — comment-only change |

---

#### CR-8: `evaluate_expression` Disallowed-Chars Regex Has Dead/Redundant Characters

| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **File/Lines** | `cruncher.js` L226 (`RE_DISALLOWED_CHARS`) |
| **Category** | Security / Code Quality |

**Root Cause:**

The negated character class `[^0-9+\-*/().% \t*,Mathabspowrndflceigumsxqtogv1]` contains:

| Issue | Detail |
|-------|--------|
| **Duplicate `*`** | Appears both in `*/` (the `/` escape group) AND after `\t*` — second `*` is redundant |
| **Duplicate `1`** | Already covered by `0-9` range — standalone `1` is dead |
| **Allow `v`** | No valid `Math.*` function uses `v`: `sin cos tan asin acos atan sqrt log log10 pow abs round floor ceil min max` — none contain `v`. This allows an unnecessary character. |

**Security Implication:**

The `v` character isn't yet exploitable (no `Math.v*` functions exist in V8),
but it reveals that the regex was manually constructed rather than generated
from the actual set of needed characters. If a future JavaScript version adds
a dangerous `Math.*` function using `v`, this whitelist would allow it.

**Proposed Fix:**

Regenerate the allowed character set deterministically from the actual Math
function names:

```js
// Compute allowed chars from actual Math function names
const ALLOWED_MATH_FUNCTIONS = [
    "abs", "round", "floor", "ceil", "min", "max",
    "sin", "cos", "tan", "asin", "acos", "atan",
    "sqrt", "log", "log10", "pow"
];
const MATH_CHARS = new Set(
    ALLOWED_MATH_FUNCTIONS.join("").split("").concat("Math")
);
// base chars: digits, operators, parentheses, decimal, comma, space, tab
const BASE_CHARS = "0123456789+\-*/().% \t,";
const ALLOWED = BASE_CHARS + [...MATH_CHARS].join("");
// Escape special regex chars and build the negated set
const escaped = ALLOWED.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
const RE_DISALLOWED_CHARS = new RegExp(`[^${escaped}]`);
```

This guarantees no unnecessary characters and automatically updates if functions
are added.

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| M (1 hour) | 5 (verify all Math functions pass, verify `v` is rejected, verify no false rejections) | Medium — changing security regex needs thorough testing |

---

#### CR-9: Temperature Unit Error Message Shows Empty Available List

| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **File/Lines** | `cruncher.js` L1994–L2007 (`convert_unit` validation) |
| **Category** | UX / Error Handling |

**Root Cause:**

```js
if (!fromKey) {
    throw new Error(
        `Unknown ${category} unit: ${from}. ` +
        `Available: ${
            Object.keys(conversions)
                .filter(k => conversions[k] !== null)
                .join(', ')
        }`
    );
}
```

For `temperature` category, ALL values in the table are `null`:

```js
temperature: { C: null, F: null, K: null }
```

So `.filter(k => conversions[k] !== null)` returns `[]` → `.join(', ')` returns `""`.

The error becomes: `"Unknown temperature unit: X. Available: "` — empty list.

User sees a blank "Available:" field and has NO idea what units to use.

**Proposed Fix:**

```js
// Option A: Hardcode for temperature
if (category === "temperature") {
    throw new Error(
        `Unknown temperature unit: ${from}. Available: C, F, K`
    );
}

// Option B: Use a separate constant list for display
const UNIT_DISPLAY_NAMES = {
    temperature: ["C", "F", "K"],
};

// In error message:
const available = category === "temperature"
    ? ["C", "F", "K"].join(", ")
    : Object.keys(conversions)
        .filter(k => conversions[k] !== null)
        .join(', ');
```

Option A is simpler and sufficient.

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| S (< 10 min) | 1 (invalid temperature unit shows C, F, K) | None |

---

#### CR-10: `safeMath.divide` Loses Precision on Mismatched Decimal Counts

| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **File/Lines** | `cruncher.js` L1170–L1180 (`safeMath.divide`) |
| **Category** | Numerical Correctness |

**Root Cause:**

```js
divide: (a, b) => {
    if (b === 0) throw new Error("Division by zero is not allowed.");
    const d1 = countDecimals(a);
    const d2 = countDecimals(b);
    const maxDecimals = Math.max(d1, d2);
    const multiplier = Math.pow(10, maxDecimals);
    return Math.round(a * multiplier) / Math.round(b * multiplier);
}
```

When `a` has fewer decimals than `b`, `a * multiplier` produces a non-integer
that gets rounded. Example:

```
a = 0.5 (d1=1), b = 0.125 (d2=3), maxDecimals=3, multiplier=1000
a * multiplier = 500 (exact, no rounding loss)
b * multiplier = 125 (exact)
result = 500/125 = 4.0 ✓
```

That's actually correct. But:

```
a = 1/3 ≈ 0.3333333333333333 (d1=16), b = 2 (d2=0), maxDecimals=16
multiplier = 10^16
a * multiplier = 3333333333333333.5 → Math.round → 3333333333333334 ← WRONG
b * multiplier = 20000000000000000
result = 3333333333333334 / 20000000000000000 = 0.1666666666666667
Correct: 0.3333333333333333 / 2 = 0.16666666666666666
```

Off by ~1e-16. Negligible for most use cases, but a precision claim should be
accurate.

**Proposed Fix:**

Scale using the LCM of both multipliers:

```js
divide: (a, b) => {
    if (b === 0) throw new Error("Division by zero is not allowed.");
    const d1 = countDecimals(a);
    const d2 = countDecimals(b);
    const m1 = Math.pow(10, d1);
    const m2 = Math.pow(10, d2);
    // Scale both to integer using their respective multipliers, then divide
    return (Math.round(a * m1) * m2) / (Math.round(b * m2) * m1);
}
```

This keeps both numerator and denominator as exact integers until the final
division, preserving maximum precision.

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| M (1 hour) | 5 (mismatched decimals, negative numbers, large numbers, repeating fractions) | Medium — changes core math primitive |

---

#### CR-11: No Worker Cleanup on SIGTERM — Orphaned Workers

| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **File/Lines** | `cruncher.js` L2360 (worker creation), global scope |
| **Category** | Resource Management |

**Root Cause:**

When the process receives `SIGTERM` (from Docker stop, `kill`, systemd shutdown),
any running workers may continue executing. `worker.terminate()` is never called
on graceful shutdown. Node waits for workers to exit before the process ends,
which can delay shutdown by up to `EXECUTION_TIMEOUT` (3s default, up to 60s).

**Proposed Fix:**

```js
// Module-level tracker
const activeWorkers = new Set();

// Push when creating:
const worker = new Worker(__filename, { workerData: { ... } });
activeWorkers.add(worker);

// Pop on all 3 completion paths:
// 1. worker.on("message") → activeWorkers.delete(worker)
// 2. worker.on("error") → activeWorkers.delete(worker)
// 3. setTimeout (timeout) → activeWorkers.delete(worker)

// Graceful shutdown handler:
process.on("SIGTERM", () => {
    console.error(`[Cruncher] Received SIGTERM, terminating ${activeWorkers.size} active workers...`);
    for (const w of activeWorkers) {
        w.terminate();
    }
    process.exit(0);
});

process.on("SIGINT", () => {
    for (const w of activeWorkers) {
        w.terminate();
    }
    process.exit(0);
});
```

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| S (< 20 min) | 2 (SIGTERM during worker, verify no orphaned threads) | Low — additive lifecycle handler |

---

### 🟢 Low

#### CR-12: `evaluate_expression` Recompiles `new Function` on Every Call

| Field | Detail |
|-------|--------|
| **Severity** | 🟢 Low |
| **File/Lines** | `cruncher.js` L1860 (`new Function(...)()`) |
| **Category** | Performance |

**Root Cause:**

```js
const result = new Function("return (" + parsedExpr + ")")();
```

Every call to `evaluate_expression` creates a new Function object and invokes
the V8 JIT compiler. For batch usage with the same expression (e.g., evaluating
a formula with different constant values), this is wasteful. The existing cache
only stores the numeric result — not the compiled function.

**Proposed Fix:**

Store compiled functions in a separate cache:

```js
const compiledExprCache = new Map();  // string → Function
const MAX_COMPILED_CACHE = 100;

// In evaluate_expression handler, after security checks pass:
const exprCacheKey = parsedExpr;  // the fully sanitized expression
let fn = compiledExprCache.get(exprCacheKey);
if (!fn) {
    fn = new Function("return (" + parsedExpr + ")");
    if (compiledExprCache.size >= MAX_COMPILED_CACHE) {
        compiledExprCache.clear();  // simple strategy: clear all
    }
    compiledExprCache.set(exprCacheKey, fn);
}
const result = fn();
```

**Note:** Only cache the compiled function AFTER all security checks pass. Never
cache unsanitized expressions.

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| S (< 20 min) | 1 (verify compiled cache hit returns same result) | Low — pure optimization |

---

#### CR-13: Duplicate Comment Block (Copy-Paste Artifact)

| Field | Detail |
|-------|--------|
| **Severity** | 🟢 Low |
| **File/Lines** | `cruncher.js` L1800–L1804 |
| **Category** | Code Cleanliness |

**Root Cause:**

```js
        // 3.5. Substitute constant names with their numeric values

        // 3.5. Substitute constant names with their numeric values
        //    e.g., "pi * 2" → "3.141592653589793 * 2"
        //    Use word boundaries so "pi" doesn't match inside other identifiers.
        //    Longest constant names are matched first to avoid partial collisions.
        //    Required explicit operator: "2 * pi", not "2pi".
        parsedExpr = parsedExpr.replace(RE_CONSTANTS, (match) => CONSTANTS[match].toString());
```

The "3.5" header appears twice. The actual `replace` call follows the second one.
The first is a dead copy-paste leftover.

**Proposed Fix:**

Delete the first duplicate block (L1800).

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| S (< 1 min) | 0 | None |

---

#### CR-14: Error Messages Inconsistent — `pow` Missing from One

| Field | Detail |
|-------|--------|
| **Severity** | 🟢 Low |
| **File/Lines** | `cruncher.js` L1830 vs L1837 (two error message strings) |
| **Category** | UX |

**Root Cause:**

The `RE_DISALLOWED_CHARS` error message states:

```
"functions (abs, round, floor, ceil, min, max, sin, cos, tan, asin, acos, atan, sqrt, log10, ln, log)"
```

But the `RE_VALID_MATH_CALLS` error message states:

```
"Only abs, round, floor, ceil, min, max, pow, sin, cos, tan, asin, acos, atan, sqrt, log10, log"
```

The first one is **missing `pow`** — so if a user gets a whitelist rejection from
`RE_DISALLOWED_CHARS`, they won't know that `pow()` is a valid function (used
after `^` is converted to `**`). The second message correctly lists `pow`.

**Proposed Fix:**

Add `pow` to the first error message. Better yet: define the function list once
as a constant and use it in both:

```js
const VALID_FUNCTIONS = [
    "abs", "round", "floor", "ceil", "min", "max", "pow",
    "sin", "cos", "tan", "asin", "acos", "atan",
    "sqrt", "log10", "ln", "log"
];
const VALID_FUNCTIONS_STR = VALID_FUNCTIONS.join(", ");
// Use VALID_FUNCTIONS_STR in both error messages
```

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| S (< 10 min) | 0 | None |

---

#### CR-15: `typeof module !== "undefined"` Always Truthy in Node

| Field | Detail |
|-------|--------|
| **Severity** | 🟢 Low |
| **File/Lines** | `cruncher.js` L2460 |
| **Category** | Code Quality |

**Root Cause:**

```js
if (typeof module !== "undefined") {
    module.exports = { ... };
}
```

In Node.js, `module` is always defined (it's a global in CommonJS). This check
is a no-op — `module.exports` will always be set. The guard is unnecessary.

**Proposed Fix:**

Remove the `if` and always export:

```js
module.exports = {
    safeMath,
    countDecimals,
    // ...
};
```

Or, if you want to guard against running in a worker (where `require.main === module`
is false), use the standard pattern:

```js
if (require.main === module) {
    // Running as main script — nothing extra needed
}
```

But since the test file imports `cruncher.js` via `require`, the exports ARE
needed even in the worker context (the test imports them). So just always export.

| Effort | Tests Needed | Regression Risk |
|--------|--------------|-----------------|
| S (< 1 min) | 0 | None |

---

## Code Review Summary

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 3 | CR-1 (double-send race), CR-2 (expression DoS), CR-3 (array DoS) |
| 🟠 High | 2 | CR-4 (stale memory read), CR-5 (variance/std_dev duplication) |
| 🟡 Medium | 6 | CR-6 (tier fragility), CR-7 (FIFO vs LRU), CR-8 (regex chars), CR-9 (temp error msg), CR-10 (divide precision), CR-11 (SIGTERM cleanup) |
| 🟢 Low | 4 | CR-12 (compiled cache), CR-13 (dup comment), CR-14 (inconsistent error), CR-15 (dead guard) |
| **Total** | **15** | |

**Priority Order (recommended fix sequence):**

1. **CR-2** + **CR-3** — DoS vectors, low effort, high impact
2. **CR-1** — Race condition, small effort, eliminates protocol corruption
3. **CR-4** — Stale memory recall, medium effort, correctness fix
4. **CR-5** — Variance/std_dev DRY, trivial effort
5. **CR-8** — Regex cleanup, medium effort, security hardening
6. **CR-9** + **CR-14** — Error messages, tiny effort
7. **CR-6** + **CR-13** + **CR-15** — Code cleanliness, trivial effort
8. **CR-7** + **CR-10** + **CR-11** + **CR-12** — Nice-to-haves

**Estimated Total Effort:** 6–10 hours for all 15 issues.
**Critical Path (CR-1 through CR-5):** 3–5 hours.
