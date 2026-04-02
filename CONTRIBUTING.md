# Contributing to Cruncher

Thank you for your interest in improving Cruncher! This document provides guidelines for contributions.

## Project Overview

Cruncher is a **zero-dependency** scientific calculator MCP server. It runs on plain Node.js with no external packages beyond the MCP protocol itself.

### Core Principles
- **Zero dependencies** — No `mathjs`, `zod`, or other external libraries
- **Single-file server** — All logic in `cruncher.js`
- **Type safety via validation** — Custom recursive JSON-Schema validator
- **Main-thread first** — Instant tools run inline; only heavy ops use workers
- **Strict security** — Regex whitelisting, no `eval()`, worker isolation

## Getting Started

### Prerequisites
- Node.js >= 18
- TypeScript (for running tests via tsx)

### Setup
```bash
cd /workspaces/mcp-test-cruncher
node cruncher.js  # Start the server (stdio protocol)
```

### Running Tests
```bash
npx tsx test-cruncher-full.ts
```
All tests must pass before submitting a PR.

## How to Contribute

### 1. Adding a New Tool

1. **Add tool definition** to the `toolsAll` array in `cruncher.js`
2. **Add handler** to the `toolHandlers` object
3. **Decide the tier**:
   - `standard` — Everyday math (trig, stats, percentages, constants, units)
   - `full` — Specialized tools (memory, base conversion, percentiles, batch, cache)
4. **Cacheability** — Add to `NON_CACHEABLE` if stateful (memory, batch, cache management)
5. **Main-thread vs worker** — Add to `MAIN_THREAD_TOOLS` if instant (no heavy computation)
6. **Write tests** in `test-cruncher-full.ts` covering:
   - Success cases (normal input, edge cases)
   - Error cases (invalid input, boundary conditions)
   - Schema validation errors
7. **Update docs**: README.md, CHANGELOG.md, TODO.md

### 2. Example: Adding a Unit Conversion

```javascript
// 1. Tool definition
{
    name: "convert_unit",
    description: "Convert between common units.",
    inputSchema: {
        type: "object",
        properties: {
            value: { type: "number" },
            category: { type: "string", enum: ["length", "weight", ...] },
            from: { type: "string" },
            to: { type: "string" },
        },
        required: ["value", "category", "from", "to"],
    },
},

// 2. Handler (main-thread since it's instant)
convert_unit: ({ value, category, from, to }) => {
    // ... conversion logic
    return result;
},

// 3. Main-thread tools set
const MAIN_THREAD_TOOLS = new Set([
    "...", "convert_unit",
]);
```

### 3. Adding Tests

```typescript
// Add your test in the appropriate section of test-cruncher-full.ts
results.push(
    await runTest("category: test description", async () => {
        const result = await client.callTool({
            name: "your_tool",
            arguments: { param: value },
        });
        const parsed = JSON.parse(result.content[0].text);
        if (parsed.result !== expected) {
            throw new Error(`Expected ${expected}, got ${parsed.result}`);
        }
    }),
);
```

## Code Style

- **Indentation**: 4 spaces (matching existing code)
- **Naming**: `snake_case` for tool names, `camelCase` for variables
- **Error messages**: Descriptive, human-readable, include context
- **No external dependencies** — Use only Node.js built-in modules

## Commit Conventions

We follow a simple convention:
```
type: brief description

type:feat: New feature
type:docs: Documentation changes
type:fix: Bug fix
type:perf: Performance improvements
type:refactor: Code restructuring
type:test: Test changes
type:license: License file changes
```

## Pull Request Checklist

- [ ] All tests pass (`npx tsx test-cruncher-full.ts`)
- [ ] New tools have JSON Schema validation
- [ ] Security considerations reviewed (no eval, proper sanitization)
- [ ] Tier assignment decided (standard vs full)
- [ ] Cacheability considered (NON_CACHEABLE set)
- [ ] Tests cover success, error, and edge cases
- [ ] CHANGELOG.md updated
- [ ] README.md updated
- [ ] TODO.md updated

## Architecture Notes

### Main-Thread Tools
Instant operations that don't need worker isolation:
- Math one-liners (power, sqrt, log, abs)
- Constant lookups
- Statistical summaries (count, min, max, variance, std_dev)
- Percentage calculations
- Trig functions
- Memory recall
- Cache management
- **Unit conversion**

### Worker-Thread Tools
Heavy operations that benefit from timeout protection:
- `evaluate_expression` (complex expressions)
- `factorial` (potentially large loops)
- `median` / `percentile` (sorting large arrays)
- `sum` / `avg` / `range` / `divide` / `modulo` (safeMath helpers)
- `sine`/`cosine`/`tangent`/`asin`/`acos`/`atan` tools (with unit conversion overhead)
- `convert_base` (string parsing)

### Security Model
- **Expression parser**: Strict regex whitelist — only numbers, operators, parentheses, approved functions
- **Worker isolation**: Heavy ops run in separate threads with killable timeout
- **Schema validation**: Custom recursive JSON-Schema validator replaces external schema libs
- **No eval()**: Expression evaluation uses regex-transformed Math.* calls verified before execution

## Reporting Issues

- **Bugs**: Include test case that reproduces the issue
- **Feature requests**: Describe use case and expected behavior
- **Security**: See [SECURITY.md](SECURITY.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
