# Cruncher MCP Server - Test Suite

This directory contains comprehensive test suites for the Cruncher MCP Server using the `@slbdn/mcp-tester` package.

## Quick Start

### Run Comprehensive Test Suite
```bash
npx tsx tests/test-cruncher-full.ts
```

This single command runs all 335 tests covering every feature of the Cruncher server (~10 seconds). The suite completes in approximately 2-3 seconds.

## Test Files

| File | Description | Tests | Use Case |
|------|-------------|-------|----------|
| `test-cruncher-full.ts` | Comprehensive test suite | 335 | Full regression testing, CI/CD |
| `TEST_REPORT.md` | Test results and analysis | - | Documentation |

## Test Coverage

### ✅ Covered Features
- **Server Lifecycle**: Start, connect, disconnect
- **Tool Discovery**: List and verify all available tools
- **Basic Arithmetic**: +, -, ×, ÷, modulo
- **Advanced Math**: Power, square root, factorial
- **Trigonometry**: sin, cos, tan, asin, acos, atan (degrees & radians)
- **Logarithms**: log10, natural log
- **Constants**: Mathematical and physical constants
- **Statistics**: sum, avg, median, min, max, count, range, percentile
- **Memory**: M+, M-, MR, MC operations (with atomic locking for concurrent calls)
- **Base Conversion**: Binary, octal, decimal, hexadecimal conversions
- **Unit Conversion**: 25 tests across 8 categories, 80+ conversions across 8 categories (length, weight, temperature, area, volume, time, speed, digital_storage) via `convert_unit` (v1.2.22)
- **Scientific Notation**: `1e6`, `2.5e-3`, `1e+6` expressions
- **Built-in Functions**: `abs()`, `round()`, `floor()`, `ceil()`, `min()`, `max()`
- **Configurable Timeout**: Custom timeout for factorial, median, percentile (v1.2.4)
- **Enhanced Error Messages**: Structured error responses with parameter context (v1.2.5)
- **Batch Processing**: Multi-operation batch tool with partial failure tolerance (v1.2.6)
- **Result Caching**: Expensive operation caching with TTL and LRU eviction (v1.2.7)
- **Tiered Tool Exposure**: `CRUNCHER_TOOL_SET` env var (minimal/standard/full) — controls
  how many tools are exposed to reduce context token usage (v1.2.20)
   - **Context Token Optimization**: 40% description token reduction (~560 tokens saved),
     evaluate_expression promoted as PRIMARY tool, redundant descriptions eliminated (v1.2.11)
- **Algorithm Optimizations**: O(1) tool lookup Map, batch cache support,
  conditional worker args clone, Set-based method validation (v1.2.10)
- **Worker Elimination**: 15 instant tools moved to main-thread execution,
  dead code cleanup, double-validation elimination, pre-compiled regexes (v1.2.9)
- **Angle Mode Toggle**: Global degrees/radians toggle with set_angle_mode/get_angle_mode (v1.2.8)
- **Error Handling**: Invalid inputs, missing arguments, unknown tools
- **Statistics**: variance, standard deviation (sample/population modes) (v1.2.18)
- **Percentage Functions**: percentage_of, percentage_change, percentage_reverse (v1.2.19)

- **Percentile calculations** (full tier)

### 📊 Test Statistics
- **Pass Rate**: **100%** (335/335) on v1.2.30
- **Execution Time**: ~10 seconds
- **Total Tests**: 335
- **Pass Rate**: **100%** (335/335) on v1.2.28
- **Execution Time**: ~10 seconds
- **Coverage**: All **43 tools**, edge cases, concurrency, and advanced scenarios
- **Tier Coverage**: minimal (5 tools), standard (34 tools), full (43 tools)

## Test Framework

We use [`@slbdn/mcp-tester`](https://github.com/islobodan/mcp-tester) v1.1.0 (npm package) which provides:

- ✅ **Clean Process Management**: No hanging processes or memory leaks
- ✅ **MCP Protocol Handling**: Automatic JSON-RPC 2.0 management
- ✅ **Structured Errors**: Clear error messages with context (`MCPClientError`, `MCPTimeoutError`, `MCPConnectionError`, etc.)
- ✅ **Lifecycle Management**: Proper start/stop of MCP servers
- ✅ **Assert API**: Built-in assertion functions (`toolNumEquals`, `toolTextContains`, `toolIsError`, etc.)
- ✅ **Reusability**: Same framework works for any MCP server

### Assert API (v1.1.0+)

The test suite uses the `assert` namespace from `@slbdn/mcp-tester`:

```typescript
import { MCPClient, assert } from "@slbdn/mcp-tester";
const { toolNumEquals, toolNumCloseTo, toolTextEquals, toolIsError } = assert;
```

| Function | Purpose |
|----------|---------|
| `toolNumEquals(result, expected)` | Tool text parsed as number equals expected |
| `toolNumCloseTo(result, expected, epsilon?)` | Tool text parsed as number within epsilon |
| `toolTextEquals(result, expected)` | Tool text equals string exactly |
| `toolTextContains(result, substring)` | Tool text contains substring |
| `toolJsonEquals(result, expected)` | Tool text parsed as JSON deeply equals expected |
| `toolIsError(result)` | Tool returned an error |
| `toolIsOk(result)` | Tool did NOT return an error |
| `toolHasContent(result, minItems?)` | Tool result has content items |
| `equal(actual, expected)` | Strict equality |
| `equalNum(actual, expected)` | Numeric strict equality |
| `closeTo(actual, expected, epsilon?)` | Number within epsilon |
| `contains(str, substring)` | String contains substring |
| `ok(value)` / `notOk(value)` | Truthy / falsy assertion |
| `throws(fn)` / `doesNotThrow(fn)` | Error / no-error assertion |
| `greaterThan(a, b)` / `lessThan(a, b)` | Numeric comparison |
| `matches(str, regex)` | String matches regex |

## Running Tests in CI/CD

### GitHub Actions Example
```yaml
- name: Run Cruncher Tests
  run: |
    cd /workspaces/mcp-test-cruncher
    npx tsx tests/test-cruncher-full.ts
```

### Docker Example
```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
RUN npx tsx tests/test-cruncher-full.ts
```

## Test Output Format

```
=== Comprehensive Cruncher MCP Server Test Suite ===

🚀 Starting Cruncher server...
✓ Server started successfully

📋 1. Server Initialization Tests
✓ Server version check (0ms)
✓ Protocol version check (0ms)

🔧 2. Tool Discovery Tests
✓ List all tools (2ms)
✓ Verify required tools exist (1ms)

...

📊 TEST SUMMARY
============================================================
Total Tests: 335
Passed: 335
Failed: 0
Success Rate: 100.00%
============================================================

✅ ALL TESTS PASSED!
```

## Adding New Tests

### Example: Add a New Test Case

```typescript
import { MCPClient, assert } from "@slbdn/mcp-tester";
const { toolNumEquals, toolTextContains, toolIsError } = assert;

// ... inside testCruncher():
results.push(await runTest('My new test', async () => {
  const result = await client.callTool({
    name: 'my_tool',
    arguments: { param1: 'value' }
  });
  toolNumEquals(result, 42);           // number check
  toolTextContains(result, 'ok');      // substring check
  toolIsError(result);                 // error check
}));
```

### Test Categories

Organize tests by category for better readability:

1. Server Initialization
2. Tool Discovery
3. Basic Operations
4. Advanced Features
5. Error Handling
6. Edge Cases

## Troubleshooting

### Tests Hang
**Solution**: The `@slbdn/mcp-tester` package handles this automatically. If tests still hang:
- Check that `client.stop()` is called in the `finally` block
- Ensure the server process exits cleanly
- Verify no open file descriptors or network connections

### "Tool not found" Error
**Solution**:
- Verify the tool exists in `cruncher.js`
- Check tool name spelling (case-sensitive)
- Ensure the server has started successfully

### Floating Point Precision Issues
**Solution**:
- Use tolerance for floating point comparisons:
  ```typescript
  if (Math.abs(value - expected) > 1e-10) {
    throw new Error(`Expected ~${expected}, got ${value}`);
  }
  ```

## Contributing

### Adding New Tests
1. Add test cases in the appropriate category section
2. Update the test count in `TEST_REPORT.md`
3. Run tests to verify they pass
4. Update this README if needed

### Improving Test Coverage
- Add edge case tests
- Add performance tests
- Add concurrent operation tests
- Add timeout tests (for v1.2.0+)

## Dependencies

- **Node.js**: >= 18
- **tsx**: For TypeScript execution (`npx tsx`)
- **@slbdn/mcp-tester**: MCP testing framework ([npm](https://www.npmjs.com/package/@slbdn/mcp-tester), [GitHub](https://github.com/islobodan/mcp-tester))

## License

MIT License - See LICENSE file for details.

## Support

For issues or questions:
1. Check `TEST_REPORT.md` for known issues
2. Review the test output for specific error messages
3. Open an issue in the repository

---

**Last Updated**: 2026-04-23
**Test Framework Version**: @slbdn/mcp-tester v1.1.0
**Server Version Tested**: Cruncher **v1.2.30** (335 tests, 100% pass rate)
