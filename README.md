# Cruncher: The Scientific Calculator MCP Server

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful scientific calculator for your AI assistant, built as a **Model Context Protocol (MCP)** server. Cruncher allows compatible AI clients (like Claude Desktop) to perform complex mathematical calculations, handle memory, perform statistical analysis, and access scientific constants with a simple, secure, and standardized interface.

## What is the Model Context Protocol?

The Model Context Protocol (MCP) is an open standard that allows AI applications to securely connect with external data sources and tools. Think of it as a universal API for AI. By implementing Cruncher as an MCP server, any AI that understands MCP can instantly gain powerful, built-in calculator capabilities without custom integrations.

## ✨ Features

Cruncher provides a comprehensive set of calculator functions:

*   **Basic Arithmetic**: Addition, Subtraction, Multiplication, Division, Modulo.
*   **Power & Roots**: Exponentiation (`a^b`), Square Root.
*   **Number Theory**: Factorial (n!).
*   **Trigonometry**: Sine, Cosine, Tangent, Arcsine (`asin`), Arccosine (`acos`), and Arctangent (`atan`) (with support for degrees and radians).
*   **Logarithms**: Base-10 Logarithm and Natural Logarithm (ln).
*   **Statistical Functions**: Sum, Average, Median, Min, Max, Range, Count, and Percentile for arrays of numbers.
*   **Convenience Functions**: Absolute Value.
*   **Mathematical Constants**: Easy access to `pi` (π) and `e`.
*   **Memory Functions**: `M+`, `M-`, `MR` (Memory Recall), and `MC` (Memory Clear).

## 🚀 Installation & Usage

Get Cruncher up and running with Claude Desktop in just a few minutes.

### Step 1: Prerequisites

Ensure you have **Node.js** (version 16.0.0 or newer) installed on your system. You can download it from [nodejs.org](https://nodejs.org/).

### Step 2: Download the Server

1.  Clone this repository or download the [`cruncher.js`](cruncher.js) file directly.
2.  Place the file in a permanent, memorable location on your computer (e.g., `C:\mcp-servers\cruncher.js` on Windows or `/home/user/mcp-servers/cruncher.js` on macOS/Linux).

### Step 3: Configure Claude Desktop

You need to tell Claude Desktop where to find the Cruncher server.

1.  Locate the Claude Desktop configuration file:
    *   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
    *   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

2.  If the file doesn't exist, create it.

3.  Add the following server configuration. **Important:** Replace the `args` path with the actual path to your `cruncher.js` file.

    ```json
    {
      "mcpServers": {
        "cruncher": {
          "command": "node",
          "args": ["C:/Users/YOUR_USERNAME/mcp-servers/cruncher.js"]
        }
      }
    }
    ```
    > **Note for macOS/Linux Users:** Use a POSIX-style path, e.g., `["/home/YOUR_USERNAME/mcp-servers/cruncher.js"]`. Make sure your `node` executable is in your system's PATH.

### Step 4: Start Calculating!

1.  **Save** the configuration file and **completely quit** the Claude Desktop app.
2.  Restart Claude Desktop. It will automatically connect to the Cruncher server.
3.  Start asking questions!

### LibreChat Configuration

If you're using LibreChat, you can add the following configuration to your librechat.yaml file:

```yaml
  cruncher:
    type: stdio
    command: node
    args:
      - "/opt/mcp/cruncher.js"
```

#### Example Questions for Claude

> "What is the angle in degrees whose sine is 0.5?"

> "Calculate the average, median, and max of this list of numbers: [15, 22, 8, 41, 19, 30]"

> "What is 2 raised to the power of 10?"

> "What is the 75th percentile of [10, 20, 30, 40, 50]?"

> "Calculate the range of values in [3, 7, 2, 9, 1]"

> "What is 17 modulo 5?"

> "What is 10 factorial?"

> "Store 99 in memory."

> "Add 5 to memory and then tell me what the total now is."

---

## 📋 Available Tools

Cruncher exposes its functions as individual MCP tools. Here is the full list:

| Tool Name | Description | Arguments |
| :--- | :--- | :--- |
| **Basic Arithmetic** | | |
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
| `percentile` | Calculates the value at a given percentile (0-100). | `numbers` (array of numbers), `percentile` (number, 0-100) |
| **Other** | | |
| `absolute` | Calculates the absolute value of a number. | `value` (number) |
| **Constants** | | |
| `get_constant` | Returns the value of a mathematical constant. | `name` ("pi" or "e") |
| **Memory Functions** | | |
| `memory_clear` | Clears the calculator memory (MC). | (no arguments) |
| `memory_recall` | Recalls the value stored in memory (MR). | (no arguments) |
| `memory_add` | Adds a value to the current memory (M+). | `value` (number) |
| `memory_subtract` | Subtracts a value from the current memory (M-). | `value` (number) |

## ⛏️ How It Works (For Developers)

Cruncher is a plain Node.js JavaScript application that communicates over **standard input/output (stdio)**. This makes it a lightweight, portable, and secure MCP server.

1.  **Initialization**: On startup, the server listens for an `initialize` request from the MCP client and responds with its capabilities.
2.  **Tool Discovery**: The client sends a `tools/list` request, and the server responds with the full list of available calculator tools and their `inputSchema`, which defines the required arguments.
3.  **Tool Execution**: When the AI decides to use a calculator function (e.g., `median`), the client sends a `tools/call` request with the tool name and arguments. The server executes the corresponding JavaScript function from the `toolHandlers` object, performs error checking, and returns the result.

This architecture allows the AI to make decisions based on the available tools, while the server handles the actual computation in a controlled environment.

## 🤝 Contributing

Contributions are welcome! If you'd like to add a new function, fix a bug, or improve the documentation, please feel free to open an issue or submit a pull request.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
