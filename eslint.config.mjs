// ESLint (flat config). Alcance: código JS modular estándar (scripts de build/claves y
// tests). El monolito VacuPet.html y las Edge Functions (Deno) quedan fuera a propósito
// hasta la modularización por el equipo — ver HANDOFF.md §3-4.
//
// Activar: `npm install` (instala eslint) y `npm run lint`.

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'dist-brands/**',
      'android/**',
      'test-results/**',
      'playwright-report/**',
      'supabase/functions/**', // Deno: linter propio (deno lint)
      'VacuPet.html', // monolito: pendiente de extraer a módulos
      'gsap.min.js',
    ],
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', '*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { process: 'readonly', console: 'readonly', globalThis: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart'],
      'no-var': 'warn',
    },
  },
];
