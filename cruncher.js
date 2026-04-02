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
 * - v1.2.6: Batch processing tool for executing multiple calculations
 *           in a single request with partial failure tolerance.
 * - v1.2.7: Result caching (sqrt, power, factorial, log, evaluate_expression, etc.)
 *           with TTL and LRU eviction.
 * - v1.2.8: Angle mode toggle (set_angle_mode/get_angle_mode) with global state,
 *           trig functions moved to main-thread execution for persistence.
 * - v1.2.9: Performance optimizations: moved instant tools (power, sqrt, log,
 *           absolute, get_constant, memory_recall, count, min, max) from
 *           workers to main thread. Eliminated double-validation. Dead code
 *           removed. Pre-compiled regexes for evaluate_expression.
 * - v1.2.11: Context token optimization (~40% reduction in tool descriptions).
 *            De-emphasized individual math tools in favor of evaluate_expression.
 *            Trimmed redundant descriptions and repetitive patterns.
 * - v1.2.17: Tiered tool exposure + constants in evaluate_expression via CRUNCHER_TOOL_SET env var.
 *            minimal (5), standard (26), full (36, default) tool sets.
 *            Reduces context token usage by up to 90% for minimal mode.
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

// --- Tool Set Configuration ---
// Controls how many tools are exposed to the LLM to optimize context token usage.
// CRUNCHER_TOOL_SET=full     — All tools (core + batch, cache management).
// CRUNCHER_TOOL_SET=standard — Core + trig, stats, memory, base conversion.
// CRUNCHER_TOOL_SET=minimal  — 5 tools (math primitives + evaluate_expression).
const TOOL_SET = (process.env.CRUNCHER_TOOL_SET || "standard").toLowerCase();
const VALID_TOOL_SETS = ["minimal", "standard", "full"];
if (!VALID_TOOL_SETS.includes(TOOL_SET)) {
    console.error(`Warning: Unknown CRUNCHER_TOOL_SET='${TOOL_SET}', using 'full'.`);
}

/** Tool names exposed per tier. */
const TOOL_TIERS = {
    // Minimal: math primitives + evaluate_expression (5 tools)
    minimal: [
        "evaluate_expression", "add", "subtract", "multiply", "divide",
    ],
    // Standard: minimal + trig, stats, memory, constants, base conversion (33 tools)
    standard: [
        "evaluate_expression",
        "add", "subtract", "multiply", "divide",
        "sqrt", "power", "absolute", "modulo", "factorial",
        "logarithm", "natural_log", "get_constant",
        "sine", "cosine", "tangent", "asin", "acos", "atan",
        "set_angle_mode", "get_angle_mode",
        "sum", "avg", "min", "max", "count",
        "median", "range", "percentile",
        "convert_base",
        "memory_add", "memory_subtract", "memory_clear", "memory_recall",
    ],
    // Full means all tools (adds batch, cache management)
    full: null,
};

/** Filter master tool list by active tier. */
function filterToolsByTier(allTools, tier) {
    if (tier === "full") return allTools;
    const allowed = new Set(TOOL_TIERS[tier]);
    return allTools.filter(t => allowed.has(t.name));
}

// --- Server State ---
// A simple variable to store the memory value for M+, M-, MR, MC functions.
let memory = 0;
let memoryQueue = Promise.resolve(); // Queue for atomic memory operations (main thread)

// --- Cache State ---
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL = 300000; // 5 minutes TTL
const cache = new Map(); // Map<string, { value, timestamp }>

// --- Angle Mode State ---
let angleMode = "radians"; // Default unit for trigonometric functions

/** Generate a deterministic cache key from tool name + sorted args. */
function cacheKey(toolName, args) {
    if (!args || !Object.keys(args).length) return toolName;
    // Sort keys alphabetically for deterministic output
    const sorted = {};
    Object.keys(args).sort().forEach(k => { sorted[k] = args[k]; });
    return toolName + "|" + JSON.stringify(sorted);
}

/** Tools that should NOT be cached (stateful or management). */
const NON_CACHEABLE = new Set([
    'memory_add', 'memory_subtract', 'memory_clear', 'memory_recall',
    'batch', 'cache_clear', 'cache_info',
]);

/** Trig functions that run in main thread and are cacheable. */
const TRIG_TOOLS = ["sine", "cosine", "tangent", "asin", "acos", "atan"];

/** Memory ops that need atomic serial execution (Set for O(1) check). */
const MEMORY_OPS = new Set(["memory_add", "memory_subtract", "memory_clear"]);

/** Tools that support custom timeout param (worker-only). */
const TIMEOUT_TOOLS = new Set(["factorial", "median", "percentile"]);

/** Instant tools that run in main thread (no worker overhead needed). */
const MAIN_THREAD_TOOLS = new Set([
    // Angle management
    "set_angle_mode", "get_angle_mode",
    // Trigonometry (instant Math calls)
    "sine", "cosine", "tangent", "asin", "acos", "atan",
    // Cache management
    "cache_clear", "cache_info",
    // Simple stats (zero-cost)
    "count", "min", "max",
    // Math one-liners
    "power", "sqrt", "logarithm", "natural_log", "absolute",
    // Constant lookup
    "get_constant",
    // Memory recall (single variable read)
    "memory_recall",
]);

/** Return cached value or null if miss/expired. */
function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}

/** Store result in cache with LRU eviction. */
function cacheSet(key, value) {
    if (cache.size >= CACHE_MAX_SIZE) {
        const first = cache.keys().next().value;
        cache.delete(first);
    }
    cache.set(key, { value, timestamp: Date.now() });
}

// --- Physical & Mathematical Constants ---
// Shared between 'get_constant' tool and 'evaluate_expression' constant substitution.
const CONSTANTS = {
    // Math
    pi: Math.PI,
    e: Math.E,
    tau: 2 * Math.PI,
    phi: 1.618033988749895,
    sqrt2: Math.SQRT2,
    euler_mascheroni: 0.5772156649015329,
    // Physics (SI Units)
    c: 299792458,
    g: 9.80665,
    G: 6.6743e-11,
    h: 6.62607015e-34,
    k: 1.380649e-23,
    R: 8.314462618,
    NA: 6.02214076e23,
    e_charge: 1.602176634e-19,
    m_e: 9.1093837015e-31,
    m_p: 1.67262192369e-27,
};

// --- Pre-compiled Regex for evaluate_expression ---
const RE_NOTATION_CARAT     = /\^/g;
const RE_SCIENTIFIC_NOTATION = /(\d+\.?\d*)e([+-]?\d+)/gi;
const RE_FUNC_ABS           = /\babs\s*\(/g;
const RE_FUNC_ROUND         = /\bround\s*\(/g;
const RE_FUNC_FLOOR         = /\bfloor\s*\(/g;
const RE_FUNC_CEIL          = /\bceil\s*\(/g;
const RE_FUNC_MIN_FUNC      = /\bmin\s*\(/g;
const RE_FUNC_MAX_FUNC      = /\bmax\s*\(/g;
// Trigonometric functions (radians only — same as standard math)
const RE_FUNC_SIN           = /\bsin\s*\(/g;
const RE_FUNC_COS           = /\bcos\s*\(/g;
const RE_FUNC_TAN           = /\btan\s*\(/g;
const RE_FUNC_ASIN          = /\basin\s*\(/g;
const RE_FUNC_ACOS          = /\bacos\s*\(/g;
const RE_FUNC_ATAN          = /\batan\s*\(/g;
// Math helpers
const RE_FUNC_SQRT          = /\bsqrt\s*\(/g;
const RE_FUNC_LOG           = /\blog10\s*\(/g;        // log10() → Math.log10()
const RE_FUNC_LN            = /\bln\s*\(/g;           // ln() → Math.log()
const RE_FUNC_LOG_BASE      = /\blog\s*\(([^,)]+)\s*,\s*([^)]+)\)/g;  // log(x,base)
// Constants pattern: longest names first to avoid partial matches (e_charge before e,
// euler_mascheroni before e, sqrt2 before pi, tau before tau). Built dynamically.
const RE_CONSTANTS = (() => {
    const names = Object.keys(CONSTANTS).sort((a, b) => b.length - a.length);
    const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`\\b(${escaped.join('|')})\\b`, 'g');
})();
const RE_DISALLOWED_CHARS   = /[^0-9+\-*/().% \t*,Mathabspowrndflceigumsxqtogv1]/;
const RE_VALID_MATH_CALLS   = /Math\.(pow|abs|round|floor|ceil|min|max|sin|cos|tan|asin|acos|atan|sqrt|log10|log)\(/g;

// --- Master Tool Definitions (full catalog) ---
// Filtered at startup via CRUNCHER_TOOL_SET to optimize context token usage.
const toolsAll = [
    // --- Basic Arithmetic (use evaluate_expression for complex math) ---
    {
        name: "add",
        description:
            "Adds two numbers.",
        inputSchema: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
            required: ["a", "b"],
        },
    },
    {
        name: "subtract",
        description:
            "Subtracts two numbers.",
        inputSchema: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
            required: ["a", "b"],
        },
    },
    {
        name: "multiply",
        description:
            "Multiplies two numbers.",
        inputSchema: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
            required: ["a", "b"],
        },
    },
    {
        name: "divide",
        description:
            "Divides two numbers. Errors on zero divisor.",
        inputSchema: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
            required: ["a", "b"],
        },
    },
    // --- Power & Root ---
    {
        name: "power",
        description: "Raises a to the power of b.",
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
            "Square root. Errors on negative input.",
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
            'Sine. Angle in radians by default, or degrees with unit: "degrees".',
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
            'Cosine. Angle in radians by default, or degrees with unit: "degrees".',
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
            'Tangent. Angle in radians by default, or degrees with unit: "degrees".',
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
            'Arcsine. Result in radians by default, or degrees with unit param.',
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
            'Arccosine. Result in radians by default, or degrees with unit param.',
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
            'Arctangent. Result in radians by default, or degrees with unit param.',
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
            "Base-10 logarithm. Errors on non-positive input.",
        inputSchema: {
            type: "object",
            properties: { value: { type: "number" } },
            required: ["value"],
        },
    },
    {
        name: "natural_log",
        description:
            "Natural logarithm (ln). Errors on non-positive input.",
        inputSchema: {
            type: "object",
            properties: { value: { type: "number" } },
            required: ["value"],
        },
    },
    // --- Other ---
    {
        name: "absolute",
        description: "Absolute value.",
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
            "Returns a mathematical, physical, or chemical constant. See enum values.",
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
        description: "Sum of numbers.",
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
        description: "Average (mean) of numbers.",
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
        description: "Median of numbers.",
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
        description: "Minimum of numbers.",
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
        description: "Maximum of numbers.",
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
        description: "Clear memory (MC).",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "memory_recall",
        description: "Recall memory value (MR).",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "memory_add",
        description: "Add to memory (M+).",
        inputSchema: {
            type: "object",
            properties: { value: { type: "number" } },
            required: ["value"],
        },
    },
    {
        name: "memory_subtract",
        description: "Subtract from memory (M-).",
        inputSchema: {
            type: "object",
            properties: { value: { type: "number" } },
            required: ["value"],
        },
    },
    // --- Additional Statistical Functions ---
    {
        name: "count",
        description: "Count elements.",
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
            "Range (max - min) of numbers.",
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
            "Percentile (0-100) of numbers.",
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
            "Remainder of a / b. Errors on zero divisor.",
        inputSchema: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
            required: ["a", "b"],
        },
    },
    {
        name: "factorial",
        description:
            "Factorial of non-negative integer (n!). n > 170 overflows.",
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
            "Evaluate a mathematical expression. PRIMARY tool for ALL math: +, -, *, /, %, ^, parentheses, decimals, scientific notation (1e6), functions (abs, round, floor, ceil, min, max).",
        inputSchema: {
            type: "object",
            properties: { expression: { type: "string" } },
            required: ["expression"],
        },
    },
    {
        name: "convert_base",
        description:
            "Convert number string between bases 2, 8, 10, 16.",
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
    {
        name: "batch",
        description:
            "Execute multiple tool calls sequentially. Returns array of results.",
        inputSchema: {
            type: "object",
            properties: {
                operations: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            tool: { type: "string" },
                            args: { type: "object" },
                        },
                        required: ["tool", "args"],
                    },
                },
            },
            required: ["operations"],
        },
    },
    {
        name: "set_angle_mode",
        description: "Set global trig angle mode. Individual calls with unit param override this.",
        inputSchema: {
            type: "object",
            properties: {
                mode: { type: "string", enum: ["degrees", "radians"] }
            },
            required: ["mode"]
        }
    },
    {
        name: "get_angle_mode",
        description: "Get current trig angle mode.",
        inputSchema: { type: "object", properties: {}, required: [] }
    },
    {
        name: "cache_clear",
        description: "Clear computation cache.",
        inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
        name: "cache_info",
        description: "Show cache stats.",
        inputSchema: { type: "object", properties: {}, required: [] },
    },
];

/** Active tool list — filtered by CRUNCHER_TOOL_SET env var. */
const TOOLS = filterToolsByTier(toolsAll, TOOL_SET);

/** Pre-built O(1) Tool lookup Map (replaces O(n) TOOLS.find() per call). */
const TOOL_LOOKUP_MAP = new Map(TOOLS.map(t => [t.name, t]));

/**
 * Calculate Levenshtein distance between two strings.
 * Used for fuzzy tool name matching to help LLMs recover from typos.
 */
const levenshtein = (a, b) => {
    const m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            m[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
                ? m[i - 1][j - 1]
                : Math.min(m[i - 1][j - 1] + 1, Math.min(m[i][j - 1] + 1, m[i - 1][j] + 1));
        }
    }
    return m[b.length][a.length];
};

/**
 * Find the closest tool name match via Levenshtein distance.
 * Returns null if no match within allowed tolerance:
 *   - Exact prefix match (typedName is a known tool's prefix) → always matches
 *   - Distance ≤ 3 AND ≤ 40% of the longer name
 */
const findClosestToolName = (typedName) => {
    if (!typedName || typedName.length === 0) return null;
    const lowerTyped = typedName.toLowerCase();

    // 1. Prefix shortcut: if typedName starts a known tool name, return it
    for (const [toolName] of TOOL_LOOKUP_MAP) {
        if (toolName.toLowerCase().startsWith(lowerTyped)) return toolName;
    }

    // 2. Levenshtein fallback for non-prefix typos
    let bestName = null;
    let bestDist = Infinity;
    const maxLen = Math.max(lowerTyped.length, 5); // floor so short names aren't too strict
    const maxDist = Math.min(3, Math.floor(maxLen * 0.4));
    for (const [toolName] of TOOL_LOOKUP_MAP) {
        const dist = levenshtein(lowerTyped, toolName.toLowerCase());
        if (dist <= maxDist && dist < bestDist) {
            bestDist = dist;
            bestName = toolName;
        }
    }
    return bestName;
};

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
const toRadians = (angle, unit) => {
    const resolved = unit || angleMode;
    return resolved === "degrees" ? angle * (Math.PI / 180) : angle;
};

/**
 * Converts radians to degrees if the unit is "degrees".
 * @param {number} radians - The angle in radians.
 * @param {string} [unit] - The unit ("degrees" or "radians").
 * @returns {number} The angle in the specified unit.
 */
const fromRadians = (radians, unit) => {
    const resolved = unit || angleMode;
    return resolved === "degrees" ? radians * (180 / Math.PI) : radians;
};

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
     * Absolute value.
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
        if (name in CONSTANTS) return CONSTANTS[name];
        throw new Error(`Unknown constant: ${name}`);
    },

    // Statistical Handlers
    /**
     * Sum of numbers.
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
     * Minimum of numbers.
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
     * Maximum of numbers.
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
     * Clear memory (MC).
     * @returns {string} Confirmation message.
     */
    memory_clear: () => {
        memory = 0;
        return "Memory cleared.";
    },

    /**
     * Recall memory value (MR).
     * @returns {number} The current memory value.
     */
    memory_recall: () => memory,

    /**
     * Add to memory (M+).
     * @param {Object} args - The arguments object.
     * @param {number} args.value - The value to add.
     * @returns {string} Confirmation message with new memory value.
     */
    memory_add: ({ value }) => {
        memory += value;
        return `Added ${value} to memory. New memory value: ${memory}`;
    },

    /**
     * Subtract from memory (M-).
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
     * Count elements.
     * @param {Object} args - The arguments object.
     * @param {number[]} args.numbers - Array of numbers.
     * @returns {number} The count of elements.
     */
    count: ({ numbers }) => numbers.length,

    /**
     * Range (max - min) of numbers.
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
        // Pre-compiled regexes for expression preprocessing
        // 1. Convert mathematical ^ to JavaScript's ** operator
        let parsedExpr = expression.replace(RE_NOTATION_CARAT, "**");

        // 2. Convert scientific notation (1e6, 2.5e-3) to safe multiplication
        parsedExpr = parsedExpr.replace(
            RE_SCIENTIFIC_NOTATION,
            "($1 * Math.pow(10, $2))"
        );

        // 3. Convert built-in functions to Math.* equivalents
        parsedExpr = parsedExpr
            .replace(RE_FUNC_ABS,    "Math.abs(")
            .replace(RE_FUNC_ROUND,  "Math.round(")
            .replace(RE_FUNC_FLOOR,  "Math.floor(")
            .replace(RE_FUNC_CEIL,   "Math.ceil(")
            .replace(RE_FUNC_MIN_FUNC, "Math.min(")
            .replace(RE_FUNC_MAX_FUNC, "Math.max(")
            // Trigonometric (radians — standard math convention)
            .replace(RE_FUNC_SIN,    "Math.sin(")
            .replace(RE_FUNC_COS,    "Math.cos(")
            .replace(RE_FUNC_TAN,    "Math.tan(")
            .replace(RE_FUNC_ASIN,   "Math.asin(")
            .replace(RE_FUNC_ACOS,   "Math.acos(")
            .replace(RE_FUNC_ATAN,   "Math.atan(")
            // Math helpers
            .replace(RE_FUNC_SQRT,   "Math.sqrt(")
            .replace(RE_FUNC_LOG,    "Math.log10(")
            .replace(RE_FUNC_LN,     "Math.log(");

        // 3.1. Handle log(x, base) → Math.log(x) / Math.log(base)
        parsedExpr = parsedExpr.replace(RE_FUNC_LOG_BASE, "Math.log($1) / Math.log($2)");

        // 3.5. Substitute constant names with their numeric values

        // 3.5. Substitute constant names with their numeric values
        //    e.g., "pi * 2" → "3.141592653589793 * 2"
        //    Use word boundaries so "pi" doesn't match inside other identifiers.
        //    Longest constant names are matched first to avoid partial collisions.
        //    Required explicit operator: "2 * pi", not "2pi".
        parsedExpr = parsedExpr.replace(RE_CONSTANTS, (match) => CONSTANTS[match].toString());

        // 4. SECURITY CHECK: Strict Whitelist
        if (RE_DISALLOWED_CHARS.test(parsedExpr)) {
            throw new Error(
                "Security Error: Expression contains invalid characters. " +
                "Only numbers, basic operators (+, -, *, /, %, ^), parentheses, commas, " +
                "functions (abs, round, floor, ceil, min, max, sin, cos, tan, asin, acos, atan, sqrt, log10, ln, log) " +
                "and constants (pi, e, tau, phi, sqrt2, c, g, G, h, k, R, NA, euler_mascheroni) " +
                "are allowed.",
            );
        }
        // Verify only valid Math.* functions remain
        const sanitizedExpr = parsedExpr.replace(RE_VALID_MATH_CALLS, "");
        if (sanitizedExpr.includes("Math.")) {
            throw new Error(
                "Security Error: Invalid Math function. " +
                "Only abs, round, floor, ceil, min, max, pow, sin, cos, tan, asin, acos, atan, sqrt, log10, log are allowed.",
            );
        }

        try {
            // 5. Evaluate safely
            // Because we strictly verified the contents above, this is now safe to run.
            const result = new Function("return (" + parsedExpr + ")")();
            if (result === Infinity || result === -Infinity) {
                throw new Error(
                    "Domain Error: Expression evaluated to infinity. " +
                    "Check for division by zero or overflow (e.g., exp(1000)).",
                );
            }
            if (isNaN(result)) {
                // Try to give a more helpful message by re-evaluating sub-expressions
                throw new Error(
                    "Domain Error: Expression evaluated to NaN. " +
                    "Check for: sqrt(negative), log(negative/zero), asin/acos out of [-1,1], or 0/0.",
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

    /**
     * Executes multiple tool calls in a single request for batch processing.
     * Each operation runs sequentially and results are returned as an array.
     * @param {Object} args - The arguments object.
     * @param {Array} args.operations - Array of { tool, args } objects.
     * @returns {Array} Array of result objects with { tool, success, data/error }.
     */
    batch: ({ operations }) => {
        if (!Array.isArray(operations) || operations.length === 0) {
            throw new Error("Batch requires a non-empty array of operations.");
        }
        if (operations.length > 50) {
            throw new Error("Batch limited to 50 operations per request.");
        }

        const results = [];
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            const opName = op.tool || "unknown";
            const opArgs = op.args || {};
            const opToolDef = TOOL_LOOKUP_MAP.get(opName);
            const opHandler = toolHandlers[opName];

            if (!opToolDef || !opHandler) {
                results.push({ index: i, tool: opName, success: false, error: `Tool '${opName}' not found.` });
                continue;
            }

            try {
                // Validate operation arguments
                if (opToolDef.inputSchema) {
                    validateArguments(opToolDef.inputSchema, opArgs, "root", opName);
                }

                // Check cache before executing (batch previously bypassed cache entirely)
                if (!NON_CACHEABLE.has(opName)) {
                    const cachedKey = cacheKey(opName, opArgs);
                    const cachedValue = cacheGet(cachedKey);
                    if (cachedValue !== null) {
                        results.push({ index: i, tool: opName, success: true, data: cachedValue });
                        continue;
                    }
                }

                // Execute the tool (runs in main thread, no worker for batch)
                const result = opHandler(opArgs);
                // Cache result for cacheable tools
                if (!NON_CACHEABLE.has(opName)) {
                    cacheSet(cacheKey(opName, opArgs), result);
                }
                results.push({ index: i, tool: opName, success: true, data: result });
            } catch (error) {
                results.push({ index: i, tool: opName, success: false, error: error.message || String(error) });
            }
        }

        return JSON.stringify(results);
    },

    /** Set the global angle mode. */
    set_angle_mode: ({ mode }) => {
        angleMode = mode;
        return `Angle mode set to ${mode}`;
    },

    /** Get the current global angle mode. */
    get_angle_mode: () => {
        return JSON.stringify({ mode: angleMode });
    },

    /** Clear the result cache. */
    cache_clear: () => {
        cache.clear();
        return "Cache cleared successfully";
    },

    /** Get cache statistics. */
    cache_info: () => {
        return JSON.stringify({
            size: cache.size,
            max_size: CACHE_MAX_SIZE,
            ttl_ms: CACHE_TTL,
        });
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
                        toolName,
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
                validateArguments(schema.items, args[i], `${path}[${i}]`, toolName);
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
    const supportedMethods = new Set(["initialize", "tools/list", "tools/call"]);
    if (!supportedMethods.has(message.method)) {
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

    console.error(`Cruncher v1.2.17 MCP Server starting...`);
    console.error(`  Tool set: ${TOOL_SET} (${TOOLS.length} tools exposed)`);

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
                serverInfo: { name: "Cruncher", version: "1.2.17" },
            });
            return;
        }

        if (message.method === "tools/list") {
            sendSuccess(message.id, { tools: TOOLS });
            return;
        }

        if (message.method === "tools/call") {
            const { name, arguments: args } = message.params;

            // O(1) tool lookup via pre-built Map
            const toolDef = TOOL_LOOKUP_MAP.get(name);
            const handler = toolHandlers[name];

            if (!toolDef || !handler) {
                const didYouMean = findClosestToolName(name);
                const msg = didYouMean
                    ? `Tool '${name}' not found. Did you mean '${didYouMean}'?`
                    : `Tool '${name}' not found.`;
                sendError(message.id, -32601, { message: msg });
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

            // 2. Main-thread fast path (instant calls, no worker overhead)
            //    Validation already happened above — just execute and return.
            if (MAIN_THREAD_TOOLS.has(name)) {
                try {
                    const result = handler(args);
                    if (TRIG_TOOLS.includes(name)) {
                        cacheSet(cacheKey(name, args), result);
                    }
                    sendSuccess(message.id, {
                        content: [{ type: "text", text: String(result) }],
                    });
                } catch (error) {
                    sendError(message.id, -32602, { message: error.message });
                }
                return;
            }

            // 3. Result cache hit check (worker tools only, skips worker spawn)
            if (!NON_CACHEABLE.has(name)) {
                const key = cacheKey(name, args);
                const cached = cacheGet(key);
                if (cached !== null) {
                    sendSuccess(message.id, {
                        content: [{ type: "text", text: String(cached) }],
                    });
                    return;
                }
            }

            // Check if this is a memory operation (needs atomic locking)
            const isMemoryOp = MEMORY_OPS.has(name);

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

                // Only clone args for tools that support custom timeout.
                // All other tools pass args directly — zero allocation.
                let workerArgs = args;
                if (TIMEOUT_TOOLS.has(name)) {
                    workerArgs = { ...args };
                    delete workerArgs.timeout;
                }
                
                // Extract custom timeout from original args (if provided)
                const customTimeout = args && args.timeout;
                
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

                        // 3. Store result in cache (cacheable tools only)
                        if (!NON_CACHEABLE.has(name)) {
                            const key = cacheKey(name, args);
                            cacheSet(key, result.data);
                        }
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
