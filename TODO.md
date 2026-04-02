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

- Trimmed redundant tool descriptions across all 36 tools (~560 tokens saved)
- `evaluate_expression` promoted as PRIMARY tool
- Removed repetitive warnings and verbose examples

### O4: Tiered Tool Exposure (v1.2.12)
**Implemented**: 2026-04-02

- `CRUNCHER_TOOL_SET` env var: `minimal` (5), `standard` (34 **default**), `full` (42)
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

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
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

**Version**: v1.2.23
**Last Updated**: 2026-04-02
**Total Tasks**: 15
**Completed**: 13 ✅
**Skipped**: 3 🚫 (low impact, disproportionate effort)

**Project Status**: Feature-complete 🎉
