# Agent Instructions for Cruncher (MCP Server)

You are connected to **Cruncher**, a highly reliable, accurate, and zero-dependency scientific calculator built over the Model Context Protocol (MCP).

Whenever a user asks you to perform mathematics, statistics, **unit conversions**, or fetch physical constants, you **must** use the tools provided by Cruncher rather than relying on your own internal mental math or generating a Python script, as Cruncher guarantees zero hallucination, strict decimal accuracy, and infinite-loop protection.

## Server Overview

| Attribute | Value |
|-----------|-------|
| **Version** | v1.2.27 |
| **Total Tools** | 43 (full), 34 (standard default), 5 (minimal) |
| **Default Tier** | `standard` (34 tools) |
| **Protocol Version** | `2025-11-25` (latest MCP spec) |
| **Timeout** | 3 seconds (configurable via `CRUNCHER_TIMEOUT` env var) |
| **Dependencies** | Zero (pure Node.js) |

## 1. Prioritize `evaluate_expression` for Math

For any non-trivial math, use **one** call to `evaluate_expression` instead of chaining individual tools.

### Supported in Expression Strings

| Category | Items |
|----------|-------|
| **Operators** | `+`, `-`, `*`, `/`, `%`, `^` (power) |
| **Constants** | `pi`, `e`, `tau`, `phi`, `sqrt2`, `euler_mascheroni`, `c`, `g`, `G`, `h`, `k`, `R`, `NA`, `e_charge`, `m_e`, `m_p` |
| **Trig** | `sin()`, `cos()`, `tan()`, `asin()`, `acos()`, `atan()` |
| **Math** | `sqrt()`, `log10()`, `ln()`, `log(x, base)`, `abs()`, `round()`, `floor()`, `ceil()`, `min()`, `max()` |

### Examples

```
evaluate_expression("2 * pi * 5")
evaluate_expression("sin(pi/6) + sqrt(16)")
evaluate_expression("3^3 + abs(-5) / 2")
evaluate_expression("log10(1000) ^ 2")
evaluate_expression("log(16, 2)")
evaluate_expression("1e6 + 2.5e-3")
```

### Constraints
- Letters are **only** allowed for the constants and function names listed above — no algebraic variables like `x + 2`
- Individual trig tool calls (`sine`, `cosine`, etc.) use the **global angle mode** (default: degrees). `evaluate_expression` **always uses radians** (JavaScript standard).
- Scientific notation: `1e6`, `2.5e-3` both work
- Explicit operators required: `2 * pi` works, `2pi` does not

## 2. Use Typed Tools When They Match

| User Asks | Best Tool |
|-----------|-----------|
| "15 factorial" | `factorial({ n: 15 })` |
| "Speed of light" | `get_constant({ name: "c" })` |
| "50 miles to km" | `convert_unit(...)` |
| "11010 in decimal" | `convert_base(...)` |
| "Average of these" | `avg({ numbers: [...] })` |
| "Standard deviation" | `std_dev({ numbers: [1, 2, 3], population: false })` |

## 3. Argument Strictness

Cruncher uses a custom recursive JSON-Schema validator.

**Rule**: Send correct JSON types. Examples:

| Rule | Correct | Wrong |
|------|---------|-------|
| **Types** | `5` (number) | `"5"` (string) |
| **Enums** | `"degrees"` | `"deg"` |
| **Constants** | `"c"` | `"speed_of_light"` |
| **Arrays** | `[1, 2, 3]` | `"1,2,3"` |

Mistake triggers `-32602 Validation Error` with exact property path.

## 4. Timeouts

Heavy calculations run in isolated worker threads with a **3-second kill switch**.

On `-32000 Execution Timeout`: **do not retry**. The user can raise `CRUNCHER_TIMEOUT` (milliseconds) in their MCP config.

## 5. Floating-Point Accuracy

`0.1 + 0.2` returns exactly `0.3`. Integer-scaling math under the hood — no IEEE 754 drift. Safe for financial and scientific decimals.

## 6. Memory is Persistent

| Tool | Purpose |
|------|---------|
| `memory_add` | Add to running total |
| `memory_subtract` | Subtract from running total |
| `memory_recall` | Get current value |
| `memory_clear` | Reset to zero |

> Full tier only (not in standard).

## 7. Unit Conversions

Use `convert_unit` — never calculate conversion factors yourself.

```
convert_unit({ value: 5, category: "length", from: "mi", to: "km" })
```

Returns: `{ value, from, to, result, category }`

- **80+ units** across 8 categories: length, weight, temperature, area, volume, time, speed, digital_storage
- **Case-insensitive**: `"KM"` and `"km"` both work
- **Temperature** uses non-linear C/F/K formulas; otherwise base-unit factor tables
- In **standard tier** (available by default)

## 8. Percentage Tools

All in **standard tier**.

| Tool | Question | Example |
|------|----------|---------|
| `percentage_of` | X% of Y? | 15% of 200 = **30** |
| `percentage_change` | A to B, % change? | 50→80 = **+60%** |
| `percentage_reverse` | X is Y% of what? | 30 is 15% of = **200** |

## 9. Statistics

| Tool | Mode | Tier |
|------|------|------|
| `sum`, `avg`, `count`, `min`, `max` | — | standard |
| `variance`, `std_dev` | `sample` (n-1) / `population` (n) | standard |
| `median`, `range` | — | standard |
| `percentile` | — | full |

## 10. Angle Mode

Trig functions use a **global** angle mode (default: **degrees**).

| Tool | Purpose |
|------|---------|
| `get_angle_mode()` | Returns current mode |
| `set_angle_mode({ mode: "radians" })` | Switch to radians |

In `evaluate_expression`, trig **always uses radians** (JavaScript standard). The global angle mode only affects individual tool calls (`sine`, `cosine`, etc.), which accept an explicit `unit` param that overrides it.

> **Standard tier** (available by default).

## 11. Batch Processing

For 2+ sequential calls that can't be one string:

```
batch({
  operations: [
    { tool: "sqrt", args: { number: 144 } },
    { tool: "add", args: { a: 12, b: 10 } }
  ]
})
```

- Up to **50 operations** per request
- Partial failure tolerant
- Full tier only

## 12. Caching (Automatic)

Repeated calls with same arguments hit a zero-cost LRU cache (1000 entries, 5-min TTL). You do not need to do anything — just query normally.

| Tool | Purpose |
|------|---------|
| `cache_clear()` | Clear cache |
| `cache_info()` | Show cache stats |

Full tier only.

## 13. Fuzzy Tool Name Forgiveness

Typo? Cruncher auto-corrects via Levenshtein distance + prefix matching:

- `sinn` → `sine`
- `squrt` → `sqrt`
- `fctorial` → `factorial`
- `addd` → `add`

Gibberish like `totally_wrong` gets no suggestion.

## Tool Quick Reference

| Tier | Count | Scope |
|------|-------|-------|
| `minimal` | 5 | Core arithmetic + `evaluate_expression` |
| **`standard`** (Default) | 34 | Minimal + trig, stats, percentages, constants, unit conversion |
| `full` | 43 | Standard + memory, base conversion, percentiles, batch, cache |

## Rules of Thumb

1. **Don't guess math** — call Cruncher, always
2. **Prefer `evaluate_expression`** for anything with 2+ operators
3. **Validate your JSON** before sending: correct types, correct enums, correct constant keys
4. **Read validation errors** — they tell you exactly which property is wrong
5. **Timeout = no retry** — explain to user; they can increase `CRUNCHER_TIMEOUT`
6. **Missing tool?** Server may not be in `full` mode. Suggest `CRUNCHER_TOOL_SET=full`
