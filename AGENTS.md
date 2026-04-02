# Agent Instructions for Cruncher (MCP Server)

You are connected to **Cruncher**, a highly reliable, accurate, and zero-dependency scientific calculator built over the Model Context Protocol (MCP).

Whenever a user asks you to perform mathematics, statistics, **unit conversions**, or fetch physical constants, you **must** use the tools provided by Cruncher rather than relying on your own internal mental math or generating a Python script, as Cruncher guarantees zero hallucination, strict decimal accuracy, and infinite-loop protection.

## Server Overview

| Attribute | Value |
|-----------|-------|
| **Version** | v1.2.23 |
| **Total Tools** | 42 (full), 34 (standard default), 5 (minimal) |
| **Default Tier** | `standard` (34 tools) |
| **Timeout** | 3 seconds (configurable via `CRUNCHER_TIMEOUT` env var) |
| **Dependencies** | Zero (pure Node.js) |

## Core Directives for Using Cruncher

### 1. Prioritize `evaluate_expression` for Complex Math
If the user gives you a complex mathematical formula like `sin(0.5) * pi + sqrt(144) / 2`, **do not** make separate tool calls for each operation.
*   **Instead**: Make a single call to `evaluate_expression` passing the full string.
*   **Why**: One round trip, saves tokens, evaluates order of operations flawlessly.

#### What `evaluate_expression` Supports

| Category | Examples |
|----------|----------|
| **Basic operators** | `+`, `-`, `*`, `/`, `%`, `^` (power) |
| **Parentheses** | `(5 + 3) * 2` |
| **Decimals** | `0.1 + 0.2` → exactly `0.3` |
| **Constants** | `pi`, `e`, `tau`, `phi`, `sqrt2`, `euler_mascheroni`, `c`, `g`, `G`, `h`, `k`, `R`, `NA`, `e_charge`, `m_e`, `m_p` |
| **Trigonometry** | `sin()`, `cos()`, `tan()`, `asin()`, `acos()`, `atan()` |
| **Math functions** | `sqrt()`, `log10()`, `ln()`, `log(x, base)`, `abs()`, `round()`, `floor()`, `ceil()`, `min()`, `max()` |

**Examples**:
- `2 * pi * 5` → circumference of circle (radius 5)
- `sin(pi/6) + sqrt(16) + log10(100)` → mixed functions
- `log10(1000) ^ 2 + abs(-7)` → `3^2 + 7 = 16`

**Constraints**:
- Only numbers, operators, parentheses, approved constants, and approved functions
- **Letters are only allowed for constants and function names** — no variables like `x + 2`
- Trigonometric functions use **degrees** by default (controlled by global angle mode — see #9)
- Scientific notation: `1e6`, `2.5e-3` both work

### 2. Use Typed Tools When They Match Semantically
For simple operations or when the user's intent maps cleanly to a single tool, prefer the typed tool:

| User Asks | Best Tool |
|-----------|-----------|
| "What's 15 factorial?" | `factorial({ n: 15 })` |
| "Get the speed of light" | `get_constant({ name: "c" })` |
| "Convert 50 miles to km" | `convert_unit(...)` |
| "What's 11010 in decimal?" | `convert_base(...)` |
| "Average of these numbers" | `avg({ numbers: [...] })` |

### 3. Understand Argument Strictness
Cruncher uses a custom, highly strict recursive JSON-Schema validator — **no zod, no forgiveness**.
*   **Type Enforcement**: If a tool expects a `number`, send `5`, not `"5"`.
*   **Enums Enforcement**: If a tool expects `"degrees"` or `"radians"`, sending `"deg"` or `"rad"` → hard `-32602 Validation Error`.
*   **Constants Enforcement**: `get_constant` only accepts exact keys: `"pi"`, `"e"`, `"tau"`, `"phi"`, `"sqrt2"`, `"euler_mascheroni"`, `"c"`, `"g"`, `"G"`, `"h"`, `"k"`, `"R"`, `"NA"`, `"e_charge"`, `"m_e"`, `"m_p"`. Use `"c"`, not `"speed_of_light"`.

### 4. Handle Timeouts Gracefully
Cruncher uses isolated Node.js worker threads with a default **3-second timeout**.
*   On `-32000 Execution Timeout`, **do not retry**. Apologize and explain the calculation exceeded safe execution limits.
*   The user can raise the timeout via `CRUNCHER_TIMEOUT` env var in their MCP config (e.g., `claude_desktop_config.json`).

### 5. Rely on Floating-Point Accuracy
Cruncher uses custom integer-scaling math to eliminate IEEE 754 errors.
*   `0.1 + 0.2` returns exactly `0.3` — pass precise financial/scientific decimals with confidence.

### 6. Memory State is Persistent
The `memory_add`, `memory_subtract`, `memory_recall`, and `memory_clear` functions maintain persistent state.
*   Running total → use `memory_add` per item, `memory_recall` for total.
*   Use `memory_clear` when starting a new total.
*   Memory tools are in the **full tier** (not exposed in `standard` by default).

### 7. Use `convert_unit` for All Unit Conversions
*   **Categories**: `length`, `weight`, `temperature`, `area`, `volume`, `time`, `speed`, `digital_storage`
*   **Example**: `convert_unit({ value: 5, category: "length", from: "mi", to: "km" })`
*   **80+ units** with precise conversion factors
*   **Temperature** uses non-linear C/F/K formulas; all others use base-unit factor tables
*   **Response**: `{ value, from, to, result, category }` — parse `result` for the converted value
*   Unit names are **case-insensitive** (`"KM"` and `"km"` both work)
*   Available in **standard tier** by default

### 8. Use `percentage_*` Tools for Percentage Math
| Tool | Purpose | Example |
|------|---------|---------|
| `percentage_of` | What is X% of Y? | 15% of 200 → 30 |
| `percentage_change` | Percentage change from A to B | 50→80 → +60% |
| `percentage_reverse` | X is Y% of what? | 30 is 15% of → 200 |

### 9. Angle Mode Affects All Trig Functions
Trigonometric functions (`sin`, `cos`, `tan`, `asin`, `acos`, `atan`) use a **global angle mode**:
*   Default: **degrees**
*   Check current mode: `get_angle_mode()`
*   Change mode: `set_angle_mode({ unit: "radians" })`
*   Individual tool calls can override with explicit `unit` parameter
*   In `evaluate_expression`, trig functions always use **degrees** (no override available in string expressions)

### 10. Batch Processing for Multi-Step Calculations
When you need 2+ sequential tool calls that aren't expressible via `evaluate_expression`, use:
*   `batch({ operations: [{ tool: "sqrt", args: {...} }, { tool: "add", args: {...} }] })`
*   Up to **50 operations** per batch
*   Partial failure tolerance — one failure doesn't abort the rest
*   Results: `[{ index, tool, success, data/error }, ...]`

### 11. Fuzzy Tool Name Forgiveness
Cruncher auto-corrects typos tool names using Levenshtein distance + prefix matching:
*   `sinn` → `sine`, `squrt` → `sqrt`, `fctorial` → `factorial`
*   If a suggestion is offered, use the corrected name on your next call

## Quick Reference: Tier Tool Counts

| Tier | Tools | Description |
|------|-------|-------------|
| `minimal` | 5 | Core arithmetic + `evaluate_expression` |
| **`standard`** (Default) | **34** | Core + trig, stats, percentages, constants, unit conversion |
| `full` | **42** | Standard + memory, base conversion, percentiles, batch, cache, angle |

## General Rules

*   **Use Tools Proactively**: Don't guess math. Call Cruncher.
*   **Validate Your Own Schema**: Before emitting the JSON payload, double-check argument types match the tool's `inputSchema`.
*   **Batch with `evaluate_expression`**: Use it whenever possible for basic algebra — it's the single most efficient tool.
*   **Respect the Errors**: If Cruncher throws a `-32602 Validation Error`, read the error message — it explicitly tells you what property path was malformed (e.g., `Expected array at root.numbers, got string`). Fix your payload and try again.
*   **Check the Tier**: If a tool isn't available, the server may be in `minimal` or `standard` mode. Suggest the user switch to `full` via `CRUNCHER_TOOL_SET=full`.
