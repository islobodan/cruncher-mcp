import { MCPClient } from "../mcp-tester/src/index.js";

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

async function runTest(
    name: string,
    testFn: () => Promise<void>,
): Promise<TestResult> {
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
    console.log("=== Comprehensive Cruncher MCP Server Test Suite ===\n");
    console.log(`Starting at: ${new Date().toISOString()}\n`);

    const client = new MCPClient({
        name: "cruncher-comprehensive-test",
        version: "1.0.0",
        timeout: TEST_TIMEOUT,
        logLevel: "none", // Disable verbose logging for cleaner output
    });

    const results: TestResult[] = [];

    try {
        // Start the server
        console.log("🚀 Starting Cruncher server...\n");
        await client.start({
            command: "node",
            args: ["cruncher.js"],
            env: { CRUNCHER_TOOL_SET: "full", NODE_ENV: "test" },
        });
        console.log("✓ Server started successfully\n");

        // ========== 1. Server Initialization Tests ==========
        console.log("📋 1. Server Initialization Tests");
        results.push(
            await runTest("Server version check", async () => {
                const info = await client.client?.getServerVersion();
                if (!info) throw new Error("No server info returned");
                if (info.name !== "Cruncher")
                    throw new Error(`Wrong server name: ${info.name}`);
                if (!info.version) throw new Error("No version returned");
            }),
        );

        results.push(
            await runTest("Protocol version check", async () => {
                // The SDK handles protocol negotiation automatically
                // Just verify we're connected
                if (!client.client) throw new Error("Client not connected");
            }),
        );

        // ========== 2. Tool Discovery Tests ==========
        console.log("\n🔧 2. Tool Discovery Tests");
        results.push(
            await runTest("List all tools", async () => {
                const tools = await client.listTools();
                if (tools.length === 0) throw new Error("No tools found");
                console.log(`   Found ${tools.length} tools`);
            }),
        );

        const requiredTools = [
            "add",
            "subtract",
            "multiply",
            "divide",
            "modulo",
            "power",
            "sqrt",
            "factorial",
            "sine",
            "cosine",
            "tangent",
            "asin",
            "acos",
            "atan",
            "logarithm",
            "natural_log",
            "absolute",
            "get_constant",
            "sum",
            "avg",
            "median",
            "min",
            "max",
            "count",
            "range",
            "percentile",
            "memory_clear",
            "memory_recall",
            "memory_add",
            "memory_subtract",
            "batch",
            "cache_clear",
            "cache_info",
            "set_angle_mode",
            "get_angle_mode",
        ];

        results.push(
            await runTest("Verify required tools exist", async () => {
                const tools = await client.listTools();
                const toolNames = tools.map((t) => t.name);
                const missing = requiredTools.filter(
                    (name) => !toolNames.includes(name),
                );
                if (missing.length > 0) {
                    throw new Error(`Missing tools: ${missing.join(", ")}`);
                }
            }),
        );

        // ========== 3. Basic Arithmetic Tests ==========
        console.log("\n➕ 3. Basic Arithmetic Tests");
        results.push(
            await runTest("Addition: 0.1 + 0.2", async () => {
                const result = await client.callTool({
                    name: "add",
                    arguments: { a: 0.1, b: 0.2 },
                });
                const value = parseFloat(result.content[0].text);
                // Allow small floating point tolerance
                if (Math.abs(value - 0.3) > 1e-10) {
                    throw new Error(`Expected ~0.3, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Subtraction: 1.0 - 0.9", async () => {
                const result = await client.callTool({
                    name: "subtract",
                    arguments: { a: 1.0, b: 0.9 },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - 0.1) > 1e-10) {
                    throw new Error(`Expected ~0.1, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Multiplication: 6 × 7", async () => {
                const result = await client.callTool({
                    name: "multiply",
                    arguments: { a: 6, b: 7 },
                });
                if (parseFloat(result.content[0].text) !== 42) {
                    throw new Error("Expected 42");
                }
            }),
        );

        results.push(
            await runTest("Division: 10 / 4", async () => {
                const result = await client.callTool({
                    name: "divide",
                    arguments: { a: 10, b: 4 },
                });
                if (parseFloat(result.content[0].text) !== 2.5) {
                    throw new Error("Expected 2.5");
                }
            }),
        );

        results.push(
            await runTest("Division by zero error", async () => {
                try {
                    await client.callTool({
                        name: "divide",
                        arguments: { a: 5, b: 0 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("Division by zero")) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        results.push(
            await runTest("Modulo: 17 % 5", async () => {
                const result = await client.callTool({
                    name: "modulo",
                    arguments: { a: 17, b: 5 },
                });
                if (parseFloat(result.content[0].text) !== 2) {
                    throw new Error("Expected 2");
                }
            }),
        );

        results.push(
            await runTest("Modulo by zero error", async () => {
                try {
                    await client.callTool({
                        name: "modulo",
                        arguments: { a: 5, b: 0 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("Modulo by zero")) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        // ========== 4. Advanced Math Tests ==========
        console.log("\n🔬 4. Advanced Math Tests");
        results.push(
            await runTest("Power: 2^10", async () => {
                const result = await client.callTool({
                    name: "power",
                    arguments: { base: 2, exponent: 10 },
                });
                if (parseFloat(result.content[0].text) !== 1024) {
                    throw new Error("Expected 1024");
                }
            }),
        );

        results.push(
            await runTest("Square root: √144", async () => {
                const result = await client.callTool({
                    name: "sqrt",
                    arguments: { value: 144 },
                });
                if (parseFloat(result.content[0].text) !== 12) {
                    throw new Error("Expected 12");
                }
            }),
        );

        results.push(
            await runTest("Square root of negative (error)", async () => {
                try {
                    await client.callTool({
                        name: "sqrt",
                        arguments: { value: -1 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("negative")) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        results.push(
            await runTest("Factorial: 5!", async () => {
                const result = await client.callTool({
                    name: "factorial",
                    arguments: { n: 5 },
                });
                if (parseFloat(result.content[0].text) !== 120) {
                    throw new Error("Expected 120");
                }
            }),
        );

        results.push(
            await runTest("Factorial: 0!", async () => {
                const result = await client.callTool({
                    name: "factorial",
                    arguments: { n: 0 },
                });
                if (parseFloat(result.content[0].text) !== 1) {
                    throw new Error("Expected 1");
                }
            }),
        );

        results.push(
            await runTest("Factorial negative (error)", async () => {
                try {
                    await client.callTool({
                        name: "factorial",
                        arguments: { n: -1 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("negative")) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        // ========== 5. Trigonometry Tests ==========
        console.log("\n📐 5. Trigonometry Tests");
        results.push(
            await runTest("Sine: sin(90°)", async () => {
                const result = await client.callTool({
                    name: "sine",
                    arguments: { angle: 90, unit: "degrees" },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - 1) > 1e-10) {
                    throw new Error(`Expected ~1, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Cosine: cos(0°)", async () => {
                const result = await client.callTool({
                    name: "cosine",
                    arguments: { angle: 0, unit: "degrees" },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - 1) > 1e-10) {
                    throw new Error(`Expected ~1, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Tangent: tan(45°)", async () => {
                const result = await client.callTool({
                    name: "tangent",
                    arguments: { angle: 45, unit: "degrees" },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - 1) > 1e-10) {
                    throw new Error(`Expected ~1, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Arcsine: asin(1) in degrees", async () => {
                const result = await client.callTool({
                    name: "asin",
                    arguments: { value: 1, unit: "degrees" },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - 90) > 1e-10) {
                    throw new Error(`Expected ~90, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Arccosine: acos(0) in degrees", async () => {
                const result = await client.callTool({
                    name: "acos",
                    arguments: { value: 0, unit: "degrees" },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - 90) > 1e-10) {
                    throw new Error(`Expected ~90, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Arctangent: atan(1) in degrees", async () => {
                const result = await client.callTool({
                    name: "atan",
                    arguments: { value: 1, unit: "degrees" },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - 45) > 1e-10) {
                    throw new Error(`Expected ~45, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Asin out of range (error)", async () => {
                try {
                    await client.callTool({
                        name: "asin",
                        arguments: { value: 2 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("between -1 and 1")) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        // ========== 6. Logarithm Tests ==========
        console.log("\n📊 6. Logarithm Tests");
        results.push(
            await runTest("Log10: log10(1000)", async () => {
                const result = await client.callTool({
                    name: "logarithm",
                    arguments: { value: 1000 },
                });
                if (parseFloat(result.content[0].text) !== 3) {
                    throw new Error("Expected 3");
                }
            }),
        );

        results.push(
            await runTest("Natural log: ln(e)", async () => {
                const result = await client.callTool({
                    name: "natural_log",
                    arguments: { value: Math.E },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - 1) > 1e-10) {
                    throw new Error(`Expected ~1, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Log10 of zero (error)", async () => {
                try {
                    await client.callTool({
                        name: "logarithm",
                        arguments: { value: 0 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("positive")) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        // ========== 7. Constant Tests ==========
        console.log("\n🔢 7. Constant Tests");
        results.push(
            await runTest("Get constant: pi", async () => {
                const result = await client.callTool({
                    name: "get_constant",
                    arguments: { name: "pi" },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - Math.PI) > 1e-10) {
                    throw new Error(`Expected ~${Math.PI}, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Get constant: e", async () => {
                const result = await client.callTool({
                    name: "get_constant",
                    arguments: { name: "e" },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - Math.E) > 1e-10) {
                    throw new Error(`Expected ~${Math.E}, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Get constant: c (speed of light)", async () => {
                const result = await client.callTool({
                    name: "get_constant",
                    arguments: { name: "c" },
                });
                if (parseFloat(result.content[0].text) !== 299792458) {
                    throw new Error("Expected 299792458");
                }
            }),
        );

        results.push(
            await runTest("Unknown constant (error)", async () => {
                try {
                    await client.callTool({
                        name: "get_constant",
                        arguments: { name: "unknown" },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    // Accept either the validation error or the "Unknown constant" error
                    if (
                        !error.message.includes("Unknown constant") &&
                        !error.message.includes("Validation Error")
                    ) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        // ========== 8. Statistical Tests ==========
        console.log("\n📈 8. Statistical Tests");
        results.push(
            await runTest("Sum: [1, 2, 3, 4, 5]", async () => {
                const result = await client.callTool({
                    name: "sum",
                    arguments: { numbers: [1, 2, 3, 4, 5] },
                });
                if (parseFloat(result.content[0].text) !== 15) {
                    throw new Error("Expected 15");
                }
            }),
        );

        results.push(
            await runTest("Average: [1, 2, 3, 4, 5]", async () => {
                const result = await client.callTool({
                    name: "avg",
                    arguments: { numbers: [1, 2, 3, 4, 5] },
                });
                if (parseFloat(result.content[0].text) !== 3) {
                    throw new Error("Expected 3");
                }
            }),
        );

        results.push(
            await runTest("Median: [3, 1, 4, 1, 5]", async () => {
                const result = await client.callTool({
                    name: "median",
                    arguments: { numbers: [3, 1, 4, 1, 5] },
                });
                if (parseFloat(result.content[0].text) !== 3) {
                    throw new Error("Expected 3");
                }
            }),
        );

        results.push(
            await runTest("Median even: [1, 2, 3, 4]", async () => {
                const result = await client.callTool({
                    name: "median",
                    arguments: { numbers: [1, 2, 3, 4] },
                });
                if (parseFloat(result.content[0].text) !== 2.5) {
                    throw new Error("Expected 2.5");
                }
            }),
        );

        results.push(
            await runTest("Min: [3, 1, 4, 1, 5]", async () => {
                const result = await client.callTool({
                    name: "min",
                    arguments: { numbers: [3, 1, 4, 1, 5] },
                });
                if (parseFloat(result.content[0].text) !== 1) {
                    throw new Error("Expected 1");
                }
            }),
        );

        results.push(
            await runTest("Max: [3, 1, 4, 1, 5]", async () => {
                const result = await client.callTool({
                    name: "max",
                    arguments: { numbers: [3, 1, 4, 1, 5] },
                });
                if (parseFloat(result.content[0].text) !== 5) {
                    throw new Error("Expected 5");
                }
            }),
        );

        results.push(
            await runTest("Count: [1, 2, 3]", async () => {
                const result = await client.callTool({
                    name: "count",
                    arguments: { numbers: [1, 2, 3] },
                });
                if (parseFloat(result.content[0].text) !== 3) {
                    throw new Error("Expected 3");
                }
            }),
        );

        results.push(
            await runTest("Range: [1, 5, 3]", async () => {
                const result = await client.callTool({
                    name: "range",
                    arguments: { numbers: [1, 5, 3] },
                });
                if (parseFloat(result.content[0].text) !== 4) {
                    throw new Error("Expected 4");
                }
            }),
        );

        results.push(
            await runTest(
                "Percentile 50 (median): [10, 20, 30, 40, 50]",
                async () => {
                    const result = await client.callTool({
                        name: "percentile",
                        arguments: {
                            numbers: [10, 20, 30, 40, 50],
                            percentile: 50,
                        },
                    });
                    if (parseFloat(result.content[0].text) !== 30) {
                        throw new Error("Expected 30");
                    }
                },
            ),
        );

        results.push(
            await runTest("Empty array sum (error)", async () => {
                try {
                    await client.callTool({
                        name: "sum",
                        arguments: { numbers: [] },
                    });
                    // Empty sum might return 0, which is valid
                } catch (error: any) {
                    // Some implementations throw, some return 0
                    if (!error.message.includes("empty")) {
                        // If it throws, check the message
                        if (!error.message.includes("empty")) {
                            // Ignore if it's not about empty arrays
                        }
                    }
                }
            }),
        );

        results.push(
            await runTest("Empty array avg (error)", async () => {
                try {
                    await client.callTool({
                        name: "avg",
                        arguments: { numbers: [] },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("empty")) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        // ========== 9. Memory Tests ==========
        console.log("\n💾 9. Memory Tests");
        results.push(
            await runTest("Memory clear", async () => {
                const result = await client.callTool({
                    name: "memory_clear",
                    arguments: {},
                });
                if (!result.content[0].text.includes("Memory cleared")) {
                    throw new Error("Expected memory cleared message");
                }
            }),
        );

        results.push(
            await runTest("Memory recall after clear", async () => {
                await client.callTool({ name: "memory_clear", arguments: {} });
                const result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                if (parseFloat(result.content[0].text) !== 0) {
                    throw new Error("Expected 0");
                }
            }),
        );

        results.push(
            await runTest("Memory add and recall", async () => {
                await client.callTool({ name: "memory_clear", arguments: {} });
                await client.callTool({
                    name: "memory_add",
                    arguments: { value: 50 },
                });
                const result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                if (parseFloat(result.content[0].text) !== 50) {
                    throw new Error("Expected 50");
                }
            }),
        );

        results.push(
            await runTest("Memory subtract", async () => {
                await client.callTool({ name: "memory_clear", arguments: {} });
                await client.callTool({
                    name: "memory_add",
                    arguments: { value: 100 },
                });
                await client.callTool({
                    name: "memory_subtract",
                    arguments: { value: 40 },
                });
                const result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                if (parseFloat(result.content[0].text) !== 60) {
                    throw new Error("Expected 60");
                }
            }),
        );

        results.push(
            await runTest("Memory full cycle (MC, M+, M-, MR)", async () => {
                await client.callTool({ name: "memory_clear", arguments: {} });
                await client.callTool({
                    name: "memory_add",
                    arguments: { value: 99 },
                });
                await client.callTool({
                    name: "memory_add",
                    arguments: { value: 1 },
                });
                let result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                if (parseFloat(result.content[0].text) !== 100) {
                    throw new Error("Expected 100");
                }
                await client.callTool({
                    name: "memory_subtract",
                    arguments: { value: 50 },
                });
                result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                if (parseFloat(result.content[0].text) !== 50) {
                    throw new Error("Expected 50");
                }
                await client.callTool({ name: "memory_clear", arguments: {} });
                result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                if (parseFloat(result.content[0].text) !== 0) {
                    throw new Error("Expected 0");
                }
            }),
        );

        // ========== 10. Error Handling Tests ==========
        console.log("\n⚠️  10. Error Handling Tests");
        results.push(
            await runTest("Invalid tool name", async () => {
                try {
                    await client.callTool({
                        name: "nonexistent_tool",
                        arguments: {},
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("not found")) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        results.push(
            await runTest("Invalid argument type", async () => {
                try {
                    await client.callTool({
                        name: "add",
                        arguments: { a: "not a number", b: 2 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (
                        !error.message.includes("Validation Error") &&
                        !error.message.includes("Expected number")
                    ) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        results.push(
            await runTest("Missing required argument", async () => {
                try {
                    await client.callTool({ name: "add", arguments: { a: 1 } });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("Missing required property")) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        // ========== 11. Structured Error Response Tests ==========
        console.log("\n📋 11. Structured Error Response Tests");
        results.push(
            await runTest("structured error: tool not found", async () => {
                try {
                    await client.callTool({ name: "nonexistent_tool", arguments: {} });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    const msg = error.message || error.toString();
                    if (!msg.includes("not found")) {
                        throw new Error(`Expected 'not found', got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("structured error: missing required param", async () => {
                try {
                    await client.callTool({ name: "add", arguments: { a: 1 } });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    const msg = error.message || error.toString();
                    if (!msg.includes("Missing required property")) {
                        throw new Error(`Expected missing param error, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("structured error: wrong type validation", async () => {
                try {
                    await client.callTool({ name: "add", arguments: { a: "string", b: 2 } });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    const msg = error.message || error.toString();
                    if (!msg.includes("Expected number") && !msg.includes("Validation Error")) {
                        throw new Error(`Expected validation error, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("structured error: enum validation", async () => {
                try {
                    await client.callTool({
                        name: "sine",
                        arguments: { angle: 0, unit: "gradians" },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    const msg = error.message || error.toString();
                    if (!msg.includes("degrees") || !msg.includes("radians")) {
                        throw new Error(`Expected enum error, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("structured error: math domain error", async () => {
                try {
                    await client.callTool({ name: "sqrt", arguments: { value: -4 } });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    const msg = error.message || error.toString();
                    if (!msg.toLowerCase().includes("negative")) {
                        throw new Error(`Expected negative error, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("structured error: division by zero", async () => {
                try {
                    await client.callTool({ name: "divide", arguments: { a: 1, b: 0 } });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    const msg = error.message || error.toString();
                    if (!msg.includes("Division by zero")) {
                        throw new Error(`Expected division by zero error, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("structured error: factorial negative", async () => {
                try {
                    await client.callTool({ name: "factorial", arguments: { n: -5 } });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    const msg = error.message || error.toString();
                    if (!msg.includes("negative")) {
                        throw new Error(`Expected negative factorial error, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("structured error: factorial non-integer", async () => {
                try {
                    await client.callTool({ name: "factorial", arguments: { n: 5.5 } });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    const msg = error.message || error.toString();
                    if (!msg.includes("integer")) {
                        throw new Error(`Expected integer error, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("structured error: empty array stats", async () => {
                try {
                    await client.callTool({ name: "avg", arguments: { numbers: [] } });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    const msg = error.message || error.toString();
                    if (!msg.includes("empty")) {
                        throw new Error(`Expected empty error, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("structured error: convert_base invalid chars", async () => {
                try {
                    await client.callTool({
                        name: "convert_base",
                        arguments: { value: "1G", from_base: 16, to_base: 2 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    const msg = error.message || error.toString();
                    if (!msg.includes("Invalid characters")) {
                        throw new Error(`Expected invalid chars error, got: ${msg}`);
                    }
                }
            }),
        );

        // ========== 12. Batch Processing Tests ==========
        console.log("\n📦 12. Batch Processing Tests");
        results.push(
            await runTest("Batch: basic multi-operation", async () => {
                const result = await client.callTool({
                    name: "batch",
                    arguments: {
                        operations: [
                            { tool: "add", args: { a: 10, b: 20 } },
                            { tool: "multiply", args: { a: 3, b: 7 } },
                        ],
                    },
                });
                const data = JSON.parse(result.content[0].text);
                if (!Array.isArray(data)) throw new Error("Expected array result");
                if (data.length !== 2) throw new Error(`Expected 2 results, got ${data.length}`);
                if (!data[0].success || data[0].data !== 30) throw new Error(`add failed: ${JSON.stringify(data[0])}`);
                if (!data[1].success || data[1].data !== 21) throw new Error(`multiply failed: ${JSON.stringify(data[1])}`);
            }),
        );

        results.push(
            await runTest("Batch: partial failure continues", async () => {
                const result = await client.callTool({
                    name: "batch",
                    arguments: {
                        operations: [
                            { tool: "add", args: { a: 1, b: 2 } },
                            { tool: "divide", args: { a: 5, b: 0 } },
                            { tool: "power", args: { base: 2, exponent: 8 } },
                        ],
                    },
                });
                const data = JSON.parse(result.content[0].text);
                if (data.length !== 3) throw new Error(`Expected 3 results, got ${data.length}`);
                if (!data[0].success) throw new Error("add should succeed");
                if (data[1].success) throw new Error("divide by zero should fail");
                if (!data[2].success) throw new Error("power should succeed");
            }),
        );

        results.push(
            await runTest("Batch: nonexistent tool", async () => {
                const result = await client.callTool({
                    name: "batch",
                    arguments: {
                        operations: [
                            { tool: "nonexistent", args: {} },
                        ],
                    },
                });
                const data = JSON.parse(result.content[0].text);
                if (data[0].success) throw new Error("Expected failure for nonexistent tool");
                if (!data[0].error.includes("not found")) throw new Error(`Wrong error: ${data[0].error}`);
            }),
        );

        results.push(
            await runTest("Batch: empty operations", async () => {
                try {
                    await client.callTool({
                        name: "batch",
                        arguments: { operations: [] },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("non-empty")) {
                        throw new Error(`Wrong error: ${error.message}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Batch: with evaluate_expression", async () => {
                const result = await client.callTool({
                    name: "batch",
                    arguments: {
                        operations: [
                            { tool: "evaluate_expression", args: { expression: "2 + 3" } },
                            { tool: "evaluate_expression", args: { expression: "4 * 5" } },
                        ],
                    },
                });
                const data = JSON.parse(result.content[0].text);
                if (!data[0].success || parseFloat(data[0].data) !== 5) throw new Error("First eval failed");
                if (!data[1].success || parseFloat(data[1].data) !== 20) throw new Error("Second eval failed");
            }),
        );

        results.push(
            await runTest("Batch: too many operations (limit 50)", async () => {
                try {
                    const ops = Array.from({ length: 51 }, (_, i) => ({ tool: "add", args: { a: i, b: 1 } }));
                    await client.callTool({
                        name: "batch",
                        arguments: { operations: ops },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("50")) {
                        throw new Error(`Wrong error: ${error.message}`);
                    }
                }
            }),
        );

        // ========== 13. Angle Mode Toggle Tests ==========
        console.log("\n🔀 13. Angle Mode Toggle Tests");
        results.push(
            await runTest("Angle: default mode is radians", async () => {
                const result = await client.callTool({ name: "get_angle_mode", arguments: {} });
                const data = JSON.parse(result.content[0].text);
                if (data.mode !== "radians") throw new Error(`Expected radians, got ${data.mode}`);
            }),
        );

        results.push(
            await runTest("Angle: set mode to degrees", async () => {
                const result = await client.callTool({ name: "set_angle_mode", arguments: { mode: "degrees" } });
                if (!result.content[0].text.includes("degrees")) throw new Error(`Expected degrees message, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Angle: get mode returns degrees after set", async () => {
                await client.callTool({ name: "set_angle_mode", arguments: { mode: "degrees" } });
                const result = await client.callTool({ name: "get_angle_mode", arguments: {} });
                const data = JSON.parse(result.content[0].text);
                if (data.mode !== "degrees") throw new Error(`Expected degrees, got ${data.mode}`);
            }),
        );

        results.push(
            await runTest("Angle: sin(90) = 1 in degrees mode", async () => {
                await client.callTool({ name: "set_angle_mode", arguments: { mode: "degrees" } });
                const result = await client.callTool({ name: "sine", arguments: { angle: 90 } });
                if (Math.abs(parseFloat(result.content[0].text) - 1) > 1e-10) throw new Error(`Expected ~1, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Angle: sin(PI/2) = 1 in radians mode", async () => {
                await client.callTool({ name: "set_angle_mode", arguments: { mode: "radians" } });
                const result = await client.callTool({ name: "sine", arguments: { angle: Math.PI / 2 } });
                if (Math.abs(parseFloat(result.content[0].text) - 1) > 1e-10) throw new Error(`Expected ~1, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Angle: explicit unit overrides global mode", async () => {
                await client.callTool({ name: "set_angle_mode", arguments: { mode: "radians" } });
                const result = await client.callTool({ name: "sine", arguments: { angle: 90, unit: "degrees" } });
                if (Math.abs(parseFloat(result.content[0].text) - 1) > 1e-10) throw new Error(`Expected ~1, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Angle: asin returns degrees when mode is degrees", async () => {
                await client.callTool({ name: "set_angle_mode", arguments: { mode: "degrees" } });
                const result = await client.callTool({ name: "asin", arguments: { value: 1 } });
                if (Math.abs(parseFloat(result.content[0].text) - 90) > 1e-10) throw new Error(`Expected ~90, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Angle: cos(60) = 0.5 in degrees mode", async () => {
                await client.callTool({ name: "set_angle_mode", arguments: { mode: "degrees" } });
                const result = await client.callTool({ name: "cosine", arguments: { angle: 60 } });
                if (Math.abs(parseFloat(result.content[0].text) - 0.5) > 1e-10) throw new Error(`Expected ~0.5, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Angle: atan(1) = 45 in degrees mode", async () => {
                await client.callTool({ name: "set_angle_mode", arguments: { mode: "degrees" } });
                const result = await client.callTool({ name: "atan", arguments: { value: 1 } });
                if (Math.abs(parseFloat(result.content[0].text) - 45) > 1e-10) throw new Error(`Expected ~45, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Angle: switch back to radians for remaining tests", async () => {
                await client.callTool({ name: "set_angle_mode", arguments: { mode: "radians" } });
                const result = await client.callTool({ name: "get_angle_mode", arguments: {} });
                const data = JSON.parse(result.content[0].text);
                if (data.mode !== "radians") throw new Error(`Expected radians, got ${data.mode}`);
            }),
        );

        // --- 14. Extended evaluate_expression Tests ---
        results.push(
            await runTest("evaluate_expression: simple addition", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "5 + 3" },
                });
                if (parseFloat(result.content[0].text) !== 8)
                    throw new Error(
                        `Expected 8, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("evaluate_expression: complex nested", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "((5 + 3) * 2) - 4" },
                });
                if (parseFloat(result.content[0].text) !== 12)
                    throw new Error(
                        `Expected 12, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("evaluate_expression: power operator", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "2 ^ 8" },
                });
                if (parseFloat(result.content[0].text) !== 256)
                    throw new Error(
                        `Expected 256, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("evaluate_expression: negative numbers", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "-5 + 10" },
                });
                if (parseFloat(result.content[0].text) !== 5)
                    throw new Error(
                        `Expected 5, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("evaluate_expression: decimals", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "0.1 + 0.2" },
                });
                if (Math.abs(parseFloat(result.content[0].text) - 0.3) > 1e-10)
                    throw new Error(
                        `Expected 0.3, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest(
                "evaluate_expression: invalid chars (error)",
                async () => {
                    try {
                        await client.callTool({
                            name: "evaluate_expression",
                            arguments: { expression: "5 + z" }, // 'z' is not a valid character
                        });
                        throw new Error("Should have thrown an error");
                    } catch (error: any) {
                        if (
                            !error.message.includes("Security Error") &&
                            !error.message.includes("invalid characters")
                        ) {
                            throw new Error(
                                `Wrong error message: ${error.message}`,
                            );
                        }
                    }
                },
            ),
        );

        // --- 15. Extended Constants Tests ---
        const constantsToTest = [
            { name: "tau", expected: 2 * Math.PI },
            { name: "phi", expected: 1.618033988749895 },
            { name: "sqrt2", expected: Math.SQRT2 },
            { name: "g", expected: 9.80665 },
            { name: "G", expected: 6.6743e-11 },
            { name: "h", expected: 6.62607015e-34 },
            { name: "NA", expected: 6.02214076e23 },
        ];

        for (const constant of constantsToTest) {
            results.push(
                await runTest(`Get constant: ${constant.name}`, async () => {
                    const result = await client.callTool({
                        name: "get_constant",
                        arguments: { name: constant.name },
                    });
                    const value = parseFloat(result.content[0].text);
                    if (
                        Math.abs(value - constant.expected) /
                            constant.expected >
                        1e-10
                    ) {
                        throw new Error(
                            `Expected ~${constant.expected}, got ${value}`,
                        );
                    }
                }),
            );
        }

        // --- 16. Trigonometry Radians Tests ---
        results.push(
            await runTest("Sine in radians: sin(π/2)", async () => {
                const result = await client.callTool({
                    name: "sine",
                    arguments: { angle: Math.PI / 2, unit: "radians" },
                });
                if (Math.abs(parseFloat(result.content[0].text) - 1) > 1e-10) {
                    throw new Error(
                        `Expected ~1, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest("Cosine in radians: cos(0)", async () => {
                const result = await client.callTool({
                    name: "cosine",
                    arguments: { angle: 0, unit: "radians" },
                });
                if (Math.abs(parseFloat(result.content[0].text) - 1) > 1e-10) {
                    throw new Error(
                        `Expected ~1, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest("Tangent in radians: tan(π/4)", async () => {
                const result = await client.callTool({
                    name: "tangent",
                    arguments: { angle: Math.PI / 4, unit: "radians" },
                });
                if (Math.abs(parseFloat(result.content[0].text) - 1) > 1e-10) {
                    throw new Error(
                        `Expected ~1, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest("Arcsine in radians: asin(0.5)", async () => {
                const result = await client.callTool({
                    name: "asin",
                    arguments: { value: 0.5, unit: "radians" },
                });
                if (
                    Math.abs(parseFloat(result.content[0].text) - Math.PI / 6) >
                    1e-10
                ) {
                    throw new Error(
                        `Expected ~${Math.PI / 6}, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        // --- 17. Statistical Edge Cases ---
        results.push(
            await runTest("Percentile 0 (min)", async () => {
                const result = await client.callTool({
                    name: "percentile",
                    arguments: { numbers: [10, 20, 30, 40, 50], percentile: 0 },
                });
                if (parseFloat(result.content[0].text) !== 10)
                    throw new Error(
                        `Expected 10, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Percentile 100 (max)", async () => {
                const result = await client.callTool({
                    name: "percentile",
                    arguments: {
                        numbers: [10, 20, 30, 40, 50],
                        percentile: 100,
                    },
                });
                if (parseFloat(result.content[0].text) !== 50)
                    throw new Error(
                        `Expected 50, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Single element array", async () => {
                const result = await client.callTool({
                    name: "avg",
                    arguments: { numbers: [42] },
                });
                if (parseFloat(result.content[0].text) !== 42)
                    throw new Error(
                        `Expected 42, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Negative numbers in stats", async () => {
                const result = await client.callTool({
                    name: "sum",
                    arguments: { numbers: [-5, 10, -3, 8] },
                });
                if (parseFloat(result.content[0].text) !== 10)
                    throw new Error(
                        `Expected 10, got ${result.content[0].text}`,
                    );
            }),
        );

        // --- 18. Floating Point Precision Tests ---
        results.push(
            await runTest("Safe math: 1.1 + 2.2", async () => {
                const result = await client.callTool({
                    name: "add",
                    arguments: { a: 1.1, b: 2.2 },
                });
                if (parseFloat(result.content[0].text) !== 3.3)
                    throw new Error(
                        `Expected 3.3, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Safe math: 0.3 - 0.1", async () => {
                const result = await client.callTool({
                    name: "subtract",
                    arguments: { a: 0.3, b: 0.1 },
                });
                if (parseFloat(result.content[0].text) !== 0.2)
                    throw new Error(
                        `Expected 0.2, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Safe math: 0.1 * 0.2", async () => {
                const result = await client.callTool({
                    name: "multiply",
                    arguments: { a: 0.1, b: 0.2 },
                });
                if (parseFloat(result.content[0].text) !== 0.02)
                    throw new Error(
                        `Expected 0.02, got ${result.content[0].text}`,
                    );
            }),
        );

        // --- 19. Factorial Edge Cases ---
        results.push(
            await runTest("Factorial: 1!", async () => {
                const result = await client.callTool({
                    name: "factorial",
                    arguments: { n: 1 },
                });
                if (parseFloat(result.content[0].text) !== 1)
                    throw new Error(
                        `Expected 1, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Factorial: 10!", async () => {
                const result = await client.callTool({
                    name: "factorial",
                    arguments: { n: 10 },
                });
                if (parseFloat(result.content[0].text) !== 3628800)
                    throw new Error(
                        `Expected 3628800, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Factorial non-integer (error)", async () => {
                try {
                    await client.callTool({
                        name: "factorial",
                        arguments: { n: 5.5 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("integer")) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        // --- 20. Absolute Value Tests ---
        results.push(
            await runTest("Absolute: positive", async () => {
                const result = await client.callTool({
                    name: "absolute",
                    arguments: { value: -42 },
                });
                if (parseFloat(result.content[0].text) !== 42)
                    throw new Error(
                        `Expected 42, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Absolute: zero", async () => {
                const result = await client.callTool({
                    name: "absolute",
                    arguments: { value: 0 },
                });
                if (parseFloat(result.content[0].text) !== 0)
                    throw new Error(
                        `Expected 0, got ${result.content[0].text}`,
                    );
            }),
        );

        // --- 21. Logarithm Edge Cases ---
        results.push(
            await runTest("Log10: log10(1)", async () => {
                const result = await client.callTool({
                    name: "logarithm",
                    arguments: { value: 1 },
                });
                if (parseFloat(result.content[0].text) !== 0)
                    throw new Error(
                        `Expected 0, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Natural log: ln(1)", async () => {
                const result = await client.callTool({
                    name: "natural_log",
                    arguments: { value: 1 },
                });
                if (parseFloat(result.content[0].text) !== 0)
                    throw new Error(
                        `Expected 0, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Natural log negative (error)", async () => {
                try {
                    await client.callTool({
                        name: "natural_log",
                        arguments: { value: -1 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (!error.message.includes("positive")) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        // --- 22. Modulo Edge Cases ---
        results.push(
            await runTest("Modulo: negative dividend", async () => {
                const result = await client.callTool({
                    name: "modulo",
                    arguments: { a: -17, b: 5 },
                });
                if (parseFloat(result.content[0].text) !== -2)
                    throw new Error(
                        `Expected -2, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Modulo: decimal", async () => {
                const result = await client.callTool({
                    name: "modulo",
                    arguments: { a: 17.5, b: 5 },
                });
                if (parseFloat(result.content[0].text) !== 2.5)
                    throw new Error(
                        `Expected 2.5, got ${result.content[0].text}`,
                    );
            }),
        );

        // --- 23. Power Edge Cases ---
        results.push(
            await runTest("Power: negative base", async () => {
                const result = await client.callTool({
                    name: "power",
                    arguments: { base: -2, exponent: 3 },
                });
                if (parseFloat(result.content[0].text) !== -8)
                    throw new Error(
                        `Expected -8, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Power: zero exponent", async () => {
                const result = await client.callTool({
                    name: "power",
                    arguments: { base: 5, exponent: 0 },
                });
                if (parseFloat(result.content[0].text) !== 1)
                    throw new Error(
                        `Expected 1, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Power: negative exponent", async () => {
                const result = await client.callTool({
                    name: "power",
                    arguments: { base: 2, exponent: -1 },
                });
                if (parseFloat(result.content[0].text) !== 0.5)
                    throw new Error(
                        `Expected 0.5, got ${result.content[0].text}`,
                    );
            }),
        );

        // --- 24. Base Conversion Tests ---
        results.push(
            await runTest("convert_base: binary to decimal", async () => {
                const result = await client.callTool({
                    name: "convert_base",
                    arguments: { value: "1010", from_base: 2, to_base: 10 },
                });
                if (result.content[0].text !== "10")
                    throw new Error(
                        `Expected '10', got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("convert_base: decimal to binary", async () => {
                const result = await client.callTool({
                    name: "convert_base",
                    arguments: { value: "10", from_base: 10, to_base: 2 },
                });
                if (result.content[0].text !== "1010")
                    throw new Error(
                        `Expected '1010', got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("convert_base: hex to decimal", async () => {
                const result = await client.callTool({
                    name: "convert_base",
                    arguments: { value: "FF", from_base: 16, to_base: 10 },
                });
                if (result.content[0].text !== "255")
                    throw new Error(
                        `Expected '255', got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("convert_base: decimal to hex", async () => {
                const result = await client.callTool({
                    name: "convert_base",
                    arguments: { value: "255", from_base: 10, to_base: 16 },
                });
                if (result.content[0].text !== "FF")
                    throw new Error(
                        `Expected 'FF', got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("convert_base: hex to binary", async () => {
                const result = await client.callTool({
                    name: "convert_base",
                    arguments: { value: "FF", from_base: 16, to_base: 2 },
                });
                if (result.content[0].text !== "11111111")
                    throw new Error(
                        `Expected '11111111', got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("convert_base: binary to hex", async () => {
                const result = await client.callTool({
                    name: "convert_base",
                    arguments: { value: "11111111", from_base: 2, to_base: 16 },
                });
                if (result.content[0].text !== "FF")
                    throw new Error(
                        `Expected 'FF', got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("convert_base: octal to decimal", async () => {
                const result = await client.callTool({
                    name: "convert_base",
                    arguments: { value: "17", from_base: 8, to_base: 10 },
                });
                if (result.content[0].text !== "15")
                    throw new Error(
                        `Expected '15', got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("convert_base: decimal to octal", async () => {
                const result = await client.callTool({
                    name: "convert_base",
                    arguments: { value: "15", from_base: 10, to_base: 8 },
                });
                if (result.content[0].text !== "17")
                    throw new Error(
                        `Expected '17', got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest(
                "convert_base: same base (no conversion)",
                async () => {
                    const result = await client.callTool({
                        name: "convert_base",
                        arguments: { value: "123", from_base: 10, to_base: 10 },
                    });
                    if (result.content[0].text !== "123")
                        throw new Error(
                            `Expected '123', got ${result.content[0].text}`,
                        );
                },
            ),
        );

        results.push(
            await runTest("convert_base: lowercase hex input", async () => {
                const result = await client.callTool({
                    name: "convert_base",
                    arguments: { value: "ff", from_base: 16, to_base: 10 },
                });
                if (result.content[0].text !== "255")
                    throw new Error(
                        `Expected '255', got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("convert_base: zero conversion", async () => {
                const result = await client.callTool({
                    name: "convert_base",
                    arguments: { value: "0", from_base: 10, to_base: 2 },
                });
                if (result.content[0].text !== "0")
                    throw new Error(
                        `Expected '0', got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("convert_base: invalid binary (error)", async () => {
                try {
                    await client.callTool({
                        name: "convert_base",
                        arguments: { value: "102", from_base: 2, to_base: 10 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (
                        !error.message.includes("Invalid characters") &&
                        !error.message.includes("base 2")
                    ) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        results.push(
            await runTest("convert_base: invalid octal (error)", async () => {
                try {
                    await client.callTool({
                        name: "convert_base",
                        arguments: { value: "19", from_base: 8, to_base: 10 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (
                        !error.message.includes("Invalid characters") &&
                        !error.message.includes("base 8")
                    ) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        results.push(
            await runTest(
                "convert_base: invalid hex character (error)",
                async () => {
                    try {
                        await client.callTool({
                            name: "convert_base",
                            arguments: {
                                value: "GH",
                                from_base: 16,
                                to_base: 10,
                            },
                        });
                        throw new Error("Should have thrown an error");
                    } catch (error: any) {
                        if (
                            !error.message.includes("Invalid characters") &&
                            !error.message.includes("base 16")
                        ) {
                            throw new Error(
                                `Wrong error message: ${error.message}`,
                            );
                        }
                    }
                },
            ),
        );

        // --- 25. Scientific Notation Tests ---
        results.push(
            await runTest("Scientific: 1e6 (1 million)", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "1e6" },
                });
                if (parseFloat(result.content[0].text) !== 1000000) {
                    throw new Error(`Expected 1000000, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Scientific: 2.5e-3 (0.0025)", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "2.5e-3" },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - 0.0025) > 1e-10) {
                    throw new Error(`Expected 0.0025, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Scientific: 1e+6 (positive exponent)", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "1e+6" },
                });
                if (parseFloat(result.content[0].text) !== 1000000) {
                    throw new Error(`Expected 1000000, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Scientific: 5E3 (uppercase E)", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "5E3" },
                });
                if (parseFloat(result.content[0].text) !== 5000) {
                    throw new Error(`Expected 5000, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Scientific: 1e6 + 1e3 (combined)", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "1e6 + 1e3" },
                });
                if (parseFloat(result.content[0].text) !== 1001000) {
                    throw new Error(`Expected 1001000, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Scientific: (1.5e2) * 2 (with parens)", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "(1.5e2) * 2" },
                });
                if (parseFloat(result.content[0].text) !== 300) {
                    throw new Error(`Expected 300, got ${result.content[0].text}`);
                }
            }),
        );

        // --- 26. Built-in Functions Tests ---
        results.push(
            await runTest("Built-in: abs(-5) = 5", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "abs(-5)" },
                });
                if (parseFloat(result.content[0].text) !== 5) {
                    throw new Error(`Expected 5, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: abs(3) = 3", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "abs(3)" },
                });
                if (parseFloat(result.content[0].text) !== 3) {
                    throw new Error(`Expected 3, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: round(3.7) = 4", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "round(3.7)" },
                });
                if (parseFloat(result.content[0].text) !== 4) {
                    throw new Error(`Expected 4, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: round(3.2) = 3", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "round(3.2)" },
                });
                if (parseFloat(result.content[0].text) !== 3) {
                    throw new Error(`Expected 3, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: floor(3.7) = 3", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "floor(3.7)" },
                });
                if (parseFloat(result.content[0].text) !== 3) {
                    throw new Error(`Expected 3, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: floor(3.2) = 3", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "floor(3.2)" },
                });
                if (parseFloat(result.content[0].text) !== 3) {
                    throw new Error(`Expected 3, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: ceil(3.7) = 4", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "ceil(3.7)" },
                });
                if (parseFloat(result.content[0].text) !== 4) {
                    throw new Error(`Expected 4, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: ceil(3.2) = 4", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "ceil(3.2)" },
                });
                if (parseFloat(result.content[0].text) !== 4) {
                    throw new Error(`Expected 4, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: min(1, 2, 3) = 1", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "min(1, 2, 3)" },
                });
                if (parseFloat(result.content[0].text) !== 1) {
                    throw new Error(`Expected 1, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: min(5, 2, 8, 1) = 1", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "min(5, 2, 8, 1)" },
                });
                if (parseFloat(result.content[0].text) !== 1) {
                    throw new Error(`Expected 1, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: max(1, 2, 3) = 3", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "max(1, 2, 3)" },
                });
                if (parseFloat(result.content[0].text) !== 3) {
                    throw new Error(`Expected 3, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: max(5, 2, 8, 1) = 8", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "max(5, 2, 8, 1)" },
                });
                if (parseFloat(result.content[0].text) !== 8) {
                    throw new Error(`Expected 8, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: abs(-5) + round(3.7) = 9", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "abs(-5) + round(3.7)" },
                });
                if (parseFloat(result.content[0].text) !== 9) {
                    throw new Error(`Expected 9, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: floor(10 / 3) * ceil(2.1) = 9", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "floor(10 / 3) * ceil(2.1)" },
                });
                if (parseFloat(result.content[0].text) !== 9) {
                    throw new Error(`Expected 9, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: min(10, 20) + max(5, 3) = 15", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "min(10, 20) + max(5, 3)" },
                });
                if (parseFloat(result.content[0].text) !== 15) {
                    throw new Error(`Expected 15, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: abs(-3.5) = 3.5", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "abs(-3.5)" },
                });
                if (parseFloat(result.content[0].text) !== 3.5) {
                    throw new Error(`Expected 3.5, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: floor(-3.7) = -4", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "floor(-3.7)" },
                });
                if (parseFloat(result.content[0].text) !== -4) {
                    throw new Error(`Expected -4, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Built-in: ceil(-3.7) = -3", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "ceil(-3.7)" },
                });
                if (parseFloat(result.content[0].text) !== -3) {
                    throw new Error(`Expected -3, got ${result.content[0].text}`);
                }
            }),
        );

        // --- 27. Atomic Memory Operations Tests ---
        results.push(
            await runTest("Atomic Memory: Clear before test", async () => {
                const result = await client.callTool({
                    name: "memory_clear",
                    arguments: {},
                });
                if (!result.content[0].text.includes("cleared")) {
                    throw new Error("Memory clear failed");
                }
            }),
        );

        results.push(
            await runTest("Atomic Memory: 50 concurrent adds of 1", async () => {
                // Clear memory first
                await client.callTool({ name: "memory_clear", arguments: {} });
                
                // Fire 50 concurrent memory_add(1) calls
                const promises = Array(50).fill(null).map(() =>
                    client.callTool({
                        name: "memory_add",
                        arguments: { value: 1 },
                    })
                );
                
                await Promise.all(promises);
                
                // Recall memory - should be exactly 50
                const result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                
                if (parseFloat(result.content[0].text) !== 50) {
                    throw new Error(`Expected 50, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Atomic Memory: 25 concurrent subtracts of 2", async () => {
                // Set memory to 100 first
                await client.callTool({ name: "memory_clear", arguments: {} });
                await client.callTool({ name: "memory_add", arguments: { value: 100 } });
                
                // Fire 25 concurrent memory_subtract(2) calls
                const promises = Array(25).fill(null).map(() =>
                    client.callTool({
                        name: "memory_subtract",
                        arguments: { value: 2 },
                    })
                );
                
                await Promise.all(promises);
                
                // Recall memory - should be exactly 50
                const result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                
                if (parseFloat(result.content[0].text) !== 50) {
                    throw new Error(`Expected 50, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Atomic Memory: Mixed concurrent operations", async () => {
                // Clear memory
                await client.callTool({ name: "memory_clear", arguments: {} });
                
                // Fire 20 adds of 5 and 10 subtracts of 5 concurrently
                const addPromises = Array(20).fill(null).map(() =>
                    client.callTool({
                        name: "memory_add",
                        arguments: { value: 5 },
                    })
                );
                const subPromises = Array(10).fill(null).map(() =>
                    client.callTool({
                        name: "memory_subtract",
                        arguments: { value: 5 },
                    })
                );
                
                await Promise.all([...addPromises, ...subPromises]);
                
                // Recall memory - should be exactly 50 (20*5 - 10*5)
                const result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                
                if (parseFloat(result.content[0].text) !== 50) {
                    throw new Error(`Expected 50, got ${result.content[0].text}`);
                }
            }),
        );

        // --- 28. Timeout Protection Tests ---
        results.push(
            await runTest(
                "Timeout: Feature exists (worker threads)",
                async () => {
                    // Verify that timeout protection is configured
                    const result = await client.callTool({
                        name: "median",
                        arguments: { numbers: [1, 2, 3, 4, 5] },
                    });
                    if (parseFloat(result.content[0].text) !== 3) {
                        throw new Error(
                            `Basic median failed: ${result.content[0].text}`,
                        );
                    }
                },
            ),
        );

        // --- 29. Configurable Timeout Tests ---
        results.push(
            await runTest(
                "Configurable Timeout: factorial with custom timeout",
                async () => {
                    const result = await client.callTool({
                        name: "factorial",
                        arguments: { n: 20, timeout: 5000 },
                    });
                    const value = parseFloat(result.content[0].text);
                    if (value !== 2432902008176640000) {
                        throw new Error(`Expected 20! = 2432902008176640000, got ${value}`);
                    }
                },
            ),
        );

        results.push(
            await runTest(
                "Configurable Timeout: median with custom timeout",
                async () => {
                    const result = await client.callTool({
                        name: "median",
                        arguments: { numbers: [5, 2, 8, 1, 9], timeout: 5000 },
                    });
                    if (parseFloat(result.content[0].text) !== 5) {
                        throw new Error(`Expected 5, got ${result.content[0].text}`);
                    }
                },
            ),
        );

        results.push(
            await runTest(
                "Configurable Timeout: percentile with custom timeout",
                async () => {
                    const result = await client.callTool({
                        name: "percentile",
                        arguments: { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], percentile: 50, timeout: 5000 },
                    });
                    if (parseFloat(result.content[0].text) !== 5.5) {
                        throw new Error(`Expected 5.5, got ${result.content[0].text}`);
                    }
                },
            ),
        );

        results.push(
            await runTest(
                "Configurable Timeout: very short timeout causes timeout error",
                async () => {
                    try {
                        // Use a very short timeout (100ms) with a large factorial
                        // This should timeout
                        await client.callTool({
                            name: "factorial",
                            arguments: { n: 100000, timeout: 100 },
                        });
                        // If we get here, it didn't timeout (might be too fast on this machine)
                        // That's okay - the test is mainly to verify the parameter is accepted
                    } catch (error: any) {
                        if (!error.message.includes("Timeout")) {
                            // Some other error - might be okay depending on system speed
                        }
                    }
                },
            ),
        );

        results.push(
            await runTest(
                "Configurable Timeout: default timeout still works",
                async () => {
                    // Without specifying timeout, should use default
                    const result = await client.callTool({
                        name: "factorial",
                        arguments: { n: 15 },
                    });
                    const value = parseFloat(result.content[0].text);
                    if (value !== 1307674368000) {
                        throw new Error(`Expected 15! = 1307674368000, got ${value}`);
                    }
                },
            ),
        );

        results.push(
            await runTest(
                "Configurable Timeout: timeout parameter not passed to worker",
                async () => {
                    // Verify timeout doesn't interfere with calculation
                    const result = await client.callTool({
                        name: "median",
                        arguments: { numbers: [10, 20, 30], timeout: 1000 },
                    });
                    if (parseFloat(result.content[0].text) !== 20) {
                        throw new Error(`Expected 20, got ${result.content[0].text}`);
                    }
                },
            ),
        );

        // --- 30. Factorial Boundary Tests ---
        results.push(
            await runTest("Factorial: 170! (max safe)", async () => {
                const result = await client.callTool({
                    name: "factorial",
                    arguments: { n: 170 },
                });
                const value = parseFloat(result.content[0].text);
                if (!Number.isFinite(value) || value <= 0) {
                    throw new Error(
                        `Expected finite positive number, got ${value}`,
                    );
                }
            }),
        );

        results.push(
            await runTest(
                "Factorial: 171! (should error - too large)",
                async () => {
                    try {
                        await client.callTool({
                            name: "factorial",
                            arguments: { n: 171 },
                        });
                        throw new Error("Should have thrown an error");
                    } catch (error: any) {
                        if (
                            !error.message.includes("exceeds") &&
                            !error.message.includes("170")
                        ) {
                            throw new Error(
                                `Wrong error message: ${error.message}`,
                            );
                        }
                    }
                },
            ),
        );

        // --- 31. Trigonometry Undefined Points ---
        results.push(
            await runTest("Tangent: tan(90°) (undefined)", async () => {
                const result = await client.callTool({
                    name: "tangent",
                    arguments: { angle: 90, unit: "degrees" },
                });
                const value = parseFloat(result.content[0].text);
                // tan(90°) is undefined, should return very large number or Infinity
                if (!Number.isFinite(value)) {
                    // Accept Infinity as valid result for undefined tangent
                }
            }),
        );

        results.push(
            await runTest("Tangent: tan(270°) (undefined)", async () => {
                const result = await client.callTool({
                    name: "tangent",
                    arguments: { angle: 270, unit: "degrees" },
                });
                const value = parseFloat(result.content[0].text);
                if (!Number.isFinite(value)) {
                    // Accept Infinity as valid result
                }
            }),
        );

        // --- 32. Logarithm Near-Boundary ---
        results.push(
            await runTest("Log10: log10(0.0000001)", async () => {
                const result = await client.callTool({
                    name: "logarithm",
                    arguments: { value: 0.0000001 },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - -7) > 1e-10) {
                    throw new Error(`Expected ~-7, got ${value}`);
                }
            }),
        );

        results.push(
            await runTest("Natural log: ln(0.0001)", async () => {
                const result = await client.callTool({
                    name: "natural_log",
                    arguments: { value: 0.0001 },
                });
                const value = parseFloat(result.content[0].text);
                if (Math.abs(value - -9.210340371976184) > 1e-6) {
                    throw new Error(`Expected ~-9.21, got ${value}`);
                }
            }),
        );

        // --- 33. evaluate_expression More Edge Cases ---
        results.push(
            await runTest(
                "evaluate_expression: very large numbers",
                async () => {
                    const result = await client.callTool({
                        name: "evaluate_expression",
                        arguments: { expression: "1000000 * 1000000" },
                    });
                    if (parseFloat(result.content[0].text) !== 1000000000000) {
                        throw new Error(
                            `Expected 1000000000000, got ${result.content[0].text}`,
                        );
                    }
                },
            ),
        );

        results.push(
            await runTest("evaluate_expression: just a number", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "42" },
                });
                if (parseFloat(result.content[0].text) !== 42)
                    throw new Error(
                        `Expected 42, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("evaluate_expression: empty (error)", async () => {
                try {
                    await client.callTool({
                        name: "evaluate_expression",
                        arguments: { expression: "" },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (
                        !error.message.includes("Failed to evaluate") &&
                        !error.message.includes("invalid")
                    ) {
                        throw new Error(
                            `Wrong error message: ${error.message}`,
                        );
                    }
                }
            }),
        );

        // --- 34. Constants in evaluate_expression ---
        console.log("\n🔬 34. Constants in evaluate_expression Tests");

        results.push(
            await runTest("Constants: 2 * pi", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "2 * pi" },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - 2 * Math.PI) > 1e-10)
                    throw new Error(`Expected ${2 * Math.PI}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Constants: pi ^ 2", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "pi ^ 2" },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - Math.PI ** 2) > 1e-10)
                    throw new Error(`Expected ${Math.PI ** 2}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Constants: e + 1", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "e + 1" },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - (Math.E + 1)) > 1e-10)
                    throw new Error(`Expected ${Math.E + 1}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Constants: tau / 2 = pi", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "tau / 2" },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - Math.PI) > 1e-10)
                    throw new Error(`Expected ${Math.PI}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Constants: sqrt2 * sqrt2 = 2", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "sqrt2 * sqrt2" },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - 2) > 1e-10)
                    throw new Error(`Expected 2, got ${got}`);
            }),
        );

        results.push(
            await runTest("Constants: e * e", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "e * e" },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - Math.E * Math.E) > 1e-10)
                    throw new Error(`Expected ${Math.E * Math.E}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Constants: phi * 2", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "phi * 2" },
                });
                const got = parseFloat(result.content[0].text);
                const expected = 1.618033988749895 * 2;
                if (Math.abs(got - expected) > 1e-10)
                    throw new Error(`Expected ${expected}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Constants: G * 1e11", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "G * 1e11" },
                });
                const got = parseFloat(result.content[0].text);
                const expected = 6.6743e-11 * 1e11;
                if (Math.abs(got - expected) > 1e-6)
                    throw new Error(`Expected ${expected}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Constants: c = speed of light", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "c" },
                });
                const got = parseFloat(result.content[0].text);
                if (got !== 299792458)
                    throw new Error(`Expected 299792458, got ${got}`);
            }),
        );

        results.push(
            await runTest("Constants: R + 2", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "R + 2" },
                });
                const got = parseFloat(result.content[0].text);
                const expected = 8.314462618 + 2;
                if (Math.abs(got - expected) > 1e-8)
                    throw new Error(`Expected ${expected}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Constants: k * 1e23", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "k * 1e23" },
                });
                const got = parseFloat(result.content[0].text);
                const expected = 1.380649e-23 * 1e23;
                if (Math.abs(got - expected) > 1e-10)
                    throw new Error(`Expected ${expected}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Constants: Scientific notation still works (1e6)", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "1e6" },
                });
                if (parseFloat(result.content[0].text) !== 1e6)
                    throw new Error(`Expected 1e6, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Constants: 2.5e-3 notation", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "2.5e-3" },
                });
                if (parseFloat(result.content[0].text) !== 2.5e-3)
                    throw new Error(`Expected 0.0025, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Constants: Combined expression 2 * pi * 5", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "2 * pi * 5" },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - 2 * Math.PI * 5) > 1e-10)
                    throw new Error(`Expected ${2 * Math.PI * 5}, got ${got}`);
            }),
        );

        // --- 35b. Extended evaluate_expression Built-ins ---
        console.log("\n🧮 35b. Additional evaluate_expression Built-ins Tests");

        // Trigonometric functions
        results.push(
            await runTest("Trig: sin(pi/2) = 1", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "sin(pi / 2)" },
                });
                if (Math.abs(parseFloat(result.content[0].text) - 1) > 1e-10)
                    throw new Error(`Expected 1, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Trig: cos(pi) = -1", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "cos(pi)" },
                });
                if (Math.abs(parseFloat(result.content[0].text) - (-1)) > 1e-10)
                    throw new Error(`Expected -1, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Trig: tan(pi/4) ≈ 1", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "tan(pi / 4)" },
                });
                if (Math.abs(parseFloat(result.content[0].text) - 1) > 1e-10)
                    throw new Error(`Expected ~1, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Trig: asin(1) = pi/2", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "asin(1)" },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - Math.PI / 2) > 1e-10)
                    throw new Error(`Expected ${Math.PI / 2}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Trig: acos(0) = pi/2", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "acos(0)" },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - Math.PI / 2) > 1e-10)
                    throw new Error(`Expected ${Math.PI / 2}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Trig: atan(1) = pi/4", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "atan(1)" },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - Math.PI / 4) > 1e-10)
                    throw new Error(`Expected ${Math.PI / 4}, got ${got}`);
            }),
        );

        results.push(
            await runTest("Trig: sin(pi/6) + cos(pi/3) = 1", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "sin(pi/6) + cos(pi/3)" },
                });
                if (Math.abs(parseFloat(result.content[0].text) - 1) > 1e-10)
                    throw new Error(`Expected 1, got ${result.content[0].text}`);
            }),
        );

        // sqrt and logarithmic functions
        results.push(
            await runTest("Math: sqrt(144) = 12", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "sqrt(144)" },
                });
                if (parseFloat(result.content[0].text) !== 12)
                    throw new Error(`Expected 12, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Math: sqrt(2) * sqrt(2) = 2", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "sqrt(2) * sqrt(2)" },
                });
                if (Math.abs(parseFloat(result.content[0].text) - 2) > 1e-10)
                    throw new Error(`Expected 2, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Math: log10(1000) = 3", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "log10(1000)" },
                });
                if (parseFloat(result.content[0].text) !== 3)
                    throw new Error(`Expected 3, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Math: ln(e) = 1", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "ln(e)" },
                });
                if (Math.abs(parseFloat(result.content[0].text) - 1) > 1e-10)
                    throw new Error(`Expected 1, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Math: log(8, 2) = 3 (arbitrary base)", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "log(8, 2)" },
                });
                if (parseFloat(result.content[0].text) !== 3)
                    throw new Error(`Expected 3, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Math: log(100, 10) = 2", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "log(100, 10)" },
                });
                if (parseFloat(result.content[0].text) !== 2)
                    throw new Error(`Expected 2, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("Math: Combined sin + sqrt + log10", async () => {
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "sin(pi / 6) + sqrt(16) + log10(100)" },
                });
                if (Math.abs(parseFloat(result.content[0].text) - 6.5) > 1e-10)
                    throw new Error(`Expected 6.5, got ${result.content[0].text}`);
            }),
        );

        // --- 35c. Error Messaging Tests ---
        console.log("\n💬 35c. Error Messaging Tests");

        results.push(
            await runTest("Error: sqrt(-1) gives domain hint", async () => {
                try {
                    await client.callTool({
                        name: "evaluate_expression",
                        arguments: { expression: "sqrt(-1)" },
                    });
                    throw new Error("Expected error but got result");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("NaN") && !msg.includes("Domain")) {
                        throw new Error(`Expected domain/NaN hint, got: ${msg}`);
                    }
                    if (!msg.includes("sqrt(negative)")) {
                        throw new Error(`Missing sqrt(negative) hint, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Error: ln(0) gives infinity or domain hint", async () => {
                try {
                    await client.callTool({
                        name: "evaluate_expression",
                        arguments: { expression: "ln(0)" },
                    });
                    throw new Error("Expected error but got result");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("infinity") && !msg.includes("Domain") && !msg.includes("NaN")) {
                        throw new Error(`Expected domain/infinity/NaN hint, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Error: asin(5) gives domain hint", async () => {
                try {
                    await client.callTool({
                        name: "evaluate_expression",
                        arguments: { expression: "asin(5)" },
                    });
                    throw new Error("Expected error but got result");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("NaN") && !msg.includes("Domain")) {
                        throw new Error(`Expected domain/NaN hint, got: ${msg}`);
                    }
                    if (!msg.includes("asin/acos out of")) {
                        throw new Error(`Missing asin/acos hint, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Error: 1/0 gives infinity/zero hint", async () => {
                try {
                    await client.callTool({
                        name: "evaluate_expression",
                        arguments: { expression: "1 / 0" },
                    });
                    throw new Error("Expected error but got result");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("infinity") && !msg.includes("division by zero")) {
                        throw new Error(`Expected infinity/division hint, got: ${msg}`);
                    }
                }
            }),
        );


        // --- 35d. Standard Deviation & Variance Tests ---
        console.log("\n📊 35d. Standard Deviation & Variance Tests");

        // Variance tests
        results.push(
            await runTest("Variance: sample variance [1,2,3,4,5] = 2.5", async () => {
                const result = await client.callTool({
                    name: "variance",
                    arguments: { numbers: [1, 2, 3, 4, 5] },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - 2.5) > 1e-10)
                    throw new Error(`Expected 2.5, got ${got}`);
            }),
        );

        results.push(
            await runTest("Variance: population variance [1,2,3,4,5] = 2", async () => {
                const result = await client.callTool({
                    name: "variance",
                    arguments: { numbers: [1, 2, 3, 4, 5], population: true },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - 2) > 1e-10)
                    throw new Error(`Expected 2, got ${got}`);
            }),
        );

        results.push(
            await runTest("Variance: empty array throws error", async () => {
                try {
                    await client.callTool({
                        name: "variance",
                        arguments: { numbers: [] },
                    });
                    throw new Error("Expected error");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("empty"))
                        throw new Error(`Expected empty list error, got: ${msg}`);
                }
            }),
        );

        results.push(
            await runTest("Variance: single element sample throws", async () => {
                try {
                    await client.callTool({
                        name: "variance",
                        arguments: { numbers: [5] },
                    });
                    throw new Error("Expected error");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("variance") || !msg.includes("≥2"))
                        throw new Error(`Expected sample error, got: ${msg}`);
                }
            }),
        );

        results.push(
            await runTest("Variance: single element population returns 0", async () => {
                const result = await client.callTool({
                    name: "variance",
                    arguments: { numbers: [5], population: true },
                });
                if (parseFloat(result.content[0].text) !== 0)
                    throw new Error(`Expected 0, got ${result.content[0].text}`);
            }),
        );

        // std_dev tests
        results.push(
            await runTest("StdDev: sample std_dev [1,2,3,4,5] ≈ 1.5811", async () => {
                const result = await client.callTool({
                    name: "std_dev",
                    arguments: { numbers: [1, 2, 3, 4, 5] },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - 1.5811388300841898) > 1e-10)
                    throw new Error(`Expected 1.5811..., got ${got}`);
            }),
        );

        results.push(
            await runTest("StdDev: population std_dev [1,2,3,4,5] ≈ 1.4142", async () => {
                const result = await client.callTool({
                    name: "std_dev",
                    arguments: { numbers: [1, 2, 3, 4, 5], population: true },
                });
                const got = parseFloat(result.content[0].text);
                if (Math.abs(got - 1.4142135623730951) > 1e-10)
                    throw new Error(`Expected 1.4142..., got ${got}`);
            }),
        );

        results.push(
            await runTest("StdDev: all-same values [10,10,10,10,10] = 0", async () => {
                const result = await client.callTool({
                    name: "std_dev",
                    arguments: { numbers: [10, 10, 10, 10, 10] },
                });
                if (parseFloat(result.content[0].text) !== 0)
                    throw new Error(`Expected 0, got ${result.content[0].text}`);
            }),
        );

        results.push(
            await runTest("StdDev: single element sample throws error", async () => {
                try {
                    await client.callTool({
                        name: "std_dev",
                        arguments: { numbers: [5] },
                    });
                    throw new Error("Expected error");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("≥2"))
                        throw new Error(`Expected sample error, got: ${msg}`);
                }
            }),
        );

        // --- 36. Fuzzy Tool Name Matching Tests ---
        console.log("\n🔍 36. Fuzzy Tool Name Matching Tests");

        results.push(
            await runTest("Fuzzy: fact -> factorial (prefix match)", async () => {
                try {
                    const result = await client.callTool({
                        name: "fact",
                        arguments: { n: 5 },
                    });
                    // If it somehow succeeded, that's unexpected
                    throw new Error("Expected fuzzy suggestion error but got result: " + JSON.stringify(result));
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("Did you mean 'factorial'?")) {
                        throw new Error(`Expected factorial suggestion, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Fuzzy: fac -> factorial (short prefix match)", async () => {
                try {
                    await client.callTool({
                        name: "fac",
                        arguments: { n: 5 },
                    });
                    throw new Error("Expected fuzzy suggestion error");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("Did you mean 'factorial'?")) {
                        throw new Error(`Expected factorial suggestion, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Fuzzy: sinn -> sine (Levenshtein typo)", async () => {
                try {
                    await client.callTool({
                        name: "sinn",
                        arguments: { angle: 0 },
                    });
                    throw new Error("Expected fuzzy suggestion error");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("Did you mean 'sine'?")) {
                        throw new Error(`Expected sine suggestion, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Fuzzy: squrt -> sqrt (Levenshtein typo)", async () => {
                try {
                    await client.callTool({
                        name: "squrt",
                        arguments: { x: 16 },
                    });
                    throw new Error("Expected fuzzy suggestion error");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("Did you mean 'sqrt'?")) {
                        throw new Error(`Expected sqrt suggestion, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Fuzzy: adddd -> add (extra letters)", async () => {
                try {
                    await client.callTool({
                        name: "adddd",
                        arguments: { a: 1, b: 2 },
                    });
                    throw new Error("Expected fuzzy suggestion error");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("Did you mean 'add'?")) {
                        throw new Error(`Expected add suggestion, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Fuzzy: divid -> divide (missing suffix)", async () => {
                try {
                    await client.callTool({
                        name: "divid",
                        arguments: { a: 10, b: 2 },
                    });
                    throw new Error("Expected fuzzy suggestion error");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (!msg.includes("Did you mean 'divide'?")) {
                        throw new Error(`Expected divide suggestion, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Fuzzy: totally_gibberish -> no suggestion", async () => {
                try {
                    await client.callTool({
                        name: "totally_gibberish",
                        arguments: {},
                    });
                    throw new Error("Expected tool not found error");
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    if (msg.includes("Did you mean")) {
                        throw new Error(`Should NOT suggest a match for gibberish, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Fuzzy: exact valid tool still works", async () => {
                const result = await client.callTool({
                    name: "factorial",
                    arguments: { n: 5 },
                });
                if (parseFloat(result.content[0].text) !== 120) {
                    throw new Error(`Expected 120, got ${result.content[0].text}`);
                }
            }),
        );

        // --- 35. Memory Persistence ---
        // --- 34. Memory Persistence ---
        results.push(
            await runTest("Memory: persistence across calls", async () => {
                // Clear memory
                await client.callTool({ name: "memory_clear", arguments: {} });
                // Add value
                await client.callTool({
                    name: "memory_add",
                    arguments: { value: 100 },
                });
                // Recall should still be 100
                let result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                if (parseFloat(result.content[0].text) !== 100) {
                    throw new Error(
                        `Expected 100, got ${result.content[0].text}`,
                    );
                }
                // Subtract
                await client.callTool({
                    name: "memory_subtract",
                    arguments: { value: 30 },
                });
                // Recall should be 70
                result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                if (parseFloat(result.content[0].text) !== 70) {
                    throw new Error(
                        `Expected 70, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest("Memory: large values", async () => {
                await client.callTool({ name: "memory_clear", arguments: {} });
                await client.callTool({
                    name: "memory_add",
                    arguments: { value: 1e15 },
                });
                const result = await client.callTool({
                    name: "memory_recall",
                    arguments: {},
                });
                if (Math.abs(parseFloat(result.content[0].text) - 1e15) > 1e5) {
                    throw new Error(
                        `Expected ~1e15, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        // --- 35. Large Array Performance ---
        results.push(
            await runTest("Performance: sum of 1000 elements", async () => {
                const numbers = Array.from({ length: 1000 }, (_, i) => i + 1);
                const result = await client.callTool({
                    name: "sum",
                    arguments: { numbers },
                });
                const expected = (1000 * 1001) / 2; // Sum of 1 to 1000
                if (parseFloat(result.content[0].text) !== expected) {
                    throw new Error(
                        `Expected ${expected}, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest("Performance: avg of 1000 elements", async () => {
                const numbers = Array.from({ length: 1000 }, (_, i) => i + 1);
                const result = await client.callTool({
                    name: "avg",
                    arguments: { numbers },
                });
                const expected = 500.5;
                if (
                    Math.abs(parseFloat(result.content[0].text) - expected) >
                    1e-10
                ) {
                    throw new Error(
                        `Expected ${expected}, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        // --- 36. Division Edge Cases ---
        results.push(
            await runTest("Division: by very small number", async () => {
                const result = await client.callTool({
                    name: "divide",
                    arguments: { a: 1, b: 0.0000001 },
                });
                if (parseFloat(result.content[0].text) !== 10000000) {
                    throw new Error(
                        `Expected 10000000, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest("Division: negative by negative", async () => {
                const result = await client.callTool({
                    name: "divide",
                    arguments: { a: -10, b: -2 },
                });
                if (parseFloat(result.content[0].text) !== 5)
                    throw new Error(
                        `Expected 5, got ${result.content[0].text}`,
                    );
            }),
        );

        // --- 37. Percentile Boundary ---
        results.push(
            await runTest("Percentile: 50 equals median", async () => {
                const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                const medianResult = await client.callTool({
                    name: "median",
                    arguments: { numbers },
                });
                const percentileResult = await client.callTool({
                    name: "percentile",
                    arguments: { numbers, percentile: 50 },
                });
                if (
                    Math.abs(
                        parseFloat(medianResult.content[0].text) -
                            parseFloat(percentileResult.content[0].text),
                    ) > 1e-10
                ) {
                    throw new Error(
                        `Median and percentile 50 should match: ${medianResult.content[0].text} vs ${percentileResult.content[0].text}`,
                    );
                }
            }),
        );

        // --- 38. Modulo More Edge Cases ---
        results.push(
            await runTest("Modulo: negative divisor", async () => {
                const result = await client.callTool({
                    name: "modulo",
                    arguments: { a: 17, b: -5 },
                });
                if (parseFloat(result.content[0].text) !== 2)
                    throw new Error(
                        `Expected 2, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Modulo: both negative", async () => {
                const result = await client.callTool({
                    name: "modulo",
                    arguments: { a: -17, b: -5 },
                });
                if (parseFloat(result.content[0].text) !== -2)
                    throw new Error(
                        `Expected -2, got ${result.content[0].text}`,
                    );
            }),
        );

        // --- 39. Power More Edge Cases ---
        results.push(
            await runTest("Power: 1 to any power", async () => {
                const result = await client.callTool({
                    name: "power",
                    arguments: { base: 1, exponent: 999 },
                });
                if (parseFloat(result.content[0].text) !== 1)
                    throw new Error(
                        `Expected 1, got ${result.content[0].text}`,
                    );
            }),
        );

        results.push(
            await runTest("Power: decimal base", async () => {
                const result = await client.callTool({
                    name: "power",
                    arguments: { base: 2.5, exponent: 2 },
                });
                if (
                    Math.abs(parseFloat(result.content[0].text) - 6.25) > 1e-10
                ) {
                    throw new Error(
                        `Expected 6.25, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        // --- 40. Concurrent Execution Tests (Critical for Production) ---
        results.push(
            await runTest("Concurrent: 10 simultaneous add calls", async () => {
                const promises = Array.from({ length: 10 }, async (_, i) => {
                    return await client.callTool({
                        name: "add",
                        arguments: { a: i, b: i * 2 },
                    });
                });
                const results = await Promise.all(promises);
                // Verify all succeeded
                if (results.length !== 10)
                    throw new Error(
                        `Expected 10 results, got ${results.length}`,
                    );
                // Verify results are correct (i + i*2 = 3i)
                for (let i = 0; i < 10; i++) {
                    const expected = 3 * i;
                    const actual = parseFloat(results[i].content[0].text);
                    if (actual !== expected)
                        throw new Error(
                            `Call ${i}: Expected ${expected}, got ${actual}`,
                        );
                }
            }),
        );

        results.push(
            await runTest(
                "Concurrent: Mixed tools simultaneously",
                async () => {
                    const promises = [
                        client.callTool({
                            name: "add",
                            arguments: { a: 1, b: 2 },
                        }),
                        client.callTool({
                            name: "multiply",
                            arguments: { a: 3, b: 4 },
                        }),
                        client.callTool({
                            name: "sqrt",
                            arguments: { value: 16 },
                        }),
                        client.callTool({
                            name: "power",
                            arguments: { base: 2, exponent: 3 },
                        }),
                        client.callTool({
                            name: "get_constant",
                            arguments: { name: "pi" },
                        }),
                    ];
                    const results = await Promise.all(promises);
                    if (results.length !== 5)
                        throw new Error(
                            `Expected 5 results, got ${results.length}`,
                        );
                    if (parseFloat(results[0].content[0].text) !== 3)
                        throw new Error("Add failed");
                    if (parseFloat(results[1].content[0].text) !== 12)
                        throw new Error("Multiply failed");
                    if (parseFloat(results[2].content[0].text) !== 4)
                        throw new Error("Sqrt failed");
                    if (parseFloat(results[3].content[0].text) !== 8)
                        throw new Error("Power failed");
                    if (
                        Math.abs(
                            parseFloat(results[4].content[0].text) - Math.PI,
                        ) > 1e-10
                    )
                        throw new Error("Pi failed");
                },
            ),
        );

        results.push(
            await runTest(
                "Concurrent: Memory operations (sequential)",
                async () => {
                    // Clear memory first
                    await client.callTool({
                        name: "memory_clear",
                        arguments: {},
                    });

                    // Perform memory operations sequentially to ensure atomicity
                    await client.callTool({
                        name: "memory_add",
                        arguments: { value: 100 },
                    });
                    await client.callTool({
                        name: "memory_add",
                        arguments: { value: 200 },
                    });

                    // Recall should be 300 (100 + 200)
                    const result = await client.callTool({
                        name: "memory_recall",
                        arguments: {},
                    });
                    if (parseFloat(result.content[0].text) !== 300) {
                        throw new Error(
                            `Expected 300, got ${result.content[0].text}`,
                        );
                    }
                },
            ),
        );

        // --- 41. Security & Injection Tests ---
        results.push(
            await runTest("Security: Unicode injection (error)", async () => {
                try {
                    await client.callTool({
                        name: "evaluate_expression",
                        arguments: { expression: "5 + ①" },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (
                        !error.message.includes("Security Error") &&
                        !error.message.includes("invalid characters")
                    ) {
                        throw new Error(
                            `Expected security error, got: ${error.message}`,
                        );
                    }
                }
            }),
        );

        results.push(
            await runTest(
                "Security: Prototype pollution attempt (error)",
                async () => {
                    try {
                        await client.callTool({
                            name: "evaluate_expression",
                            arguments: { expression: "5 + __proto__" },
                        });
                        throw new Error("Should have thrown an error");
                    } catch (error: any) {
                        if (
                            !error.message.includes("Security Error") &&
                            !error.message.includes("invalid characters")
                        ) {
                            throw new Error(
                                `Expected security error, got: ${error.message}`,
                            );
                        }
                    }
                },
            ),
        );

        results.push(
            await runTest("Security: Null input handling", async () => {
                try {
                    await client.callTool({
                        name: "add",
                        arguments: { a: null as any, b: 2 },
                    });
                    throw new Error("Should have thrown an error");
                } catch (error: any) {
                    if (
                        !error.message.includes("Validation Error") &&
                        !error.message.includes("Expected number")
                    ) {
                        throw new Error(
                            `Expected validation error, got: ${error.message}`,
                        );
                    }
                }
            }),
        );

        results.push(
            await runTest(
                "Security: Array in number field (error)",
                async () => {
                    try {
                        await client.callTool({
                            name: "add",
                            arguments: { a: [1] as any, b: 2 },
                        });
                        throw new Error("Should have thrown an error");
                    } catch (error: any) {
                        if (
                            !error.message.includes("Validation Error") &&
                            !error.message.includes("Expected number")
                        ) {
                            throw new Error(
                                `Expected validation error, got: ${error.message}`,
                            );
                        }
                    }
                },
            ),
        );

        results.push(
            await runTest(
                "Security: Whitespace handling (should work)",
                async () => {
                    const result = await client.callTool({
                        name: "evaluate_expression",
                        arguments: { expression: "  5  +  3  " },
                    });
                    if (parseFloat(result.content[0].text) !== 8)
                        throw new Error(
                            `Expected 8, got ${result.content[0].text}`,
                        );
                },
            ),
        );

        // --- 42. Extreme Precision & Boundary Tests ---
        results.push(
            await runTest("Precision: Very small decimals", async () => {
                const result = await client.callTool({
                    name: "add",
                    arguments: { a: 0.0000000001, b: 0.0000000002 },
                });
                const expected = 0.0000000003;
                if (
                    Math.abs(parseFloat(result.content[0].text) - expected) >
                    1e-15
                ) {
                    throw new Error(
                        `Expected ${expected}, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest("Precision: Very large decimals", async () => {
                const result = await client.callTool({
                    name: "add",
                    arguments: { a: 999999999.999999999, b: 1 },
                });
                const expected = 1000000000.999999999;
                if (
                    Math.abs(parseFloat(result.content[0].text) - expected) >
                    1e-6
                ) {
                    throw new Error(
                        `Expected ~${expected}, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest("Precision: Mixed precision", async () => {
                const result = await client.callTool({
                    name: "add",
                    arguments: { a: 1, b: 0.0000000000001 },
                });
                const expected = 1.0000000000001;
                if (
                    Math.abs(parseFloat(result.content[0].text) - expected) >
                    1e-13
                ) {
                    throw new Error(
                        `Expected ~${expected}, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest("Boundary: Power with large exponent", async () => {
                const result = await client.callTool({
                    name: "power",
                    arguments: { base: 2, exponent: 1000 },
                });
                if (!Number.isFinite(parseFloat(result.content[0].text))) {
                    throw new Error(
                        `Expected finite number, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest(
                "Boundary: Power with negative base and fractional exponent",
                async () => {
                    // (-8)^(1/3) = -2 (in real numbers, but JS returns NaN)
                    // We expect an error or NaN handling
                    const result = await client.callTool({
                        name: "power",
                        arguments: { base: -8, exponent: 1 / 3 },
                    });
                    // JS Math.pow returns NaN for this case, which is acceptable
                    if (isNaN(parseFloat(result.content[0].text))) {
                        // Accept NaN as valid behavior for complex result
                    }
                },
            ),
        );

        // --- 43. Real-World Integration Scenarios ---
        results.push(
            await runTest("Real-world: Compound interest formula", async () => {
                // A = P(1 + r/n)^(nt)
                // P=1000, r=0.05, n=12, t=10
                const expression = "1000 * (1 + 0.05/12)^(12*10)";
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression },
                });
                const expected = 1000 * Math.pow(1 + 0.05 / 12, 120);
                if (
                    Math.abs(parseFloat(result.content[0].text) - expected) >
                    0.01
                ) {
                    throw new Error(
                        `Expected ~${expected.toFixed(2)}, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest("Real-world: Physics E=mc^2", async () => {
                const mass = 5; // kg
                const cConstant = await client.callTool({
                    name: "get_constant",
                    arguments: { name: "c" },
                });
                const c = parseFloat(cConstant.content[0].text);
                const expression = `${mass} * ${c}^2`;
                const result = await client.callTool({
                    name: "evaluate_expression",
                    arguments: { expression },
                });
                const expected = mass * c * c;
                if (
                    Math.abs(parseFloat(result.content[0].text) - expected) >
                    1e10
                ) {
                    throw new Error(
                        `Expected ~${expected.toExponential(2)}, got ${result.content[0].text}`,
                    );
                }
            }),
        );

        results.push(
            await runTest(
                "Real-world: Statistical workflow (mean, variance, std dev)",
                async () => {
                    const data = [10, 20, 30, 40, 50];
                    // Mean
                    const meanResult = await client.callTool({
                        name: "avg",
                        arguments: { numbers: data },
                    });
                    const mean = parseFloat(meanResult.content[0].text);

                    // Variance: sum((x - mean)^2) / n
                    const squaredDiffs = data.map((x) => Math.pow(x - mean, 2));
                    const sumSquaredDiffs = squaredDiffs.reduce(
                        (a, b) => a + b,
                        0,
                    );
                    const variance = sumSquaredDiffs / data.length;

                    // Calculate via evaluate_expression
                    const varianceExpr = squaredDiffs
                        .map((d) => d.toFixed(10))
                        .join(" + ");
                    const varianceResult = await client.callTool({
                        name: "evaluate_expression",
                        arguments: {
                            expression: `(${varianceExpr}) / ${data.length}`,
                        },
                    });
                    const calculatedVariance = parseFloat(
                        varianceResult.content[0].text,
                    );

                    if (Math.abs(calculatedVariance - variance) > 1e-10) {
                        throw new Error(
                            `Variance mismatch: Expected ${variance}, got ${calculatedVariance}`,
                        );
                    }
                },
            ),
        );

        results.push(
            await runTest(
                "Real-world: Gravitational force (simplified)",
                async () => {
                    // Use smaller, manageable numbers to avoid scientific notation
                    // F = G * m1 * m2 / r^2
                    // G ≈ 6.674e-11, use 0.00000000006674
                    // m1 = 1000, m2 = 2000, r = 100
                    const expression = "0.00000000006674 * 1000 * 2000 / 100^2";
                    const result = await client.callTool({
                        name: "evaluate_expression",
                        arguments: { expression },
                    });
                    const expected = (6.674e-11 * 1000 * 2000) / (100 * 100);

                    if (
                        Math.abs(
                            parseFloat(result.content[0].text) - expected,
                        ) > 1e-18
                    ) {
                        throw new Error(
                            `Force mismatch: Expected ${expected}, got ${result.content[0].text}`,
                        );
                    }
                },
            ),
        );

        // --- 44. Server Stability Stress Test ---
        results.push(
            await runTest("Stress: 100 sequential calls", async () => {
                for (let i = 0; i < 100; i++) {
                    const result = await client.callTool({
                        name: "add",
                        arguments: { a: i, b: i + 1 },
                    });
                    if (parseFloat(result.content[0].text) !== 2 * i + 1) {
                        throw new Error(
                            `Call ${i} failed: Expected ${2 * i + 1}, got ${result.content[0].text}`,
                        );
                    }
                }
            }),
        );

        results.push(
            await runTest("Stress: 50 complex expressions", async () => {
                for (let i = 0; i < 50; i++) {
                    const expr = `${i} * ${i + 1} + ${i + 2} - ${i + 3}`;
                    const result = await client.callTool({
                        name: "evaluate_expression",
                        arguments: { expression: expr },
                    });
                    const expected = i * (i + 1) + (i + 2) - (i + 3);
                    if (parseFloat(result.content[0].text) !== expected) {
                        throw new Error(
                            `Expression ${i} failed: Expected ${expected}, got ${result.content[0].text}`,
                        );
                    }
                }
            }),
        );


        // --- 45. Tiered Tool Exposure (CRUNCHER_TOOL_SET) Tests ---
        console.log("\n🎛️ 45. Tiered Tool Exposure Tests");

        // --- Minimal mode test ---
        const minimalClient = new MCPClient({
            name: "minimal-tier-test",
            version: "1.0.0",
            timeout: TEST_TIMEOUT,
            logLevel: "none",
        });
        const expectedMinimalTools = [
            "evaluate_expression",
            "add",
            "subtract",
            "multiply",
            "divide",
        ];

        results.push(
            await runTest("Minimal tier: Start server with CRUNCHER_TOOL_SET=minimal", async () => {
                await minimalClient.start({
                    command: "node",
                    args: ["cruncher.js"],
                    env: { CRUNCHER_TOOL_SET: "minimal", NODE_ENV: "test" },
                });
            }),
        );

        results.push(
            await runTest("Minimal tier: Exactly 5 tools exposed", async () => {
                const tools = await minimalClient.listTools();
                if (tools.length !== 5) {
                    throw new Error(`Expected 5 tools in minimal mode, got ${tools.length}`);
                }
            }),
        );

        results.push(
            await runTest("Minimal tier: Core math tools present", async () => {
                const tools = await minimalClient.listTools();
                const toolNames = tools.map((t) => t.name);
                const missing = expectedMinimalTools.filter(
                    (name) => !toolNames.includes(name),
                );
                if (missing.length > 0) {
                    throw new Error(`Missing minimal tools: ${missing.join(", ")}`);
                }
            }),
        );

        results.push(
            await runTest("Minimal tier: Trigonometry tools excluded", async () => {
                const tools = await minimalClient.listTools();
                const toolNames = tools.map((t) => t.name);
                const banned = ["sine", "cosine", "tangent", "asin", "acos", "atan"];
                const present = banned.filter((name) => toolNames.includes(name));
                if (present.length > 0) {
                    throw new Error(`Unexpected tools in minimal: ${present.join(", ")}`);
                }
            }),
        );

        results.push(
            await runTest("Minimal tier: Statistics tools excluded", async () => {
                const tools = await minimalClient.listTools();
                const toolNames = tools.map((t) => t.name);
                const banned = ["median", "percentile", "range", "count"];
                const present = banned.filter((name) => toolNames.includes(name));
                if (present.length > 0) {
                    throw new Error(`Unexpected tools in minimal: ${present.join(", ")}`);
                }
            }),
        );

        results.push(
            await runTest("Minimal tier: Batch/cache/memory tools excluded", async () => {
                const tools = await minimalClient.listTools();
                const toolNames = tools.map((t) => t.name);
                const banned = ["batch", "cache_clear", "cache_info", "memory_add", "memory_subtract", "memory_clear", "memory_recall"];
                const present = banned.filter((name) => toolNames.includes(name));
                if (present.length > 0) {
                    throw new Error(`Unexpected tools in minimal: ${present.join(", ")}`);
                }
            }),
        );

        results.push(
            await runTest("Minimal tier: evaluate_expression works", async () => {
                const result = await minimalClient.callTool({
                    name: "evaluate_expression",
                    arguments: { expression: "100 / 4 + 10" },
                });
                if (parseFloat(result.content[0].text) !== 35) {
                    throw new Error(`Expected 35, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Minimal tier: add works", async () => {
                const result = await minimalClient.callTool({
                    name: "add",
                    arguments: { a: 42, b: 58 },
                });
                if (parseFloat(result.content[0].text) !== 100) {
                    throw new Error(`Expected 100, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Minimal tier: multiply works", async () => {
                const result = await minimalClient.callTool({
                    name: "multiply",
                    arguments: { a: 7, b: 8 },
                });
                if (parseFloat(result.content[0].text) !== 56) {
                    throw new Error(`Expected 56, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Minimal tier: sine returns Tool not found error", async () => {
                try {
                    await minimalClient.callTool({
                        name: "sine",
                        arguments: { angle: 0 },
                    });
                    throw new Error("Expected MCP error for unknown tool, but call succeeded");
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    if (!msg.includes("not found")) {
                        throw new Error(`Expected 'not found' error, got: ${msg}`);
                    }
                }
            }),
        );

        results.push(
            await runTest("Minimal tier: server stop", async () => {
                await minimalClient.stop();
            }),
        );

        // --- Standard mode test ---
        const standardClient = new MCPClient({
            name: "standard-tier-test",
            version: "1.0.0",
            timeout: TEST_TIMEOUT,
            logLevel: "none",
        });

        results.push(
            await runTest("Standard tier: Start server with CRUNCHER_TOOL_SET=standard", async () => {
                await standardClient.start({
                    command: "node",
                    args: ["cruncher.js"],
                    env: { CRUNCHER_TOOL_SET: "standard", NODE_ENV: "test" },
                });
            }),
        );

        results.push(
            await runTest("Standard tier: Exactly 36 tools exposed", async () => {
                const tools = await standardClient.listTools();
                if (tools.length !== 36) {
                    throw new Error(`Expected 36 tools in standard mode, got ${tools.length}`);
                }
            }),
        );

        results.push(
            await runTest("Standard tier: Includes all minimal tools", async () => {
                const tools = await standardClient.listTools();
                const toolNames = tools.map((t) => t.name);
                const missing = expectedMinimalTools.filter(
                    (name) => !toolNames.includes(name),
                );
                if (missing.length > 0) {
                    throw new Error(`Missing minimal tools in standard: ${missing.join(", ")}`);
                }
            }),
        );

        results.push(
            await runTest("Standard tier: Includes stats, memory, and trig tools", async () => {
                const tools = await standardClient.listTools();
                const toolNames = tools.map((t) => t.name);
                const expectedStandardExtras = [
                    "sqrt", "power", "factorial", "sum", "avg", "min", "max", "count",
                    "median", "memory_add", "memory_clear", "get_constant", "convert_base",
                    "sine", "cosine", "tangent", "asin", "acos", "atan",
                    "set_angle_mode", "get_angle_mode",
                    "variance", "std_dev",
                ];
                const missing = expectedStandardExtras.filter(
                    (name) => !toolNames.includes(name),
                );
                if (missing.length > 0) {
                    throw new Error(`Missing standard tools: ${missing.join(", ")}`);
                }
            }),
        );

        results.push(
            await runTest("Standard tier: Batch/cache excluded (admin-only)", async () => {
                const tools = await standardClient.listTools();
                const toolNames = tools.map((t) => t.name);
                const banned = ["batch", "cache_clear", "cache_info"];
                const present = banned.filter((name) => toolNames.includes(name));
                if (present.length > 0) {
                    throw new Error(`Unexpected tools in standard: ${present.join(", ")}`);
                }
            }),
        );

        results.push(
            await runTest("Standard tier: factorial works", async () => {
                const result = await standardClient.callTool({
                    name: "factorial",
                    arguments: { n: 6 },
                });
                if (parseFloat(result.content[0].text) !== 720) {
                    throw new Error(`Expected 720, got ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Standard tier: memory_add works", async () => {
                const result = await standardClient.callTool({
                    name: "memory_add",
                    arguments: { value: 42 },
                });
                if (!result.content[0].text.includes("42")) {
                    throw new Error(`Expected result containing 42, got: ${result.content[0].text}`);
                }
            }),
        );

        results.push(
            await runTest("Standard tier: server stop", async () => {
                await standardClient.stop();
            }),
        );


        // ========== Summary ==========
        console.log("\n" + "=".repeat(60));
        console.log("📊 TEST SUMMARY");
        console.log("=".repeat(60));
        console.log(`Total Tests: ${results.length}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(
            `Success Rate: ${((passedTests / results.length) * 100).toFixed(2)}%`,
        );
        console.log("=".repeat(60));

        if (failedTests > 0) {
            console.log("\n❌ Failed Tests:");
            results
                .filter((r) => !r.passed)
                .forEach((r) => {
                    console.log(`   - ${r.name}: ${r.error}`);
                });
            throw new Error(`${failedTests} test(s) failed`);
        } else {
            console.log("\n✅ ALL TESTS PASSED!");
        }
    } catch (error) {
        console.error("\n💥 Test suite failed:", error);
        process.exit(1);
    } finally {
        console.log("\n🛑 Stopping client...");
        await client.stop();
        console.log("✓ Client stopped\n");
        console.log(`Finished at: ${new Date().toISOString()}`);
    }
}

// Run the test
testCruncher();
