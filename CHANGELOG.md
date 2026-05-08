# Changelog

All notable changes to Cruncher MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.29] — 2026-05-08

### Added
- `server.json` for MCP Registry discovery (validated against live registry API)
- `mcpName` field in `package.json` for registry discovery
- Truncated description to fit registry 100-char limit

### Fixed
- **Worker timeout double-send race (CR-1)**: Added `responded` guard across all 3 worker completion paths (timeout, message, error) to prevent two JSON-RPC responses being emitted for the same request ID when a worker finishes just as the timeout fires
- **Expression DoS prevention (CR-2)**: Added `MAX_EXPR_LENGTH=4096` cap on `evaluate_expression` input — rejects oversized expressions BEFORE any regex processing or `new Function` compilation, preventing OOM crashes from gigabyte-sized expression strings
- **Array DoS prevention (CR-3)**: Added `MAX_ARRAY_LENGTH=10000` cap in `validateArguments` for all array-typed parameters — prevents 10M-element arrays from freezing the event loop. Replaced `Math.min/max(...arr)` spread operator (which crashes V8 beyond ~125K elements) with safe loop-based implementations in `min`, `max`, and `range` handlers

## [1.2.28] — 2026-04-29

### Added
- **MCP spec 2025-11-25 compliance**: Protocol version bumped from `2024-11-05` to `2025-11-25` (latest, backward compatible)
- **Tool annotations** on all 43 tools (`title`, `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) — signals safety metadata to MCP clients
- **`-y` flag** added to all npx client configs in README.md

## [1.2.27] — 2026-04-28

### Fixed
- Silence malformed JSON stdin lines instead of logging full `SyntaxError` stack traces (matches official MCP SDK `StdioServerTransport` behavior)

### Added
- **`ping` method**: Returns empty result `{}` for MCP liveness checks — required by spec and sent by most MCP clients
- **Notification handling**: Silently accepts and ignores notifications (messages without `id`) like `notifications/initialized`, `notifications/cancelled`, etc. — matches MCP SDK behavior
- **Protocol compliance tests** (section 54, 5 tests): ping, notifications/initialized, unknown notifications, garbage stdin resilience, garbage+ping combo
- **Tool annotations** (MCP spec 2025-11-25): All 43 tools now include `annotations` with `title`, `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`

### Changed
- **Protocol version bumped**: `2024-11-05` → `2025-11-25` (latest MCP spec, backward compatible)
- Test suite: 330 → 335 tests, 100% pass rate
- `package.json` normalized via `npm pkg fix` (bin paths, repository URL prefix)
- README.md: Added `-y` flag to all npx client configs

## [1.2.26] — 2026-04-23

### Added
- **Assert API in tests**: 16+ manual `parseFloat + throw` assertions replaced with `@slbdn/mcp-tester` assert functions (`toolNumEquals`, `toolNumCloseTo`, etc.)
- **CHANGELOG.md**: Added v1.2.24 and v1.2.25 entries (npm publication, assert API, test refactor)

### Changed
- **Test restructure**: `test-cruncher-full.ts`, `TEST_REPORT.md`, `README-TESTS.md` moved to `tests/` directory
- **README-TESTS.md**: Full refresh — `@slbdn/mcp-tester` v1.1.0, assert API reference table, updated examples
- **TEST_REPORT.md**: Fixed stale counts ("01 tools" → 43, "221 tests" → 330, "0.1+0.2=0.0" → 0.3), full 36-section results table
- **TODO.md**: Fixed "36 tools" → "43 tools", updated version tables with v1.2.26
- **CONTRIBUTING.md**: Updated all file paths to `tests/` directory
- **package.json**: Test script updated to `npx tsx tests/test-cruncher-full.ts`

### Fixed
- All markdown docs refreshed with accurate, consistent information

## [1.2.25] — 2026-04-23

### Added
- **npm publication**: Package published as `@slbdn/cruncher-mcp` on npm registry
- All MCP client configurations now prioritize `npx @slbdn/cruncher-mcp` over manual file download
- `@slbdn/mcp-tester` assert API used in test suite (`toolNumEquals`, `toolNumCloseTo`, etc.)

### Changed
- `package.json` renamed to `@slbdn/cruncher-mcp` with bin entry
- Version bumped to 1.2.25 across all docs

### Fixed
- All 6 trig tool descriptions corrected to say "degrees by default" (was incorrectly "radians")
- AGENTS.md: `evaluate_expression` always uses radians (JavaScript standard), global angle mode only affects individual tool calls
- AGENTS.md: `batch` schema param is `args` not `arguments`
- AGENTS.md: `set_angle_mode` schema param is `mode` not `unit`
- `package.json` description: stale "42 tools" → "43 tools"
- Double comma syntax error in `evaluate_expression` description
- Test suite angle default: radians → degrees (to match code + docs)

### Refactor
- Test files moved to `tests/` directory (`test-cruncher-full.ts`, `TEST_REPORT.md`, `README-TESTS.md`)
- Replaced 16+ manual `parseFloat + throw` patterns with `@slbdn/mcp-tester` assert API

## [1.2.24] — 2026-04-16

### Changed
- Migrated test dependency from local `../mcp-tester` to `@slbdn/mcp-tester` npm package
- Version bumped to 1.2.24 across all docs

## [1.2.23] — 2026-04-02

### Added
- **Test suite expansion**: 302 → 330 tests (+28, 100% pass) — 8 new sections covering:
  - Full-mode exclusive tools (convert_base, batch, cache_clear/info, percentile)
  - Missing `evaluate_expression` built-ins (log(x,base), euler_mascheroni, h, NA constants)
  - Expression injection security tests (eval(), require(), process.exit())
  - Variance/std_dev edge cases (single-element sample, negative numbers)
  - Unit conversion edge cases (reverse m→km, -40°C/F intersection, absolute zero)
  - Batch boundary tests (49 ops, 50 ops exact limit, mixed operations)
  - Fuzzy tool name edge cases (fctorial, multply, sub prefix)
  - Remaining physical constants in expressions (e_charge, m_e)
- **`CHANGELOG.md`** — Complete version history from v1.0.0 to v1.2.22
- **`CONTRIBUTING.md`** — Developer guide with tool-adding workflow, test examples, PR checklist
- **`SECURITY.md`** — 5-layer expression security model, threat matrix, deployment best practices
- **`.editorconfig`** — Consistent 4-space JS/TS, 2-space JSON/YAML, LF endings
- **`package.json`** — Scripts (`start`, `test`, `test:quick`, `check-syntax`), metadata, binary entry

### Changed
- All GitHub URLs point to correct repo: `islobodan/cruncher-mcp`
- Node.js requirement: >= 16 → >= 18
- README badges now link to correct sources
- TODO.md: 3 low-impact items marked intentionally skipped
  - Complex numbers: niche, LLM iterates conversationally
  - Progress streaming: worker timeout handles long ops
  - Expression history: redundant with LLM conversation context

### Why
- Production-grade repo requires standard metadata files
- Enables `npm start`, `npm test` conventions
- SECURITY.md documents expression whitelist + worker isolation for audit
- CONTRIBUTING.md reduces onboarding friction for new contributors
- TODO.md closure signals project maturity

---

## [1.2.22] — 2026-04-02

### Added
- **`convert_unit` tool** — 80+ conversions across 8 categories:
  - Length: m, km, cm, mm, µm, nm, in, ft, yd, mi, nmi
  - Weight: kg, g, mg, µg, lb, oz, st, t
  - Temperature: °C, °F, K (non-linear formulas)
  - Area: m², km², cm², ft², ac, ha, in², yd², mi²
  - Volume: L, mL, m³, cm³, gal, qt, pt, cup, fl oz, tbsp, tsp, imp_gal
  - Time: s, ms, µs, ns, min, hr, day, week, month, year
  - Speed: m/s, km/h, mph, kn, ft/s, mach, c
  - Digital storage: B, KB, MB, GB, TB, PB, b, Kb, Mb, Gb
- Case-insensitive unit matching
- Structured JSON response: `{ value, from, to, result, category }`
- 25 new tests covering all categories, edge cases, and validation errors

### Changed
- Added `convert_unit` to standard tier (now 34 tools)
- Full tier now has 42 tools

## [1.2.21] — 2026-04-02

### Fixed
- README.md tier counts: standard 33, full 41 (were wrong in multiple places)
- README.md default tool set: `standard` (was documented as `full`)
- Missing 8 tools in Available Tools table (variance, std_dev, percentage_*, batch, cache tools, angle tools)
- Example configs across Claude Desktop, Cline, Goose, Zed, LM Studio, LibreChat

### Changed
- Updated example questions to reflect current feature set
- Added "Full Tier Examples" subsection in README

## [1.2.20] — 2026-04-02

### Changed
- Moved `memory_*` tools to full tier (stateful, less common)
- Moved `convert_base` to full tier (specialized use)
- Moved `percentile` to full tier (advanced statistics)
- Standard tier now 33 tools (focused on everyday math)
- Full tier now 41 tools

## [1.2.19] — 2026-04-02

### Added
- **`percentage_of`** — What is X% of Y?
- **`percentage_change`** — Percentage change from A to B
- **`percentage_reverse`** — X is Y% of what?
- 9 new tests

### Why
- Anti-hallucination: prevents LLM math errors on percentage calculations
- Semantic tool selection over manual computation

## [1.2.18] — 2026-04-02

### Added
- **`variance`** — Sample (n-1) or population (n) variance
- **`std_dev`** — Sample (n-1) or population (n) standard deviation
- 8 new tests

### Changed
- Both added to standard tier

## [1.2.17] — 2026-04-02

### Changed
- Default `CRUNCHER_TOOL_SET` changed from `full` → `standard`
- Added trig + angle tools to standard tier
- Saves ~400 tokens per request for default users

## [1.2.16] — 2026-04-02

### Changed
- Trimmed redundant domain constraint text from `asin`/`acos` descriptions
- Constraints already enforced by JSON Schema enum — description duplication removed

## [1.2.15] — 2026-04-02

### Added
- **Trigonometric functions in `evaluate_expression`**: `sin()`, `cos()`, `tan()`, `asin()`, `acos()`, `atan()`
- **Math functions in `evaluate_expression`**: `sqrt()`, `log10()`, `ln()`, `log(x, base)`
- **Improved domain error messages**: NaN/Infinity checks with specific hints
  - `sqrt(-1)` → hints about negative input
  - `1/0` → hints about division by zero
  - `asin(5)` → hints about valid range [-1, 1]

### Changed
- 18 new tests

## [1.2.14] — 2026-04-02

### Added
- **Fuzzy tool name matching** using Levenshtein distance + prefix shortcut
- Typos like `sinn` → `sine`, `squrt` → `sqrt`, `fac` → `factorial`
- Suggests `"Did you mean 'X'?"` for close matches
- No suggestions for gibberish (`totally_wrong` → no match)

### Changed
- 8 new tests

## [1.2.13] — 2026-04-02

### Added
- **Constants in `evaluate_expression`**: Use `pi`, `e`, `tau`, `phi`, `sqrt2`, `euler_mascheroni`, `c`, `g`, `G`, `h`, `k`, `R`, `NA`, `e_charge`, `m_e`, `m_p` directly in strings
- Longest-match-first substitution (`euler_mascheroni` won't collide with `e`)

### Changed
- Shared `CONSTANTS` object between `get_constant` tool and expression substitution
- Requires explicit operator: `2 * pi` works, `2pi` does not

## [1.2.12] — 2026-04-02

### Added
- **`CRUNCHER_TOOL_SET` environment variable** — Three tiers:
  - `minimal` (5 tools): Core arithmetic only
  - `standard` (26 tools): Math + stats + constants
  - `full` (36 tools): Everything (was default)
- Reduces context token usage by up to 90% in minimal mode

### Added (tests)
- 20 tiered tool exposure tests

## [1.2.11] — 2026-04-02

### Changed
- Trimmed redundant tool descriptions (~560 tokens saved, ~40% reduction)
- Promoted `evaluate_expression` as PRIMARY tool in description
- Removed repetitive warnings and verbose examples across all tools

## [1.2.10] — 2026-04-02

### Changed
- **O(1) tool lookup** via `TOOL_LOOKUP_MAP` (replaced O(n) `TOOLS.find()`)
- **Batch cache integration**: batch sub-ops check cache before execution
- **Conditional worker args clone**: only clone for timeout-enabled tools
- Supported-methods Set in `validateMessage`

## [1.2.9] — 2026-04-02

### Changed
- **Moved 15 instant tools from worker threads to main thread**:
  `power`, `sqrt`, `logarithm`, `natural_log`, `absolute`, `get_constant`, `memory_recall`, `count`, `min`, `max`
- 40-80ms latency reduction per instant call
- Eliminated double-validation overhead
- Pre-compiled regexes for `evaluate_expression`

## [1.2.8] — 2026-04-01

### Added
- **`set_angle_mode`** — Set global trig angle mode (degrees/radians)
- **`get_angle_mode`** — Get current angle mode
- Global `angleMode` state; explicit `unit` param overrides global mode

### Changed
- Trig functions moved to main-thread execution (state persistence)
- 10 new tests

## [1.2.7] — 2026-04-01

### Added
- **Result caching**: Main-thread Map cache (1000 entries, 5-min TTL, LRU eviction)
- **`cache_clear`** — Clear computation cache
- **`cache_info`** — Show cache stats (size, max_size, ttl_ms)

### Changed
- Cache hit check before worker spawn (zero-cost hits)
- Non-cacheable tools: memory ops, batch, cache management
- 6 new tests

## [1.2.6] — 2026-04-01

### Added
- **`batch`** — Execute up to 50 tool calls in one request
- Partial failure tolerance (continues on individual errors)
- Sequential execution in main thread (no worker overhead)
- Result format: `[{ index, tool, success, data/error }, ...]`

### Changed
- 5 new tests

## [1.2.5] — 2026-03-31

### Added
- **Structured error responses** with `data` payload:
  `{ parameter, expected, received, receivedValue, tool }`
- `validateMessage` now sends errors with structured context

### Changed
- `validateArguments` throws structured error objects instead of plain strings
- `sendError` handles both structured errors and legacy plain strings
- `structuredValidationError()` helper function
- 10 new tests

## [1.2.4] — 2026-03-13

### Added
- **Configurable per-request timeout** (100-60000ms) for `factorial`, `median`, `percentile`
- Optional `timeout` parameter in tool arguments
- `CRUNCHER_TIMEOUT` env var for global default

### Changed
- 6 new tests

## [1.2.3] — 2026-03-13

### Added
- **Built-in functions in `evaluate_expression`**:
  `abs()`, `round()`, `floor()`, `ceil()`, `min()`, `max()`

### Changed
- Functions converted to `Math.*` before security check
- Works with complex/nested expressions
- 18 new tests

## [1.2.2] — 2026-03-13

### Added
- **Scientific notation** in `evaluate_expression`: `1e6`, `2.5e-3`, `1e+6`
- Converted to safe `Math.pow` before security check
- **Atomic memory operations**: promise-based queue (`memoryQueue`) serializes concurrent memory ops

### Fixed
- Race condition when concurrent `memory_add`/`memory_subtract` calls lose updates
- Scientific notation `e` blocked by security regex

### Changed
- 6 new tests

## [1.2.1] — 2026-03-13

### Added
- **`convert_base`** — Convert between binary, octal, decimal, hexadecimal
- Input validation for base-specific characters
- Case-insensitive output (hex uppercase)

### Changed
- 11 new tests

## [1.2.0] — 2026-03-11

### Added
- **`evaluate_expression`** — Safe string-based math evaluation with strict regex whitelist
- **Worker thread isolation** with 3-second timeout (configurable via `CRUNCHER_TIMEOUT`)
- **Custom recursive JSON-Schema validator** — no external dependencies (no zod)
- **Safe floating-point math** via integer-scaling (`safeMath` helpers)
- **16 mathematical/physical constants** via `get_constant` tool
- **Worker timeout protection** prevents infinite loops

### Changed
- Strict input validation replaces loose argument parsing
- All tools now require properly typed JSON arguments
- 37 new tests (50 → 87 total)

## [1.1.0] — 2026-03-01

### Added
- Inverse trigonometry: `asin`, `acos`, `atan` with degrees/radians support
- Statistical functions: `sum`, `avg`, `median`, `min`, `max`, `count`, `range`, `percentile`
- Memory operations: `memory_add`, `memory_subtract`, `memory_clear`, `memory_recall`
- 42 new tests

## [1.0.0] — 2026-02-15

### Added
- Initial release
- Basic arithmetic: `add`, `subtract`, `multiply`, `divide`, `modulo`
- Power & root: `power`, `sqrt`
- Number theory: `factorial`
- Trigonometry: `sine`, `cosine`, `tangent`
- Logarithms: `logarithm`, `natural_log`
- Other: `absolute`
- MCP stdio server with JSON-RPC 2.0 protocol
