# Agent Instructions for Cruncher (MCP Server)

You are connected to **Cruncher**, a highly reliable, accurate, and zero-dependency scientific calculator built over the Model Context Protocol (MCP). 

Whenever a user asks you to perform mathematics, statistics, or fetch physical constants, you **must** use the tools provided by Cruncher rather than relying on your own internal mental math or generating a Python script, as Cruncher guarantees zero hallucination, strict decimal accuracy, and infinite-loop protection.

## Core Directives for Using Cruncher

### 1. Prioritize `evaluate_expression` for Complex Math
If the user gives you a complex mathematical formula like `(15.5 * 3) + 12 / 2 - 4^3`, **do not** make separate tool calls for `multiply`, `add`, `divide`, and `power`.
*   **Instead**: Make a single call to `evaluate_expression` passing the string `"(15.5 * 3) + 12 / 2 - 4^3"`.
*   **Why**: It reduces round trips, saves tokens, and evaluates the order of operations flawlessly.
*   **Constraint**: The string must only contain numbers, whitespace, parentheses, and the basic operators: `+`, `-`, `*`, `/`, `%`, `^`. It does not support letters or functions like `sin()` inside the string.

### 2. Understand Argument Strictness
Cruncher does not use a forgiving library like `zod`. It uses a custom, highly strict recursive JSON-Schema validator.
*   **Type Enforcement**: If a tool expects a `number`, you must send a JSON number (e.g., `5`), not a string (e.g., `"5"`).
*   **Enums Enforcement**: If a tool expects a unit of `"degrees"` or `"radians"`, sending `"deg"` or `"rad"` will result in a hard `-32602 Validation Error`. 
*   **Constants Enforcement**: The `get_constant` tool only accepts specific strings: `"pi"`, `"e"`, `"tau"`, `"phi"`, `"sqrt2"`, `"euler_mascheroni"`, `"c"`, `"g"`, `"G"`, `"h"`, `"k"`, `"R"`, `"NA"`, `"e_charge"`, `"m_e"`, `"m_p"`. If you need the speed of light, pass `"c"`, not `"speed_of_light"`.

### 3. Handle Timeouts Gracefully
Cruncher employs aggressive Infinite-Loop Protection using isolated Node.js worker threads. If a calculation takes longer than the configured timeout (defaulting to **3 seconds**), the thread is assassinated and you will receive a `-32000 Execution Timeout` error.
*   If you encounter this error (e.g., by passing an array of 50 million items to `median`, or calculating a massive factorial), **do not retry the exact same call**. Apologize to the user and explain that the calculation exceeded the safe execution time limits of the calculator.
*   **Inform the User**: If the user absolutely needs this massive calculation to finish, you can inform them that they can increase the execution timeout by setting the `CRUNCHER_TIMEOUT` environment variable (in milliseconds) in their MCP configuration file (e.g., `claude_desktop_config.json`).

### 4. Rely on its Floating-Point Accuracy
Cruncher employs custom integer-scaling math under the hood to bypass standard IEEE 754 floating-point errors.
*   You do not need to worry about operations like `0.1 + 0.2` returning `0.30000000000000004`. Cruncher will return exactly `0.3`. You can confidently pass precise financial or scientific decimals to `add`, `subtract`, `multiply`, `divide`, and `modulo`.

### 5. Memory State is Persistent
The `memory_add`, `memory_subtract`, `memory_recall`, and `memory_clear` functions modify a persistent state variable inside the server. 
*   If a user asks you to "Keep a running total of the groceries," use `memory_add` for each item, and `memory_recall` to fetch the total.
*   Remember to `memory_clear` when the user asks to start a new total.

### Summary of Best Practices
*   **Use Tools Proactively**: Don't guess math. Call Cruncher.
*   **Validate Your Own Schema**: Before you emit the JSON payload, mentally double-check that your argument types match the tool's `inputSchema`.
*   **Batch with `evaluate_expression`**: Use it whenever possible for basic algebra.
*   **Respect the Errors**: If Cruncher throws a `-32602 Validation Error`, read the error message carefully—it will explicitly tell you what property path was malformed (e.g., `Validation Error: Expected array at root.numbers, got string`). Fix your payload and try again.