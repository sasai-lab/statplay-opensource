import js from '@eslint/js';

export default [
  {
    ignores: [
      'node_modules/**',
      'icons/**',
      'sw.js',
      'stat_cyber_og.png',
      '**/*.min.js',
      'scripts/test_layout.mjs',
      'scripts/capture_ogp.mjs',
      '.claude/**',
      'test-results/**',
      'dist/**'
    ]
  },
  {
    files: ['js/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly',
        location: 'readonly', history: 'readonly', console: 'readonly',
        fetch: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly',
        requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
        IntersectionObserver: 'readonly', ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        Event: 'readonly', CustomEvent: 'readonly', MouseEvent: 'readonly',
        KeyboardEvent: 'readonly', PointerEvent: 'readonly',
        Image: 'readonly', Blob: 'readonly', FileReader: 'readonly',
        getComputedStyle: 'readonly', matchMedia: 'readonly',
        HTMLElement: 'readonly', HTMLCanvasElement: 'readonly',
        Element: 'readonly', NodeList: 'readonly', Node: 'readonly',
        performance: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        sessionStorage: 'readonly',
        localStorage: 'readonly',
        addEventListener: 'readonly', dispatchEvent: 'readonly',
        removeEventListener: 'readonly',
        __LANG: 'readonly', __THEME: 'readonly',
        __REDUCED_MOTION: 'readonly', __OS_PREFERS_LIGHT: 'readonly'
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars':   ['warn', {'args':'none', 'varsIgnorePattern':'^_', 'caughtErrorsIgnorePattern':'^_'}],
      'no-empty':         ['warn', {'allowEmptyCatch': true}],
      'no-fallthrough':   'warn',
      'no-cond-assign':   ['error', 'except-parens'],
      'eqeqeq':           ['warn', 'smart'],
      'semi':             ['warn', 'always'],
      'no-template-curly-in-string': 'warn'
    }
  },
  {
    files: ['scripts/**/*.mjs'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly', console: 'readonly', URL: 'readonly',
        setTimeout: 'readonly', Buffer: 'readonly'
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', {'args':'none', 'varsIgnorePattern':'^_', 'caughtErrorsIgnorePattern':'^_'}],
      'no-empty':       ['warn', {'allowEmptyCatch': true}],
      'no-undef':       'error'
    }
  }
];
