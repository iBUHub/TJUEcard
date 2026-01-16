/**
 * Prettier Configuration
 * Formats code consistently across the project
 */

module.exports = {
    // ==================== Basic Formatting ====================
    tabWidth: 4, // Default to 4 spaces
    useTabs: false,
    endOfLine: "lf",

    // ==================== String & Quotes ====================
    singleQuote: false,
    quoteProps: "as-needed",

    // ==================== Semicolons & Commas ====================
    semi: true,
    trailingComma: "es5",

    // ==================== Line Length ====================
    printWidth: 120,

    // ==================== Spacing ====================
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: "avoid",

    // ==================== HTML/Vue Specific ====================
    htmlWhitespaceSensitivity: "css",
    vueIndentScriptAndStyle: false,

    // Plugin for CJK spacing
    plugins: ["prettier-plugin-zh"],

    // ==================== File-specific Overrides ====================
    overrides: [
        {
            // Web/Frontend - Single Quotes
            files: ["web/**/*.{js,ts,vue}"],
            options: {
                singleQuote: true,
            },
        },
        {
            // Server/Backend - Double Quotes
            files: ["server/**/*.{js,ts}"],
            options: {
                singleQuote: false,
            },
        },
        {
            // JSON files
            files: "*.json",
            options: {
                tabWidth: 4,
                trailingComma: "none",
            },
        },
        {
            files: ["*.md"],
            options: {
                tabWidth: 2,
                proseWrap: "preserve",
            },
        },
    ],
};
