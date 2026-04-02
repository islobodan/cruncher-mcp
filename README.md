# Cruncher: The Scientific Calculator MCP Server

[![Version](https://img.shields.io/badge/version-1.2.23-blue.svg)](https://github.com/islobodan/cruncher-mcp)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-330%20%7C%20100%25-brightgreen.svg)](TEST_REPORT.md)
[![Status](https://img.shields.io/badge/status-feature--complete-brightgreen.svg)](TODO.md)

A powerful scientific calculator for your AI assistant, built as a **Model Context Protocol (MCP)** server. Cruncher allows compatible AI clients (like Claude Desktop) to perform complex mathematical calculations, handle memory, perform statistical analysis, and access scientific constants with a simple, secure, and standardized interface.

## 🌟 The Purity Promise (Zero Dependencies)

Cruncher is built as a highly educational, extremely lightweight tool. It accomplishes powerful features without pulling in any heavy external libraries (no `mathjs`, no `zod`, no `@modelcontextprotocol/sdk`). Everything is handled using native Node.js capabilities:
* **Safe Expression Evaluation**: Instead of relying on `mathjs` or dangerous `eval()`, Cruncher uses `new Function()` guarded by a strict whitelist Regex that guarantees only numbers and math operators can pass.
* **Input Validation**: Instead of heavy schema libraries like Zod, a custom recursive validation function rigidly enforces AI inputs against JSON Schemas directly.
* **Timeout Protection**: Instead of complex process managers, it leverages Node.js `worker_threads` to spawn calculations. If an AI requests a multi-million loop factorial, the main thread easily terminates the worker after a strict timeout (default 3 seconds). This timeout is configurable via the `CRUNCHER_TIMEOUT` environment variable (in milliseconds), ensuring the server remains responsive even during heavy computational loads.
* **Floating-Point Accuracy**: Instead of using `decimal.js`, it solves the classic JS math error (`0.1 + 0.2 = 0.30000000000000004`) via dynamic integer-scaling logic under the hood.

## 📚 An Educational Approach to MCP

This project serves as an excellent learning resource for developers looking to understand the Model Context Protocol (MCP) deeply. Because it deliberately avoids using the official `@modelcontextprotocol/sdk`, the entire implementation of the MCP protocol, JSON-RPC message handling, input validations, and error formatting is exposed in plain JavaScript. 

Reading through `cruncher.js` provides unparalleled, transparent insight into exactly how an MCP server communicates over `stdio`, parses incoming requests (`initialize`, `tools/list`, `tools/call`), and responds back to the AI client—demystifying the "magic" that SDKs usually hide away.

## What is the Model Context Protocol?

The Model Context Protocol (MCP) is an open standard that allows AI applications to securely connect with external data sources and tools. Think of it as a universal API for AI. By implementing Cruncher as an MCP server, any AI that understands MCP can instantly gain powerful, built-in calculator capabilities without custom integrations.

## ✨ Features

Cruncher provides a comprehensive set of calculator functions built completely from scratch without heavy dependencies:

*   **Robust Architecture**: 
    *   **Zero Dependencies**: Relies purely on Node.js standard libraries.
    *   **Strict Input Validation**: Custom schema validator prevents AI hallucinations and invalid data.
    *   **Infinite Loop Protection**: Utilizes Node.js `worker_threads` with a 3-second strict timeout to prevent complex calculations from freezing the server.
    *   **Accurate Decimal Math**: Uses an integer-scaling approach to prevent classic JS floating-point errors (e.g., `0.1 + 0.2 === 0.3`).
*   **Tiered Tool Exposure**: Three tiers (`minimal`, `standard` default, `full`) to optimize context token usage.
*   **Basic Arithmetic**: Addition, Subtraction, Multiplication, Division, Modulo.
*   **Expression Evaluation**: Safely compute entire plain-text math strings (e.g. `(5 + 3) * 10 / 2`).
*   **Power & Roots**: Exponentiation (`a^b`), Square Root.
*   **Number Theory**: Factorial (n!).
*   **Trigonometry**: Sine, Cosine, Tangent, Arcsine (`asin`), Arccosine (`acos`), and Arctangent (`atan`) (with support for degrees and radians).
*   **Logarithms**: Base-10 Logarithm and Natural Logarithm (ln).
*   **Statistical Functions**: Sum, Average, Median, Min, Max, Range, Count, **Variance**, and **Standard Deviation** for arrays of numbers.
*   **Percentage Functions**: Percentage-of, percentage-change, and reverse-percentage calculations.
*   **Unit Conversion**: 80+ conversions across 8 categories (length, weight, temperature, area, volume, time, speed, digital_storage).
*   **Convenience Functions**: Absolute Value.
*   **Constants**: Easy access to Math (`pi`, `e`, `tau`, `phi`, `sqrt2`, `euler_mascheroni`), Physics (`c`, `g`, `G`, `h`, `k`, `R`), and Chemistry constants (`NA`, `e_charge`, `m_e`, `m_p`).
*   **Memory Functions**: `M+`, `M-`, `MR` (Memory Recall), and `MC` (Memory Clear) — full tier only.

## 🚀 Installation & Usage

Get Cruncher up and running with Claude Desktop in just a few minutes.

### Step 1: Prerequisites

Ensure you have **Node.js** (version 18.0.0 or newer) installed on your system. You can download it from [nodejs.org](https://nodejs.org/).

### Step 2: Download the Server

1.  Clone this repository or download the [`cruncher.js`](cruncher.js) file directly.
2.  Place the file in a permanent, memorable location on your computer (e.g., `C:\mcp-servers\cruncher.js` on Windows or `/home/user/mcp-servers/cruncher.js` on macOS/Linux).

### Step 3: Configure Claude Desktop

You need to tell Claude Desktop where to find the Cruncher server.

1.  Locate the Claude Desktop configuration file:
    *   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
    *   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

2.  If the file doesn't exist, create it.

3.  Add the following server configuration. **Important:** Replace the `args` path with the actual path to your `cruncher.js` file. You can also configure the execution timeout (in milliseconds) via the `CRUNCHER_TIMEOUT` environment variable (defaults to 3000ms).

    ```json
    {
      "mcpServers": {
        "cruncher": {
          "command": "node",
          "args": ["C:/Users/YOUR_USERNAME/mcp-servers/cruncher.js"],
          "env": {
            "CRUNCHER_TOOL_SET": "standard"
          }
        }
      }
    }
    ```
    > **Note for macOS/Linux Users:** Use a POSIX-style path, e.g., `["/home/YOUR_USERNAME/mcp-servers/cruncher.js"]`. Make sure your `node` executable is in your system's PATH.

### Step 4: Start Calculating!

1.  **Save** the configuration file and **completely quit** the Claude Desktop app.
2.  Restart Claude Desktop. It will automatically connect to the Cruncher server.
3.  Start asking questions!

### OpenWebUI (Formerly Ollama WebUI)
OpenWebUI natively supports connecting to `stdio` MCP servers.
1. Go to **Admin Panel** > **Settings** > **Tools** > **MCP Servers**.
2. Click **Add Server**.
3. Name it "Cruncher", select **stdio**, use `node` as the command, and `/path/to/cruncher.js` as the argument.

### Cursor IDE
You can give Cursor's built-in AI the ability to run math and calculate hashes.
1. Open Cursor Settings (gear icon) > **Features** > **MCP Servers**.
2. Click **+ Add New MCP Server**.
3. Set Type to `command`, Name to `cruncher`, and Command to `node /path/to/cruncher.js`.

### Cline (VS Code Extension)
If you use Cline for agentic coding in VS Code, open the MCP configuration file (`cline_mcp_settings.json`) and add:

```json
{
  "mcpServers": {
    "cruncher": {
      "command": "node",
      "args": ["/path/to/cruncher.js"],
      "env": {
        "CRUNCHER_TOOL_SET": "standard"
      }
    }
  }
}
```

### Goose (Terminal Agent)
Goose is a lightweight, terminal‑based AI assistant that fully supports MCP.
1. Edit `~/.goose/config.yaml` (or the local project config).
2. Add a new server entry:

```yaml
mcpServers:
  cruncher:
    command: node
    args:
      - "/path/to/cruncher.js"
    env:
      CRUNCHER_TOOL_SET: "standard"
```
3. Restart Goose. You can now ask Goose to run calculations like `evaluate_expression` or `median` directly.

### Zed Editor (AI Pane)
Zed’s built‑in AI pane supports MCP connections.
1. Open **Settings → AI → MCP Servers**.
2. Click **Add Server** and fill in:
   - **Name**: `cruncher`
   - **Command**: `node`
   - **Args**: `/absolute/path/to/cruncher.js`
   - **Env** (optional): `CRUNCHER_TOOL_SET=standard`
3. Save. The Zed AI can now call Cruncher for precise arithmetic and statistics.

### LM Studio (Local LLM + MCP)
LM Studio runs LLMs entirely offline and now includes an MCP client.
1. Open **Settings → MCP** in LM Studio.
2. Click **Add Server** and provide:
   - **Executable**: `node`
   - **Arguments**: `/absolute/path/to/cruncher.js`
   - **Environment** (optional): `CRUNCHER_TOOL_SET=standard`
3. Confirm. Your private model (e.g., Llama 3, DeepSeek‑V2) can now offload math to Cruncher without any network traffic.

### LibreChat Configuration

If you're using LibreChat, you can add the following configuration to your librechat.yaml file:

```yaml
  cruncher:
    type: stdio
    command: node
    args:
      - "/opt/mcp/cruncher.js"
    env:
      CRUNCHER_TIMEOUT: "5000"
```

**Example Questions for Claude**

> "What is the angle in degrees whose sine is 0.5?"

> "Calculate the average, median, and range of these numbers: [15, 22, 8, 41, 19, 30]"

> "What is 2 raised to the power of 10?"

> "What is the standard deviation of [10, 12, 8, 14, 6]?"

> "What is 15% of 240?"

> "A stock went from $50 to $75. What's the percentage change?"

> "What is the variance of test scores [85, 92, 78, 90, 88]?"

> "Calculate the range of values in [3, 7, 2, 9, 1]"

> "Evaluate the expression: sin(pi/4) + sqrt(16) + log10(100)"

> "What is 10 factorial?"

> "What is 17 modulo 5?"

**Full Tier Examples** (with `CRUNCHER_TOOL_SET=full`):

> "Store 99 in memory, add 5, then recall the total."

> "What's the 75th percentile of [10, 20, 30, 40, 50]?"

> "Convert 11010 from binary to decimal."

> "Batch: square root of 144, add 10, then raise to power 2."

> "Switch trigonometric functions to radians mode."

> "Clear the result cache and show cache statistics."

> "Recall what's in memory, then subtract 15 and store the result."

> "What's the 95th percentile of [23, 45, 12, 67, 89, 34, 56, 78, 90, 11]?"

> "Convert 0xFF from hex to binary."

---

## 📋 Available Tools

Cruncher exposes its functions as individual MCP tools. Here is the full list:

| Tool Name | Description | Arguments |
| :--- | :--- | :--- |
| **Basic Arithmetic** | | |
| `evaluate_expression` | Evaluates a plain text math expression (e.g. `(5 + 3) * 10 / 2`). | `expression` (string) |
| `add` | Adds two numbers (a + b). | `a` (number), `b` (number) |
| `subtract` | Subtracts the second number from the first (a - b). | `a` (number), `b` (number) |
| `multiply` | Multiplies two numbers (a * b). | `a` (number), `b` (number) |
| `divide` | Divides the first number by the second (a / b). | `a` (number), `b` (number) |
| `modulo` | Calculates the remainder (a mod b). | `a` (number), `b` (number) |
| **Power & Roots** | | |
| `power` | Calculates a raised to the power of b (a^b). | `base` (number), `exponent` (number) |
| `sqrt` | Calculates the square root of a value. | `value` (number) |
| **Number Theory** | | |
| `factorial` | Calculates the factorial of a non-negative integer (n!). | `n` (number, non-negative integer) |
| **Unit Conversion** | | |
| `convert_unit` | Convert between common units. 8 categories, 80+ units. | `value` (number), `category` (string), `from` (string), `to` (string) |
| **Base Conversion (Full Tier)** | | |
| `convert_base` | Converts between bases 2, 8, 10, 16. | `value` (string), `from_base` (2, 8, 10, 16), `to_base` (2, 8, 10, 16) |
| **Trigonometry** | | |
| `sine` | Calculates the sine of an angle. | `angle` (number), `unit` (degrees/radians, optional) |
| `cosine` | Calculates the cosine of an angle. | `angle` (number), `unit` (degrees/radians, optional) |
| `tangent` | Calculates the tangent of an angle. | `angle` (number), `unit` (degrees/radians, optional) |
| `asin` | Calculates the inverse sine (arcsine) of a value. Returns an angle. | `value` (number), `unit` (degrees/radians, optional) |
| `acos` | Calculates the inverse cosine (arccosine) of a value. Returns an angle. | `value` (number), `unit` (degrees/radians, optional) |
| `atan` | Calculates the inverse tangent (arctangent) of a value. Returns an angle. | `value` (number), `unit` (degrees/radians, optional) |
| **Logarithms** | | |
| `logarithm` | Calculates the base-10 logarithm of a value. | `value` (number) |
| `natural_log` | Calculates the natural logarithm (base-e) of a value. | `value` (number) |
| **Statistical Functions** | | |
| `sum` | Calculates the sum of an array of numbers. | `numbers` (array of numbers) |
| `avg` | Calculates the average of an array of numbers. | `numbers` (array of numbers) |
| `median` | Calculates the median of an array of numbers. | `numbers` (array of numbers) |
| `min` | Finds the minimum value in an array of numbers. | `numbers` (array of numbers) |
| `max` | Finds the maximum value in an array of numbers. | `numbers` (array of numbers) |
| `count` | Counts the number of elements in an array. | `numbers` (array of numbers) |
| `range` | Calculates the range (max - min) of an array. | `numbers` (array of numbers) |
| `percentile` | Calculates the value at a given percentile (0-100). **Full tier.** | `numbers` (array of numbers), `percentile` (number, 0-100) |
| `variance` | Variance of an array. Sample (n-1) or population (n). | `numbers` (array of numbers), `population` (boolean, optional) |
| `std_dev` | Standard deviation. Sample (n-1) or population (n). | `numbers` (array of numbers), `population` (boolean, optional) |
| `percentage_of` | What is X% of Y? e.g., 15% of 200 = 30. | `percent` (number), `total` (number) |
| `percentage_change` | % change from A to B. e.g., 50→80 = 60%. | `from` (number), `to` (number) |
| `percentage_reverse` | X is Y% of what? e.g., 30 is 15% of 200. | `value` (number), `percent` (number) |
| **Other** | | |
| `absolute` | Calculates the absolute value of a number. | `value` (number) |
| **Constants** | | |
| `get_constant` | Returns the value of a mathematical, physical, or chemical constant. | `name` ("pi", "e", "tau", "phi", "sqrt2", "euler_mascheroni", "c", "g", "G", "h", "k", "R", "NA", "e_charge", "m_e", "m_p") |
| **Memory Functions (Full Tier)** | | |
| `memory_clear` | Clears the calculator memory (MC). | (no arguments) |
| `memory_recall` | Recalls the value stored in memory (MR). | (no arguments) |
| `memory_add` | Adds a value to the current memory (M+). | `value` (number) |
| `memory_subtract` | Subtracts a value from the current memory (M-). | `value` (number) |
| **Angle Mode (Standard Tier)** | | |
| `set_angle_mode` | Set global angle mode (default: degrees). | `unit` ("degrees" or "radians") |
| `get_angle_mode` | Get current angle mode. | (no arguments) |
| **Admin Tools (Full Tier)** | | |
| `batch` | Execute multiple tool calls sequentially. | `operations` (array of {tool, arguments}) |
| `cache_clear` | Clear computation cache. | (no arguments) |
| `cache_info` | Show cache stats. | (no arguments) |

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CRUNCHER_TIMEOUT` | `3000` | Worker thread execution timeout (ms). Range 100-60000 |
| `CRUNCHER_TOOL_SET` | `standard` | Controls tool exposure: `minimal` (5), `standard` (34 **default**), `full` (43) |



### Tool Tiers — Full Reference

Cruncher exposes **3 tiers** via the `CRUNCHER_TOOL_SET` environment variable. Each tier is a strict superset of the one before it.

#### Tier Overview

| Tier | Tools | Use Case |
|------|-------|----------|
| **Minimal** (5) | Core arithmetic only | Lightweight calculators, simple math agents |
| **Standard** (34 — default) | All minimal + trig, stats, constants, unit conversion | General-purpose AI assistant math |
| **Full** (43) | All standard + memory, batch, cache, base conversion, advanced stats | Power users, multi-step workflows |

#### Minimal Tier (5 Tools)

All tools run in the worker thread with timeout protection.

| # | Tool | Description |
|---|------|-------------|
| 1 | `evaluate_expression` | Evaluates a math expression string |
| 2 | `add` | Addition (a + b) |
| 3 | `subtract` | Subtraction (a - b) |
| 4 | `multiply` | Multiplication (a × b) |
| 5 | `divide` | Division (a ÷ b) |

#### Standard Tier (34 Tools — includes all 5 Minimal)

| # | Tool | Category |
|---|------|----------|
| 6 | `sqrt` | Square root |
| 7 | `power` | Exponentiation (a^b) |
| 8 | `absolute` | Absolute value |
| 9 | `modulo` | Remainder (a mod b) |
| 10 | `factorial` | Factorial (n!) |
| 11 | `logarithm` | Base-10 logarithm |
| 12 | `natural_log` | Natural logarithm (ln) |
| 13 | `get_constant` | Fetch physical/math constants |
| 14–16 | `sine`, `cosine`, `tangent` | Trigonometry |
| 17–19 | `asin`, `acos`, `atan` | Inverse trigonometry |
| 20 | `set_angle_mode` | Toggle degrees/radians (global) |
| 21 | `get_angle_mode` | Check current angle mode |
| 22–25 | `sum`, `avg`, `min`, `max` | Basic statistics |
| 26 | `count` | Count elements |
| 27 | `variance` | Variance (sample or population) |
| 28 | `std_dev` | Standard deviation (sample or population) |
| 29 | `percentage_of` | X% of Y |
| 30 | `percentage_change` | % change A→B |
| 31 | `percentage_reverse` | X is Y% of what? |
| 32 | `median` | Median value |
| 33 | `range` | Range (max - min) |
| 34 | `convert_unit` | 80+ unit conversions, 8 categories |

#### Full Tier (43 Tools — includes all 34 Standard)

| # | Tool | Category |
|---|------|----------|
| 35 | `percentile` | Value at Nth percentile |
| 36 | `convert_base` | Base 2/8/10/16 conversion |
| 37 | `memory_add` | Add to running total |
| 38 | `memory_subtract` | Subtract from running total |
| 39 | `memory_recall` | Get current memory value |
| 40 | `memory_clear` | Reset memory to zero |
| 41 | `batch` | Execute up to 50 operations in one call |
| 42 | `cache_clear` | Clear result cache |
| 43 | `cache_info` | Show cache statistics |

### Fuzzy Tool Name Matching

If the LLM calls a tool that doesn't exist, Cruncher uses **Levenshtein distance** to find the closest match and suggests it:

| Typo | Suggestion | Match Type |
|------|-----------|------------|
| `fact` | `factorial` | Prefix match |
| `fac` | `factorial` | Prefix match |
| `sinn` | `sine` | 1-char typo |
| `squrt` | `sqrt` | Transposition |
| `adddd` | `add` | Extra letters |
| `divid` | `divide` | Missing suffix |
| `totally_wrong` | *(none)* | Too different — no suggestion |

Response format:
```json
{
  "error": {
    "code": -32601,
    "message": "Tool 'fact' not found. Did you mean 'factorial'?"
  }
}
```


### Extended evaluate_expression Built-ins

Beyond basic arithmetic, `evaluate_expression` supports these functions natively:

| Function | Description | Example | Result |
|----------|-------------|---------|--------|
| `sin(x)` | Sine (radians, always in expressions) | `sin(pi / 2)` | 1 |
| `cos(x)` | Cosine (radians, always in expressions) | `cos(pi)` | -1 |
| `tan(x)` | Tangent (radians) | `tan(pi / 4)` | ~1 |
| `asin(x)` | Arc-sine (result in radians) | `asin(1)` | π/2 |
| `acos(x)` | Arc-cosine (result in radians) | `acos(0)` | π/2 |
| `atan(x)` | Arc-tangent (result in radians) | `atan(1)` | π/4 |
| `sqrt(x)` | Square root | `sqrt(144)` | 12 |
| `log10(x)` | Base-10 logarithm | `log10(1000)` | 3 |
| `ln(x)` | Natural log (base e) | `ln(e)` | 1 |
| `log(x, b)` | Arbitrary base logarithm | `log(8, 2)` | 3 |
| `abs(x)` | Absolute value | `abs(-5)` | 5 |
| `round(x)` | Round to nearest int | `round(3.7)` | 4 |
| `floor(x)` | Round down | `floor(3.9)` | 3 |
| `ceil(x)` | Round up | `ceil(3.1)` | 4 |
| `min(a,b,...)` | Minimum value | `min(3, 1, 4)` | 1 |
| `max(a,b,...)` | Maximum value | `max(3, 1, 4)` | 4 |

Combine freely: `sin(pi/6) + sqrt(16) + log10(100) = 6.5`

### Improved Error Messages

Domain errors now tell you what went wrong:
- `sqrt(-1)` → "Check for: sqrt(negative), log(negative/zero), asin/acos out of [-1,1]"
- `1/0` → "Check for division by zero or overflow"
- `asin(5)` → "asin/acos out of [-1,1]"

### Constants in Expressions

You can now use mathematical and physical constant names directly inside `evaluate_expression`:

| Constant | Description | Value |
|----------|-------------|-------|
| `pi` | π (circle ratio) | 3.14159... |
| `e` | Euler's number | 2.71828... |
| `tau` | τ = 2π | 6.28318... |
| `phi` | Golden ratio (φ) | 1.61803... |
| `sqrt2` | √2 | 1.41421... |
| `euler_mascheroni` | Euler-Mascheroni (γ) | 0.57721... |
| `c` | Speed of light (m/s) | 299792458 |
| `g` | Gravity (m/s²) | 9.80665 |
| `G` | Gravitational constant | 6.6743e-11 |
| `h` | Planck constant (J·s) | 6.62607015e-34 |
| `k` | Boltzmann constant (J/K) | 1.380649e-23 |
| `R` | Ideal gas constant (J/mol·K) | 8.314462618 |
| `NA` | Avogadro constant (1/mol) | 6.02214076e23 |
| `e_charge` | Elementary charge (C) | 1.602176634e-19 |
| `m_e` | Electron mass (kg) | 9.1093837015e-31 |
| `m_p` | Proton mass (kg) | 1.67262192369e-27 |

**Examples:**
```
2 * pi * 5       → 31.4159...
phi ^ 2          → 2.61803...
G * 1e11         → 6.6743
sqrt2 * sqrt2    → 2
e * e            → 7.38906...
c * 2            → 599584916
```

**Rules:**
- Use explicit operators: `2 * pi` works, `2pi` does not (no implicit multiplication)
- Constants coexist with scientific notation: `1e6` and `e * 2` both work correctly
- Longest constant names match first: `euler_mascheroni` won't become `299792458uler_mascheroni`

### Tiered Tool Exposure

The `CRUNCHER_TOOL_SET` environment variable lets you optimize context token usage by exposing only the tools you actually need:

| Tier | Tools | Token Budget | Use Case |
|------|-------|-------------|----------|
| `minimal` | 5 | ~160 tokens | Basic arithmetic. All complex math via `evaluate_expression` |
| `standard` | 34 | ~1,150 tokens | Arithmetic, trig, stats, percentages, constants, unit conversion (**default**) |
| `full` | 43 | ~1,500 tokens | Standard + memory, base conversion, percentile, batch, cache |

**Note**: Even in `minimal` mode, `evaluate_expression` handles complex math — individual tools (`sin`, `sqrt`, etc.) just aren't registered as separate MCP tool calls. This saves up to **90%** on context tokens.

Example MCP config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cruncher-minimal": {
      "command": "node",
      "args": ["/path/to/cruncher.js"],
      "env": { "CRUNCHER_TOOL_SET": "minimal" }
    }
  }
}
```

## ⛏️ How It Works (For Developers)

Cruncher is a plain Node.js JavaScript application that communicates over **standard input/output (stdio)**. This makes it a lightweight, portable, and secure MCP server. The entire flow for a single tool call looks like this:

1.  **Initialization**: On startup, the server listens for an `initialize` request from the MCP client and responds with its capabilities and version info (`v1.2.23`).
2.  **Tool Discovery**: The client sends a `tools/list` request, and the server responds with the full list of available calculator tools and their `inputSchema`, which defines the required arguments and their types.
3.  **Input Validation**: Before any tool is executed, the server runs a custom recursive `validateArguments` function against the tool's `inputSchema`. This ensures required fields are present, types are correct (number, string, array), enum values are valid, and min/max constraints are respected — all without any external library.
4.  **Worker Thread Execution**: Once validated, the tool call is handed off to an isolated Node.js `worker_thread`. This completely protects the main thread (and its `stdio` communication) from being blocked by a long-running or infinite calculation.
5.  **Timeout Protection**: A configurable timer (`CRUNCHER_TIMEOUT`, default 3000ms) watches the worker. If the worker takes too long, the main thread forcefully terminates it via `worker.terminate()` and returns a `-32000` error to the AI client.
6.  **Safe Math & Result**: The worker executes the handler function using `safeMath` (integer-scaling) for decimal-safe arithmetic, then posts the result back to the main thread, which formats and writes the final JSON-RPC 2.0 response to `stdout`.

## 🤝 Contributing

Contributions are welcome! If you'd like to add a new function, fix a bug, or improve the documentation, please feel free to open an issue or submit a pull request.

## 📜 License

This project is licensed under the MIT License.
