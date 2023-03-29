module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', , "no-only-tests"],
  extends: ['airbnb/base', 'airbnb-typescript/base'],
  rules: {
    "import/prefer-default-export": 0,
    "max-len": ["error", { "code": 240 }],
    "no-only-tests/no-only-tests": ["error", {
      "focus": ["only"]
    }],
  }
};
