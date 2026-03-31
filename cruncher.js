/*
 * MCP Server: Cruncher - The Scientific Calculator
 * Author: Slobodan Ivkovic
 * Type: stdio
 * Language: Plain JavaScript (Node.js)
 *
 * This server provides a wide range of scientific and memory functions
 * as tools that an AI assistant can call.
 * - v1.1.0: Added inverse trig and statistical functions.
 * - v1.2.0: Added evaluate_expression, extended constants, custom input
 *           validation, worker_thread timeout protection, and safe
 *           floating-point arithmetic via integer-scaling.
 * - v1.2.5: Enhanced error messages with structured JSON-RPC responses
 *           including parameter context (parameter, expected, received,
 *           receivedValue, tool) for better debugging.
 */

const readline = require("readline");
const {
    Worker,
    isMainThread,
    parentPort,
    workerData,
} = require("worker_threads");

// --- Configuration ---
// Allow the user to configure the timeout via an environment variable, defaulting to 3000ms.
const EXECUTION_TIMEOUT = parseInt(process.env.CRUNCHER_TIMEOUT, 10) || 3000;

// --- Server State ---
// A simple variable to store the memory value for M+, M-, MR, MC functions.
let memory = 0;
let memoryQueue = Promise.resolve(); // Queue for atomic memory operations (main thread)

// --- Tool Definitions ---
// This array defines all the calculator functions available to the AI model.
const TOOLS = [
    // --- Basic Arithmetic ---
    {
        name: "add",
        description:
            "Adds two numbers (a + b). NOTE: For multi-step calculations or complex expressions, use 'evaluate_expression' instead (e.g., '5 + 3 + 2' or '(10 + 5) * 2').",
        inputSchema: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
            required: ["a", "b"],
        },
    },
    {
        name: "subtract",
        description:
            "Subtracts the second number from the first (a - b). NOTE: For multi-step calculations, use 'evaluate_expression' instead.",
        inputSchema: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
            required: ["a", "b"],
        },
    },
    {
        name: "multiply",
        description:
            "Multiplies two numbers (a * b). NOTE: For multi-step calculations, use 'evaluate_expression' instead.",
        inputSchema: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
            required: ["a", "b"],
        },
    },
    {
        name: "divide",
        description:
            "Divides the first number by the second (a / b). Returns an error if b is zero. NOTE: For multi-step calculations, use 'evaluate_expression' instead.",
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
            properties: {
                base: { type: "number" },
                exponent: { type: "number" },
            },
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
    // --- Inverse Trigonometry (added in v1.1.0) ---
    {
        name: "asin",
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
        name: "acos",
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
        name: "atan",
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
            "Returns the value of a mathematical, physical, or chemical constant. Supported constants: Math (pi, e, tau, phi, sqrt2, euler_mascheroni), Physics/Chemistry (c, g, G, h, k, R, NA, e_charge, m_e, m_p).",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    enum: [
                        "pi",
                        "e",
                        "tau",
                        "phi",
                        "sqrt2",
                        "euler_mascheroni",
                        "c",
                        "g",
                        "G",
                        "h",
                        "k",
                        "R",
                        "NA",
                        "e_charge",
                        "m_e",
                        "m_p",
                    ],
                },
            },
            required: ["name"],
        },
    },
    // --- Statistical Functions (added in v1.1.0) ---
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
        description: "Calculates the median of an array of numbers. Optional timeout parameter for large arrays (default: 3000ms).",
        inputSchema: {
            type: "object",
            properties: {
                numbers: { type: "array", items: { type: "number" } },
                timeout: { type: "number", minimum: 100, maximum: 60000, description: "Custom timeout in ms (100-60000, default: 3000)" },
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
            "Calculates the value at a given percentile (0-100) in an array of numbers. For example, percentile 50 is the median. Optional timeout parameter for large arrays (default: 3000ms).",
        inputSchema: {
            type: "object",
            properties: {
                numbers: { type: "array", items: { type: "number" } },
                percentile: { type: "number", minimum: 0, maximum: 100 },
                timeout: { type: "number", minimum: 100, maximum: 60000, description: "Custom timeout in ms (100-60000, default: 3000)" },
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
            "Calculates the factorial of a non-negative integer (n!). For example, 5! = 5 x 4 x 3 x 2 x 1 = 120. Optional timeout parameter for large calculations (default: 3000ms).",
        inputSchema: {
            type: "object",
            properties: {
                n: { type: "number" },
                timeout: { type: "number", minimum: 100, maximum: 60000, description: "Custom timeout in ms (100-60000, default: 3000)" },
            },
            required: ["n"],
        },
    },
    // --- NEW in v1.2.0: Expression Evaluator ---
    {
        name: "evaluate_expression",
        description:
            "Evaluates a plain text mathematical expression. PREFERRED METHOD for most calculations. Use this for ANY math problem that can be written as a single expression (e.g., '5 + 3 * 2', '(100 - 25) / 3', '2^10 + sqrt(16)'). Supports +, -, *, /, %, ^, parentheses, and decimals. Prefer this over calling add/subtract/multiply/divide separately for better accuracy and efficiency.",
        inputSchema: {
            type: "object",
            properties: { expression: { type: "string" } },
            required: ["expression"],
        },
    },
    {
        name: "convert_base",
        description:
            "Converts a number between different bases (2=binary, 8=octal, 10=decimal, 16=hexadecimal). Input value must be a string in the source base (e.g., 1010 for binary, FF for hex). Returns string representation in target base.",
        inputSchema: {
            type: "object",
            properties: {
                value: { type: "string" },
                from_base: { type: "number", enum: [2, 8, 10, 16] },
                to_base: { type: "number", enum: [2, 8, 10, 16] },
            },
            required: ["value", "from_base", "to_base"],
        },
    },
];

// --- Safe Floating Point Math Helpers ---

/**
 * Counts the number of decimal places in a number to avoid floating-point errors.
 * @param {number} num - The number to evaluate.
 * @returns {number} The number of decimal places.
 */
const countDecimals = (num) => {
    if (Math.floor(num) === num) return 0;
    const str = num.toString();
    if (str.includes("e-")) return parseInt(str.split("e-")[1], 10);
    if (str.includes(".")) return str.split(".")[1].length;
    return 0;
};

const safeMath = {
    add: (a, b) => {
        const d1 = countDecimals(a);
        const d2 = countDecimals(b);
        const maxDecimals = Math.max(d1, d2);
        const multiplier = Math.pow(10, maxDecimals);
        return (
            (Math.round(a * multiplier) + Math.round(b * multiplier)) /
            multiplier
        );
    },
    subtract: (a, b) => {
        const d1 = countDecimals(a);
        const d2 = countDecimals(b);
        const maxDecimals = Math.max(d1, d2);
        const multiplier = Math.pow(10, maxDecimals);
        return (
            (Math.round(a * multiplier) - Math.round(b * multiplier)) /
            multiplier
        );
    },
    multiply: (a, b) => {
        const d1 = countDecimals(a);
        const d2 = countDecimals(b);
        const multiplier1 = Math.pow(10, d1);
        const multiplier2 = Math.pow(10, d2);
        return (
            (Math.round(a * multiplier1) * Math.round(b * multiplier2)) /
            (multiplier1 * multiplier2)
        );
    },
    divide: (a, b) => {
        if (b === 0) throw new Error("Division by zero is not allowed.");
        const d1 = countDecimals(a);
        const d2 = countDecimals(b);
        const maxDecimals = Math.max(d1, d2);
        const multiplier = Math.pow(10, maxDecimals);
        return Math.round(a * multiplier) / Math.round(b * multiplier);
    },
    modulo: (a, b) => {
        if (b === 0) throw new Error("Modulo by zero is not allowed.");
        const d1 = countDecimals(a);
        const d2 = countDecimals(b);
        const maxDecimals = Math.max(d1, d2);
        const multiplier = Math.pow(10, maxDecimals);
        return (
            (Math.round(a * multiplier) % Math.round(b * multiplier)) /
            multiplier
        );
    },
};

// --- Trigonometry Helpers ---

/**
 * Converts an angle to radians if it's in degrees.
 * @param {number} angle - The angle value.
 * @param {string} [unit] - The unit ("degrees" or "radians").
 * @returns {number} The angle in radians.
 */
const toRadians = (angle, unit) =>
    unit === "degrees" ? angle * (Math.PI / 180) : angle;

/**
 * Converts radians to degrees if the unit is "degrees".
 * @param {number} radians - The angle in radians.
 * @param {string} [unit] - The unit ("degrees" or "radians").
 * @returns {number} The angle in the specified unit.
 */
const fromRadians = (radians, unit) =>
    unit === "degrees" ? radians * (180 / Math.PI) : radians;

// --- Tool Implementations ---

const toolHandlers = {
    /**
     * Adds two numbers together.
     * @param {Object} args - The arguments object.
     * @param {number} args.a - The first number.
     * @param {number} args.b - The second number.
     * @returns {number} The sum of a and b.
     */
    add: ({ a, b }) => safeMath.add(a, b),

    /**
     * Subtracts the second number from the first.
     * @param {Object} args - The arguments object.
     * @param {number} args.a - The first number.
     * @param {number} args.b - The second number to subtract.
     * @returns {number} The difference of a and b.
     */
    subtract: ({ a, b }) => safeMath.subtract(a, b),

    /**
     * Multiplies two numbers together.
     * @param {Object} args - The arguments object.
     * @param {number} args.a - The first number.
     * @param {number} args.b - The second number.
     * @returns {number} The product of a and b.
     */
    multiply: ({ a, b }) => safeMath.multiply(a, b),

    /**
     * Divides the first number by the second.
     * @param {Object} args - The arguments object.
     * @param {number} args.a - The numerator.
     * @param {number} args.b - The denominator.
     * @returns {number} The quotient of a and b.
     * @throws {Error} If b is zero.
     */
    divide: ({ a, b }) => safeMath.divide(a, b),

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
            throw new Error(
                "Cannot calculate the square root of a negative number.",
            );
        return Math.sqrt(value);
    },

    /**
     * Calculates the sine of an angle.
     * @param {Object} args - The arguments object.
     * @param {number} args.angle - The angle value.
     * @param {string} [args.unit] - The unit ("degrees" or "radians").
     * @returns {number} The sine of the angle.
     */
    sine: ({ angle, unit }) => Math.sin(toRadians(angle, unit)),

    /**
     * Calculates the cosine of an angle.
     * @param {Object} args - The arguments object.
     * @param {number} args.angle - The angle value.
     * @param {string} [args.unit] - The unit ("degrees" or "radians").
     * @returns {number} The cosine of the angle.
     */
    cosine: ({ angle, unit }) => Math.cos(toRadians(angle, unit)),

    /**
     * Calculates the tangent of an angle.
     * @param {Object} args - The arguments object.
     * @param {number} args.angle - The angle value.
     * @param {string} [args.unit] - The unit ("degrees" or "radians").
     * @returns {number} The tangent of the angle.
     */
    tangent: ({ angle, unit }) => Math.tan(toRadians(angle, unit)),

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
        return fromRadians(Math.asin(value), unit);
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
        return fromRadians(Math.acos(value), unit);
    },

    /**
     * Calculates the inverse tangent (arctangent) of a value.
     * @param {Object} args - The arguments object.
     * @param {number} args.value - The value.
     * @param {string} [args.unit] - The unit ("degrees" or "radians").
     * @returns {number} The angle whose tangent is value.
     */
    atan: ({ value, unit }) => fromRadians(Math.atan(value), unit),

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
            throw new Error(
                "Natural log is only defined for positive numbers.",
            );
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
     * @param {string} args.name - The constant name.
     * @returns {number} The value of the constant.
     * @throws {Error} If the constant name is unknown.
     */
    get_constant: ({ name }) => {
        const constants = {
            // Math
            pi: Math.PI,
            e: Math.E,
            tau: 2 * Math.PI,
            phi: 1.618033988749895, // Golden ratio
            sqrt2: Math.SQRT2,
            euler_mascheroni: 0.5772156649015329,
            // Physics (SI Units)
            c: 299792458, // Speed of light (m/s)
            g: 9.80665, // Standard gravity (m/s^2)
            G: 6.6743e-11, // Gravitational constant (m^3/kg/s^2)
            h: 6.62607015e-34, // Planck constant (J*s)
            k: 1.380649e-23, // Boltzmann constant (J/K)
            R: 8.314462618, // Ideal gas constant (J/mol*K)
            // Chemistry/Atomic
            NA: 6.02214076e23, // Avogadro constant (1/mol)
            e_charge: 1.602176634e-19, // Elementary charge (C)
            m_e: 9.1093837015e-31, // Electron mass (kg)
            m_p: 1.67262192369e-27, // Proton mass (kg)
        };

        if (name in constants) return constants[name];
        throw new Error(`Unknown constant: ${name}`);
    },

    // Statistical Handlers
    /**
     * Calculates the sum of an array of numbers.
     * @param {Object} args - The arguments object.
     * @param {number[]} args.numbers - Array of numbers.
     * @returns {number} The sum of all numbers.
     */
    sum: ({ numbers }) =>
        numbers.reduce((acc, val) => safeMath.add(acc, val), 0),

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
        return safeMath.divide(
            numbers.reduce((acc, val) => safeMath.add(acc, val), 0),
            numbers.length,
        );
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
            throw new Error(
                "Cannot calculate the percentile of an empty list.",
            );
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
    modulo: ({ a, b }) => safeMath.modulo(a, b),

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

    /**
     * Evaluates a mathematical string expression securely.
     * Supports scientific notation (e.g., 1e6, 2.5e-3) and built-in functions:
     * abs(), round(), floor(), ceil(), min(), max().
     * @param {Object} args - The arguments object.
     * @param {string} args.expression - The math expression as a string.
     * @returns {number} The calculated result.
     */
    evaluate_expression: ({ expression }) => {
        // 1. Convert mathematical ^ to JavaScript's ** operator
        let parsedExpr = expression.replace(/\^/g, "**");

        // 2. Convert scientific notation (e.g., 1e6, 2.5e-3, 1e+6) to safe multiplication
        // Pattern: number followed by e/E and optional +/- and digits
        // This must happen BEFORE security check since 'e' would be blocked
        parsedExpr = parsedExpr.replace(
            /(\d+\.?\d*)e([+-]?\d+)/gi,
            "($1 * Math.pow(10, $2))"
        );

        // 3. Convert built-in functions to Math.* equivalents
        // This must happen BEFORE security check since function names would be blocked
        const functionMap = {
            abs: "Math.abs",
            round: "Math.round",
            floor: "Math.floor",
            ceil: "Math.ceil",
            min: "Math.min",
            max: "Math.max",
        };

        for (const [funcName, mathFunc] of Object.entries(functionMap)) {
            // Match function name followed by opening parenthesis
            // Use word boundary to avoid partial matches
            const regex = new RegExp(`\\b${funcName}\\s*\\(`, "g");
            parsedExpr = parsedExpr.replace(regex, `${mathFunc}(`);
        }

        // 4. SECURITY CHECK: Strict Whitelist
        // Allow: digits, dot, operators, parentheses, whitespace, comma
        // Allow: Math.pow, Math.abs, Math.round, Math.floor, Math.ceil, Math.min, Math.max
        // We use a comprehensive allowed character set that includes all letters in these functions
        const disallowedChars = /[^0-9+\-*/().% \t*,Mathabspowrndflceigumx]/;
        
        // Check for any disallowed characters
        if (disallowedChars.test(parsedExpr)) {
            throw new Error(
                "Security Error: Expression contains invalid characters. Only numbers, basic operators (+, -, *, /, %, ^), and functions (abs, round, floor, ceil, min, max) are allowed.",
            );
        }
        
        // Additional check: ensure only valid Math.* functions are used
        const mathFuncPattern = /Math\.(pow|abs|round|floor|ceil|min|max)\(/g;
        const sanitizedExpr = parsedExpr.replace(mathFuncPattern, "");
        // After removing valid Math.* calls, check if any "Math." remains (invalid function)
        if (sanitizedExpr.includes("Math.")) {
            throw new Error(
                "Security Error: Invalid Math function. Only abs, round, floor, ceil, min, max, pow are allowed.",
            );
        }

        try {
            // 5. Evaluate safely
            // Because we strictly verified the contents above, this is now safe to run.
            const result = new Function("return (" + parsedExpr + ")")();
            if (!Number.isFinite(result) || isNaN(result)) {
                throw new Error(
                    "Expression did not result in a valid finite number.",
                );
            }
            return result;
        } catch (error) {
            throw new Error("Failed to evaluate expression: " + error.message);
        }
    },

    /**
     * Converts a number between different bases.
     * @param {Object} args - The arguments object.
     * @param {string} args.value - The number string in source base.
     * @param {number} args.from_base - Source base (2, 8, 10, or 16).
     * @param {number} args.to_base - Target base (2, 8, 10, or 16).
     * @returns {string} The converted number in target base.
     */
    convert_base: ({ value, from_base, to_base }) => {
        // Define valid characters for each base
        const validChars = {
            2: /^[01]+$/i,
            8: /^[0-7]+$/i,
            10: /^[0-9]+$/i,
            16: /^[0-9a-f]+$/i,
        };

        // Validate the value matches the source base
        if (!validChars[from_base].test(value)) {
            throw new Error(
                `Invalid characters for base ${from_base}. Expected: ${
                    from_base === 2
                        ? "binary (0-1)"
                        : from_base === 8
                          ? "octal (0-7)"
                          : from_base === 10
                            ? "decimal (0-9)"
                            : "hexadecimal (0-F)"
                }.`,
            );
        }

        // Step 1: Convert from source base to decimal (integer)
        const decimalValue = parseInt(value, from_base);

        // Step 2: Handle special case - same base
        if (from_base === to_base) {
            return value.toUpperCase();
        }

        // Step 3: Convert from decimal to target base
        return decimalValue.toString(to_base).toUpperCase();
    },
};

/**
 * Sends a JSON-RPC 2.0 error response to stdout.
 * @param {string|number|null} id - The request ID to correlate with the error.
 * @param {number} code - The error code (e.g., -32600, -32601, -32602).
 * @param {Object|string} errorDetails - Error details object with `message` and optional `data`, or legacy plain string.
 */
const sendError = (id, code, errorDetails) => {
    const msg = typeof errorDetails === "string" ? errorDetails : (errorDetails.message || "Unknown error");
    const errorResponse = {
        jsonrpc: "2.0",
        id: id,
        error: { code: code, message: msg },
    };
    if (typeof errorDetails === "object" && errorDetails.data) {
        errorResponse.error.data = errorDetails.data;
    }
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
 * Creates a structured validation error object with detailed debugging context.
 * @param {string} code - JSON-RPC error code.
 * @param {string} message - Human-readable error message.
 * @param {Object} details - Additional context (parameter, expected, received, receivedValue, tool).
 * @returns {Object} A structured error object with code, message, and data fields.
 */
const structuredValidationError = (code, message, details) => ({
    code,
    message,
    data: {
        parameter: details.parameter || null,
        expected: details.expected || null,
        received: details.received || null,
        receivedValue: details.receivedValue !== undefined ? details.receivedValue : null,
        tool: details.tool || null,
    },
});

/**
 * Recursively validates arguments against a JSON Schema to prevent malicious or malformed AI inputs.
 * Ensures the arguments strictly match the definitions in `inputSchema` for the given tool.
 *
 * @param {Object} schema - The JSON Schema defining the expected input.
 * @param {any} args - The arguments provided by the client (AI).
 * @param {string} path - The current property path (used for clear error messages).
 * @param {string} toolName - The name of the tool being validated (for error context).
 * @throws {Object} A structured error object with code, message, and data fields if arguments don't match.
 */
const validateArguments = (schema, args, path = "root", toolName = "unknown") => {
    if (!schema) return;

    // 1. Required fields
    if (schema.required) {
        for (const req of schema.required) {
            if (args === undefined || args[req] === undefined) {
                throw structuredValidationError(-32602,
                    `Validation Error: Missing required property '${req}' at ${path}`,
                    { parameter: req, expected: "defined value", received: "undefined", tool: toolName },
                );
            }
        }
    }

    // Handle undefined args when they aren't required
    if (args === undefined) return;

    // 2. Objects
    if (schema.type === "object") {
        if (typeof args !== "object" || args === null || Array.isArray(args)) {
            throw structuredValidationError(-32602,
                `Validation Error: Expected object at ${path}, got ${typeof args}`,
                { parameter: path.replace("root.", ""), expected: "object", received: typeof args, receivedValue: args, tool: toolName },
            );
        }
        if (schema.properties) {
            for (const key in args) {
                if (schema.properties[key]) {
                    validateArguments(
                        schema.properties[key],
                        args[key],
                        `${path}.${key}`,
                    );
                }
            }
        }
    }

    // 3. Arrays
    if (schema.type === "array") {
        if (!Array.isArray(args)) {
            throw structuredValidationError(-32602,
                `Validation Error: Expected array at ${path}, got ${typeof args}`,
                { parameter: path.replace("root.", ""), expected: "array", received: typeof args, receivedValue: args, tool: toolName },
            );
        }
        if (schema.items) {
            for (let i = 0; i < args.length; i++) {
                validateArguments(schema.items, args[i], `${path}[${i}]`);
            }
        }
    }

    // 4. Primitives (number, string, boolean)
    if (schema.type === "number" && typeof args !== "number") {
        throw structuredValidationError(-32602,
            `Validation Error: Expected number at ${path}, got ${typeof args}`,
            { parameter: path.replace("root.", ""), expected: "number", received: typeof args, receivedValue: args, tool: toolName },
        );
    }
    if (schema.type === "string" && typeof args !== "string") {
        throw structuredValidationError(-32602,
            `Validation Error: Expected string at ${path}, got ${typeof args}`,
            { parameter: path.replace("root.", ""), expected: "string", received: typeof args, receivedValue: args, tool: toolName },
        );
    }
    if (schema.type === "boolean" && typeof args !== "boolean") {
        throw structuredValidationError(-32602,
            `Validation Error: Expected boolean at ${path}, got ${typeof args}`,
            { parameter: path.replace("root.", ""), expected: "boolean", received: typeof args, receivedValue: args, tool: toolName },
        );
    }

    // 5. Constraints
    if (schema.enum && !schema.enum.includes(args)) {
        throw structuredValidationError(-32602,
            `Validation Error: Value '${args}' at ${path} is not valid. Must be one of: ${schema.enum.join(", ")}`,
            { parameter: path.replace("root.", ""), expected: JSON.stringify(schema.enum), received: "invalid enum value", receivedValue: args, tool: toolName },
        );
    }
    if (schema.minimum !== undefined && args < schema.minimum) {
        throw structuredValidationError(-32602,
            `Validation Error: Value ${args} at ${path} must be >= ${schema.minimum}`,
            { parameter: path.replace("root.", ""), expected: `>= ${schema.minimum}`, received: "out of range", receivedValue: args, tool: toolName },
        );
    }
    if (schema.maximum !== undefined && args > schema.maximum) {
        throw structuredValidationError(-32602,
            `Validation Error: Value ${args} at ${path} must be <= ${schema.maximum}`,
            { parameter: path.replace("root.", ""), expected: `<= ${schema.maximum}`, received: "out of range", receivedValue: args, tool: toolName },
        );
    }
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
            { message: "Invalid Request: JSON-RPC version must be '2.0'" },
        );
        return false;
    }

    // Validate that method exists
    if (!message.method) {
        sendError(
            message.id,
            -32600,
            { message: "Invalid Request: 'method' property is required" },
        );
        return false;
    }

    // Validate supported methods
    const supportedMethods = ["initialize", "tools/list", "tools/call"];
    if (!supportedMethods.includes(message.method)) {
        sendError(
            message.id,
            -32601,
            { message: `Method not found: '${message.method}' is not a supported method` },
        );
        return false;
    }

    return true;
};

// --- MCP Server & Worker Thread Logic ---

if (isMainThread) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
    });

    console.error("Cruncher v1.2.5 MCP Server starting...");

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
                serverInfo: { name: "Cruncher", version: "1.2.5" },
            });
            return;
        }

        if (message.method === "tools/list") {
            sendSuccess(message.id, { tools: TOOLS });
            return;
        }

        if (message.method === "tools/call") {
            const { name, arguments: args } = message.params;

            // Find the tool definition and handler
            const toolDef = TOOLS.find((t) => t.name === name);
            const handler = toolHandlers[name];

            if (!toolDef || !handler) {
                sendError(message.id, -32601, { message: `Tool '${name}' not found.` });
                return;
            }

            try {
                // 1. Strict Input Validation based on Tool Schema
                if (toolDef.inputSchema) {
                    validateArguments(toolDef.inputSchema, args || {}, "root", name);
                }
            } catch (error) {
                // Fail fast on validation errors before spawning worker
                // Pass structured error objects directly, or wrap plain strings
                if (error.code && error.data) {
                    sendError(message.id, error.code, error);
                } else {
                    sendError(message.id, -32602, { message: error.message });
                }
                return;
            }

            // Check if this is a memory operation (needs atomic locking)
            const isMemoryOp = ["memory_add", "memory_subtract", "memory_clear"].includes(name);

            // For memory operations, chain onto the queue to ensure serial execution
            const executeTool = async () => {
                let releaseQueue = null;
                
                if (isMemoryOp) {
                    // Chain onto the queue - this creates a new promise that future calls will wait for
                    const currentQueue = memoryQueue;
                    let resolveQueue;
                    memoryQueue = new Promise((resolve) => {
                        resolveQueue = resolve;
                    });
                    releaseQueue = resolveQueue;
                    // Wait for previous operations to complete
                    await currentQueue;
                }

                // 2. Safe Execution via Worker Thread (Timeout Protection)
                // Extract custom timeout if provided (for factorial, median, percentile)
                const workerArgs = { ...(args || {}) };
                const customTimeout = workerArgs.timeout;
                delete workerArgs.timeout; // Remove timeout from args before passing to worker
                
                // Use custom timeout if valid, otherwise use default
                const timeout = (customTimeout && customTimeout >= 100 && customTimeout <= 60000) 
                    ? customTimeout 
                    : EXECUTION_TIMEOUT;

                // Pass the current memory state to the worker
                // For memory ops, this is now guaranteed to be the latest value
                const worker = new Worker(__filename, {
                    workerData: { name, args: workerArgs, currentMemory: memory },
                });

                // Set the execution timeout (custom or default)
                const timeoutId = setTimeout(() => {
                    worker.terminate(); // Forcefully kill the thread!
                    sendError(
                        message.id,
                        -32000,
                        { message: `Execution Timeout: The calculation took longer than ${timeout}ms and was terminated to prevent an infinite loop.` },
                    );
                    // Release queue on timeout
                    if (releaseQueue) releaseQueue();
                }, timeout);

                worker.on("message", (result) => {
                    clearTimeout(timeoutId);
                    if (result.success) {
                        // Sync the main thread's memory with the worker's potentially modified memory
                        memory = result.newMemory;
                        sendSuccess(message.id, {
                            content: [{ type: "text", text: String(result.data) }],
                        });
                    } else {
                        sendError(message.id, -32602, { message: result.error });
                    }
                    // Release queue after worker completes
                    if (releaseQueue) releaseQueue();
                });

                worker.on("error", (error) => {
                    clearTimeout(timeoutId);
                    sendError(message.id, -32603, { message: `Worker Error: ${error.message}` });
                    // Release queue on error
                    if (releaseQueue) releaseQueue();
                });
            };

            executeTool().catch((error) => {
                sendError(message.id, -32603, { message: `Unexpected error: ${error.message}` });
            });
        }
    });
} else {
    // --- Worker Thread Logic ---
    // This block only executes inside the spawned worker
    const { name, args, currentMemory } = workerData;

    // Sync the worker's module-level memory variable with the main thread's state
    memory = currentMemory;

    try {
        const handler = toolHandlers[name];
        const result = handler(args);

        // Send back the result and the potentially modified memory state
        parentPort.postMessage({
            success: true,
            data: result,
            newMemory: memory,
        });
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message,
        });
    }
}

// --- Test Exports ---
// Expose internals for testing without affecting runtime behaviour.
// When cruncher.js is run directly or as a worker, this block is harmless.
if (typeof module !== "undefined") {
    module.exports = {
        safeMath,
        countDecimals,
        toolHandlers,
        validateArguments,
        validateMessage,
        sendError,
        structuredValidationError,
        EXECUTION_TIMEOUT,
    };
}
