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
      'scripts/legacy/**',
      'scripts/_split_tests.py',
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
      'no-template-curly-in-string': 'warn',
      // Forbid direct reads of `window.__LANG`. Use `isEn()` / `getLang()`
      // from utils.js instead. (lang.js / prefs.js still WRITE to it; this
      // rule targets MemberExpression reads, which both writes pass through
      // when used as the LHS of assignment — but ESLint only flags reads
      // semantically. We add per-file overrides below for the two writers.)
      'no-restricted-syntax': ['error', {
        selector: "MemberExpression[object.name='window'][property.name='__LANG']",
        message: 'Use getLang() / isEn() from utils.js instead of window.__LANG'
      }]
    }
  },
  {
    // The two modules that own writing window.__LANG (the source of truth)
    // need to bypass the no-restricted-syntax rule above.
    files: ['js/modules/lang.js', 'js/modules/prefs.js', 'js/utils.js'],
    rules: {
      'no-restricted-syntax': 'off'
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
