# Cruncher MCP Server - TODO List

## Quick Overview

| # | Task | Status | Effort | Priority | Impact |
|---|------|--------|--------|----------|--------|
| 1 | Scientific Notation Support | `[x]` | L | 🔴 High | High |
| 2 | Atomic Memory Operations | `[x]` | M | 🔴 High | Medium |
| 3 | Configurable Timeout | `[]` | L | 🔴 High | High |
| 4 | More Built-in Functions | `[]` | L | 🟡 Medium | High |
| 5 | Angle Mode Toggle | `[]` | L | 🟡 Medium | Medium |
| 6 | Result Caching | `[]` | M | 🟡 Medium | High |
| 7 | Enhanced Error Messages | `[]` | M | 🟡 Medium | Medium |
| 8 | Batch Operations | `[]` | M | 🟡 Medium | High |
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
| `[]`   | L      | 🔴 High  | High   |

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
| `[]`   | L      | 🟡 Medium | High   |

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
| `[]`   | L      | 🟡 Medium | Medium |

**Description**: Add server-wide angle mode instead of passing unit every time.

**Proposed Tools**:
```javascript
{
  name: "set_angle_mode",
  description: "Set the angle mode for trigonometric functions",
  inputSchema: {
    type: "object",
    properties: {
      mode: { type: "string", enum: ["degrees", "radians"] }
    },
    required: ["mode"]
  }
},
{
  name: "get_angle_mode",
  description: "Get the current angle mode",
  inputSchema: { type: "object", properties: {} }
}
```

**Implementation**:
```javascript
let angleMode = 'degrees'; // default

// Modify trig functions to use global mode if unit not specified
sin: ({ value, unit }) => {
  const useUnit = unit || angleMode;
  // ... existing logic
}
```

**Files to Modify**:
- `cruncher.js` - Add state variable, new tools, modify trig handlers

**Tests to Add**:
- Set mode to radians, sin(PI/2) = 1
- Set mode to degrees, sin(90) = 1
- Get mode returns current mode
- Explicit unit parameter overrides global mode

---

### 6. Result Caching
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[]`   | M      | 🟡 Medium | High   |

**Description**: Cache expensive calculations to improve performance for repeated operations.

**Proposed Implementation**:
```javascript
const cache = new Map();
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL = 60000; // 1 minute

const getCachedOrCompute = (key, compute) => {
  if (cache.has(key)) {
    const cached = cache.get(key);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.value;
    }
    cache.delete(key);
  }
  
  const result = compute();
  
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  
  cache.set(key, { value: result, timestamp: Date.now() });
  return result;
};

// Usage in factorial:
factorial: ({ n }) => getCachedOrCompute(`factorial:${n}`, () => {
  // ... existing logic
})
```

**Cache Key Strategy**:
- `evaluate_expression:${expression}`
- `factorial:${n}`
- `sqrt:${value}`

**Files to Modify**:
- `cruncher.js` - Add cache module, wrap expensive operations

**Tests to Add**:
- Second call to same expression is faster
- Cache respects TTL
- Cache evicts oldest when full

---

### 7. Enhanced Error Messages
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[]`   | M      | 🟡 Medium | Medium |

**Description**: Include more context in errors for better debugging.

**Current Error**:
```json
{ "error": "Value must be a number" }
```

**Proposed Error**:
```json
{
  "error": {
    "code": "INVALID_TYPE",
    "message": "Value must be a number",
    "details": {
      "parameter": "a",
      "expected": "number",
      "received": "string",
      "receivedValue": "hello",
      "tool": "add"
    }
  }
}
```

**Files to Modify**:
- `cruncher.js` - `validateArguments`, error handlers

**Tests to Add**:
- Errors include parameter name
- Errors include expected type
- Errors include received value
- Backward compatibility with existing error parsing

---

### 8. Batch Operations
| Status | Effort | Priority | Impact |
|--------|--------|----------|--------|
| `[]`   | M      | 🟡 Medium | High   |

**Description**: Execute multiple calculations in a single request to reduce round trips.

**Proposed Tool**:
```javascript
{
  name: "batch",
  description: "Execute multiple tool calls in sequence. Returns array of results.",
  inputSchema: {
    type: "object",
    properties: {
      operations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tool: { type: "string" },
            arguments: { type: "object" }
          },
          required: ["tool"]
        },
        minItems: 1,
        maxItems: 50
      }
    },
    required: ["operations"]
  }
}
```

**Example Usage**:
```javascript
batch({
  operations: [
    { tool: "add", arguments: { a: 1, b: 2 } },
    { tool: "multiply", arguments: { a: 3, b: 4 } },
    { tool: "sqrt", arguments: { value: 144 } }
  ]
})
// Returns: [3, 12, 12]
```

**Files to Modify**:
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
| 2 | Configurable Timeout | 🔴 High | High | L | Quick win, improves usability |
| ✅ 3 | Atomic Memory Operations | 🔴 High | Medium | M | **DONE** - Fixes concurrency bug |
| 4 | More Built-in Functions | 🟡 Medium | High | L | Easy to add, high value |
| 5 | Result Caching | 🟡 Medium | High | M | Performance improvement |
| 6 | Batch Operations | 🟡 Medium | High | M | Reduces round trips |
| 7 | Enhanced Error Messages | 🟡 Medium | Medium | M | Improves debugging |
| 8 | Angle Mode Toggle | 🟡 Medium | Medium | L | Quality of life improvement |
| 9 | Unit Conversion | 🟡 Medium | Medium | M | New feature |
| 10 | Statistics Mode | 🟢 Low | Medium | M | Nice to have |
| 11 | Expression History | 🟢 Low | Low | L | Nice to have |
| 12 | Complex Numbers | 🟢 Low | Low | H | Niche use case |
| 13 | Progress Streaming | 🟢 Low | Low | H | Niche use case |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
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
**Completed**: 2 ✅  
**In Progress**: 0  
**Remaining**: 11
