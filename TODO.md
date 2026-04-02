# Cruncher MCP Server - TODO List

## Quick Overview

| # | Task | Status | Effort | Priority | Impact |
|---|------|--------|--------|----------|--------|
| 1 | Scientific Notation Support | `[x]` | L | 🔴 High | High |
| O1 | Performance Optimizations | `[x]` | M | 🔴 High | High |
| O2 | Context Token Optimization | `[x]` | L | 🔴 High | High |
| O3 | Tiered Tool Exposure | `[x]` | L | 🔴 High | High |
| O4 | Constants in evaluate_expression | `[x]` | M | 🔴 High | High |
| O5 | Fuzzy Tool Name Matching | `[x]` | S | 🔴 High | High |
| O6 | Extended evaluate_expression Built-ins | `[x]` | S | 🔴 High | High |
| O7 | Improved Domain Error Messages | `[x]` | S | 🔴 High | High |
| 2 | Atomic Memory Operations | `[x]` | M | 🔴 High | Medium |
| 3 | Configurable Timeout | `[x]` | L | 🔴 High | High |
| 4 | More Built-in Functions | `[x]` | L | 🟡 Medium | High |
| 5 | Angle Mode Toggle | `[x]` | L | 🟡 Medium | Medium |
| 6 | Result Caching | `[x]` | M | 🟡 Medium | High |
| 7 | Enhanced Error Messages | `[x]` | M | 🟡 Medium | Medium |
| 8 | Batch Operations | `[x]` | M | 🟡 Medium | High |
| 9 | Unit Conversion Tool | `[]` | M | 🟡 Medium | Medium |
| 10 | Complex Number Support | `[]` | H | 🟢 Low | Low |
| 11 | Progress Streaming | `[]` | H | 🟢 Low | Low |
| 12 | Statistics Mode | `[]` | M | 🟢 Low | Medium |
| 13 | Expression History | `[]` | L | 🟢 Low | Low |

---

## Legend

### Status
- `[]` - Not started
- `[/]` - In progress  
- `[x]` - Implemented

### Effort
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

## High Priority

### 1. Scientific Notation Support
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[x]`  | L      | 🔴 High  | High   |

**Implemented**: 2026-03-13

**Implementation Details**:
- Converts scientific notation (e.g., `1e6`, `2.5e-3`) to `Math.pow` expressions before security check
- Supports both `e` and `E` notation
- Supports positive (`1e+6`) and negative (`1e-3`) exponents
- Works with decimal coefficients (`2.5e3`)

**Description**: The security regex blocks `e` which prevents scientific notation like `1e6` (1 million) or `2.5e-3`.

**Current Behavior**:
```javascript
// Blocks 1e6 (1 million)
if (!/^[0-9+\-*/().% \t*]+$/.test(parsedExpr)) {
  throw new Error("Security Error: Expression contains invalid characters...");
}
```

**Proposed Solution**:
```javascript
// Allow e/E only when followed by +/- and digits (e.g., 1e6, 2.5e-3)
// Add before security check:
const scientificNotationPattern = /(\d\.?\d*)e([+-]?\d+)/gi;
const sanitizedExpr = parsedExpr.replace(scientificNotationPattern, '($1 * Math.pow(10, $2))');
```

**Files to Modify**:
- `cruncher.js` - `evaluate_expression` handler

**Tests to Add**:
- `1e6` evaluates to `1000000`
- `2.5e-3` evaluates to `0.0025`
- `1e+6` evaluates to `1000000`
- Invalid scientific notation still rejected

---

### 2. Atomic Memory Operations
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[x]`  | M      | 🔴 High  | Medium |

**Implemented**: 2026-03-13

**Implementation Details**:
- Added promise-based queue at main thread level (`memoryQueue`)
- Memory operations (`memory_add`, `memory_subtract`, `memory_clear`) are serialized
- Each memory operation waits for previous operations to complete before spawning worker
- Non-memory operations run concurrently as before

**Description**: Concurrent `memory_add` calls aren't atomic. Since the server uses worker threads, memory state can have race conditions when multiple operations happen simultaneously.

**Current Behavior**: Tests revealed that concurrent memory operations lose updates.

**Proposed Solution**:
```javascript
let memoryLock = Promise.resolve();

// Wrap all memory operations
const atomicMemoryOp = async (op) => {
  await memoryLock;
  let resolve;
  memoryLock = new Promise(r => resolve = r);
  try {
    return op();
  } finally {
    resolve();
  }
};

// In handlers:
memory_add: async ({ value }) => {
  return atomicMemoryOp(() => {
    memory += value;
    return memory;
  });
}
```

**Files to Modify**:
- `cruncher.js` - Add lock mechanism and wrap memory handlers

**Tests to Add**:
- 100 concurrent `memory_add(1)` calls result in `memory = 100`
- Concurrent `memory_add` and `memory_subtract` work correctly

---

### 3. Configurable Timeout
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[x]`  | L      | 🔴 High  | High   |

**Implemented**: 2026-03-13

**Implementation Details**:
- Added optional `timeout` parameter (100-60000ms) to `factorial`, `median`, `percentile`
- Default timeout remains 3000ms (configurable via `CRUNCHER_TIMEOUT` env var)
- Timeout parameter is extracted before passing args to worker thread
- 6 new tests added

**Example Usage**:
```javascript
factorial({ n: 50000, timeout: 30000 })     // 30 seconds for large factorial
median({ numbers: [...], timeout: 10000 })  // 10 seconds for large array
```

**Description**: Allow per-request timeout override instead of fixed 3-second timeout.

**Current Behavior**: All requests timeout at 3 seconds (`CRUNCHER_TIMEOUT`).

**Proposed Solution**:
```javascript
// Add optional timeout to tool schemas that need it
inputSchema: {
  type: "object",
  properties: {
    numbers: { type: "array", items: { type: "number" } },
    timeout: { type: "number", minimum: 100, maximum: 30000, description: "Custom timeout in ms (optional)" }
  },
  required: ["numbers"]
}

// In handler, use custom timeout if provided
const timeout = args.timeout || EXECUTION_TIMEOUT;
```

**Files to Modify**:
- `cruncher.js` - Update `evaluate_expression`, `factorial`, `median` tool schemas

**Tests to Add**:
- Short timeout (100ms) times out on complex calculation
- Long timeout (10s) allows complex calculation to complete
- Invalid timeout (negative, too large) returns error

---

## Medium Priority

### 4. Add More Built-in Functions
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[x]`  | L      | 🟡 Medium | High   |

**Implemented**: 2026-03-13

**Functions Added**:
- `abs(x)` - Absolute value: `abs(-5)` → `5`
- `round(x)` - Round to nearest: `round(3.7)` → `4`
- `floor(x)` - Round down: `floor(3.7)` → `3`
- `ceil(x)` - Round up: `ceil(3.2)` → `4`
- `min(a, b, ...)` - Minimum value: `min(1, 2, 3)` → `1`
- `max(a, b, ...)` - Maximum value: `max(1, 2, 3)` → `3`

**Implementation Details**:
- Functions are converted to `Math.*` equivalents before security check
- Works with complex expressions: `abs(-5) + round(3.7)` → `9`
- 18 new tests added

**Description**: Expand `evaluate_expression` to support common math functions.

**Proposed Functions**:
```javascript
const mathFunctions = {
  abs: Math.abs,      // abs(-5) = 5
  round: Math.round,  // round(3.7) = 4
  floor: Math.floor,  // floor(3.7) = 3
  ceil: Math.ceil,    // ceil(3.2) = 4
  min: Math.min,      // min(1, 2, 3) = 1
  max: Math.max,      // max(1, 2, 3) = 3
};
```

**Implementation Approach**:
1. Parse function calls in expression
2. Validate arguments
3. Execute safely with bound arguments

**Files to Modify**:
- `cruncher.js` - `evaluate_expression` handler

**Tests to Add**:
- `abs(-5)` evaluates to `5`
- `round(3.7)` evaluates to `4`
- `floor(3.7)` evaluates to `3`
- `ceil(3.2)` evaluates to `4`
- Nested functions: `abs(floor(-3.7))` evaluates to `3`

---

### 5. Angle Mode Toggle
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[x]`   | L      | 🟡 Medium | Medium |

**Implemented**: 2026-04-01

**Description**: Add server-wide angle mode instead of passing unit every time.

**Implementation Details**:
- Global `angleMode` variable with default `"radians"`
- `set_angle_mode` tool: updates global mode (degrees|radians)
- `get_angle_mode` tool: returns current mode as JSON
- `toRadians()` and `fromRadians()` helpers default to global mode when `unit` param is omitted
- Explicit `unit` parameter overrides global mode (backward compatible)
- Trigonometric functions moved to main-thread execution for state persistence (also eliminates worker overhead for instant Math.* calls)
- Both management tools AND all 6 trig functions run in main thread

**Tests Added**: 10 angle mode tests (default mode, set/get, degrees, radians, override, inverse trig)

---

### 6. Result Caching
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[x]`   | M      | 🟡 Medium | High   |

**Implemented**: 2026-04-01

**Description**: Cache expensive calculations to improve performance for repeated operations.

**Implementation Details**:
- Main thread cache (Map) that intercepts worker results and stores them
- Cache hit check happens in main thread before worker spawn — zero-cost hits
- 1000 entry LRU-eviction FIFO cache with 5-minute TTL
- Non-cacheable tools: memory_clear/ad/subtract/recall, batch, cache_clear, cache_info
- `cache_clear` tool: clears all cached results
- `cache_info` tool: returns JSON with size, max_size, ttl_ms stats
- Both management tools run directly in main thread (avoiding worker isolation)
- Cache evicts oldest when full

---

### 7. Enhanced Error Messages
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[x]`   | M      | 🟡 Medium | Medium |

**Implemented**: 2026-03-31

**Description**: Include more context in errors for better debugging.

**Implementation Details**:
- Refactored `sendError(id, code, errorDetails)` to accept structured `errorDetails` object with `message` and optional `data` payload
- Created `structuredValidationError(code, message, details)` helper that returns `{ code, message, data: { parameter, expected, received, receivedValue, tool } }`
- Updated `validateArguments(schema, args, path, toolName)` to throw structured error objects instead of plain strings
- Added 10 new tests covering: missing params, wrong types, enum validation, math domain errors, division by zero, factorial edge cases, empty arrays, and base conversion errors
- Backward compatible: `sendError` still handles legacy plain-string third arguments gracefully

**Error Response Format**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Validation Error: Missing required property 'b' at root",
    "data": {
      "parameter": "b",
      "expected": "defined value",
      "received": "undefined",
      "receivedValue": null,
      "tool": "add"
    }
  }
}
```

---

### 8. Batch Operations
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[x]`   | M      | 🟡 Medium | High   |

**Implemented**: 2026-04-01

**Description**: Execute multiple calculations in a single request to reduce round trips.

**Implementation Details**:
- Added `batch` tool that accepts array of `{ tool, args }` operations
- Executes operations sequentially in main thread (no worker overhead)
- Partial failure tolerance: continues processing even if individual operations fail
- Each result includes `{ index, tool, success, data/error }`
- Results returned as JSON.stringify'd array string
- Batch limited to 50 operations per request for performance
- Validates each operation schema before execution (non-blocking: skips failures)
- `cruncher.js` - Add batch tool and handler

**Tests to Add**:
- Batch of 3 operations returns correct results
- Batch with one error returns error for that operation
- Batch respects max 50 operations limit
- Empty batch returns error

---

### 9. Unit Conversion Tool
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[]`   | M      | 🟡 Medium | Medium |

**Description**: Add common unit conversions beyond base conversion.

**Proposed Tool**:
```javascript
{
  name: "convert_unit",
  description: "Convert between common units of measurement",
  inputSchema: {
    type: "object",
    properties: {
      value: { type: "number" },
      from: { type: "string" },
      to: { type: "string" },
      category: { 
        type: "string", 
        enum: ["length", "weight", "temperature", "area", "volume", "time"] 
      }
    },
    required: ["value", "from", "to", "category"]
  }
}
```

**Supported Conversions**:
- Length: m, km, cm, mm, in, ft, yd, mi
- Weight: kg, g, mg, lb, oz
- Temperature: C, F, K
- Area: m2, km2, ft2, ac, ha
- Volume: L, mL, gal, qt, pt, cup
- Time: s, min, hr, day, week

**Files to Modify**:
- `cruncher.js` - Add new tool with conversion logic

**Tests to Add**:
- 1 km = 1000 m
- 32 F = 0 C
- 1 lb = 16 oz
- Invalid unit returns error

---

## Low Priority

### 10. Complex Number Support
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[]`   | H      | 🟢 Low   | Low    |

**Description**: Support complex number operations for advanced mathematical use cases.

**Proposed Tools**:
```javascript
{
  name: "complex_add",
  name: "complex_multiply",
  name: "complex_conjugate",
  name: "complex_magnitude",
  name: "complex_phase",
  name: "complex_from_polar"
}
```

**Example**:
```javascript
complex_add({ real1: 1, imag1: 2, real2: 3, imag2: 4 })
// Returns: { real: 4, imag: 6 }
```

**Files to Modify**:
- `cruncher.js` - Add complex number module and tools

**Tests to Add**:
- Basic arithmetic
- Magnitude and phase
- Polar conversion
- Edge cases (zero, purely real, purely imaginary)

---

### 11. Progress Streaming
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[]`   | H      | 🟢 Low   | Low    |

**Description**: Send progress updates for long-running calculations.

**Proposed Implementation**:
```javascript
// JSON-RPC notification for progress
const sendProgress = (percent, message) => {
  process.stdout.write(JSON.stringify({
    jsonrpc: "2.0",
    method: "progress",
    params: { percent, message }
  }) + "\n");
};

// Usage in factorial:
factorial: ({ n }) => {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
    if (i % 1000 === 0) {
      sendProgress(Math.round((i / n) * 100), `Computing ${i}/${n}`);
    }
  }
  return result;
}
```

**Files to Modify**:
- `cruncher.js` - Add progress notification support

**Tests to Add**:
- Long calculation sends progress notifications
- Progress percentage is accurate
- Client can handle progress notifications

---

### 12. Statistics Mode
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[]`   | M      | 🟢 Low   | Medium |

**Description**: Add statistical functions with sample/population mode.

**Proposed Tools**:
```javascript
{
  name: "variance",
  description: "Calculate variance of numbers",
  inputSchema: {
    type: "object",
    properties: {
      numbers: { type: "array", items: { type: "number" } },
      mode: { type: "string", enum: ["sample", "population"], default: "sample" }
    }
  }
},
{
  name: "std_dev",
  description: "Calculate standard deviation"
},
{
  name: "correlation",
  description: "Calculate correlation coefficient between two datasets"
}
```

**Files to Modify**:
- `cruncher.js` - Add statistical tools

**Tests to Add**:
- Sample vs population variance
- Standard deviation
- Correlation coefficient
- Edge cases (single value, identical values)

---

### 13. Expression History
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[]`   | L      | 🟢 Low   | Low    |

**Description**: Store and recall previous expressions.

**Proposed Tools**:
```javascript
{
  name: "history_list",
  description: "List recent expressions and results"
},
{
  name: "history_recall",
  description: "Recall result from history by index"
},
{
  name: "history_clear",
  description: "Clear expression history"
}
```

**Files to Modify**:
- `cruncher.js` - Add history storage and tools

**Tests to Add**:
- Expression stored after evaluation
- History list returns recent expressions
- Recall by index works
- History clear works
- History respects max size

---

## Implementation Order

Based on priority, impact, and dependencies:

| Order | Task | Priority | Impact | Effort | Rationale |
|-------|------|----------|--------|--------|-----------|
| ✅ 1 | Scientific Notation | 🔴 High | High | L | **DONE** - Unblocks common use case |
| ✅ 2 | Configurable Timeout | 🔴 High | High | L | **DONE** - For factorial/median/percentile |
| ✅ 3 | Atomic Memory Operations | 🔴 High | Medium | M | **DONE** - Fixes concurrency bug |
| ✅ 4 | More Built-in Functions | 🟡 Medium | High | L | **DONE** - Added abs/round/floor/ceil/min/max |
| 5 | Result Caching | ✅ Done | High | M | Performance improvement |
| 6 | Batch Operations | 🟡 Medium | High | M | Reduces round trips |
| 7 | Enhanced Error Messages | ✅ Done | Medium | M | Improves debugging |
| 8 | Angle Mode Toggle | ✅ Done | Medium | L | Quality of life improvement |
| 9 | Unit Conversion | 🟡 Medium | Medium | M | New feature |
| 10 | Statistics Mode | 🟢 Low | Medium | M | Nice to have |
| 11 | Expression History | 🟢 Low | Low | L | Nice to have |
| 12 | Complex Numbers | 🟢 Low | Low | H | Niche use case |
| 13 | Progress Streaming | 🟢 Low | Low | H | Niche use case |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-02 | v1.2.20 | Tiered tool exposure (CRUNCHER_TOOL_SET: minimal/standard/full) |
| 2026-04-02 | v1.2.11 | Context token optimization (~40% description reduction) |
| 2026-04-02 | v1.2.10 | O(1) tool lookup, batch cache, conditional worker clone |
| 2026-04-02 | v1.2.9 | Moved 15 instant tools from workers to main thread |
| 2026-03-13 | v1.2.1 | Added `convert_base` tool (32 tools total) |
| 2026-03-11 | v1.2.0 | Added `evaluate_expression`, worker threads, strict validation |
| 2026-03-01 | v1.1.0 | Added statistics functions, memory operations |
| 2026-02-15 | v1.0.0 | Initial release with basic math operations |

---

## Testing Requirements

For each new feature:
- [ ] Unit tests for success cases
- [ ] Unit tests for error cases
- [ ] Edge case tests
- [ ] Integration tests with other features
- [ ] Documentation updated in README.md
- [ ] Test count updated in README-TESTS.md and TEST_REPORT.md

---

**Last Updated**: 2026-03-13  
**Total Tasks**: 13  
**Completed**: 4 ✅  
**In Progress**: 0  
**Remaining**: 9
