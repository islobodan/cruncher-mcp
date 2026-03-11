# Cruncher MCP Server - Test Suite

This directory contains comprehensive test suites for the Cruncher MCP Server using the `mcp-tester` framework.

## Quick Start

### Run Comprehensive Test Suite
```bash
npx tsx test-cruncher-full.ts
```

This single command runs all 50 tests covering every feature of the Cruncher server. The suite completes in approximately 2-3 seconds.

## Test Files

| File | Description | Tests | Use Case |
|------|-------------|-------|----------|
| `test-cruncher-full.ts` | Comprehensive test suite | 108 | Full regression testing, CI/CD |
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
- **Memory**: M+, M-, MR, MC operations
- **Error Handling**: Invalid inputs, missing arguments, unknown tools

### 📊 Test Statistics
- **Total Tests**: 108
- **Pass Rate**: **100%** (108/108) on v1.2.0
- **Execution Time**: ~3-4 seconds
- **Coverage**: All 31 tools, edge cases, and advanced scenarios

## Test Framework

We use the custom `mcp-tester` framework which provides:

- ✅ **Clean Process Management**: No hanging processes or memory leaks
- ✅ **MCP Protocol Handling**: Automatic JSON-RPC 2.0 management
- ✅ **Structured Errors**: Clear error messages with context
- ✅ **Lifecycle Management**: Proper start/stop of MCP servers
- ✅ **Reusability**: Same framework works for any MCP server

## Running Tests in CI/CD

### GitHub Actions Example
```yaml
- name: Run Cruncher Tests
  run: |
    cd /workspaces/mcp-test-cruncher
    npx tsx test-cruncher-full.ts
```

### Docker Example
```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
RUN npx tsx test-cruncher-full.ts
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
Total Tests: 108
Passed: 108
Failed: 0
Success Rate: 100.00%
============================================================

✅ ALL TESTS PASSED!
```

## Adding New Tests

### Example: Add a New Test Case

```typescript
results.push(await runTest('My new test', async () => {
  // Call the tool
  const result = await client.callTool({
    name: 'my_tool',
    arguments: { param1: 'value' }
  });
  
  // Assert the result
  if (parseFloat(result.content[0].text) !== expected) {
    throw new Error(`Expected ${expected}, got ${result.content[0].text}`);
  }
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
**Solution**: The `mcp-tester` framework handles this automatically. If tests still hang:
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
- **tsx**: For TypeScript execution
- **mcp-tester**: Custom MCP testing framework (parent directory)

## License

MIT License - See LICENSE file for details.

## Support

For issues or questions:
1. Check `TEST_REPORT.md` for known issues
2. Review the test output for specific error messages
3. Open an issue in the repository

---

**Last Updated**: 2026-03-11  
**Test Framework Version**: mcp-tester 1.0.0  
**Server Version Tested**: Cruncher **v1.2.0** (100% pass rate)
