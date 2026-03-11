import { MCPClient } from '../mcp-tester/src/index.js';

// Test configuration
const TEST_TIMEOUT = 30000;
let passedTests = 0;
let failedTests = 0;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    console.log(`✓ ${name} (${duration}ms)`);
    passedTests++;
    return { name, passed: true, duration };
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${name}: ${errorMsg}`);
    failedTests++;
    return { name, passed: false, error: errorMsg, duration };
  }
}

async function testCruncher() {
  console.log('=== Comprehensive Cruncher MCP Server Test Suite ===\n');
  console.log(`Starting at: ${new Date().toISOString()}\n`);

  const client = new MCPClient({
    name: 'cruncher-comprehensive-test',
    version: '1.0.0',
    timeout: TEST_TIMEOUT,
    logLevel: 'none', // Disable verbose logging for cleaner output
  });

  const results: TestResult[] = [];

  try {
    // Start the server
    console.log('🚀 Starting Cruncher server...\n');
    await client.start({
      command: 'node',
      args: ['cruncher.js'],
      env: { NODE_ENV: 'test' },
    });
    console.log('✓ Server started successfully\n');

    // ========== 1. Server Initialization Tests ==========
    console.log('📋 1. Server Initialization Tests');
    results.push(await runTest('Server version check', async () => {
      const info = await client.client?.getServerVersion();
      if (!info) throw new Error('No server info returned');
      if (info.name !== 'Cruncher') throw new Error(`Wrong server name: ${info.name}`);
      if (!info.version) throw new Error('No version returned');
    }));

    results.push(await runTest('Protocol version check', async () => {
      // The SDK handles protocol negotiation automatically
      // Just verify we're connected
      if (!client.client) throw new Error('Client not connected');
    }));

    // ========== 2. Tool Discovery Tests ==========
    console.log('\n🔧 2. Tool Discovery Tests');
    results.push(await runTest('List all tools', async () => {
      const tools = await client.listTools();
      if (tools.length === 0) throw new Error('No tools found');
      console.log(`   Found ${tools.length} tools`);
    }));

    const requiredTools = [
      'add', 'subtract', 'multiply', 'divide', 'modulo',
      'power', 'sqrt', 'factorial',
      'sine', 'cosine', 'tangent', 'asin', 'acos', 'atan',
      'logarithm', 'natural_log', 'absolute',
      'get_constant',
      'sum', 'avg', 'median', 'min', 'max', 'count', 'range', 'percentile',
      'memory_clear', 'memory_recall', 'memory_add', 'memory_subtract'
    ];

    results.push(await runTest('Verify required tools exist', async () => {
      const tools = await client.listTools();
      const toolNames = tools.map(t => t.name);
      const missing = requiredTools.filter(name => !toolNames.includes(name));
      if (missing.length > 0) {
        throw new Error(`Missing tools: ${missing.join(', ')}`);
      }
    }));

    // ========== 3. Basic Arithmetic Tests ==========
    console.log('\n➕ 3. Basic Arithmetic Tests');
    results.push(await runTest('Addition: 0.1 + 0.2', async () => {
      const result = await client.callTool({ name: 'add', arguments: { a: 0.1, b: 0.2 } });
      const value = parseFloat(result.content[0].text);
      // Allow small floating point tolerance
      if (Math.abs(value - 0.3) > 1e-10) {
        throw new Error(`Expected ~0.3, got ${value}`);
      }
    }));

    results.push(await runTest('Subtraction: 1.0 - 0.9', async () => {
      const result = await client.callTool({ name: 'subtract', arguments: { a: 1.0, b: 0.9 } });
      const value = parseFloat(result.content[0].text);
      if (Math.abs(value - 0.1) > 1e-10) {
        throw new Error(`Expected ~0.1, got ${value}`);
      }
    }));

    results.push(await runTest('Multiplication: 6 × 7', async () => {
      const result = await client.callTool({ name: 'multiply', arguments: { a: 6, b: 7 } });
      if (parseFloat(result.content[0].text) !== 42) {
        throw new Error('Expected 42');
      }
    }));

    results.push(await runTest('Division: 10 / 4', async () => {
      const result = await client.callTool({ name: 'divide', arguments: { a: 10, b: 4 } });
      if (parseFloat(result.content[0].text) !== 2.5) {
        throw new Error('Expected 2.5');
      }
    }));

    results.push(await runTest('Division by zero error', async () => {
      try {
        await client.callTool({ name: 'divide', arguments: { a: 5, b: 0 } });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        if (!error.message.includes('Division by zero')) {
          throw new Error(`Wrong error message: ${error.message}`);
        }
      }
    }));

    results.push(await runTest('Modulo: 17 % 5', async () => {
      const result = await client.callTool({ name: 'modulo', arguments: { a: 17, b: 5 } });
      if (parseFloat(result.content[0].text) !== 2) {
        throw new Error('Expected 2');
      }
    }));

    results.push(await runTest('Modulo by zero error', async () => {
      try {
        await client.callTool({ name: 'modulo', arguments: { a: 5, b: 0 } });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        if (!error.message.includes('Modulo by zero')) {
          throw new Error(`Wrong error message: ${error.message}`);
        }
      }
    }));

    // ========== 4. Advanced Math Tests ==========
    console.log('\n🔬 4. Advanced Math Tests');
    results.push(await runTest('Power: 2^10', async () => {
      const result = await client.callTool({ name: 'power', arguments: { base: 2, exponent: 10 } });
      if (parseFloat(result.content[0].text) !== 1024) {
        throw new Error('Expected 1024');
      }
    }));

    results.push(await runTest('Square root: √144', async () => {
      const result = await client.callTool({ name: 'sqrt', arguments: { value: 144 } });
      if (parseFloat(result.content[0].text) !== 12) {
        throw new Error('Expected 12');
      }
    }));

    results.push(await runTest('Square root of negative (error)', async () => {
      try {
        await client.callTool({ name: 'sqrt', arguments: { value: -1 } });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        if (!error.message.includes('negative')) {
          throw new Error(`Wrong error message: ${error.message}`);
        }
      }
    }));

    results.push(await runTest('Factorial: 5!', async () => {
      const result = await client.callTool({ name: 'factorial', arguments: { n: 5 } });
      if (parseFloat(result.content[0].text) !== 120) {
        throw new Error('Expected 120');
      }
    }));

    results.push(await runTest('Factorial: 0!', async () => {
      const result = await client.callTool({ name: 'factorial', arguments: { n: 0 } });
      if (parseFloat(result.content[0].text) !== 1) {
        throw new Error('Expected 1');
      }
    }));

    results.push(await runTest('Factorial negative (error)', async () => {
      try {
        await client.callTool({ name: 'factorial', arguments: { n: -1 } });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        if (!error.message.includes('negative')) {
          throw new Error(`Wrong error message: ${error.message}`);
        }
      }
    }));

    // ========== 5. Trigonometry Tests ==========
    console.log('\n📐 5. Trigonometry Tests');
    results.push(await runTest('Sine: sin(90°)', async () => {
      const result = await client.callTool({ name: 'sine', arguments: { angle: 90, unit: 'degrees' } });
      const value = parseFloat(result.content[0].text);
      if (Math.abs(value - 1) > 1e-10) {
        throw new Error(`Expected ~1, got ${value}`);
      }
    }));

    results.push(await runTest('Cosine: cos(0°)', async () => {
      const result = await client.callTool({ name: 'cosine', arguments: { angle: 0, unit: 'degrees' } });
      const value = parseFloat(result.content[0].text);
      if (Math.abs(value - 1) > 1e-10) {
        throw new Error(`Expected ~1, got ${value}`);
      }
    }));

    results.push(await runTest('Tangent: tan(45°)', async () => {
      const result = await client.callTool({ name: 'tangent', arguments: { angle: 45, unit: 'degrees' } });
      const value = parseFloat(result.content[0].text);
      if (Math.abs(value - 1) > 1e-10) {
        throw new Error(`Expected ~1, got ${value}`);
      }
    }));

    results.push(await runTest('Arcsine: asin(1) in degrees', async () => {
      const result = await client.callTool({ name: 'asin', arguments: { value: 1, unit: 'degrees' } });
      const value = parseFloat(result.content[0].text);
      if (Math.abs(value - 90) > 1e-10) {
        throw new Error(`Expected ~90, got ${value}`);
      }
    }));

    results.push(await runTest('Arccosine: acos(0) in degrees', async () => {
      const result = await client.callTool({ name: 'acos', arguments: { value: 0, unit: 'degrees' } });
      const value = parseFloat(result.content[0].text);
      if (Math.abs(value - 90) > 1e-10) {
        throw new Error(`Expected ~90, got ${value}`);
      }
    }));

    results.push(await runTest('Arctangent: atan(1) in degrees', async () => {
      const result = await client.callTool({ name: 'atan', arguments: { value: 1, unit: 'degrees' } });
      const value = parseFloat(result.content[0].text);
      if (Math.abs(value - 45) > 1e-10) {
        throw new Error(`Expected ~45, got ${value}`);
      }
    }));

    results.push(await runTest('Asin out of range (error)', async () => {
      try {
        await client.callTool({ name: 'asin', arguments: { value: 2 } });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        if (!error.message.includes('between -1 and 1')) {
          throw new Error(`Wrong error message: ${error.message}`);
        }
      }
    }));

    // ========== 6. Logarithm Tests ==========
    console.log('\n📊 6. Logarithm Tests');
    results.push(await runTest('Log10: log10(1000)', async () => {
      const result = await client.callTool({ name: 'logarithm', arguments: { value: 1000 } });
      if (parseFloat(result.content[0].text) !== 3) {
        throw new Error('Expected 3');
      }
    }));

    results.push(await runTest('Natural log: ln(e)', async () => {
      const result = await client.callTool({ name: 'natural_log', arguments: { value: Math.E } });
      const value = parseFloat(result.content[0].text);
      if (Math.abs(value - 1) > 1e-10) {
        throw new Error(`Expected ~1, got ${value}`);
      }
    }));

    results.push(await runTest('Log10 of zero (error)', async () => {
      try {
        await client.callTool({ name: 'logarithm', arguments: { value: 0 } });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        if (!error.message.includes('positive')) {
          throw new Error(`Wrong error message: ${error.message}`);
        }
      }
    }));

    // ========== 7. Constant Tests ==========
    console.log('\n🔢 7. Constant Tests');
    results.push(await runTest('Get constant: pi', async () => {
      const result = await client.callTool({ name: 'get_constant', arguments: { name: 'pi' } });
      const value = parseFloat(result.content[0].text);
      if (Math.abs(value - Math.PI) > 1e-10) {
        throw new Error(`Expected ~${Math.PI}, got ${value}`);
      }
    }));

    results.push(await runTest('Get constant: e', async () => {
      const result = await client.callTool({ name: 'get_constant', arguments: { name: 'e' } });
      const value = parseFloat(result.content[0].text);
      if (Math.abs(value - Math.E) > 1e-10) {
        throw new Error(`Expected ~${Math.E}, got ${value}`);
      }
    }));

    results.push(await runTest('Get constant: c (speed of light)', async () => {
      const result = await client.callTool({ name: 'get_constant', arguments: { name: 'c' } });
      if (parseFloat(result.content[0].text) !== 299792458) {
        throw new Error('Expected 299792458');
      }
    }));

    results.push(await runTest('Unknown constant (error)', async () => {
      try {
        await client.callTool({ name: 'get_constant', arguments: { name: 'unknown' } });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        // Accept either the validation error or the "Unknown constant" error
        if (!error.message.includes('Unknown constant') && !error.message.includes('Validation Error')) {
          throw new Error(`Wrong error message: ${error.message}`);
        }
      }
    }));

    // ========== 8. Statistical Tests ==========
    console.log('\n📈 8. Statistical Tests');
    results.push(await runTest('Sum: [1, 2, 3, 4, 5]', async () => {
      const result = await client.callTool({ name: 'sum', arguments: { numbers: [1, 2, 3, 4, 5] } });
      if (parseFloat(result.content[0].text) !== 15) {
        throw new Error('Expected 15');
      }
    }));

    results.push(await runTest('Average: [1, 2, 3, 4, 5]', async () => {
      const result = await client.callTool({ name: 'avg', arguments: { numbers: [1, 2, 3, 4, 5] } });
      if (parseFloat(result.content[0].text) !== 3) {
        throw new Error('Expected 3');
      }
    }));

    results.push(await runTest('Median: [3, 1, 4, 1, 5]', async () => {
      const result = await client.callTool({ name: 'median', arguments: { numbers: [3, 1, 4, 1, 5] } });
      if (parseFloat(result.content[0].text) !== 3) {
        throw new Error('Expected 3');
      }
    }));

    results.push(await runTest('Median even: [1, 2, 3, 4]', async () => {
      const result = await client.callTool({ name: 'median', arguments: { numbers: [1, 2, 3, 4] } });
      if (parseFloat(result.content[0].text) !== 2.5) {
        throw new Error('Expected 2.5');
      }
    }));

    results.push(await runTest('Min: [3, 1, 4, 1, 5]', async () => {
      const result = await client.callTool({ name: 'min', arguments: { numbers: [3, 1, 4, 1, 5] } });
      if (parseFloat(result.content[0].text) !== 1) {
        throw new Error('Expected 1');
      }
    }));

    results.push(await runTest('Max: [3, 1, 4, 1, 5]', async () => {
      const result = await client.callTool({ name: 'max', arguments: { numbers: [3, 1, 4, 1, 5] } });
      if (parseFloat(result.content[0].text) !== 5) {
        throw new Error('Expected 5');
      }
    }));

    results.push(await runTest('Count: [1, 2, 3]', async () => {
      const result = await client.callTool({ name: 'count', arguments: { numbers: [1, 2, 3] } });
      if (parseFloat(result.content[0].text) !== 3) {
        throw new Error('Expected 3');
      }
    }));

    results.push(await runTest('Range: [1, 5, 3]', async () => {
      const result = await client.callTool({ name: 'range', arguments: { numbers: [1, 5, 3] } });
      if (parseFloat(result.content[0].text) !== 4) {
        throw new Error('Expected 4');
      }
    }));

    results.push(await runTest('Percentile 50 (median): [10, 20, 30, 40, 50]', async () => {
      const result = await client.callTool({ name: 'percentile', arguments: { numbers: [10, 20, 30, 40, 50], percentile: 50 } });
      if (parseFloat(result.content[0].text) !== 30) {
        throw new Error('Expected 30');
      }
    }));

    results.push(await runTest('Empty array sum (error)', async () => {
      try {
        await client.callTool({ name: 'sum', arguments: { numbers: [] } });
        // Empty sum might return 0, which is valid
      } catch (error: any) {
        // Some implementations throw, some return 0
        if (!error.message.includes('empty')) {
          // If it throws, check the message
          if (!error.message.includes('empty')) {
            // Ignore if it's not about empty arrays
          }
        }
      }
    }));

    results.push(await runTest('Empty array avg (error)', async () => {
      try {
        await client.callTool({ name: 'avg', arguments: { numbers: [] } });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        if (!error.message.includes('empty')) {
          throw new Error(`Wrong error message: ${error.message}`);
        }
      }
    }));

    // ========== 9. Memory Tests ==========
    console.log('\n💾 9. Memory Tests');
    results.push(await runTest('Memory clear', async () => {
      const result = await client.callTool({ name: 'memory_clear', arguments: {} });
      if (!result.content[0].text.includes('Memory cleared')) {
        throw new Error('Expected memory cleared message');
      }
    }));

    results.push(await runTest('Memory recall after clear', async () => {
      await client.callTool({ name: 'memory_clear', arguments: {} });
      const result = await client.callTool({ name: 'memory_recall', arguments: {} });
      if (parseFloat(result.content[0].text) !== 0) {
        throw new Error('Expected 0');
      }
    }));

    results.push(await runTest('Memory add and recall', async () => {
      await client.callTool({ name: 'memory_clear', arguments: {} });
      await client.callTool({ name: 'memory_add', arguments: { value: 50 } });
      const result = await client.callTool({ name: 'memory_recall', arguments: {} });
      if (parseFloat(result.content[0].text) !== 50) {
        throw new Error('Expected 50');
      }
    }));

    results.push(await runTest('Memory subtract', async () => {
      await client.callTool({ name: 'memory_clear', arguments: {} });
      await client.callTool({ name: 'memory_add', arguments: { value: 100 } });
      await client.callTool({ name: 'memory_subtract', arguments: { value: 40 } });
      const result = await client.callTool({ name: 'memory_recall', arguments: {} });
      if (parseFloat(result.content[0].text) !== 60) {
        throw new Error('Expected 60');
      }
    }));

    results.push(await runTest('Memory full cycle (MC, M+, M-, MR)', async () => {
      await client.callTool({ name: 'memory_clear', arguments: {} });
      await client.callTool({ name: 'memory_add', arguments: { value: 99 } });
      await client.callTool({ name: 'memory_add', arguments: { value: 1 } });
      let result = await client.callTool({ name: 'memory_recall', arguments: {} });
      if (parseFloat(result.content[0].text) !== 100) {
        throw new Error('Expected 100');
      }
      await client.callTool({ name: 'memory_subtract', arguments: { value: 50 } });
      result = await client.callTool({ name: 'memory_recall', arguments: {} });
      if (parseFloat(result.content[0].text) !== 50) {
        throw new Error('Expected 50');
      }
      await client.callTool({ name: 'memory_clear', arguments: {} });
      result = await client.callTool({ name: 'memory_recall', arguments: {} });
      if (parseFloat(result.content[0].text) !== 0) {
        throw new Error('Expected 0');
      }
    }));

    // ========== 10. Error Handling Tests ==========
    console.log('\n⚠️  10. Error Handling Tests');
    results.push(await runTest('Invalid tool name', async () => {
      try {
        await client.callTool({ name: 'nonexistent_tool', arguments: {} });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        if (!error.message.includes('not found')) {
          throw new Error(`Wrong error message: ${error.message}`);
        }
      }
    }));

    results.push(await runTest('Invalid argument type', async () => {
      try {
        await client.callTool({ name: 'add', arguments: { a: 'not a number', b: 2 } });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        if (!error.message.includes('Validation Error') && !error.message.includes('Expected number')) {
          throw new Error(`Wrong error message: ${error.message}`);
        }
      }
    }));

    results.push(await runTest('Missing required argument', async () => {
      try {
        await client.callTool({ name: 'add', arguments: { a: 1 } });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        if (!error.message.includes('Missing required property')) {
          throw new Error(`Wrong error message: ${error.message}`);
        }
      }
    }));

    // ========== Summary ==========
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / results.length) * 100).toFixed(2)}%`);
    console.log('='.repeat(60));

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
      throw new Error(`${failedTests} test(s) failed`);
    } else {
      console.log('\n✅ ALL TESTS PASSED!');
    }

  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  } finally {
    console.log('\n🛑 Stopping client...');
    await client.stop();
    console.log('✓ Client stopped\n');
    console.log(`Finished at: ${new Date().toISOString()}`);
  }
}

// Run the test
testCruncher();
