import { defineConfig } from '@fullstacksjs/eslint-config';

export default defineConfig({
  typescript: {
    tsconfigRootDir: import.meta.dirname,
  },
  rules: {
    'no-fallthrough': ['error', { allowEmptyCase: true }],
    'max-lines-per-function': 'off',
    'max-statements': 'off',
    complexity: 'off',
    '@typescript-eslint/no-floating-promises': 'off',
    'react-hooks/incompatible-library': 'off',
    'react-refresh/only-export-components': 'off',
    '@eslint-react/refs': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
  },
  ignores: ['./src/database.types.ts', './eslint.config.js', './scripts/*.js'],
});
