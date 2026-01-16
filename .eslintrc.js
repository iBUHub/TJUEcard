/**
 * ESLint Configuration
 * Enforces code style consistency across the project
 */

module.exports = {
    env: {
        node: true,
        es2021: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:prettier/recommended", // Enables eslint-plugin-prettier and eslint-config-prettier
    ],
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    plugins: ["sort-keys-fix", "jsonc", "vue", "@typescript-eslint"],
    overrides: [
        {
            // Configuration files - exempt from object key sorting
            files: [".eslintrc.js", ".prettierrc.js", "vite.config.ts", "*.config.js", "*.config.ts"],
            rules: {
                "sort-keys-fix/sort-keys-fix": "off",
            },
        },
        {
            // Vue Single File Components (Web)
            files: ["web/src/**/*.vue"],
            env: {
                browser: true,
                es2021: true,
            },
            extends: [
                "eslint:recommended",
                "plugin:vue/vue3-recommended",
                "plugin:@typescript-eslint/recommended", // Add TS support
                "plugin:prettier/recommended", // Must be last
            ],
            parser: "vue-eslint-parser",
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                parser: "@typescript-eslint/parser",
            },
            rules: {
                // Vue-specific rules
                "vue/component-name-in-template-casing": ["error", "PascalCase"],
                "vue/component-definition-name-casing": ["error", "PascalCase"],
                "vue/multi-word-component-names": "off",

                // Frontend uses single quotes
                quotes: ["error", "single", { avoidEscape: true }],
            },
        },
        {
            // Frontend TypeScript/JavaScript files
            files: ["web/**/*.{ts,js}"],
            env: {
                browser: true,
                es2021: true,
            },
            parser: "@typescript-eslint/parser",
            plugins: ["@typescript-eslint"],
            extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],
            rules: {
                // Frontend uses single quotes
                quotes: ["error", "single", { avoidEscape: true }],
                "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            },
        },
        {
            // Backend TypeScript/JavaScript files
            files: ["server/**/*.{ts,js}"],
            env: {
                node: true,
                es2021: true,
                worker: true, // For Cloudflare Workers
            },
            parser: "@typescript-eslint/parser",
            plugins: ["@typescript-eslint"],
            extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],
            rules: {
                // Backend uses double quotes
                quotes: ["error", "double", { avoidEscape: true }],
                "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            },
        },
        {
            // JSON files in locales directory - enforce sorted keys
            files: ["web/locales/*.json"],
            extends: [
                "plugin:jsonc/recommended-with-json",
                "plugin:prettier/recommended", // Must be last
            ],
            parser: "jsonc-eslint-parser",
            rules: {
                "jsonc/sort-keys": [
                    "error",
                    "asc",
                    {
                        caseSensitive: false,
                        natural: true,
                    },
                ],
                "jsonc/indent": ["error", 4], // Vue/Web often uses 2 spaces
            },
        },
        {
            // All other JSON files - enforce sorting
            files: ["**/*.json"],
            extends: ["plugin:jsonc/recommended-with-json", "plugin:prettier/recommended"],
            parser: "jsonc-eslint-parser",
            rules: {
                "jsonc/sort-keys": [
                    "error",
                    "asc",
                    {
                        caseSensitive: false,
                        natural: true,
                        minKeys: 2,
                    },
                ],
            },
        },
        {
            // Exempt package.json and lock files from sorting
            files: ["package.json", "package-lock.json", "**/package.json", "**/package-lock.json"],
            extends: ["plugin:jsonc/recommended-with-json", "plugin:prettier/recommended"],
            parser: "jsonc-eslint-parser",
            rules: {
                "jsonc/sort-keys": "off",
            },
        },
    ],
    rules: {
        // ==================== Code Quality ====================
        "no-console": "off",
        "no-var": "error",
        "prefer-const": "error",

        // ==================== Code Style ====================
        "prefer-arrow-callback": "error",
        "arrow-body-style": ["error", "as-needed"],
        "object-shorthand": ["error", "always"],

        // Enforce sorted object keys (fixable)
        "sort-keys-fix/sort-keys-fix": [
            "error",
            "asc",
            {
                caseSensitive: false,
                natural: true,
            },
        ],

        // ==================== Disabled Rules (Prettier Handles These) ====================
        indent: "off",
        semi: "off",
        "comma-dangle": "off",
    },
};
