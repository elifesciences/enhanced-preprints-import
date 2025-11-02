module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', , "no-only-tests"],
  extends: ['airbnb/base', 'airbnb-typescript/base', 'plugin:deprecation/recommended'],
  rules: {
    "deprecation/deprecation": 1,
    "import/prefer-default-export": 0,
    "max-len": ["error", { "code": 240 }],
    "no-only-tests/no-only-tests": ["error", {
      "focus": ["only"]
    }],
    "import/no-extraneous-dependencies": ["error", {"devDependencies": ["src/**/*.test.ts"]}],
    "@typescript-eslint/consistent-type-imports": ["error", { "fixStyle": "inline-type-imports" }],
  }
};
