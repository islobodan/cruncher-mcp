/*
 * MCP Server: Cruncher - The Scientific Calculator
 * Author: Slobodan Ivkovic
 * Type: stdio
 * Language: Plain JavaScript (Node.js)
 *
 * This server provides a wide range of scientific and memory functions
 * as tools that an AI assistant can call.
 * - v1.1.0: Added inverse trig and statistical functions.
 */

const readline = require("readline");

// --- Server State ---
// A simple variable to store the memory value for M+, M-, MR, MC functions.
let memory = 0;

// --- Tool Definitions ---
// This array defines all the calculator functions available to the AI model.
const TOOLS = [
  // ... (All previous tools are maintained) ...
  // --- Basic Arithmetic ---
  {
    name: "add",
    description: "Adds two numbers (a + b).",
    inputSchema: {
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
      required: ["a", "b"],
    },
  },
  {
    name: "subtract",
    description: "Subtracts the second number from the first (a - b).",
    inputSchema: {
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
      required: ["a", "b"],
    },
  },
  {
    name: "multiply",
    description: "Multiplies two numbers (a * b).",
    inputSchema: {
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
      required: ["a", "b"],
    },
  },
  {
    name: "divide",
    description:
      "Divides the first number by the second (a / b). Returns an error if b is zero.",
    inputSchema: {
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
      required: ["a", "b"],
    },
  },
  // --- Power & Root ---
  {
    name: "power",
    description: "Calculates a raised to the power of b (a^b).",
    inputSchema: {
      type: "object",
      properties: { base: { type: "number" }, exponent: { type: "number" } },
      required: ["base", "exponent"],
    },
  },
  {
    name: "sqrt",
    description:
      "Calculates the square root of a value. Returns an error for negative numbers.",
    inputSchema: {
      type: "object",
      properties: { value: { type: "number" } },
      required: ["value"],
    },
  },
  // --- Trigonometry ---
  {
    name: "sine",
    description:
      'Calculates the sine of an angle. Unit can be "degrees" or "radians" (default).',
    inputSchema: {
      type: "object",
      properties: {
        angle: { type: "number" },
        unit: { type: "string", enum: ["degrees", "radians"] },
      },
      required: ["angle"],
    },
  },
  {
    name: "cosine",
    description:
      'Calculates the cosine of an angle. Unit can be "degrees" or "radians" (default).',
    inputSchema: {
      type: "object",
      properties: {
        angle: { type: "number" },
        unit: { type: "string", enum: ["degrees", "radians"] },
      },
      required: ["angle"],
    },
  },
  {
    name: "tangent",
    description:
      'Calculates the tangent of an angle. Unit can be "degrees" or "radians" (default).',
    inputSchema: {
      type: "object",
      properties: {
        angle: { type: "number" },
        unit: { type: "string", enum: ["degrees", "radians"] },
      },
      required: ["angle"],
    },
  },
  // --- Inverse Trigonometry (NEW in v1.1.0) ---
  {
    name: "asin", // Arcsine
    description:
      'Calculates the inverse sine (arcsine) of a value. Returns the angle. Unit can be "degrees" or "radians" (default). Input must be between -1 and 1.',
    inputSchema: {
      type: "object",
      properties: {
        value: { type: "number" },
        unit: { type: "string", enum: ["degrees", "radians"] },
      },
      required: ["value"],
    },
  },
  {
    name: "acos", // Arccosine
    description:
      'Calculates the inverse cosine (arccosine) of a value. Returns the angle. Unit can be "degrees" or "radians" (default). Input must be between -1 and 1.',
    inputSchema: {
      type: "object",
      properties: {
        value: { type: "number" },
        unit: { type: "string", enum: ["degrees", "radians"] },
      },
      required: ["value"],
    },
  },
  {
    name: "atan", // Arctangent
    description:
      'Calculates the inverse tangent (arctangent) of a value. Returns the angle. Unit can be "degrees" or "radians" (default).',
    inputSchema: {
      type: "object",
      properties: {
        value: { type: "number" },
        unit: { type: "string", enum: ["degrees", "radians"] },
      },
      required: ["value"],
    },
  },
  // --- Logarithms ---
  {
    name: "logarithm",
    description:
      "Calculates the base-10 logarithm of a value. Returns an error for non-positive numbers.",
    inputSchema: {
      type: "object",
      properties: { value: { type: "number" } },
      required: ["value"],
    },
  },
  {
    name: "natural_log",
    description:
      "Calculates the natural logarithm (base-e) of a value. Returns an error for non-positive numbers.",
    inputSchema: {
      type: "object",
      properties: { value: { type: "number" } },
      required: ["value"],
    },
  },
  // --- Other ---
  {
    name: "absolute",
    description: "Calculates the absolute value of a number.",
    inputSchema: {
      type: "object",
      properties: { value: { type: "number" } },
      required: ["value"],
    },
  },
  // --- Constants ---
  {
    name: "get_constant",
    description:
      'Returns the value of a mathematical constant like "pi" or "e".',
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", enum: ["pi", "e"] } },
      required: ["name"],
    },
  },
  // --- Statistical Functions (NEW in v1.1.0) ---
  {
    name: "sum",
    description: "Calculates the sum of an array of numbers.",
    inputSchema: {
      type: "object",
      properties: {
        numbers: { type: "array", items: { type: "number" } },
      },
      required: ["numbers"],
    },
  },
  {
    name: "avg",
    description: "Calculates the average of an array of numbers.",
    inputSchema: {
      type: "object",
      properties: {
        numbers: { type: "array", items: { type: "number" } },
      },
      required: ["numbers"],
    },
  },
  {
    name: "median",
    description: "Calculates the median of an array of numbers.",
    inputSchema: {
      type: "object",
      properties: {
        numbers: { type: "array", items: { type: "number" } },
      },
      required: ["numbers"],
    },
  },
  {
    name: "min",
    description: "Finds the minimum value in an array of numbers.",
    inputSchema: {
      type: "object",
      properties: {
        numbers: { type: "array", items: { type: "number" } },
      },
      required: ["numbers"],
    },
  },
  {
    name: "max",
    description: "Finds the maximum value in an array of numbers.",
    inputSchema: {
      type: "object",
      properties: {
        numbers: { type: "array", items: { type: "number" } },
      },
      required: ["numbers"],
    },
  },
  // --- Memory Functions ---
  {
    name: "memory_clear",
    description: "Clears the calculator memory (MC).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "memory_recall",
    description: "Recalls the value stored in memory (MR).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "memory_add",
    description: "Adds a value to the current memory (M+).",
    inputSchema: {
      type: "object",
      properties: { value: { type: "number" } },
      required: ["value"],
    },
  },
  {
    name: "memory_subtract",
    description: "Subtracts a value from the current memory (M-).",
    inputSchema: {
      type: "object",
      properties: { value: { type: "number" } },
      required: ["value"],
    },
  },
  // --- Additional Statistical Functions ---
  {
    name: "count",
    description: "Counts the number of elements in an array of numbers.",
    inputSchema: {
      type: "object",
      properties: {
        numbers: { type: "array", items: { type: "number" } },
      },
      required: ["numbers"],
    },
  },
  {
    name: "range",
    description:
      "Calculates the range (difference between max and min) of an array of numbers.",
    inputSchema: {
      type: "object",
      properties: {
        numbers: { type: "array", items: { type: "number" } },
      },
      required: ["numbers"],
    },
  },
  {
    name: "percentile",
    description:
      "Calculates the value at a given percentile (0-100) in an array of numbers. For example, percentile 50 is the median.",
    inputSchema: {
      type: "object",
      properties: {
        numbers: { type: "array", items: { type: "number" } },
        percentile: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["numbers", "percentile"],
    },
  },
  // --- Additional Math Functions ---
  {
    name: "modulo",
    description:
      "Calculates the remainder (modulo) of dividing two numbers (a mod b).",
    inputSchema: {
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
      required: ["a", "b"],
    },
  },
  {
    name: "factorial",
    description:
      "Calculates the factorial of a non-negative integer (n!). For example, 5! = 5 × 4 × 3 × 2 × 1 = 120.",
    inputSchema: {
      type: "object",
      properties: { n: { type: "number" } },
      required: ["n"],
    },
  },
];

// --- Tool Implementations ---
const toolHandlers = {
  /**
   * Adds two numbers together.
   * @param {Object} args - The arguments object.
   * @param {number} args.a - The first number.
   * @param {number} args.b - The second number.
   * @returns {number} The sum of a and b.
   */
  add: ({ a, b }) => a + b,

  /**
   * Subtracts the second number from the first.
   * @param {Object} args - The arguments object.
   * @param {number} args.a - The first number.
   * @param {number} args.b - The second number to subtract.
   * @returns {number} The difference of a and b.
   */
  subtract: ({ a, b }) => a - b,

  /**
   * Multiplies two numbers together.
   * @param {Object} args - The arguments object.
   * @param {number} args.a - The first number.
   * @param {number} args.b - The second number.
   * @returns {number} The product of a and b.
   */
  multiply: ({ a, b }) => a * b,

  /**
   * Divides the first number by the second.
   * @param {Object} args - The arguments object.
   * @param {number} args.a - The numerator.
   * @param {number} args.b - The denominator.
   * @returns {number} The quotient of a and b.
   * @throws {Error} If b is zero.
   */
  divide: ({ a, b }) => {
    if (b === 0) throw new Error("Division by zero is not allowed.");
    return a / b;
  },

  /**
   * Calculates a number raised to a power.
   * @param {Object} args - The arguments object.
   * @param {number} args.base - The base number.
   * @param {number} args.exponent - The exponent.
   * @returns {number} The result of base raised to the power of exponent.
   */
  power: ({ base, exponent }) => Math.pow(base, exponent),

  /**
   * Calculates the square root of a number.
   * @param {Object} args - The arguments object.
   * @param {number} args.value - The number to calculate the square root of.
   * @returns {number} The square root of value.
   * @throws {Error} If value is negative.
   */
  sqrt: ({ value }) => {
    if (value < 0)
      throw new Error("Cannot calculate the square root of a negative number.");
    return Math.sqrt(value);
  },

  /**
   * Converts an angle to radians if it's in degrees.
   * @param {number} angle - The angle value.
   * @param {string} [unit] - The unit ("degrees" or "radians").
   * @returns {number} The angle in radians.
   * @private
   */
  _toRadians: (angle, unit) =>
    unit === "degrees" ? angle * (Math.PI / 180) : angle,

  /**
   * Converts radians to degrees if the unit is "degrees".
   * @param {number} radians - The angle in radians.
   * @param {string} [unit] - The unit ("degrees" or "radians").
   * @returns {number} The angle in the specified unit.
   * @private
   */
  _fromRadians: (radians, unit) =>
    unit === "degrees" ? radians * (180 / Math.PI) : radians,

  /**
   * Calculates the sine of an angle.
   * @param {Object} args - The arguments object.
   * @param {number} args.angle - The angle value.
   * @param {string} [args.unit] - The unit ("degrees" or "radians").
   * @returns {number} The sine of the angle.
   */
  sine: ({ angle, unit }) => Math.sin(toolHandlers._toRadians(angle, unit)),

  /**
   * Calculates the cosine of an angle.
   * @param {Object} args - The arguments object.
   * @param {number} args.angle - The angle value.
   * @param {string} [args.unit] - The unit ("degrees" or "radians").
   * @returns {number} The cosine of the angle.
   */
  cosine: ({ angle, unit }) => Math.cos(toolHandlers._toRadians(angle, unit)),

  /**
   * Calculates the tangent of an angle.
   * @param {Object} args - The arguments object.
   * @param {number} args.angle - The angle value.
   * @param {string} [args.unit] - The unit ("degrees" or "radians").
   * @returns {number} The tangent of the angle.
   */
  tangent: ({ angle, unit }) => Math.tan(toolHandlers._toRadians(angle, unit)),

  /**
   * Calculates the inverse sine (arcsine) of a value.
   * @param {Object} args - The arguments object.
   * @param {number} args.value - The value between -1 and 1.
   * @param {string} [args.unit] - The unit ("degrees" or "radians").
   * @returns {number} The angle whose sine is value.
   * @throws {Error} If value is not between -1 and 1.
   */
  asin: ({ value, unit }) => {
    if (value < -1 || value > 1)
      throw new Error("asin input must be between -1 and 1.");
    return toolHandlers._fromRadians(Math.asin(value), unit);
  },

  /**
   * Calculates the inverse cosine (arccosine) of a value.
   * @param {Object} args - The arguments object.
   * @param {number} args.value - The value between -1 and 1.
   * @param {string} [args.unit] - The unit ("degrees" or "radians").
   * @returns {number} The angle whose cosine is value.
   * @throws {Error} If value is not between -1 and 1.
   */
  acos: ({ value, unit }) => {
    if (value < -1 || value > 1)
      throw new Error("acos input must be between -1 and 1.");
    return toolHandlers._fromRadians(Math.acos(value), unit);
  },

  /**
   * Calculates the inverse tangent (arctangent) of a value.
   * @param {Object} args - The arguments object.
   * @param {number} args.value - The value.
   * @param {string} [args.unit] - The unit ("degrees" or "radians").
   * @returns {number} The angle whose tangent is value.
   */
  atan: ({ value, unit }) => toolHandlers._fromRadians(Math.atan(value), unit),

  /**
   * Calculates the base-10 logarithm of a value.
   * @param {Object} args - The arguments object.
   * @param {number} args.value - The positive number.
   * @returns {number} The base-10 logarithm of value.
   * @throws {Error} If value is not positive.
   */
  logarithm: ({ value }) => {
    if (value <= 0)
      throw new Error("Logarithm is only defined for positive numbers.");
    return Math.log10(value);
  },

  /**
   * Calculates the natural logarithm (base-e) of a value.
   * @param {Object} args - The arguments object.
   * @param {number} args.value - The positive number.
   * @returns {number} The natural logarithm of value.
   * @throws {Error} If value is not positive.
   */
  natural_log: ({ value }) => {
    if (value <= 0)
      throw new Error("Natural log is only defined for positive numbers.");
    return Math.log(value);
  },

  /**
   * Calculates the absolute value of a number.
   * @param {Object} args - The arguments object.
   * @param {number} args.value - The number.
   * @returns {number} The absolute value of value.
   */
  absolute: ({ value }) => Math.abs(value),

  /**
   * Returns the value of a mathematical constant.
   * @param {Object} args - The arguments object.
   * @param {string} args.name - The constant name ("pi" or "e").
   * @returns {number} The value of the constant.
   * @throws {Error} If the constant name is unknown.
   */
  get_constant: ({ name }) => {
    if (name === "pi") return Math.PI;
    if (name === "e") return Math.E;
    throw new Error(`Unknown constant: ${name}`);
  },

  // Statistical Handlers

  /**
   * Calculates the sum of an array of numbers.
   * @param {Object} args - The arguments object.
   * @param {number[]} args.numbers - Array of numbers.
   * @returns {number} The sum of all numbers.
   */
  sum: ({ numbers }) => numbers.reduce((acc, val) => acc + val, 0),

  /**
   * Calculates the average (mean) of an array of numbers.
   * @param {Object} args - The arguments object.
   * @param {number[]} args.numbers - Array of numbers.
   * @returns {number} The average of all numbers.
   * @throws {Error} If the array is empty.
   */
  avg: ({ numbers }) => {
    if (numbers.length === 0)
      throw new Error("Cannot calculate the average of an empty list.");
    return numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
  },

  /**
   * Calculates the median of an array of numbers.
   * @param {Object} args - The arguments object.
   * @param {number[]} args.numbers - Array of numbers.
   * @returns {number} The median value.
   * @throws {Error} If the array is empty.
   */
  median: ({ numbers }) => {
    if (numbers.length === 0)
      throw new Error("Cannot calculate the median of an empty list.");
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  },

  /**
   * Finds the minimum value in an array of numbers.
   * @param {Object} args - The arguments object.
   * @param {number[]} args.numbers - Array of numbers.
   * @returns {number} The minimum value.
   * @throws {Error} If the array is empty.
   */
  min: ({ numbers }) => {
    if (numbers.length === 0)
      throw new Error("Cannot find the minimum of an empty list.");
    return Math.min(...numbers);
  },

  /**
   * Finds the maximum value in an array of numbers.
   * @param {Object} args - The arguments object.
   * @param {number[]} args.numbers - Array of numbers.
   * @returns {number} The maximum value.
   * @throws {Error} If the array is empty.
   */
  max: ({ numbers }) => {
    if (numbers.length === 0)
      throw new Error("Cannot find the maximum of an empty list.");
    return Math.max(...numbers);
  },

  // Memory Handlers

  /**
   * Clears the calculator memory (MC).
   * @returns {string} Confirmation message.
   */
  memory_clear: () => {
    memory = 0;
    return "Memory cleared.";
  },

  /**
   * Recalls the value stored in memory (MR).
   * @returns {number} The current memory value.
   */
  memory_recall: () => memory,

  /**
   * Adds a value to the current memory (M+).
   * @param {Object} args - The arguments object.
   * @param {number} args.value - The value to add.
   * @returns {string} Confirmation message with new memory value.
   */
  memory_add: ({ value }) => {
    memory += value;
    return `Added ${value} to memory. New memory value: ${memory}`;
  },

  /**
   * Subtracts a value from the current memory (M-).
   * @param {Object} args - The arguments object.
   * @param {number} args.value - The value to subtract.
   * @returns {string} Confirmation message with new memory value.
   */
  memory_subtract: ({ value }) => {
    memory -= value;
    return `Subtracted ${value} from memory. New memory value: ${memory}`;
  },

  // Additional Statistical Handlers

  /**
   * Counts the number of elements in an array of numbers.
   * @param {Object} args - The arguments object.
   * @param {number[]} args.numbers - Array of numbers.
   * @returns {number} The count of elements.
   */
  count: ({ numbers }) => numbers.length,

  /**
   * Calculates the range (difference between max and min) of an array of numbers.
   * @param {Object} args - The arguments object.
   * @param {number[]} args.numbers - Array of numbers.
   * @returns {number} The range (max - min).
   * @throws {Error} If the array is empty.
   */
  range: ({ numbers }) => {
    if (numbers.length === 0)
      throw new Error("Cannot calculate the range of an empty list.");
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    return max - min;
  },

  /**
   * Calculates the value at a given percentile (0-100) in an array of numbers.
   * Uses linear interpolation method for percentile calculation.
   * @param {Object} args - The arguments object.
   * @param {number[]} args.numbers - Array of numbers.
   * @param {number} args.percentile - The percentile to calculate (0-100).
   * @returns {number} The value at the specified percentile.
   * @throws {Error} If the array is empty or percentile is out of range.
   */
  percentile: ({ numbers, percentile }) => {
    if (numbers.length === 0)
      throw new Error("Cannot calculate the percentile of an empty list.");
    if (percentile < 0 || percentile > 100)
      throw new Error("Percentile must be between 0 and 100.");

    const sorted = [...numbers].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);

    if (index === Math.floor(index)) {
      return sorted[index];
    } else {
      const lower = sorted[Math.floor(index)];
      const upper = sorted[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  },

  // Additional Math Handlers

  /**
   * Calculates the remainder (modulo) of dividing two numbers.
   * @param {Object} args - The arguments object.
   * @param {number} args.a - The dividend.
   * @param {number} args.b - The divisor.
   * @returns {number} The remainder of a divided by b.
   * @throws {Error} If b is zero.
   */
  modulo: ({ a, b }) => {
    if (b === 0) throw new Error("Modulo by zero is not allowed.");
    return a % b;
  },

  /**
   * Calculates the factorial of a non-negative integer (n!).
   * @param {Object} args - The arguments object.
   * @param {number} args.n - The non-negative integer.
   * @returns {number} The factorial of n.
   * @throws {Error} If n is negative or not an integer.
   */
  factorial: ({ n }) => {
    if (n < 0)
      throw new Error("Factorial is not defined for negative numbers.");
    if (!Number.isInteger(n))
      throw new Error("Factorial requires an integer value.");
    if (n > 170)
      throw new Error(
        "Factorial result exceeds maximum safe integer (n > 170).",
      );

    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  },
};

/**
 * Sends a JSON-RPC 2.0 error response to stdout.
 * @param {string|number|null} id - The request ID to correlate with the error.
 * @param {number} code - The error code (e.g., -32600, -32601, -32602).
 * @param {string} message - A descriptive error message.
 */
const sendError = (id, code, message) => {
  const errorResponse = {
    jsonrpc: "2.0",
    id: id,
    error: { code: code, message: message },
  };
  process.stdout.write(JSON.stringify(errorResponse) + "\n");
};

/**
 * Sends a JSON-RPC 2.0 success response to stdout.
 * @param {string|number} id - The request ID to correlate with the response.
 * @param {Object} result - The result object to return to the client.
 */
const sendSuccess = (id, result) => {
  const successResponse = {
    jsonrpc: "2.0",
    id: id,
    result: result,
  };
  process.stdout.write(JSON.stringify(successResponse) + "\n");
};

/**
 * Validates an incoming JSON-RPC 2.0 message according to MCP specification.
 * Checks for required id property, jsonrpc version, method property, and supported methods.
 * Sends error responses for validation failures.
 * @param {Object} message - The parsed JSON-RPC message object to validate.
 * @returns {boolean} True if the message is valid, false otherwise.
 */
const validateMessage = (message) => {
  // Check for message.id first - required for MCP compliance
  if (!("id" in message)) {
    console.error(
      "Invalid Request: Message missing required 'id' property (MCP requires non-null id)",
    );
    return false;
  }

  // Validate JSON-RPC version
  if (message.jsonrpc !== "2.0") {
    sendError(
      message.id,
      -32600,
      "Invalid Request: JSON-RPC version must be '2.0'",
    );
    return false;
  }

  // Validate that method exists
  if (!message.method) {
    sendError(
      message.id,
      -32600,
      "Invalid Request: 'method' property is required",
    );
    return false;
  }

  // Validate supported methods
  const supportedMethods = ["initialize", "tools/list", "tools/call"];
  if (!supportedMethods.includes(message.method)) {
    sendError(
      message.id,
      -32601,
      `Method not found: '${message.method}' is not a supported method`,
    );
    return false;
  }

  return true;
};

// --- MCP Server Logic (unchanged) ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

console.error("Cruncher v1.1.0 MCP Server starting...");

rl.on("line", (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch (e) {
    console.error("Failed to parse message:", e);
    return;
  }

  // Validate the message
  if (!validateMessage(message)) {
    return;
  }

  if (message.method === "initialize") {
    sendSuccess(message.id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "Cruncher", version: "1.1.0" },
    });
    return;
  }
  if (message.method === "tools/list") {
    sendSuccess(message.id, { tools: TOOLS });
    return;
  }
  if (message.method === "tools/call") {
    const { name, arguments: args } = message.params;
    const handler = toolHandlers[name];
    if (!handler) {
      sendError(message.id, -32601, `Tool '${name}' not found.`);
      return;
    }
    try {
      const result = handler(args);
      sendSuccess(message.id, {
        content: [{ type: "text", text: String(result) }],
      });
    } catch (error) {
      sendError(message.id, -32602, error.message);
    }
  }
});
